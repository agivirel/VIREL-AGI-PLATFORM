import {
  GoogleGenAI,
  GenerateContentResponse,
  GenerateContentParameters,
  Modality,
  Type,
  FunctionDeclaration,
  Content, // Fix: Import Content type for chat history
} from '@google/genai';
import {
  GenerativeModel,
  CustomBlob,
  LiveSessionCallbacks,
  LiveSessionConfig,
  LiveInputSendRequest,
  LiveToolResponseSendRequest,
  Resolution,
  AspectRatio,
  GroundingChunk,
} from '../types';
import {
  LIVE_API_INPUT_SAMPLE_RATE,
  LIVE_API_AUDIO_CHANNELS,
  LIVE_API_OUTPUT_SAMPLE_RATE,
  TTSVoiceName, // Import TTSVoiceName from constants
} from '../constants';

// Helper functions for audio encoding/decoding
export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function createPcmBlob(data: Float32Array): CustomBlob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: `audio/pcm;rate=${LIVE_API_INPUT_SAMPLE_RATE}`,
  };
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result?.toString().split(',')[1];
      if (base64String) {
        resolve(base64String);
      } else {
        reject('Failed to convert blob to base64');
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Geolocation helper
export async function getGeolocation(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 },
      );
    } else {
      console.warn('Geolocation is not supported by this browser.');
      resolve(null);
    }
  });
}

// Gemini API Service
export class GeminiService {
  private getAiInstance(): GoogleGenAI {
    if (!process.env.API_KEY) {
      throw new Error('API_KEY is not defined. Please ensure it is set as an environment variable.');
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  // General content generation for text/images
  public async generateContent(
    model: GenerativeModel,
    prompt: string,
    imageParts?: Array<{ inlineData: { mimeType: string; data: string } }>,
    systemInstruction?: string,
    useThinkingMode: boolean = false,
  ): Promise<{ text: string; groundingUrls?: GroundingChunk[] }> {
    const ai = this.getAiInstance();
    const contents: GenerateContentParameters['contents'] = imageParts
      ? { parts: [...imageParts, { text: prompt }] }
      : prompt;

    const config: GenerateContentParameters['config'] = {
      systemInstruction,
    };

    if (useThinkingMode && model === 'gemini-2.5-pro') {
      config.thinkingConfig = { thinkingBudget: 32768 };
      // maxOutputTokens should not be set with thinkingBudget according to instructions.
    }

    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model,
        contents,
        config,
      });
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      return { text: response.text, groundingUrls: groundingChunks };
    } catch (error) {
      console.error('Error generating content:', error);
      throw error;
    }
  }

  // Chat functionality
  public async sendMessage(model: GenerativeModel, history: Content[], message: string) { // Fix: Changed history type to Content[]
    const ai = this.getAiInstance();
    const chat = ai.chats.create({
      model,
      history,
    });
    const response = await chat.sendMessage({ message });
    return response.text;
  }

  // Image generation with Imagen
  public async generateImage(prompt: string, aspectRatio: AspectRatio): Promise<string> {
    const ai = this.getAiInstance();
    try {
      const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio,
        },
      });
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      return `data:image/png;base64,${base64ImageBytes}`;
    } catch (error) {
      console.error('Error generating image:', error);
      throw error;
    }
  }

  // Video generation (Veo) from text
  public async generateVideoFromText(
    prompt: string,
    aspectRatio: AspectRatio,
    resolution: Resolution,
    onProgress: (message: string) => void,
  ): Promise<string> {
    const ai = this.getAiInstance();
    try {
      onProgress('Initiating video generation...');
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        config: {
          numberOfVideos: 1,
          resolution,
          aspectRatio,
        },
      });

      while (!operation.done) {
        onProgress(`Video generation in progress... Waiting for 10 seconds. Status: ${operation.metadata?.state || 'UNKNOWN'}`);
        await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) {
        throw new Error('No video download link found.');
      }
      onProgress('Video generation complete. Fetching video...');
      // The response.body contains the MP4 bytes. You must append an API key when fetching from the download link.
      const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      if (!videoResponse.ok) {
        throw new Error(`Failed to fetch video: ${videoResponse.statusText}`);
      }
      const videoBlob = await videoResponse.blob();
      return URL.createObjectURL(videoBlob);
    } catch (error) {
      console.error('Error generating video:', error);
      throw error;
    }
  }

  // Video generation (Veo) from image
  public async generateVideoFromImage(
    prompt: string,
    imageBytes: string,
    imageMimeType: string,
    aspectRatio: AspectRatio,
    resolution: Resolution,
    onProgress: (message: string) => void,
  ): Promise<string> {
    const ai = this.getAiInstance();
    try {
      onProgress('Initiating video generation from image...');
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        image: {
          imageBytes,
          mimeType: imageMimeType,
        },
        config: {
          numberOfVideos: 1,
          resolution,
          aspectRatio,
        },
      });

      while (!operation.done) {
        onProgress(`Video generation from image in progress... Waiting for 10 seconds. Status: ${operation.metadata?.state || 'UNKNOWN'}`);
        await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) {
        throw new Error('No video download link found.');
      }
      onProgress('Video generation from image complete. Fetching video...');
      const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      if (!videoResponse.ok) {
        throw new Error(`Failed to fetch video: ${videoResponse.statusText}`);
      }
      const videoBlob = await videoResponse.blob();
      return URL.createObjectURL(videoBlob);
    } catch (error) {
      console.error('Error generating video from image:', error);
      throw error;
    }
  }

  // Text-to-Speech
  public async generateSpeech(text: string, voiceName: TTSVoiceName): Promise<string> {
    const ai = this.getAiInstance();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        throw new Error('No audio data received from TTS API.');
      }
      return base64Audio; // Return base64 for later decoding and playback
    } catch (error) {
      console.error('Error generating speech:', error);
      throw error;
    }
  }

  // Live Audio API (for real-time conversation)
  public async connectLiveSession(
    callbacks: LiveSessionCallbacks,
    systemInstruction?: string,
  ): Promise<{
    session: {
      sendRealtimeInput: (req: LiveInputSendRequest) => void;
      sendToolResponse: (req: LiveToolResponseSendRequest) => void;
      close: () => void;
    };
    outputAudioContext: AudioContext;
  }> {
    const ai = this.getAiInstance();
    // Fix: Use window.AudioContext directly
    const outputAudioContext = new (window.AudioContext)({
      sampleRate: LIVE_API_OUTPUT_SAMPLE_RATE,
    });

    const config: LiveSessionConfig = {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
      },
      systemInstruction,
      inputAudioTranscription: {}, // Enable transcription for user input audio
      outputAudioTranscription: {}, // Enable transcription for model output audio
    };

    const sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks,
      config,
    });

    const session = await sessionPromise;
    return { session, outputAudioContext };
  }

  // Grounding with Google Search
  public async searchGrounding(prompt: string): Promise<{ text: string; groundingUrls: GroundingChunk[] }> {
    const ai = this.getAiInstance();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
      const groundingChunks: GroundingChunk[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      return { text: response.text, groundingUrls: groundingChunks };
    } catch (error) {
      console.error('Error during search grounding:', error);
      throw error;
    }
  }

  // Grounding with Google Maps
  public async mapsGrounding(
    prompt: string,
    latitude: number,
    longitude: number,
  ): Promise<{ text: string; groundingUrls: GroundingChunk[] }> {
    const ai = this.getAiInstance();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: {
                latitude,
                longitude,
              },
            },
          },
        },
      });
      const groundingChunks: GroundingChunk[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      return { text: response.text, groundingUrls: groundingChunks };
    } catch (error) {
      console.error('Error during maps grounding:', error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
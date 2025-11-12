import { GenerateContentResponse, LiveServerMessage, Modality, FunctionDeclaration } from '@google/genai';

export enum ChatMessageType {
  USER = 'user',
  MODEL = 'model',
  INFO = 'info',
  ERROR = 'error',
}

export interface ChatMessage {
  id: string;
  type: ChatMessageType;
  text: string;
  timestamp: Date;
  groundingUrls?: GroundingChunk[];
}

export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
  maps?: {
    uri?: string;
    title?: string;
    placeAnswerSources?: Array<{ reviewSnippets?: { uri?: string } }>;
  };
}

export type GenerativeModel =
  | 'gemini-2.5-flash'
  | 'gemini-2.5-pro'
  | 'gemini-2.5-flash-lite'
  | 'imagen-4.0-generate-001'
  | 'veo-3.1-fast-generate-preview'
  | 'gemini-2.5-flash-native-audio-preview-09-2025'
  | 'gemini-2.5-flash-preview-tts';

export enum AspectRatio {
  '1:1' = '1:1',
  '3:4' = '3:4',
  '4:3' = '4:3',
  '9:16' = '9:16',
  '16:9' = '16:9',
}

export enum Resolution {
  '720p' = '720p',
  '1080p' = '1080p',
}

// Custom Blob type for Live API
export interface CustomBlob {
  data: string; // base64 encoded string
  mimeType: string;
}

export interface LiveSessionCallbacks {
  onopen: () => void;
  onmessage: (message: LiveServerMessage) => Promise<void>;
  onerror: (e: Event) => void;
  onclose: (e: CloseEvent) => void;
}

export interface LiveSessionConfig {
  responseModalities: [Modality.AUDIO];
  speechConfig?: {
    voiceConfig: {
      prebuiltVoiceConfig: {
        voiceName: 'Zephyr' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir';
      };
    };
  };
  systemInstruction?: string;
  outputAudioTranscription?: {};
  inputAudioTranscription?: {};
  tools?: [{ functionDeclarations: FunctionDeclaration[] }];
}

export interface LiveInputSendRequest {
  media: CustomBlob;
}

export interface LiveToolResponseSendRequest {
  functionResponses: {
    id: string;
    name: string;
    response: { result: string };
  };
}

// Interface for window.aistudio
export interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

// Augment the Window interface
declare global {
  interface Window {
    aistudio: AIStudio;
  }
}

// Global Loading Context Type
export interface LoadingContextType {
  isLoading: boolean;
  incrementLoading: () => void;
  decrementLoading: () => void;
}
import React, { useState, useRef } from 'react';
import { geminiService, decodeAudioData, decode } from '../services/geminiService';
import { DEFAULT_TTS_VOICE, TTS_VOICE_NAMES, LIVE_API_OUTPUT_SAMPLE_RATE, LIVE_API_AUDIO_CHANNELS } from '../constants';
import { TTSVoiceName } from '../constants'; // Fix: Import TTSVoiceName from constants

interface TTSFeatureProps {}

const TTSFeature: React.FC<TTSFeatureProps> = () => {
  const [text, setText] = useState<string>('');
  const [selectedVoice, setSelectedVoice] = useState<TTSVoiceName>(DEFAULT_TTS_VOICE);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const handleGenerateAndPlaySpeech = async () => {
    if (text.trim() === '') {
      setError('Please enter some text to convert to speech.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (audioSourceRef.current) {
        audioSourceRef.current.stop();
        audioSourceRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }

      const base64Audio = await geminiService.generateSpeech(text, selectedVoice);

      // Fix: Use window.AudioContext directly
      audioContextRef.current = new (window.AudioContext)({
        sampleRate: LIVE_API_OUTPUT_SAMPLE_RATE,
      });

      const audioBuffer = await decodeAudioData(
        decode(base64Audio),
        audioContextRef.current,
        LIVE_API_OUTPUT_SAMPLE_RATE,
        LIVE_API_AUDIO_CHANNELS,
      );

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();
      audioSourceRef.current = source;
    } catch (err: any) {
      console.error('Text-to-Speech failed:', err);
      setError(`Failed to generate speech: ${err.message || 'Unknown error.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 bg-white rounded-lg shadow-xl animate-fade-in-up">
      <h2 className="text-3xl font-extrabold text-indigo-800 mb-6 text-center">
        VIREL Text-to-Speech (TTS)
      </h2>
      <p className="text-center text-gray-600 mb-8">
        Convert written text into natural-sounding speech.
      </p>

      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <label htmlFor="tts-text" className="block text-lg font-medium text-gray-700 mb-2">
            Text to Speak:
          </label>
          <textarea
            id="tts-text"
            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter the text you want VIREL to speak..."
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="voice-select" className="block text-lg font-medium text-gray-700 mb-2">
            Select Voice:
          </label>
          <select
            id="voice-select"
            className="w-full md:w-1/2 p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200"
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value as TTSVoiceName)}
            disabled={isLoading}
          >
            {TTS_VOICE_NAMES.map((voice) => (
              <option key={voice} value={voice}>
                {voice}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleGenerateAndPlaySpeech}
          className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          disabled={isLoading}
        >
          {isLoading ? (
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ) : (
            'Generate & Play Speech'
          )}
        </button>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mt-4">
            <strong className="font-bold">Error! </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TTSFeature;
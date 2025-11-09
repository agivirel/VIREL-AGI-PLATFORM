import React, { useState } from 'react';
import { geminiService } from '../services/geminiService';
import { GenerativeModel } from '../types';
import { GEMINI_MODEL_FLASH_LITE, GEMINI_MODEL_PRO } from '../constants';
import { MarkdownRenderer } from './MarkdownRenderer'; // Fix: Changed to named import

interface GeminiPlaygroundFeatureProps {}

const GeminiPlaygroundFeature: React.FC<GeminiPlaygroundFeatureProps> = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<GenerativeModel>(GEMINI_MODEL_FLASH_LITE);
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateResponse = async () => {
    if (prompt.trim() === '') {
      setError('Please enter a prompt.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const useThinkingMode = selectedModel === GEMINI_MODEL_PRO;
      const result = await geminiService.generateContent(
        selectedModel,
        prompt,
        undefined, // no image parts
        undefined, // no system instruction
        useThinkingMode,
      );
      setResponse(result.text);
    } catch (err: any) {
      console.error('Gemini playground request failed:', err);
      setError(`Failed to get response: ${err.message || 'Unknown error.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 bg-white rounded-lg shadow-xl animate-fade-in-up">
      <h2 className="text-3xl font-extrabold text-indigo-800 mb-6 text-center">
        VIREL AI Playground
      </h2>
      <p className="text-center text-gray-600 mb-8">
        Experiment with different Gemini models for various tasks.
      </p>

      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <label htmlFor="model-select" className="block text-lg font-medium text-gray-700 mb-2">
            Select Model:
          </label>
          <select
            id="model-select"
            className="w-full md:w-1/2 p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value as GenerativeModel)}
            disabled={isLoading}
          >
            <option value={GEMINI_MODEL_FLASH_LITE}>Gemini 2.5 Flash Lite (Fast tasks)</option>
            <option value={GEMINI_MODEL_PRO}>
              Gemini 2.5 Pro (Complex tasks with Thinking Mode)
            </option>
          </select>
          <p className="mt-2 text-sm text-gray-500">
            {selectedModel === GEMINI_MODEL_PRO
              ? 'Using Gemini 2.5 Pro with Thinking Budget: 32768 for advanced reasoning.'
              : 'Using Gemini 2.5 Flash Lite for quick responses.'}
          </p>
        </div>

        <div>
          <label htmlFor="playground-prompt" className="block text-lg font-medium text-gray-700 mb-2">
            Prompt:
          </label>
          <textarea
            id="playground-prompt"
            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            rows={5}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              selectedModel === GEMINI_MODEL_PRO
                ? 'e.g., Explain the theory of relativity in simple terms, including its implications for space travel. Consider potential paradoxes.'
                : 'e.g., Give me 3 ideas for a sci-fi short story.'
            }
            disabled={isLoading}
          />
        </div>

        <button
          onClick={handleGenerateResponse}
          className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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
            'Get Response'
          )}
        </button>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mt-4">
            <strong className="font-bold">Error! </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {response && (
          <div className="mt-8 bg-gray-50 p-6 rounded-lg shadow-inner border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">AI Response:</h3>
            <div className="prose max-w-none">
              <MarkdownRenderer content={response} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeminiPlaygroundFeature;
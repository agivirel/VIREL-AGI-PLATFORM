import React, { useState } from 'react';
import { geminiService } from '../services/geminiService';
import { AspectRatio } from '../types';
import { DEFAULT_ASPECT_RATIO } from '../constants';
import { useLoading } from '../contexts/LoadingContext'; // Import useLoading

interface ImageGenerationFeatureProps {}

const ImageGenerationFeature: React.FC<ImageGenerationFeatureProps> = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(DEFAULT_ASPECT_RATIO);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { incrementLoading, decrementLoading } = useLoading(); // Use the loading hook

  const handleGenerateImage = async () => {
    if (prompt.trim() === '') {
      setError('Please enter a prompt for image generation.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImageUrl(null); // Clear previous image
    incrementLoading(); // Start global loading
    try {
      const imageUrl = await geminiService.generateImage(prompt, aspectRatio);
      setGeneratedImageUrl(imageUrl);
    } catch (err: any) {
      console.error('Image generation failed:', err);
      setError(`Failed to generate image: ${err.message || 'Unknown error.'}`);
    } finally {
      setIsLoading(false);
      decrementLoading(); // Stop global loading
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 bg-white rounded-lg shadow-xl animate-fade-in-up">
      <h2 className="text-3xl font-extrabold text-indigo-800 mb-6 text-center">
        Image Generation with Imagen 4.0
      </h2>
      <p className="text-center text-gray-600 mb-8">
        Generate high-quality images from text descriptions.
      </p>

      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <label htmlFor="image-prompt" className="block text-lg font-medium text-gray-700 mb-2">
            Image Prompt:
          </label>
          <textarea
            id="image-prompt"
            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., A futuristic city with flying cars at sunset, detailed, vibrant colors."
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="aspect-ratio" className="block text-lg font-medium text-gray-700 mb-2">
            Aspect Ratio:
          </label>
          <select
            id="aspect-ratio"
            className="w-full md:w-1/2 p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200"
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
            disabled={isLoading}
          >
            {Object.values(AspectRatio).map((ratio) => (
              <option key={ratio} value={ratio}>
                {ratio}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleGenerateImage}
          className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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
            'Generate Image'
          )}
        </button>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mt-4">
            <strong className="font-bold">Error! </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {generatedImageUrl && (
          <div className="mt-8 text-center bg-gray-50 p-4 rounded-lg shadow-inner">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Generated Image:</h3>
            <img
              src={generatedImageUrl}
              alt="Generated by Imagen"
              className="max-w-full h-auto mx-auto rounded-lg shadow-lg border border-gray-200"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageGenerationFeature;
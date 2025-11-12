import React, { useState, useEffect, useCallback } from 'react';
import { geminiService, blobToBase64 } from '../services/geminiService';
import { GeminiService } from '../services/geminiService'; // Fix: Import the GeminiService class
import { AspectRatio, Resolution } from '../types';
import { VIDEO_ASPECT_RATIOS, VIDEO_RESOLUTIONS } from '../constants';
import { useLoading } from '../contexts/LoadingContext'; // Import useLoading

// Declare global window.aistudio for API key selection
// Fix: Removed redundant declare global block as it's defined in types.ts now.

interface VideoGenerationFeatureProps {}

const VideoGenerationFeature: React.FC<VideoGenerationFeatureProps> = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(VIDEO_ASPECT_RATIOS[0]);
  const [resolution, setResolution] = useState<Resolution>(VIDEO_RESOLUTIONS[0]);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [apiKeySelected, setApiKeySelected] = useState<boolean>(false);
  const { incrementLoading, decrementLoading } = useLoading(); // Use the loading hook

  const checkAndSelectApiKey = useCallback(async () => {
    try {
      // Access window.aistudio directly as it's augmented globally in types.ts
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        setError('No API key selected. Please select your API key to use Veo video generation.');
        setApiKeySelected(false);
      } else {
        setApiKeySelected(true);
        setError(null);
      }
    } catch (e: any) {
      console.error('Error checking API key:', e);
      setError(`Failed to check API key status: ${e.message}. Ensure window.aistudio is available.`);
      setApiKeySelected(false);
    }
  }, []);

  useEffect(() => {
    checkAndSelectApiKey();
  }, [checkAndSelectApiKey]);

  const handleSelectApiKey = async () => {
    try {
      await window.aistudio.openSelectKey();
      // Assume success for race condition mitigation
      setApiKeySelected(true);
      setError(null);
      // Optionally re-check after a brief delay if strict confirmation is needed,
      // but guidelines say to assume success.
    } catch (e: any) {
      console.error('Error opening API key selection dialog:', e);
      setError(`Failed to open API key selection: ${e.message}`);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedImageFile(event.target.files[0]);
    } else {
      setSelectedImageFile(null);
    }
  };

  const handleGenerateVideo = async () => {
    if (!apiKeySelected) {
      setError('An API key must be selected to generate videos. Please click "Select API Key".');
      return;
    }
    if (prompt.trim() === '' && !selectedImageFile) {
      setError('Please enter a prompt or upload an image to generate a video.');
      return;
    }

    setIsLoading(true);
    setLoadingMessage('Starting video generation...');
    setError(null);
    setGeneratedVideoUrl(null);
    incrementLoading(); // Start global loading

    try {
      // Fix: Create a new GeminiService instance right before API call
      // to ensure it uses the most up-to-date API key from the dialog.
      const localGeminiService = new GeminiService(); // Fix: Directly instantiate the class

      let videoUrl: string;
      if (selectedImageFile) {
        const base64Image = await blobToBase64(selectedImageFile);
        videoUrl = await localGeminiService.generateVideoFromImage(
          prompt,
          base64Image,
          selectedImageFile.type,
          aspectRatio,
          resolution,
          setLoadingMessage,
        );
      } else {
        videoUrl = await localGeminiService.generateVideoFromText(
          prompt,
          aspectRatio,
          resolution,
          setLoadingMessage,
        );
      }
      setGeneratedVideoUrl(videoUrl);
      setLoadingMessage('Video generation complete!');
    } catch (err: any) {
      console.error('Video generation failed:', err);
      // Check for specific error message about API key not found and prompt user again
      if (err.message && err.message.includes('Requested entity was not found.')) {
        setError('Video generation failed due to an API key issue. Please re-select your API key.');
        setApiKeySelected(false);
      } else {
        setError(`Failed to generate video: ${err.message || 'Unknown error.'}`);
      }
      setLoadingMessage('Video generation failed.');
    } finally {
      setIsLoading(false);
      decrementLoading(); // Stop global loading
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 bg-white rounded-lg shadow-xl animate-fade-in-up">
      <h2 className="text-3xl font-extrabold text-indigo-800 mb-6 text-center">
        VIREL Video Generation with Veo 3.1
      </h2>
      <p className="text-center text-gray-600 mb-8">
        Generate videos from text prompts or starting images.
      </p>

      <div className="space-y-6 max-w-2xl mx-auto">
        {!apiKeySelected && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg relative text-center">
            <p className="mb-2">
              Veo video generation requires an API key. Please select one to proceed.
            </p>
            <button
              onClick={handleSelectApiKey}
              className="px-4 py-2 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all duration-200"
              disabled={isLoading}
            >
              Select API Key
            </button>
            <p className="mt-2 text-xs text-yellow-800">
              <a
                href="https://ai.google.dev/gemini-api/docs/billing"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-yellow-900"
              >
                Learn more about Gemini API billing.
              </a>
            </p>
          </div>
        )}

        <div>
          <label htmlFor="video-prompt" className="block text-lg font-medium text-gray-700 mb-2">
            Video Prompt (Optional for image upload):
          </label>
          <textarea
            id="video-prompt"
            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., A fantastical creature flying through a nebula, cinematic, vibrant."
            disabled={isLoading || !apiKeySelected}
          />
        </div>

        <div>
          <label htmlFor="image-upload" className="block text-lg font-medium text-gray-700 mb-2">
            Starting Image (Optional):
          </label>
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all duration-200"
            disabled={isLoading || !apiKeySelected}
          />
          {selectedImageFile && (
            <p className="mt-2 text-sm text-gray-600">Selected file: {selectedImageFile.name}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="aspect-ratio" className="block text-lg font-medium text-gray-700 mb-2">
              Aspect Ratio:
            </label>
            <select
              id="aspect-ratio"
              className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
              disabled={isLoading || !apiKeySelected}
            >
              {VIDEO_ASPECT_RATIOS.map((ratio) => (
                <option key={ratio} value={ratio}>
                  {ratio}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="resolution" className="block text-lg font-medium text-gray-700 mb-2">
              Resolution:
            </label>
            <select
              id="resolution"
              className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white transition-all duration-200"
              value={resolution}
              onChange={(e) => setResolution(e.target.value as Resolution)}
              disabled={isLoading || !apiKeySelected}
            >
              {VIDEO_RESOLUTIONS.map((res) => (
                <option key={res} value={res}>
                  {res}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerateVideo}
          className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          disabled={isLoading || !apiKeySelected}
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
            'Generate Video'
          )}
        </button>

        {isLoading && (
          <div className="mt-4 text-center text-blue-700 font-medium">
            <p>{loadingMessage}</p>
            <div className="w-full bg-blue-100 rounded-full h-2.5 mt-2 overflow-hidden">
              <div
                className="bg-blue-600 h-2.5 rounded-full animate-marquee"
                style={{ width: '100%', animationDuration: '3s', animationIterationCount: 'infinite' }}
              ></div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Video generation can take a few minutes. Please be patient.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mt-4">
            <strong className="font-bold">Error! </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {generatedVideoUrl && (
          <div className="mt-8 text-center bg-gray-50 p-4 rounded-lg shadow-inner">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Generated Video:</h3>
            <video
              src={generatedVideoUrl}
              controls
              className="max-w-full h-auto mx-auto rounded-lg shadow-lg border border-gray-200"
            >
              Your browser does not support the video tag.
            </video>
            <a
              href={generatedVideoUrl}
              download="generated_video.mp4"
              className="mt-4 inline-block px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-all duration-200"
            >
              Download Video
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoGenerationFeature;
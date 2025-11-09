import React, { useState } from 'react';
import { geminiService, blobToBase64 } from '../services/geminiService';
import { GEMINI_MODEL_FLASH, GEMINI_MODEL_PRO } from '../constants';
import { MarkdownRenderer } from './MarkdownRenderer'; // Fix: Changed to named import

interface ContentAnalysisFeatureProps {}

const ContentAnalysisFeature: React.FC<ContentAnalysisFeatureProps> = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setAnalysisResult(null); // Clear previous result
      setError(null);
    }
  };

  const analyzeImage = async () => {
    if (!selectedFile || !selectedFile.type.startsWith('image/')) {
      setError('Please upload an image file to analyze.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const base64Image = await blobToBase64(selectedFile);
      const imageParts = [{ inlineData: { mimeType: selectedFile.type, data: base64Image } }];
      const prompt = 'Describe this image in detail and highlight any key objects or scenes.';
      const response = await geminiService.generateContent(GEMINI_MODEL_FLASH, prompt, imageParts);
      setAnalysisResult(response.text);
    } catch (err: any) {
      console.error('Image analysis failed:', err);
      setError(`Failed to analyze image: ${err.message || 'Unknown error.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeVideo = async () => {
    if (!selectedFile || !selectedFile.type.startsWith('video/')) {
      setError('Please upload a video file to analyze.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const base64Video = await blobToBase64(selectedFile);
      const videoPart = {
        inlineData: {
          mimeType: selectedFile.type,
          data: base64Video,
        },
      };
      const prompt = 'Analyze this video for key information, events, and objects. Provide a concise summary and any notable details.';
      // Using GEMINI_MODEL_PRO for complex video analysis, with thinking mode for better reasoning
      const response = await geminiService.generateContent(GEMINI_MODEL_PRO, prompt, [videoPart], undefined, true);
      setAnalysisResult(response.text);
    } catch (err: any) {
      console.error('Video analysis failed:', err);
      setError(`Failed to analyze video: ${err.message || 'Unknown error.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 bg-white rounded-lg shadow-xl animate-fade-in-up">
      <h2 className="text-3xl font-extrabold text-indigo-800 mb-6 text-center">
        VIREL Content Analysis
      </h2>
      <p className="text-center text-gray-600 mb-8">
        Upload an image or video to have VIREL analyze it for key information.
      </p>

      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <label htmlFor="file-upload" className="block text-lg font-medium text-gray-700 mb-2">
            Upload Image or Video:
          </label>
          <input
            id="file-upload"
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all duration-200"
            disabled={isLoading}
          />
          {selectedFile && (
            <p className="mt-2 text-sm text-gray-600">Selected file: {selectedFile.name} ({selectedFile.type})</p>
          )}
        </div>

        <div className="flex gap-4">
          <button
            onClick={analyzeImage}
            className="flex-1 flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            disabled={isLoading || !selectedFile || !selectedFile.type.startsWith('image/')}
          >
            {isLoading && selectedFile?.type.startsWith('image/') ? (
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
              'Analyze Image (Flash)'
            )}
          </button>

          <button
            onClick={analyzeVideo}
            className="flex-1 flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            disabled={isLoading || !selectedFile || !selectedFile.type.startsWith('video/')}
          >
            {isLoading && selectedFile?.type.startsWith('video/') ? (
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
              'Analyze Video (Pro w/ Thinking)'
            )}
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mt-4">
            <strong className="font-bold">Error! </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {analysisResult && (
          <div className="mt-8 bg-gray-50 p-6 rounded-lg shadow-inner border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Analysis Result:</h3>
            <div className="prose max-w-none">
              <MarkdownRenderer content={analysisResult} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentAnalysisFeature;
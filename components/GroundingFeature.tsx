import React, { useState, useEffect, useCallback } from 'react';
import { geminiService, getGeolocation } from '../services/geminiService';
import { GroundingChunk } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer'; // Fix: Changed to named import
import { useLoading } from '../contexts/LoadingContext'; // Import useLoading

interface GroundingFeatureProps {}

const GroundingFeature: React.FC<GroundingFeatureProps> = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [response, setResponse] = useState<string | null>(null);
  const [groundingUrls, setGroundingUrls] = useState<GroundingChunk[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchType, setSearchType] = useState<'search' | 'maps'>('search');
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(
    null,
  );
  const [locationLoading, setLocationLoading] = useState<boolean>(false);
  const { incrementLoading, decrementLoading } = useLoading(); // Use the loading hook

  const fetchUserLocation = useCallback(async () => {
    setLocationLoading(true);
    // Don't use global loading for geolocation as it's a browser API, not a Gemini API call.
    const location = await getGeolocation();
    setUserLocation(location);
    setLocationLoading(false);
    if (!location) {
      setError('Geolocation access denied or not available. Maps grounding may be limited.');
    } else {
      setError(null); // Clear geolocation error if successful
    }
  }, []);

  useEffect(() => {
    fetchUserLocation();
  }, [fetchUserLocation]);

  const handleGroundingSearch = async () => {
    if (prompt.trim() === '') {
      setError('Please enter a query.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);
    setGroundingUrls([]);
    incrementLoading(); // Start global loading

    try {
      let result;
      if (searchType === 'search') {
        result = await geminiService.searchGrounding(prompt);
      } else {
        if (!userLocation) {
          setError(
            'Cannot perform Maps grounding without your location. Please enable geolocation or refresh.',
          );
          setIsLoading(false);
          decrementLoading(); // Stop global loading if we can't proceed
          return;
        }
        result = await geminiService.mapsGrounding(
          prompt,
          userLocation.latitude,
          userLocation.longitude,
        );
      }
      setResponse(result.text);
      setGroundingUrls(result.groundingUrls || []);
    } catch (err: any) {
      console.error('Grounding search failed:', err);
      setError(`Failed to get grounding response: ${err.message || 'Unknown error.'}`);
    } finally {
      setIsLoading(false);
      decrementLoading(); // Stop global loading
    }
  };

  const renderGroundingUrls = () => {
    if (groundingUrls.length === 0) return null;

    return (
      <div className="mt-4 bg-gray-100 p-4 rounded-lg shadow-inner border border-gray-200">
        <h4 className="text-lg font-semibold text-gray-800 mb-2">Sources:</h4>
        <ul className="list-disc pl-5 space-y-1">
          {groundingUrls.map((chunk, index) => {
            if (chunk.web) {
              return (
                <li key={`web-${index}`}>
                  <a
                    href={chunk.web.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    {chunk.web.title || chunk.web.uri}
                  </a>
                </li>
              );
            } else if (chunk.maps) {
              return (
                <li key={`maps-${index}`}>
                  <a
                    href={chunk.maps.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    {chunk.maps.title || chunk.maps.uri}
                  </a>
                  {chunk.maps.placeAnswerSources &&
                    chunk.maps.placeAnswerSources.map((source, sIdx) =>
                      source.reviewSnippets?.uri ? (
                        <a
                          key={`maps-review-${index}-${sIdx}`}
                          href={source.reviewSnippets.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-blue-500 hover:underline text-xs"
                        >
                          (Review Source)
                        </a>
                      ) : null,
                    )}
                </li>
              );
            }
            return null;
          })}
        </ul>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 bg-white rounded-lg shadow-xl animate-fade-in-up">
      <h2 className="text-3xl font-extrabold text-indigo-800 mb-6 text-center">
        VIREL Grounding Capabilities
      </h2>
      <p className="text-center text-gray-600 mb-8">
        Get up-to-date and accurate information using Google Search and Google Maps.
      </p>

      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex justify-center mb-4">
          <button
            onClick={() => setSearchType('search')}
            className={`px-6 py-3 rounded-l-lg font-semibold transition-all duration-200 ${
              searchType === 'search'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
            disabled={isLoading}
          >
            Google Search
          </button>
          <button
            onClick={() => setSearchType('maps')}
            className={`px-6 py-3 rounded-r-lg font-semibold transition-all duration-200 ${
              searchType === 'maps'
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
            disabled={isLoading}
          >
            Google Maps
          </button>
        </div>

        {searchType === 'maps' && (
          <div
            className={`p-3 rounded-lg text-sm mb-4 ${
              userLocation
                ? 'bg-green-50 text-green-800'
                : error && error.includes('Geolocation')
                ? 'bg-red-50 text-red-800'
                : 'bg-blue-50 text-blue-800'
            }`}
          >
            {locationLoading ? (
              <p className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-500"
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
                Fetching your location...
              </p>
            ) : userLocation ? (
              <p>
                Geolocation obtained: Lat {userLocation.latitude.toFixed(4)}, Long{' '}
                {userLocation.longitude.toFixed(4)}
              </p>
            ) : (
              <p>
                Geolocation is required for Maps grounding. Please enable location services in your
                browser settings.
              </p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="grounding-prompt" className="block text-lg font-medium text-gray-700 mb-2">
            Query:
          </label>
          <textarea
            id="grounding-prompt"
            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              searchType === 'search'
                ? 'e.g., What are the latest developments in quantum computing?'
                : 'e.g., What are the best Italian restaurants near me?'
            }
            disabled={isLoading}
          />
        </div>

        <button
          onClick={handleGroundingSearch}
          className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          disabled={isLoading || (searchType === 'maps' && !userLocation && !locationLoading)}
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
            `Search with Google ${searchType === 'maps' ? 'Maps' : 'Search'}`
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
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Response:</h3>
            <div className="prose max-w-none">
              <MarkdownRenderer content={response} />
            </div>
            {renderGroundingUrls()}
          </div>
        )}
      </div>
    </div>
  );
};

export default GroundingFeature;
import React from 'react';
import { useLoading } from '../contexts/LoadingContext';

const LoadingBar: React.FC = () => {
  const { isLoading } = useLoading();

  if (!isLoading) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      aria-busy={isLoading}
      className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 z-[9999] opacity-90"
    >
      <div className="h-full bg-white animate-pulse-bar"></div>
      <style>{`
        @keyframes pulse-bar {
          0% {
            transform: translateX(-100%);
            width: 0%;
            opacity: 0.5;
          }
          50% {
            transform: translateX(0%);
            width: 100%;
            opacity: 1;
          }
          100% {
            transform: translateX(100%);
            width: 0%;
            opacity: 0.5;
          }
        }
        .animate-pulse-bar {
          animation: pulse-bar 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default LoadingBar;
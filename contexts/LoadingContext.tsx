import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { LoadingContextType } from '../types';

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [activeRequests, setActiveRequests] = useState<number>(0);

  const incrementLoading = useCallback(() => {
    setActiveRequests((prev) => prev + 1);
  }, []);

  const decrementLoading = useCallback(() => {
    setActiveRequests((prev) => Math.max(0, prev - 1));
  }, []);

  const isLoading = useMemo(() => activeRequests > 0, [activeRequests]);

  const contextValue = useMemo(() => ({
    isLoading,
    incrementLoading,
    decrementLoading,
  }), [isLoading, incrementLoading, decrementLoading]);

  return (
    <LoadingContext.Provider value={contextValue}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = (): LoadingContextType => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};
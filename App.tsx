import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import MemorandumViewer from './components/MemorandumViewer';
import ChatFeature from './components/ChatFeature';
import LiveConversationFeature from './components/LiveConversationFeature';
import ImageGenerationFeature from './components/ImageGenerationFeature';
import VideoGenerationFeature from './components/VideoGenerationFeature';
import ContentAnalysisFeature from './components/ContentAnalysisFeature';
import GroundingFeature from './components/GroundingFeature';
import TTSFeature from './components/TTSFeature';
import GeminiPlaygroundFeature from './components/GeminiPlaygroundFeature';
import { LoadingProvider } from './contexts/LoadingContext';
import LoadingBar from './components/LoadingBar';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('memorandum');

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const renderFeature = () => {
    switch (activeTab) {
      case 'memorandum':
        return <MemorandumViewer />;
      case 'chat':
        return <ChatFeature />;
      case 'live-conversation':
        return <LiveConversationFeature />;
      case 'image-generation':
        return <ImageGenerationFeature />;
      case 'video-generation':
        return <VideoGenerationFeature />;
      case 'content-analysis':
        return <ContentAnalysisFeature />;
      case 'grounding':
        return <GroundingFeature />;
      case 'tts':
        return <TTSFeature />;
      case 'playground':
        return <GeminiPlaygroundFeature />;
      default:
        return <MemorandumViewer />;
    }
  };

  return (
    <LoadingProvider>
      <div className="min-h-screen flex flex-col">
        <LoadingBar />
        <Header activeTab={activeTab} onTabChange={handleTabChange} />
        <main className="flex-1 container mx-auto px-4 py-8">
          {renderFeature()}
        </main>
        <Footer />
      </div>
    </LoadingProvider>
  );
};

export default App;
import React from 'react';

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'memorandum', name: 'Memorandum' },
    { id: 'chat', name: 'Chat' },
    { id: 'live-conversation', name: 'Live Conversation' },
    { id: 'image-generation', name: 'Image Generation' },
    { id: 'video-generation', name: 'Video Generation' },
    { id: 'content-analysis', name: 'Content Analysis' },
    { id: 'grounding', name: 'Grounding' },
    { id: 'tts', name: 'Text-to-Speech' },
    { id: 'playground', name: 'AI Playground' },
  ];

  return (
    <header className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight mb-4 sm:mb-0">
          <span className="text-yellow-300">VIREL</span> AGI Platform
        </h1>
        <nav className="w-full sm:w-auto">
          <ul className="flex flex-wrap justify-center sm:justify-end gap-2 text-sm md:text-base">
            {tabs.map((tab) => (
              <li key={tab.id}>
                <button
                  onClick={() => onTabChange(tab.id)}
                  className={`px-4 py-2 rounded-full transition-all duration-300 ease-in-out font-medium ${
                    activeTab === tab.id
                      ? 'bg-white text-blue-800 shadow-md transform scale-105'
                      : 'bg-blue-600 hover:bg-blue-500 text-white hover:text-yellow-200'
                  }`}
                >
                  {tab.name}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
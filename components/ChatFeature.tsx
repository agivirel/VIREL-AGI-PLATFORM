import React, { useState, useEffect, useRef, useCallback } from 'react';
import { geminiService } from '../services/geminiService';
import { ChatMessage, ChatMessageType, GenerativeModel, GroundingChunk } from '../types';
import { GEMINI_MODEL_FLASH } from '../constants';
import { v4 as uuidv4 } from 'uuid';

interface ChatFeatureProps {}

const ChatFeature: React.FC<ChatFeatureProps> = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = useCallback((type: ChatMessageType, text: string, groundingUrls?: GroundingChunk[]) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      { id: uuidv4(), type, text, timestamp: new Date(), groundingUrls },
    ]);
  }, []);

  useEffect(() => {
    addMessage(ChatMessageType.INFO, 'Welcome to the VIREL Chat! Ask me anything about the project or general knowledge.');
  }, [addMessage]);

  const handleSendMessage = async () => {
    if (input.trim() === '' || isLoading) return;

    const userMessage = input.trim();
    addMessage(ChatMessageType.USER, userMessage);
    setInput('');
    setIsLoading(true);

    try {
      // Convert current chat messages (excluding info messages) to history format for Gemini.
      const history = messages
        .filter(msg => msg.type !== ChatMessageType.INFO && msg.type !== ChatMessageType.ERROR)
        .map(msg => ({
          role: msg.type === ChatMessageType.USER ? 'user' : 'model',
          parts: [{ text: msg.text }],
        }));

      const modelResponse = await geminiService.sendMessage(GEMINI_MODEL_FLASH, history, userMessage);
      addMessage(ChatMessageType.MODEL, modelResponse);
    } catch (error: any) {
      console.error('Error sending message:', error);
      addMessage(ChatMessageType.ERROR, `Failed to get a response: ${error.message || 'Unknown error.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessageContent = (message: ChatMessage) => {
    if (message.type === ChatMessageType.INFO || message.type === ChatMessageType.ERROR) {
      return <p className="text-sm italic text-gray-600 dark:text-gray-400">{message.text}</p>;
    }
    return (
      <>
        <p className="whitespace-pre-wrap">{message.text}</p>
        {message.groundingUrls && message.groundingUrls.length > 0 && (
          <div className="mt-2 text-xs text-gray-500">
            <h4 className="font-semibold">Sources:</h4>
            <ul className="list-disc pl-4">
              {message.groundingUrls.map((chunk, idx) => (
                <li key={idx}>
                  {chunk.web && (
                    <a
                      href={chunk.web.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      {chunk.web.title || chunk.web.uri}
                    </a>
                  )}
                  {chunk.maps && (
                    <a
                      href={chunk.maps.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      {chunk.maps.title || chunk.maps.uri}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="flex flex-col h-[70vh] bg-white rounded-lg shadow-xl p-6 animate-fade-in-up">
      <h2 className="text-3xl font-extrabold text-indigo-800 mb-6 text-center">VIREL Chatbot</h2>
      <div className="flex-1 overflow-y-auto pr-4 mb-4 space-y-4 custom-scrollbar">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.type === ChatMessageType.USER ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-3/4 p-4 rounded-lg shadow-md ${
                message.type === ChatMessageType.USER
                  ? 'bg-blue-500 text-white rounded-br-none'
                  : message.type === ChatMessageType.MODEL
                  ? 'bg-gray-200 text-gray-800 rounded-bl-none'
                  : message.type === ChatMessageType.INFO
                  ? 'bg-blue-100 text-blue-800 text-center w-full'
                  : 'bg-red-100 text-red-800 text-center w-full'
              }`}
            >
              {renderMessageContent(message)}
              <span className={`block text-xs mt-1 ${message.type === ChatMessageType.USER ? 'text-blue-100' : 'text-gray-500'}`}>
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-3/4 p-3 rounded-lg bg-gray-200 text-gray-800 rounded-bl-none shadow-md">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-100"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-200"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex mt-4 p-2 bg-gray-50 rounded-lg shadow-inner sticky bottom-0">
        <input
          type="text"
          className="flex-1 p-3 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') handleSendMessage();
          }}
          disabled={isLoading}
        />
        <button
          onClick={handleSendMessage}
          className="ml-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-r-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
          disabled={isLoading}
        >
          {isLoading ? (
            <svg
              className="animate-spin h-5 w-5 text-white"
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
            'Send'
          )}
        </button>
      </div>
    </div>
  );
};

export default ChatFeature;
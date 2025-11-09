import React from 'react';
import { MarkdownRenderer } from './MarkdownRenderer'; // Fix: Changed to named import
import { MEMORANDUM_CONTENT_MD } from '../constants';

const MemorandumViewer: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8 bg-white rounded-lg shadow-xl animate-fade-in">
      <MarkdownRenderer content={MEMORANDUM_CONTENT_MD} className="text-gray-800 leading-relaxed" />
    </div>
  );
};

export default MemorandumViewer;
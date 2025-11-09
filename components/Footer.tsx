import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-800 text-white text-center p-4 mt-8 shadow-inner">
      <div className="container mx-auto text-sm">
        <p>&copy; {new Date().getFullYear()} AGI Alliance Group. All rights reserved.</p>
        <p className="mt-2">
          Powered by Google Gemini API. Learn more about{' '}
          <a
            href="https://ai.google.dev/gemini-api/docs/billing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            Gemini API billing
          </a>
          .
        </p>
      </div>
    </footer>
  );
};

export default Footer;
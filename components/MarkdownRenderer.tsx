import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Fix: Change default export to named export
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  const renderers: { [key: string]: (line: string) => React.ReactNode } = {
    // Headers
    '#': (line) => <h1 className="text-4xl font-bold mb-4">{line.substring(1).trim()}</h1>,
    '##': (line) => <h2 className="text-3xl font-bold mb-3">{line.substring(2).trim()}</h2>,
    '###': (line) => <h3 className="text-2xl font-semibold mb-2">{line.substring(3).trim()}</h3>,
    '####': (line) => <h4 className="text-xl font-semibold mb-1">{line.substring(4).trim()}</h4>,
    '-----': (line) => <hr className="my-6 border-gray-300" />,
    '---': (line) => <hr className="my-6 border-gray-300" />,
    // Lists
    '*': (line) => <li className="ml-5 list-disc">{line.substring(1).trim()}</li>,
    '-': (line) => <li className="ml-5 list-disc">{line.substring(1).trim()}</li>,
  };

  const parseLine = (line: string, index: number): React.ReactNode => {
    line = line.trim();
    if (!line) return null;

    // Check for explicit renderers
    for (const prefix in renderers) {
      if (line.startsWith(prefix)) {
        return <React.Fragment key={index}>{renderers[prefix](line)}</React.Fragment>;
      }
    }

    // Bold text (simple **text** or __text__)
    line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    line = line.replace(/__(.*?)__/g, '<strong>$1</strong>');

    // Italic text (simple *text* or _text_)
    line = line.replace(/\*(.*?)\*/g, '<em>$1</em>');
    line = line.replace(/_(.*?)_/g, '<em>$1</em>');

    // Links [text](url)
    line = line.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">$1</a>');

    // Default to paragraph
    return <p key={index} className="mb-2" dangerouslySetInnerHTML={{ __html: line }} />;
  };

  const lines = content.split('\n');
  let inList = false;

  const renderedContent = lines.map((line, index) => {
    const trimmedLine = line.trim();
    const isListItem = trimmedLine.startsWith('*') || trimmedLine.startsWith('-');

    if (isListItem) {
      if (!inList) {
        inList = true;
        return (
          <ul key={`list-start-${index}`} className="list-inside mb-2">
            {parseLine(line, index)}
          </ul>
        );
      } else {
        return parseLine(line, index);
      }
    } else {
      if (inList) {
        inList = false;
        return <React.Fragment key={`list-end-${index}`}>{parseLine(line, index)}</React.Fragment>;
      } else {
        return parseLine(line, index);
      }
    }
  });

  return <div className={`prose max-w-none ${className || ''}`}>{renderedContent}</div>;
};

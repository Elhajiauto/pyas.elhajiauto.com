import React, { useState, useEffect, useCallback } from 'react';
import { generateEmailContent } from './services/geminiService';
import { DOMAINS } from './constants';
import DomainSelector from './components/DomainSelector';
import ContentDisplay from './components/ContentDisplay';
import { LoadingSpinner } from './components/icons/LoadingSpinner';

// Helper to create a plausible sender name from a domain
const getSenderName = (domain: string): string => {
  const domainWithoutTld = domain.split('@')[1].split('.')[0];
  return domainWithoutTld
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Helper to generate a random string for boundaries and message IDs
const generateRandomString = (length: number): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

const App: React.FC = () => {
  const [selectedDomain, setSelectedDomain] = useState<string>(DOMAINS[0]);
  const [generatedHeader, setGeneratedHeader] = useState<string>('');
  const [generatedBody, setGeneratedBody] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async (domain: string) => {
    setIsLoading(true);
    setError(null);
    setGeneratedHeader('');
    setGeneratedBody('');

    try {
      const content = await generateEmailContent(domain);
      
      const boundary = `===============${Date.now()}${Math.floor(Math.random() * 10000000000000000)}==`;
      const senderName = getSenderName(domain);
      const messageId = `<${generateRandomString(16)}-${generateRandomString(8)}-${generateRandomString(4)}-${generateRandomString(4)}-${generateRandomString(4)}-${generateRandomString(12)}-000000@eu-west-2.amazonses.com>`;
      const feedbackId = `${generateRandomString(10)}::1.eu-west-2.${generateRandomString(42)}:AmazonSES`;

      const header = `Content-Type: multipart/alternative; boundary="${boundary}"
MIME-Version: 1.0
Subject: ${content.subject}
From: ${senderName} <${domain}>
To: <[To]>
Cc: <[To]>
Message-ID: ${messageId}
Date: ${new Date().toUTCString()}
Feedback-ID: ${feedbackId}
X-SES-Outgoing: 2025.10.01-[ip]
x-dkim-options: s=selector5`;
      
      const plainTextBody = content.htmlBody.replace(/<[^>]*>?/gm, '');

      const body = `--${boundary}
Content-Type: text/plain; charset="utf-8"
MIME-Version: 1.0
Content-Transfer-Encoding: 7bit

${plainTextBody}

--${boundary}
Content-Type: text/html; charset="utf-8"
MIME-Version: 1.0
Content-Transfer-Encoding: 7bit

${content.htmlBody}

--${boundary}--`;

      setGeneratedHeader(header);
      setGeneratedBody(body);

    } catch (err) {
      console.error(err);
      setError('Failed to generate email content. Please check the console for details. Ensure your API key is configured.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    handleGenerate(selectedDomain);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onGenerateClick = () => {
    handleGenerate(selectedDomain);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-cyan-400">Email Content Generator</h1>
          <p className="text-gray-400 mt-2">AI-powered tool for daily email warming campaigns</p>
        </header>

        <main>
          <div className="bg-gray-800 shadow-lg rounded-lg p-6 mb-8 max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <DomainSelector 
                domains={DOMAINS} 
                selectedDomain={selectedDomain} 
                onChange={(e) => setSelectedDomain(e.target.value)} 
              />
              <button
                onClick={onGenerateClick}
                disabled={isLoading}
                className="w-full sm:w-auto flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner />
                    Generating...
                  </>
                ) : (
                  'Generate New Content'
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative max-w-3xl mx-auto mb-6" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ContentDisplay title="Generated Header" content={generatedHeader} isLoading={isLoading} />
            <ContentDisplay title="Generated Full Body (MIME)" content={generatedBody} isLoading={isLoading} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;

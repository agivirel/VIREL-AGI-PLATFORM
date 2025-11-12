import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  geminiService,
  decodeAudioData,
  createPcmBlob,
  decode, // Fix: Import decode function directly
} from '../services/geminiService';
import {
  ChatMessageType,
  LiveSessionCallbacks,
  LiveInputSendRequest,
  CustomBlob,
} from '../types';
import {
  LIVE_API_INPUT_SAMPLE_RATE,
  LIVE_API_AUDIO_CHANNELS,
  LIVE_API_OUTPUT_SAMPLE_RATE,
  LIVE_API_SCRIPT_PROCESSOR_BUFFER_SIZE,
} from '../constants';
import { useLoading } from '../contexts/LoadingContext'; // Import useLoading

interface LiveConversationFeatureProps {}

// Helper component for message display
const LiveMessage: React.FC<{ type: ChatMessageType; text: string }> = ({ type, text }) => (
  <div
    className={`p-3 rounded-lg shadow-sm ${
      type === ChatMessageType.USER
        ? 'bg-blue-100 text-blue-800 self-end'
        : 'bg-gray-100 text-gray-800 self-start'
    }`}
  >
    <p className="whitespace-pre-wrap">{text}</p>
  </div>
);

const LiveConversationFeature: React.FC<LiveConversationFeatureProps> = () => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [currentInputTranscription, setCurrentInputTranscription] = useState<string>('');
  const [currentOutputTranscription, setCurrentOutputTranscription] = useState<string>('');
  const [transcriptionHistory, setTranscriptionHistory] = useState<
    Array<{ type: ChatMessageType; text: string }>
  >([]);
  const [statusMessage, setStatusMessage] = useState<string>('Click to start conversation');
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<any>(null); // LiveSession instance
  const streamRef = useRef<MediaStream | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0); // for audio playback scheduling
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set()); // to manage playing audio sources

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { incrementLoading, decrementLoading } = useLoading(); // Use the loading hook

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [transcriptionHistory, currentInputTranscription, currentOutputTranscription, scrollToBottom]);

  // Fix: Define stopRecording before startRecording to resolve "used before declaration" error.
  const stopRecording = useCallback((resetError: boolean = true) => {
    setIsRecording(false);
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    for (const source of sourcesRef.current.values()) {
      source.stop();
    }
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;

    setCurrentInputTranscription('');
    setCurrentOutputTranscription('');
    if (resetError) setError(null);
    setStatusMessage('Conversation ended.');
  }, []);

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Ensure stopRecording is called with resetError=false to avoid clearing a potential error
      // from a session close event that triggered this cleanup.
      stopRecording(false);
    };
  }, [stopRecording]);

  const startRecording = useCallback(async () => {
    setError(null);
    setStatusMessage('Starting...');
    incrementLoading(); // Start global loading for connection setup
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Fix: Use window.AudioContext directly
      inputAudioContextRef.current = new (window.AudioContext)({
        sampleRate: LIVE_API_INPUT_SAMPLE_RATE,
      });

      const inputSource = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
      scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(
        LIVE_API_SCRIPT_PROCESSOR_BUFFER_SIZE,
        LIVE_API_AUDIO_CHANNELS,
        LIVE_API_AUDIO_CHANNELS,
      );

      const callbacks: LiveSessionCallbacks = {
        onopen: () => {
          console.debug('Live Session opened!');
          setStatusMessage('Recording...');
          setIsRecording(true);
          decrementLoading(); // Stop global loading once session is open

          // Stream audio from the microphone to the model.
          scriptProcessorRef.current!.onaudioprocess = (audioProcessingEvent) => {
            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
            const pcmBlob = createPcmBlob(inputData);
            if (sessionRef.current) {
              // CRITICAL: Solely rely on sessionPromise resolves and then call `session.sendRealtimeInput`,
              // **do not** add other condition checks. The `sessionRef.current` check here is for safety within React.
              sessionRef.current.sendRealtimeInput({ media: pcmBlob } as LiveInputSendRequest);
            }
          };
          inputSource.connect(scriptProcessorRef.current!);
          scriptProcessorRef.current!.connect(inputAudioContextRef.current!.destination);
        },
        onmessage: async (message) => {
          if (message.serverContent?.outputTranscription) {
            setCurrentOutputTranscription((prev) => prev + message.serverContent.outputTranscription!.text);
          } else if (message.serverContent?.inputTranscription) {
            setCurrentInputTranscription((prev) => prev + message.serverContent.inputTranscription!.text);
          }

          if (message.serverContent?.turnComplete) {
            if (currentInputTranscription) {
              setTranscriptionHistory((prev) => [...prev, { type: ChatMessageType.USER, text: currentInputTranscription }]);
            }
            if (currentOutputTranscription) {
              setTranscriptionHistory((prev) => [...prev, { type: ChatMessageType.MODEL, text: currentOutputTranscription }]);
            }
            setCurrentInputTranscription('');
            setCurrentOutputTranscription('');
          }

          const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (base64EncodedAudioString && outputAudioContextRef.current) {
            nextStartTimeRef.current = Math.max(
              nextStartTimeRef.current,
              outputAudioContextRef.current.currentTime,
            );
            const audioBuffer = await decodeAudioData(
              decode(base64EncodedAudioString), // Fix: Call decode directly as it's an imported function
              outputAudioContextRef.current,
              LIVE_API_OUTPUT_SAMPLE_RATE,
              LIVE_API_AUDIO_CHANNELS,
            );
            const source = outputAudioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputAudioContextRef.current.destination);
            source.addEventListener('ended', () => {
              sourcesRef.current.delete(source);
            });

            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current = nextStartTimeRef.current + audioBuffer.duration;
            sourcesRef.current.add(source);
          }

          const interrupted = message.serverContent?.interrupted;
          if (interrupted) {
            for (const source of sourcesRef.current.values()) {
              source.stop();
              sourcesRef.current.delete(source);
            }
            nextStartTimeRef.current = 0;
            // Clear current transcriptions if interrupted before turn completion
            setCurrentInputTranscription('');
            setCurrentOutputTranscription('');
          }
        },
        onerror: (e) => {
          console.error('Live Session error:', e);
          setError(`Live Session error: ${e.type}`);
          setStatusMessage('Error occurred.');
          decrementLoading(); // Stop global loading on error
          stopRecording(); // Automatically stop on error
        },
        onclose: (e) => {
          console.debug('Live Session closed:', e);
          if (e.code !== 1000) { // 1000 is normal closure
            setError(`Live Session closed unexpectedly: ${e.code} - ${e.reason}`);
            setStatusMessage('Session closed due to error.');
          } else {
            setStatusMessage('Conversation ended.');
          }
          // The global loading should already be off from onopen or onerror.
          // No decrementLoading needed here unless session setup failed before onopen was called.
          stopRecording(false); // Stop recording without resetting error
        },
      };

      const { session, outputAudioContext } = await geminiService.connectLiveSession(
        callbacks,
        'You are a friendly and helpful AI assistant for the VIREL project. Discuss the project memorandum or general AI topics.',
      );
      sessionRef.current = session;
      outputAudioContextRef.current = outputAudioContext;
    } catch (err: any) {
      console.error('Failed to start recording or connect to Live API:', err);
      setError(`Failed to start: ${err.message}`);
      setStatusMessage('Error starting conversation.');
      decrementLoading(); // Stop global loading on connection error
      stopRecording(false); // Ensure all resources are stopped
    }
  }, [currentInputTranscription, currentOutputTranscription, stopRecording, incrementLoading, decrementLoading]);

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="flex flex-col h-[70vh] bg-white rounded-lg shadow-xl p-6 animate-fade-in-up">
      <h2 className="text-3xl font-extrabold text-indigo-800 mb-6 text-center">
        VIREL Live Conversation
      </h2>
      <p className="text-center text-gray-600 mb-4">
        Hold a real-time voice conversation with VIREL AGI.
      </p>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error! </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 rounded-lg mb-4 space-y-3 custom-scrollbar flex flex-col">
        {transcriptionHistory.map((msg, index) => (
          <LiveMessage key={index} type={msg.type} text={msg.text} />
        ))}
        {currentInputTranscription && (
          <LiveMessage type={ChatMessageType.USER} text={`You: ${currentInputTranscription}...`} />
        )}
        {currentOutputTranscription && (
          <LiveMessage
            type={ChatMessageType.MODEL}
            text={`VIREL: ${currentOutputTranscription}...`}
          />
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex flex-col items-center">
        <button
          onClick={handleToggleRecording}
          className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 ring-red-300 animate-pulse-microphone'
              : 'bg-green-500 hover:bg-green-600 ring-green-300'
          }`}
        >
          {isRecording ? (
            <svg
              className="w-12 h-12 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg
              className="w-12 h-12 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3.53-2.64 6.4-6.3 6.4-3.66 0-6.3-2.87-6.3-6.4H4c0 4.17 3.13 7.64 7 8.35V22h2v-2.65c3.87-.71 7-4.18 7-8.35h-1.7z" />
            </svg>
          )}
        </button>
        <p className="mt-4 text-lg font-semibold text-gray-700">{statusMessage}</p>
        <p className="mt-2 text-sm text-gray-500">
          (Microphone access required for this feature)
        </p>
      </div>
    </div>
  );
};

export default LiveConversationFeature;
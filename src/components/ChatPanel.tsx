import { useRef, useState } from "react";
import { llmService, type LLMProvider } from "../services/llmService";
import type { OOPromptObject } from "../types";

type Props = {
  onSend: (msg: string) => void;
  onTogglePanel: () => void;
  onExtractProperties?: (oopObject: OOPromptObject) => void;
};

type Message = {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  provider?: LLMProvider;
  isError?: boolean;
};

export function ChatPanel({ onSend, onExtractProperties }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I'm your AI assistant. I can help you with questions, provide insights, or optimize your content by extracting key properties. What would you like to work on today?",
      isUser: false,
      timestamp: new Date(),
    }
  ]);

  const handleSend = async () => {
    if (inputRef.current && inputRef.current.value.trim()) {
      const text = inputRef.current.value.trim();
      const userMessage: Message = {
        id: Date.now().toString(),
        text,
        isUser: true,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);
      
      // Add loading message
      const loadingMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Thinking...",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, loadingMessage]);
      
      try {
        // Get AI response
        const response = await llmService.chat([
          { role: 'user', content: text }
        ]);
        
        // Replace loading message with AI response
        setMessages(prev => prev.map(msg => 
          msg.id === loadingMessage.id 
            ? {
                id: msg.id,
                text: response.content,
                isUser: false,
                timestamp: response.timestamp,
                provider: response.provider
              }
            : msg
        ));
        
        onSend(text);
      } catch (error) {
        // Replace loading message with error
        setMessages(prev => prev.map(msg => 
          msg.id === loadingMessage.id 
            ? {
                id: msg.id,
                text: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                isUser: false,
                timestamp: new Date(),
                isError: true
              }
            : msg
        ));
        console.error('Chat error:', error);
      }
      
      inputRef.current.value = "";
    }
  };

  const handleExtractProperties = async () => {
    if (inputRef.current && inputRef.current.value.trim()) {
      const text = inputRef.current.value.trim();
      setIsOptimizing(true);
      
      // Add user message only
      const userMessage: Message = {
        id: Date.now().toString(),
        text: `🔍 Extracting properties...`,
        isUser: true,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);

      try {
        const oopObject = await llmService.extractPropertiesWithAssistant(text);

        if (onExtractProperties) {
          onExtractProperties(oopObject);
        }

      } catch (error) {
        console.error('Property extraction error:', error);
      } finally {
        setIsOptimizing(false);
      }
      
      inputRef.current.value = "";
    }
  };

  return (
    <div className="relative flex flex-col bg-transparent h-full chat-container">
      {/* Chat Header */}
      <div className="px-8 py-6 border-b border-gray-100 bg-white/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Chat Assistant</h2>
          <p className="text-gray-600">Ask questions, get insights, or optimize your content with AI assistance.</p>
        </div>
      </div>
      
      {/* Messages Container */}
      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            {message.isUser ? (
              <div className="max-w-xs lg:max-w-md px-5 py-4 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg hover:shadow-xl transition-shadow">
                <div className="text-sm leading-relaxed font-medium">{message.text}</div>
                <div className="text-xs mt-3 text-white/70 opacity-80 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-white/50 rounded-full"></div>
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ) : (
              <div className={`inline-block card-base px-5 py-4 text-sm max-w-[600px] hover:shadow-md transition-all ${
                message.isError ? 'bg-red-50 border-red-200 text-red-800' : 'text-gray-700'
              }`}>
                <div className="text-sm leading-relaxed whitespace-pre-line">{message.text}</div>
                <div className="text-xs mt-3 text-gray-500 opacity-70 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  {message.timestamp.toLocaleTimeString()}
                  {message.provider && (
                    <>
                      <span>•</span>
                      <span className="capitalize">{message.provider}</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        </div>
      </div>

      <div className="border-t border-gray-200/60 p-6 bg-gradient-to-r from-gray-50/50 to-white/50">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-4 items-center card-base bg-white/95 px-4 py-4 shadow-sm hover:shadow-md transition-all duration-200">
            <input
              ref={inputRef}
              className="flex-1 input bg-transparent border-0 focus:ring-0 focus:ring-offset-0 text-gray-800 placeholder:text-gray-500 text-base"
              placeholder="Ask me anything or describe what you'd like to optimize..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSend();
                }
              }}
            />
            <div className="flex gap-3">
              <button
                className="btn-ghost hover:bg-gray-100 transition-colors px-6"
                onClick={handleSend}
              >
                Send
              </button>
              <button
                className={`btn-primary hover:shadow-md transition-all duration-200 px-6 ${isOptimizing ? 'opacity-75 cursor-not-allowed' : ''}`}
                onClick={handleExtractProperties}
                disabled={isOptimizing}
              >
                {isOptimizing ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  'OOPrompt'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

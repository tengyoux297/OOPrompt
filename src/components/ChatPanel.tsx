import { useRef, useState, useEffect } from "react";
import { llmService, type LLMProvider } from "../services/llmService";
import type { OOPromptObject } from "../types";

type Props = {
  onSend: (msg: string) => void;
  onExtractProperties?: (oopObject: OOPromptObject) => void;
  messageFromOOP?: string | null;
  selectedLLM: 'openai' | 'gemini' | 'claude';
  onMessageProcessed?: () => void; // Callback to clear message after processing
};

type Message = {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  provider?: LLMProvider;
  isError?: boolean;
};

export function ChatPanel({ onSend, onExtractProperties, messageFromOOP, selectedLLM, onMessageProcessed }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showOOPNotification, setShowOOPNotification] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I'm your AI assistant. I can help you with questions, provide insights, or optimize your content by extracting key properties. What would you like to work on today?",
      isUser: false,
      timestamp: new Date(),
    }
  ]);

  // Helper function to parse and format AI responses like ChatGPT
  const formatAIResponse = (text: string) => {
    if (!text) return '';
    
    let formatted = text;
    
    // Convert markdown-style formatting to HTML-like structure
    // Headers
    formatted = formatted.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mb-2 text-gray-900">$1</h3>');
    formatted = formatted.replace(/^## (.*$)/gim, '<h2 class="text-base font-semibold mb-2 text-gray-900">$1</h2>');
    formatted = formatted.replace(/^# (.*$)/gim, '<h1 class="text-lg font-bold mb-3 text-gray-900">$1</h1>');
    
    // Bold and italic
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em class="italic text-gray-700">$1</em>');
    
    // Code blocks with language
    formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
      const language = lang || 'text';
      return `<div class="bg-gray-100 rounded-md p-3 overflow-x-auto my-3"><div class="text-xs text-gray-500 mb-2 font-mono">${language}</div><pre class="text-sm font-mono text-gray-800"><code>${code.trim()}</code></pre></div>`;
    });
    
    // Inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-gray-100 rounded px-1 py-0.5 text-xs font-mono text-gray-800">$1</code>');
    
    // Lists
    formatted = formatted.replace(/^\* (.*$)/gim, '<li class="text-gray-700 mb-1">• $1</li>');
    formatted = formatted.replace(/^- (.*$)/gim, '<li class="text-gray-700 mb-1">• $1</li>');
    formatted = formatted.replace(/^(\d+)\. (.*$)/gim, '<li class="text-gray-700 mb-1">$1. $2</li>');
    
    // Wrap lists in proper containers
    formatted = formatted.replace(/(<li.*?<\/li>)/gs, '<ul class="list-none space-y-1 mb-3">$1</ul>');
    
    // Blockquotes
    formatted = formatted.replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-gray-300 pl-4 italic text-gray-600 mb-3">$1</blockquote>');
    
    // Links
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // Line breaks
    formatted = formatted.replace(/\n\n/g, '</p><p class="mb-3">');
    formatted = formatted.replace(/\n/g, '<br>');
    
    // Wrap in paragraphs
    formatted = `<p class="mb-3">${formatted}</p>`;
    
    // Clean up empty paragraphs
    formatted = formatted.replace(/<p class="mb-3"><\/p>/g, '');
    
    return formatted;
  };

  // Handle messages from OOP panel
  useEffect(() => {
    if (messageFromOOP) {
      console.log('ChatPanel received messageFromOOP:', messageFromOOP);
      let messageToAdd: Message;
      
      // Check if this is a prompt summary or AI response
      if (messageFromOOP.startsWith('📝 OOPrompt:')) {
        // Prompt summary goes to user side
        messageToAdd = {
          id: Date.now().toString(),
          text: messageFromOOP,
          isUser: true,
          timestamp: new Date(),
        };
      } else if (messageFromOOP.startsWith('🤖 AI Response:')) {
        // AI response goes to AI side
        messageToAdd = {
          id: Date.now().toString(),
          text: messageFromOOP.replace('🤖 AI Response: ', ''),
          isUser: false,
          timestamp: new Date(),
        };
      } else {
        // Fallback: treat as user message
        messageToAdd = {
          id: Date.now().toString(),
          text: `📤 Sent from OOPrompt: ${messageFromOOP}`,
          isUser: true,
          timestamp: new Date(),
        };
      }
      
      // Add the message to the chat
      console.log('Adding message to chat:', messageToAdd);
      setMessages(prev => [...prev, messageToAdd]);
      
      // Show notification briefly
      setShowOOPNotification(true);
      setTimeout(() => setShowOOPNotification(false), 3000);
      
      // Notify parent that message has been processed
      if (onMessageProcessed) {
        console.log('Notifying parent that message was processed');
        onMessageProcessed();
      }
    }
  }, [messageFromOOP, onMessageProcessed]);

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
        // Get AI response with selected LLM
        // Add system prompt here if needed, e.g.:
        // { role: 'system', content: 'You are a helpful assistant...' }
        const response = await llmService.chat([
          { role: 'user', content: text }
        ], selectedLLM);
        
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
      
      // No need to add a message for property extraction
      // The OOP panel will handle showing the results

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
      {/* OOPrompt Notification */}
      {showOOPNotification && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 lg:left-[60%] lg:transform-none z-50">
          <div className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
            <span className="text-blue-200">📝</span>
            <span className="text-sm font-medium">New message from OOPrompt</span>
          </div>
        </div>
      )}
      
      {/* Messages Container - Scrollable area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pt-8 pb-32 min-h-0">
        <div className="max-w-4xl mx-auto lg:ml-[20%] lg:mr-0 space-y-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            {message.isUser ? (
              <div className={`max-w-[280px] sm:max-w-xs lg:max-w-md px-3 sm:px-4 lg:px-5 py-3 sm:py-4 rounded-2xl shadow-lg hover:shadow-xl transition-shadow ${
                message.text.includes('📝 OOPrompt:')
                  ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white' // Special styling for OOP messages
                  : 'bg-gradient-to-br from-blue-600 to-blue-700 text-white' // Regular user messages
              }`}>
                <div className="text-sm leading-relaxed font-medium" 
                     dangerouslySetInnerHTML={{ __html: formatAIResponse(message.text) }}></div>
                <div className="text-xs mt-3 text-white/70 opacity-80 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-white/50 rounded-full"></div>
                  {message.timestamp.toLocaleTimeString()}
                  {message.text.includes('📝 OOPrompt:') && (
                    <>
                      <span>•</span>
                      <span>OOPrompt</span>
                    </>
                  )}
                </div>
              </div>
                         ) : (
               <div className={`inline-block card-base px-3 sm:px-4 lg:px-5 py-3 sm:py-4 text-sm max-w-[280px] sm:max-w-md lg:max-w-[600px] hover:shadow-md transition-all ${
                 message.isError ? 'bg-red-50 border-red-200 text-red-800' : 'text-gray-700'
               }`}>
                                   <div 
                    className="text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: formatAIResponse(message.text) }}
                  />
                 <div className="text-xs mt-3 text-gray-500 opacity-70 flex items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                   {message.timestamp.toLocaleTimeString()}
                   {message.provider && (
                     <>
                       <span>•</span>
                       <span className="capitalize">{message.provider === 'openai' ? 'OpenAI' : message.provider === 'gemini' ? 'Gemini' : message.provider === 'claude' ? 'Claude' : message.provider}</span>
                     </>
                   )}
                   {message.text.includes('🤖 AI Response:') && (
                     <>
                       <span>•</span>
                       <span>OOP Response</span>
                     </>
                   )}
                 </div>
               </div>
             )}
          </div>
        ))}
        </div>
      </div>

      {/* Input Area - Fixed at bottom of screen, accounting for sidebar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200/60 p-3 sm:p-4 lg:p-6 bg-gradient-to-r from-gray-50/50 to-white/50 z-10">
        <div className="max-w-4xl mx-auto lg:ml-[20%] lg:mr-0">
          <div className="flex gap-2 sm:gap-3 lg:gap-4 items-center card-base bg-white/95 px-3 sm:px-4 py-3 sm:py-4 shadow-sm hover:shadow-md transition-all duration-200">
            <input
              ref={inputRef}
              className="flex-1 input bg-transparent border-0 focus:ring-0 focus:ring-offset-0 text-gray-800 placeholder:text-gray-500 text-base"
              placeholder="Ask me anything or describe what you'd like to optimize..."
              onKeyDown={(e) => {
                if (e.ctrlKey && e.key === "Enter") {
                  // Ctrl+Enter: Send message directly
                  e.preventDefault();
                  handleSend();
                } else if (e.key === "Enter" && !e.ctrlKey) {
                  // Enter: Extract properties and open OOPrompt
                  e.preventDefault();
                  handleExtractProperties();
                }
              }}
            />
            <div className="flex gap-2 sm:gap-3">
                <button
                  className="btn-ghost hover:bg-gray-100 transition-colors px-3 sm:px-4 lg:px-6"
                  onClick={handleSend}
                  title="Send message (Ctrl+Enter)"
                >
                  <div className="flex flex-col items-center">
                    <span className="text-sm sm:text-base">Send</span>
                    <span className="text-xs text-gray-500 font-mono hidden sm:block">Ctrl+↵</span>
                  </div>
                </button>
                <button
                  className={`btn-primary hover:shadow-md transition-all duration-200 px-3 sm:px-4 lg:px-6 ${isOptimizing ? 'opacity-75 cursor-not-allowed' : ''}`}
                  onClick={handleExtractProperties}
                  disabled={isOptimizing}
                  title="Open OOPrompt (Enter)"
                >
                  {isOptimizing ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span className="text-sm sm:text-base">Processing...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <span className="text-sm sm:text-base">OOPrompt</span>
                      <span className="text-xs text-white/70 font-mono hidden sm:block">↵</span>
                    </div>
                  )}
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

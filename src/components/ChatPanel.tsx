import { useRef, useState } from "react";

type Props = {
  onSend: (msg: string) => void;
  onOptimize: (text: string) => void;
  onTogglePanel: () => void;
};

type Message = {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
};

export function ChatPanel({ onSend, onOptimize }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Welcome to OOPrompt! Use the input below to chat or click 'Optimize' to extract properties from your text.",
      isUser: false,
      timestamp: new Date(),
    }
  ]);

  const handleSend = () => {
    if (inputRef.current && inputRef.current.value.trim()) {
      const text = inputRef.current.value.trim();
      const newMessage: Message = {
        id: Date.now().toString(),
        text,
        isUser: true,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, newMessage]);
      onSend(text);
      inputRef.current.value = "";
    }
  };

  const handleOptimize = () => {
    const text = inputRef.current?.value || "";
    if (text.trim()) {
      onOptimize(text);
      // Add a system message about optimization
      const newMessage: Message = {
        id: Date.now().toString(),
        text: "Optimizing and extracting properties...",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, newMessage]);
    }
  };

  return (
    <div className="relative flex flex-col bg-white">
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-3 py-2 rounded-xl ${
                message.isUser
                  ? 'bg-brand-600 text-white'
                  : 'bg-panel text-text-onLight border border-divider'
              }`}
            >
              <div className="text-sm">{message.text}</div>
              <div className={`text-xs mt-1 ${
                message.isUser ? 'text-white/80' : 'text-text-onLight/60'
              }`}>
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-divider p-3">
        <div className="flex gap-2 items-center bg-white border border-divider rounded-2xl shadow-xs px-2 py-2">
          <input
            ref={inputRef}
            className="flex-1 px-3 py-2 rounded-xl outline-none placeholder:text-gray-400"
            placeholder="Type message…"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSend();
              }
            }}
          />
          <button
            className="px-3 py-2 rounded-xl border border-divider bg-white hover:bg-gray-50 text-sm"
            onClick={handleSend}
          >
            Send
          </button>
          <button
            className="px-3 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm shadow-xs"
            onClick={handleOptimize}
          >
            Optimize
          </button>
        </div>
      </div>
    </div>
  );
}

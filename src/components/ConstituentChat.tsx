import React, { useState, useRef, useEffect } from 'react';
import { Send, X, MessageCircle, User, Bot } from 'lucide-react';
import { DigitalTwin, ChatMessage } from '../types';

interface ConstituentChatProps {
  constituent: DigitalTwin;
  isOpen: boolean;
  onClose: () => void;
}

// Fallback chat response function when AI service is not available
const generateFallbackChatResponse = (message: string, constituent: DigitalTwin): string => {
  const lowerMessage = message.toLowerCase();
  
  // Policy-related responses
  if (lowerMessage.includes('policy') || lowerMessage.includes('bill') || lowerMessage.includes('law')) {
    return `As a ${constituent.occupation.toLowerCase()} making $${constituent.annualIncome.toLocaleString()} a year, I'm concerned about how policies affect my daily life. I'd need to see the specific details to understand the impact on someone like me.`;
  }
  
  // Income-related responses
  if (lowerMessage.includes('income') || lowerMessage.includes('money') || lowerMessage.includes('salary') || lowerMessage.includes('wage')) {
    return `I make about $${constituent.annualIncome.toLocaleString()} a year as a ${constituent.occupation.toLowerCase()}. It's enough to get by, but I'm always worried about rising costs. Any policy that affects my take-home pay would be a big concern.`;
  }
  
  // Education-related responses
  if (lowerMessage.includes('education') || lowerMessage.includes('school') || lowerMessage.includes('college') || lowerMessage.includes('degree')) {
    return `I have a ${constituent.education.toLowerCase()}, which helped me get my job as a ${constituent.occupation.toLowerCase()}. Education policies are really important to me because they affect future opportunities for people in our community.`;
  }
  
  // Healthcare-related responses
  if (lowerMessage.includes('health') || lowerMessage.includes('medical') || lowerMessage.includes('insurance') || lowerMessage.includes('doctor')) {
    return `Healthcare is a major concern for me. As someone working as a ${constituent.occupation.toLowerCase()}, I need reliable and affordable healthcare. Any policy changes that affect healthcare access or costs would directly impact my family.`;
  }
  
  // Housing-related responses
  if (lowerMessage.includes('housing') || lowerMessage.includes('home') || lowerMessage.includes('rent') || lowerMessage.includes('mortgage')) {
    return `Housing costs in our area are a big challenge. I live in ${constituent.zipCode} and housing policies that affect affordability would be really important to me and my neighbors.`;
  }
  
  // General response
  return `Thanks for asking! As a ${constituent.age}-year-old ${constituent.occupation.toLowerCase()} from ${constituent.zipCode}, I'm always interested in how policies might affect people like me. What specific policy are you asking about?`;
};

const ConstituentChat: React.FC<ConstituentChatProps> = ({ constituent, isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize chat with a welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: `Hi! I'm ${constituent.name}, a ${constituent.age}-year-old ${constituent.occupation.toLowerCase()} from ${constituent.zipCode}. I have a ${constituent.education.toLowerCase()} and make about $${constituent.annualIncome.toLocaleString()} a year. ${constituent.personalStory} How can I help you understand how policies might affect someone like me?`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, constituent, messages.length]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Generate response based on constituent's profile
      const response = generateFallbackChatResponse(inputMessage, constituent);
      
      // Simulate typing delay for more realistic chat experience
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error generating chat response:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "I'm sorry, I'm having trouble responding right now. Please try again later.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{constituent.name}</h3>
              <p className="text-sm text-gray-600">{constituent.occupation} • {constituent.age} years old</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <p className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                  <span className="text-sm">Typing...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about policy impact, concerns, or experiences..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConstituentChat; 
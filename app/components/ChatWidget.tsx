import { useEffect } from 'react';

interface ChatWidgetProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  primaryColor?: string;
  welcomeMessage?: string;
}

interface LynkAIChatOptions {
  position?: string;
  primaryColor?: string;
  welcomeMessage?: string;
}

interface LynkAIChatClass {
  new (options: LynkAIChatOptions): {
    init: () => void;
    createStyles: () => void;
    createChatWidget: () => void;
    bindEvents: () => void;
    sendMessage: () => void;
    addMessage: (text: string, type: 'user' | 'assistant') => void;
  };
}

declare global {
  interface Window {
    LynkAIChat: LynkAIChatClass;
  }
}

export function ChatWidget({
  position = 'bottom-right',
  primaryColor = '#5C6AC4',
  welcomeMessage = 'Hey! What\'s up?'
}: ChatWidgetProps) {
  useEffect(() => {
    // Load the chat widget script
    const script = document.createElement('script');
    script.src = '/lynk-ai.js';
    script.async = true;
    script.onload = () => {
      // Initialize the chat widget after the script loads
      new window.LynkAIChat({
        position,
        primaryColor,
        welcomeMessage
      });
    };
    document.body.appendChild(script);

    // Cleanup on unmount
    return () => {
      // Remove the script tag if it exists and is still in the document
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
      // Remove the chat widget if it exists and is still in the document
      const widget = document.querySelector('.lynk-ai-widget');
      if (widget && widget.parentNode) {
        widget.parentNode.removeChild(widget);
      }
    };
  }, [position, primaryColor, welcomeMessage]);

  return null;
} 
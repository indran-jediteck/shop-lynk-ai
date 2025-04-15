class LynkAIChat {
  constructor(options = {}) {
    this.options = {
      position: options.position || 'bottom-right',
      primaryColor: options.primaryColor || '#5C6AC4',
      welcomeMessage: options.welcomeMessage || 'Hey! What\'s up?',
      ...options
    };
    this.init();
  }

  init() {
    this.createStyles();
    this.createChatWidget();
    this.bindEvents();
  }

  createStyles() {
    const styles = `
      .lynk-ai-widget {
        position: fixed;
        ${this.options.position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
        ${this.options.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      }

      .lynk-ai-chat-button {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: ${this.options.primaryColor};
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: transform 0.2s ease;
      }

      .lynk-ai-chat-button:hover {
        transform: scale(1.05);
      }

      .lynk-ai-chat-window {
        position: fixed;
        bottom: 90px;
        right: 20px;
        width: 480px;
        height: 720px;
        background: white;
        border-radius: 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: none;
        flex-direction: column;
        overflow: hidden;
      }

      .lynk-ai-chat-header {
        padding: 20px;
        background: ${this.options.primaryColor};
        color: white;
        display: flex;
        justify-content: space-between;
        align-items: center;
        position: relative;
        z-index: 1;
      }

      .lynk-ai-close-button {
        display: block;
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 8px;
        margin: -8px;
        line-height: 1;
      }

      .lynk-ai-chat-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 500;
      }

      .lynk-ai-chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .lynk-ai-message {
        max-width: 80%;
        padding: 12px 16px;
        border-radius: 12px;
        font-size: 14px;
        line-height: 1.4;
      }

      .lynk-ai-message.assistant {
        background: #F4F6F8;
        align-self: flex-start;
      }

      .lynk-ai-message.user {
        background: ${this.options.primaryColor};
        color: white;
        align-self: flex-end;
      }

      .lynk-ai-chat-input {
        padding: 20px;
        border-top: 1px solid #E6E8EB;
        display: flex;
        gap: 12px;
      }

      .lynk-ai-chat-input-field {
        flex: 1;
        padding: 12px;
        border: 1px solid #E6E8EB;
        border-radius: 8px;
        font-size: 14px;
        resize: none;
        min-height: 44px;
        max-height: 120px;
        outline: none;
      }

      .lynk-ai-chat-input-field:focus {
        border-color: ${this.options.primaryColor};
      }

      .lynk-ai-chat-actions {
        display: flex;
        gap: 8px;
        padding: 8px;
        border-top: 1px solid #E6E8EB;
      }

      .lynk-ai-chat-action {
        padding: 8px;
        background: none;
        border: none;
        cursor: pointer;
        opacity: 0.6;
        transition: opacity 0.2s ease;
      }

      .lynk-ai-chat-action:hover {
        opacity: 1;
      }

      .lynk-ai-chat-input-buttons {
        display: flex;
        align-items: flex-end;
      }

      .lynk-ai-chat-send {
        padding: 12px;
        background: ${this.options.primaryColor};
        border: none;
        border-radius: 8px;
        color: white;
        cursor: pointer;
        transition: opacity 0.2s ease;
      }

      .lynk-ai-chat-send:hover {
        opacity: 0.9;
      }

      /* Mobile styles */
      @media (max-width: 768px) {
        .lynk-ai-chat-window {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          height: 100%;
          border-radius: 0;
          z-index: 999999;
        }

        .lynk-ai-chat-button {
          width: 50px;
          height: 50px;
        }

        .lynk-ai-chat-header {
          padding: 16px !important;
        }

        /* Hide chat button when window is open */
        .lynk-ai-widget.chat-open .lynk-ai-chat-button {
          display: none;
        }
      }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }

  createChatWidget() {
    // Create main container
    const widget = document.createElement('div');
    widget.className = 'lynk-ai-widget';

    // Create chat button
    const chatButton = document.createElement('div');
    chatButton.className = 'lynk-ai-chat-button';
    chatButton.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>';

    // Create chat window
    const chatWindow = document.createElement('div');
    chatWindow.className = 'lynk-ai-chat-window';
    chatWindow.innerHTML = `
      <div class="lynk-ai-chat-header">
        <h3>Shop Lynk AI</h3>
        <button class="lynk-ai-close-button">×</button>
      </div>
      <div class="lynk-ai-chat-messages">
        <div class="lynk-ai-message assistant">
          ${this.options.welcomeMessage}
        </div>
      </div>
      <div class="lynk-ai-chat-actions">
        <button class="lynk-ai-chat-action">📎</button>
        <button class="lynk-ai-chat-action">👍</button>
        <button class="lynk-ai-chat-action">👎</button>
        <button class="lynk-ai-chat-action">🔊</button>
        <button class="lynk-ai-chat-action">↻</button>
      </div>
      <div class="lynk-ai-chat-input">
        <textarea 
          class="lynk-ai-chat-input-field" 
          placeholder="Ask anything"
          rows="1"
        ></textarea>
        <div class="lynk-ai-chat-input-buttons">
          <button class="lynk-ai-chat-send">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    `;

    // Append elements
    widget.appendChild(chatWindow);
    widget.appendChild(chatButton);
    document.body.appendChild(widget);

    // Store references
    this.widget = widget;
    this.chatButton = chatButton;
    this.chatWindow = chatWindow;
    this.messagesContainer = chatWindow.querySelector('.lynk-ai-chat-messages');
    this.inputField = chatWindow.querySelector('.lynk-ai-chat-input-field');
    this.sendButton = chatWindow.querySelector('.lynk-ai-chat-send');
  }

  bindEvents() {
    // Toggle chat window
    this.chatButton.addEventListener('click', () => {
      const isVisible = this.chatWindow.style.display === 'flex';
      this.chatWindow.style.display = isVisible ? 'none' : 'flex';
      this.widget.classList.toggle('chat-open', !isVisible);
      if (!isVisible) this.inputField.focus();
    });

    // Close button for mobile
    const closeButton = this.chatWindow.querySelector('.lynk-ai-close-button');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.chatWindow.style.display = 'none';
        this.widget.classList.remove('chat-open');
      });
    }

    // Handle input
    this.inputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Auto-resize textarea
    this.inputField.addEventListener('input', () => {
      this.inputField.style.height = 'auto';
      this.inputField.style.height = this.inputField.scrollHeight + 'px';
    });

    // Send button
    this.sendButton.addEventListener('click', () => this.sendMessage());
  }

  sendMessage() {
    const message = this.inputField.value.trim();
    if (!message) return;

    // Add user message
    this.addMessage(message, 'user');

    // Clear input
    this.inputField.value = '';
    this.inputField.style.height = 'auto';

    // Simulate response (replace with actual API call)
    setTimeout(() => {
      this.addMessage('Thanks for your message! I\'ll help you with that.', 'assistant');
    }, 1000);
  }

  addMessage(text, type) {
    const message = document.createElement('div');
    message.className = `lynk-ai-message ${type}`;
    message.textContent = text;
    this.messagesContainer.appendChild(message);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }
}

// Initialize chat widget
window.LynkAIChat = LynkAIChat;

// Auto-initialize the chat widget
new LynkAIChat({
  position: 'bottom-right',
  primaryColor: '#5C6AC4',
  welcomeMessage: 'Hey! What\'s up?'
}); 
import { createTag } from '../../scripts/lib-adobeio.js';
import decoratePreformattedCode from '../../components/code.js';

export default async function decorate(block) {
  const button = createTag('button', {
    class: 'spectrum-Button spectrum-Button--fill spectrum-Button--accent spectrum-Button--sizeM',
    type: 'button'
  });
  button.innerHTML = '<span class="spectrum-Button-label">Ask AI</span>';

  // Create the side drawer using Spectrum Tray
  const drawer = createTag('div', {
    class: 'spectrum-Tray spectrum-Tray--right is-open',
    role: 'dialog',
    'aria-modal': 'true'
  });
  drawer.classList.remove('is-open');
  const drawerWrapper = createTag('div', { class: 'spectrum-Tray-wrapper' });
  const drawerHeader = createTag('div', { class: 'ask-ai-header' });

  const sparkleIcon = createTag('div', { class: 'ask-ai-sparkle-icon' });
  sparkleIcon.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 0L11.0206 6.97943L18 9L11.0206 11.0206L9 18L6.97943 11.0206L0 9L6.97943 6.97943L9 0Z" fill="currentColor"/>
    </svg>
    <span>Ask questions about this product and get answers from the AI</span>
  `;

  const closeButton = createTag('button', {
    class: 'ask-ai-icon-button',
    type: 'button',
    'aria-label': 'Close'
  });
  closeButton.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  `;

  drawerHeader.append(sparkleIcon, closeButton);

  // Create disclaimer
  const disclaimer = createTag('div', { class: 'ask-ai-disclaimer' });
  const disclaimerText = createTag('p', { class: 'spectrum-Body spectrum-Body--sizeXS' });
  disclaimerText.textContent = 'Responses are generated using AI and may contain mistakes.';
  disclaimer.appendChild(disclaimerText);

  // Create drawer content - chat messages container
  const drawerContent = createTag('div', { class: 'ask-ai-content' });
  const chatMessages = createTag('div', { class: 'ask-ai-messages' });
  drawerContent.appendChild(chatMessages);

  // Create input area
  const inputArea = createTag('div', { class: 'ask-ai-input-area' });
  const inputWrapper = createTag('div', { class: 'ask-ai-input-wrapper' });
  const textField = createTag('div', { class: 'spectrum-Textfield spectrum-Textfield--multiline' });
  const textarea = createTag('textarea', {
    class: 'spectrum-Textfield-input',
    placeholder: 'Ask a question ',
    rows: '1'
  });

  textField.appendChild(textarea);

  const sendButton = createTag('button', {
    class: 'spectrum-ActionButton spectrum-ActionButton--sizeM ask-ai-send-button',
    type: 'button',
    'aria-label': 'Send'
  });
  sendButton.innerHTML = `
    <svg class="spectrum-Icon spectrum-Icon--sizeM" focusable="false" aria-hidden="true" viewBox="0 0 24 24">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor"/>
    </svg>
  `;

  inputWrapper.append(textField, sendButton);
  inputArea.appendChild(inputWrapper);

  // Append all sections to wrapper
  drawerWrapper.append(drawerHeader, disclaimer, drawerContent, inputArea);
  drawer.appendChild(drawerWrapper);

  // Create overlay
  const overlay = createTag('div', { class: 'spectrum-Underlay is-open' });
  overlay.classList.remove('is-open');

  // Append button, overlay, and drawer to block
  block.append(button, overlay, drawer);

  function parseMarkdown(markdown) {
    const codeBlockMap = new Map();
    let html = markdown;
    let codeBlockIndex = 0;

    // Step 1: Extract code blocks with unique placeholders that won't be affected by other replacements
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      const language = lang || 'javascript';
      const placeholder = `{{CODEBLOCK_${codeBlockIndex}}}`;
      const codeBlock = `<pre class="language-${language}"><code class="language-${language}">${escapeHtml(code.trim())}</code></pre>`;
      codeBlockMap.set(placeholder, codeBlock);
      codeBlockIndex++;
      return placeholder;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    // Lists
    html = html.replace(/^\* (.+)$/gim, '<li>$1</li>');
    html = html.replace(/^- (.+)$/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    html = html.replace(/^\d+\. (.+)$/gim, '<li>$1</li>');

    // Line breaks
    html = html.replace(/\n\n/g, '<br><br>');
    html = html.replace(/\n/g, '<br>');

    // Step 3: Restore code blocks - must use global replace for each placeholder
    codeBlockMap.forEach((codeBlock, placeholder) => {
      html = html.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), codeBlock);
    });

    return html;
  }

  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  function createMessageBubble(text, isUser) {
    const messageWrapper = createTag('div', {
      class: `ask-ai-message ${isUser ? 'ask-ai-message--user' : 'ask-ai-message--ai'}`
    });

    const messageBubble = createTag('div', { class: 'ask-ai-message-bubble' });
    const messageText = createTag('div', { class: 'ask-ai-message-text' });

    // Parse markdown for AI messages, keep plain text for user messages
    if (isUser) {
      messageText.textContent = text;
    } else {
      const parsedHtml = parseMarkdown(text);
      messageText.innerHTML = parsedHtml;
    }

    messageBubble.appendChild(messageText);

    const messageTime = createTag('span', { class: 'ask-ai-message-time' });
    const now = new Date();
    messageTime.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    messageBubble.appendChild(messageTime);
    messageWrapper.appendChild(messageBubble);

    return messageWrapper;
  }

  function addMessage(text, isUser) {
    if (!text || !text.trim()) return;

    const message = createMessageBubble(text.trim(), isUser);
    chatMessages.appendChild(message);

    // Apply Prism highlighting for AI messages with code blocks
    if (!isUser) {
      const messageText = message.querySelector('.ask-ai-message-text');
      const preElements = messageText?.querySelectorAll('pre[class*="language-"]');
      
      if (preElements && preElements.length > 0) {
        // Function to apply decoration and highlighting
        const applyCodeHighlighting = () => {
          // Apply decoration to each code block
          preElements.forEach((pre) => {
            const wrapper = createTag('div', { class: 'temp-wrapper' });
            wrapper.appendChild(pre.cloneNode(true));
            decoratePreformattedCode(wrapper);
            
            const decoratedPre = wrapper.querySelector('pre');
            if (decoratedPre) {
              pre.replaceWith(decoratedPre);
            }
          });
          
          // Trigger Prism highlighting after decoration
          if (window.Prism && window.Prism.highlightAllUnder) {
            window.Prism.highlightAllUnder(messageText);
          }
        };
        
        // Check if Prism is already loaded
        if (window.Prism) {
          setTimeout(applyCodeHighlighting, 0);
        } else {
          // Load Prism dynamically
          window.Prism = { manual: true };
          
          // Load Prism CSS
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = `${window.hlx.codeBasePath}/styles/prism.css`;
          document.head.appendChild(link);
          
          // Load Prism JS
          import('../../scripts/prism.js').then(() => {
            // Configure autoloader
            if (window.Prism && window.Prism.plugins && window.Prism.plugins.autoloader) {
              window.Prism.plugins.autoloader.languages_path = '/hlx_statics/scripts/prism-grammars/';
              window.Prism.plugins.autoloader.use_minified = true;
            }
            
            // Apply highlighting after Prism is loaded
            setTimeout(applyCodeHighlighting, 100);
          }).catch(error => {
            console.error('Error loading Prism:', error);
          });
        }
      }
    }

    // Scroll to bottom smoothly - scroll the content container
    requestAnimationFrame(() => {
      drawerContent.scrollTop = drawerContent.scrollHeight;
    });

    return message;
  }

  async function getAIResponse(userMessage) {
    // Show typing indicator
    const typingIndicator = createTag('div', { class: 'ask-ai-typing' });
    typingIndicator.innerHTML = '<span></span><span></span><span></span>';
    chatMessages.appendChild(typingIndicator);
    
    // Scroll to show typing indicator
    requestAnimationFrame(() => {
      drawerContent.scrollTop = drawerContent.scrollHeight;
    });

    try {
      // Make API call
      const response = await fetch('http://localhost:4000/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userMessage,
          product: 'cceverywhere',
          locale: 'en'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Remove typing indicator
      typingIndicator.remove();

      // Add AI response message
      if (data.answer) {
        addMessage(data.answer, false);
      } else {
        addMessage('Sorry, I could not get a response. Please try again.', false);
      }

    } catch (error) {
      console.error('Error calling Ask AI API:', error);
      typingIndicator.remove();
      addMessage('Sorry, there was an error processing your request. Please try again.', false);
    }
  }

  function handleSendMessage() {
    const text = textarea.value.trim();
    if (!text) return;

    // Add user message
    addMessage(text, true);

    // Clear and reset textarea
    textarea.value = '';
    textarea.style.height = 'auto';
    sendButton.classList.remove('has-content');
    inputWrapper.classList.remove('has-content');
    textarea.focus();

    // Call API to get AI response
    getAIResponse(text);
  }

  function closeDrawer() {
    drawer.classList.remove('is-open');
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  // Send button click handler
  sendButton.addEventListener('click', handleSendMessage);

  // Enter key handler (Shift+Enter for new line)
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(textarea);
    }
  });

  // Open drawer handler
  button.addEventListener('click', () => {
    drawer.classList.add('is-open');
    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    textarea.focus();
  });

  // Close drawer handlers
  closeButton.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);

  // Auto-resize textarea and update send button state
  textarea.addEventListener('input', () => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    
    // Update send button state based on textarea content
    if (textarea.value.trim()) {
      sendButton.classList.add('has-content');
      inputWrapper.classList.add('has-content');
    } else {
      sendButton.classList.remove('has-content');
      inputWrapper.classList.remove('has-content');
    }
  });
}

import {
  addExtraScriptWithLoad,
  createTag,
} from "../../scripts/lib-adobeio.js";

// #region Constants
/** TODO: This should be different based on the environment */
const AI_API_BASE_URL = "https://devsite-rag.stg.app-builder.corp.adp.adobe.io";
const AI_API_KEY = "ai-assistant-devsite-rag-demo-01";
const CHAT_BUTTON_LABEL_OPEN = "Open AI Assistant";
const CHAT_BUTTON_LABEL_CLOSE = "Close AI Assistant";
const CHAT_WINDOW_ID = "ai-assistant-chat-window";
const CHAT_WINDOW_LABEL_ID = "ai-assistant-label";
const ELEMENTS = {
  CHAT_BUTTON: null,
  CHAT_WINDOW_CLOSE_BUTTON: null,
  CHAT_SEND_BUTTON: null,
  CHAT_TEXTAREA: null,
  CHAT_WINDOW: null,
  CHAT_WINDOW_CONTENT: null,
};
const GENERIC_ERROR_MESSAGE =
  "Sorry, I encountered an error. Please try again later.";
// #endregion

// #region ChatBubble
class ChatBubble {
  constructor({ content, source, isContinuingConversation = false, id }) {
    this.content = content;
    this.source = source;
    this.isContinuingConversation = isContinuingConversation;
    this.id = id;
    this.references = null;
    this._copyButton = null;
    /** @type {HTMLElement} */
    this.element = this.#_init();
  }

  /**
   * Creates the DOM element
   */
  #_init() {
    const bubble = createTag("div", { class: "chat-bubble" });
    const contentElement = createTag("div", { class: "chat-bubble-content" });

    if (this.source === "ai") {
      if (!this.isContinuingConversation) {
        bubble.appendChild(createAiAvatar());
      } else {
        bubble.style.paddingLeft = "36px";
      }
    } else if (this.source === "user") {
      bubble.classList.add("chat-bubble-user");
    }

    if (!this.isContinuingConversation) {
      bubble.style.marginTop = "24px";
    }

    contentElement.innerHTML = window.marked.parse(this.content);
    bubble.appendChild(contentElement);

    // Create copy button for AI messages but don't append to DOM yet
    if (this.source === "ai") {
      this._copyButton = this.#_createCopyButton(this.id);

      if (this.id) {
        bubble.dataset.messageId = this.id;
        // If we have an ID already (e.g., restored from history), append the button
        contentElement.appendChild(this._copyButton);
      }
      // Otherwise, button will be inserted when showCopyButton() is called
    }

    return bubble;
  }

  /**
   * Creates the copy button element
   * @param {string|null} [messageId] - Optional message ID
   * @returns {HTMLButtonElement} The copy button element
   */
  #_createCopyButton(messageId = null) {
    const COPY_BUTTON_LABEL = "Copy response";
    const COPY_BUTTON_LABEL_COPIED = "Copied to clipboard";
    const COPY_BUTTON_LABEL_FAILED = "Copy failed";
    const COPY_FEEDBACK_REVERT_MS = 2000;
    const COPY_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" focusable="false" aria-hidden="true" role="img" class="chat-bubble-copy-icon"><path fill="currentColor" d="M11.75 18h-7.5C3.01 18 2 16.99 2 15.75v-7.5C2 7.01 3.01 6 4.25 6c.414 0 .75.336.75.75s-.336.75-.75.75c-.413 0-.75.337-.75.75v7.5c0 .413.337.75.75.75h7.5c.413 0 .75-.337.75-.75 0-.414.336-.75.75-.75s.75.336.75.75c0 1.24-1.01 2.25-2.25 2.25M6.75 5C6.336 5 6 4.664 6 4.25 6 3.01 7.01 2 8.25 2c.414 0 .75.336.75.75s-.336.75-.75.75c-.413 0-.75.337-.75.75 0 .414-.336.75-.75.75M13 3.5h-2c-.414 0-.75-.336-.75-.75S10.586 2 11 2h2c.414 0 .75.336.75.75s-.336.75-.75.75"/><path fill="currentColor" d="M13 14h-2c-.414 0-.75-.336-.75-.75s.336-.75.75-.75h2c.414 0 .75.336.75.75s-.336.75-.75.75M15.75 14c-.414 0-.75-.336-.75-.75s.336-.75.75-.75c.413 0 .75-.337.75-.75 0-.414.336-.75.75-.75s.75.336.75.75c0 1.24-1.01 2.25-2.25 2.25M17.25 5c-.414 0-.75-.336-.75-.75 0-.413-.337-.75-.75-.75-.414 0-.75-.336-.75-.75s.336-.75.75-.75C16.99 2 18 3.01 18 4.25c0 .414-.336.75-.75.75M17.25 9.75c-.414 0-.75-.336-.75-.75V7c0-.414.336-.75.75-.75s.75.336.75.75v2c0 .414-.336.75-.75.75M6.75 9.75C6.336 9.75 6 9.414 6 9V7c0-.414.336-.75.75-.75s.75.336.75.75v2c0 .414-.336.75-.75.75M8.25 14C7.01 14 6 12.99 6 11.75c0-.414.336-.75.75-.75s.75.336.75.75c0 .413.337.75.75.75.414 0 .75.336.75.75s-.336.75-.75.75"/></svg>`;
    const CHECK_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" focusable="false" aria-hidden="true" role="img" class="chat-bubble-copy-icon chat-bubble-copy-icon-check"><path fill="currentColor" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>`;

    const button = createTag("button", {
      class: "chat-bubble-copy",
      type: "button",
      "aria-label": COPY_BUTTON_LABEL,
    });
    button.innerHTML = COPY_ICON_SVG;

    if (messageId) {
      button.dataset.messageId = messageId;
    }

    button.addEventListener("click", () => {
      const id = button.dataset.messageId;
      if (!id) return;

      const message = chatHistory.findById(id);
      const text = message?.content ?? "";

      if (navigator.clipboard?.writeText) {
        navigator.clipboard
          .writeText(text)
          .then(() => {
            // Show success feedback
            if (button._copyRevertTimeout) {
              clearTimeout(button._copyRevertTimeout);
            }
            button.setAttribute("aria-label", COPY_BUTTON_LABEL_COPIED);
            button.innerHTML = CHECK_ICON_SVG;
            button._copyRevertTimeout = setTimeout(() => {
              button.setAttribute("aria-label", COPY_BUTTON_LABEL);
              button.innerHTML = COPY_ICON_SVG;
              button._copyRevertTimeout = null;
            }, COPY_FEEDBACK_REVERT_MS);
          })
          .catch(() => {
            // Show failure feedback
            if (button._copyRevertTimeout) {
              clearTimeout(button._copyRevertTimeout);
            }
            button.setAttribute("aria-label", COPY_BUTTON_LABEL_FAILED);
            button.innerHTML = COPY_ICON_SVG;
            button._copyRevertTimeout = setTimeout(() => {
              button.setAttribute("aria-label", COPY_BUTTON_LABEL);
              button.innerHTML = COPY_ICON_SVG;
              button._copyRevertTimeout = null;
            }, COPY_FEEDBACK_REVERT_MS);
          });
      } else {
        // Clipboard API not available - show failure feedback
        if (button._copyRevertTimeout) {
          clearTimeout(button._copyRevertTimeout);
        }
        button.setAttribute("aria-label", COPY_BUTTON_LABEL_FAILED);
        button.innerHTML = COPY_ICON_SVG;
        button._copyRevertTimeout = setTimeout(() => {
          button.setAttribute("aria-label", COPY_BUTTON_LABEL);
          button.innerHTML = COPY_ICON_SVG;
          button._copyRevertTimeout = null;
        }, COPY_FEEDBACK_REVERT_MS);
      }
    });

    return button;
  }

  /**
   * Updates the content of the chat bubble
   * @param {string} content
   */
  updateContent(content) {
    this.content = content;
    const contentElement = this.element.querySelector(".chat-bubble-content");
    if (contentElement) {
      contentElement.innerHTML = window.DOMPurify.sanitize(
        window.marked.parse(this.content),
      );
    }
  }

  scrollIntoView() {
    this.element.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }

  showThinking() {
    this.element.classList.add("thinking");
  }
  hideThinking() {
    this.element.classList.remove("thinking");
  }

  /**
   * Sets the message ID for this bubble
   * @param {string} messageId - The message ID to set
   */
  setMessageId(messageId) {
    if (!messageId || this.source !== "ai") return;

    this.id = messageId;
    this.element.dataset.messageId = messageId;

    // Update the copy button's dataset if it exists
    if (this._copyButton) {
      this._copyButton.dataset.messageId = messageId;
    }
  }

  /**
   * Shows the copy button by inserting it into the DOM (call after streaming completes)
   */
  showCopyButton() {
    if (this.source !== "ai" || !this._copyButton) return;

    // Check if button is already in the DOM
    if (this._copyButton.parentElement) return;

    // Insert the button into the content element
    const contentElement = this.element.querySelector(".chat-bubble-content");
    if (contentElement) {
      contentElement.appendChild(this._copyButton);
    }
  }

  /**
   * Appends references to the chat bubble
   * @param {Array<{url: string, title: string}>} references
   */
  appendReferences(references) {
    if (!references?.length) {
      console.warn("[AI Assistant] No references provided");
      return;
    }

    if (this.references?.length) {
      console.warn("[AI Assistant] References already appended to chat bubble");
      return;
    }

    this.references = references;

    const wrapper = createTag("div", { class: "chat-bubble-sources" });
    const heading = createTag("p", { class: "chat-bubble-sources-heading" });
    heading.textContent = "Sources:";
    wrapper.appendChild(heading);

    const list = createTag("ol", { class: "chat-bubble-sources-list" });
    references.forEach(({ url, title }) => {
      const li = createTag("li", { class: "chat-bubble-sources-item" });
      const a = createTag("a", {
        href: url,
        target: "_blank",
        rel: "noopener noreferrer",
      });
      a.textContent = title || url;
      li.appendChild(a);
      list.appendChild(li);
    });
    wrapper.appendChild(list);
    this.element.appendChild(wrapper);
  }
}
// #endregion

// #region ChatHistory
/**
 * Manages chat message history with sessionStorage persistence
 */
class ChatHistory {
  static STORAGE_KEY = "ai-assistant-chat-history";

  /**
   * Gets all messages from history
   * @returns {Array<{id?: string, content: string, source: 'user'|'ai', references?: Array}>}
   */
  getAll() {
    if (this._cache) return [...this._cache]; // Return copy to prevent mutations

    try {
      const stored = sessionStorage.getItem(ChatHistory.STORAGE_KEY);
      if (!stored) {
        this._cache = [];
        return [];
      }
      const parsed = JSON.parse(stored);
      this._cache = this._sanitizeMessages(parsed);
      return [...this._cache];
    } catch (error) {
      console.error("Error retrieving chat history:", error);
      this._cache = [];
      return [];
    }
  }

  /**
   * Adds a new message to history
   * @param {{content: string, source: 'user'|'ai', id?: string, references?: Array}} message
   */
  add(message) {
    const history = this.getAll();
    history.push(message);
    this._save(history);
  }

  /**
   * Updates the last message in history
   * @param {Object} updates - Properties to merge into last message
   */
  updateLast(updates) {
    const history = this.getAll();
    if (history.length > 0) {
      history[history.length - 1] = {
        ...history[history.length - 1],
        ...updates,
      };
      this._save(history);
    }
  }

  /**
   * Finds a message by ID
   * @param {string} id - Message ID to find
   * @returns {Object|undefined} The message object or undefined
   */
  findById(id) {
    return this.getAll().find((m) => m.id === id);
  }

  /**
   * Gets messages formatted for AI context (excludes last N messages)
   * @param {number} excludeLast - Number of recent messages to exclude
   * @returns {string} Formatted context string
   */
  getContextForAI(excludeLast = 2) {
    return this.getAll()
      .slice(0, -excludeLast)
      .map(({ source, content }) => JSON.stringify({ source, content }))
      .join("\n");
  }

  /**
   * Clears all history
   */
  clear() {
    try {
      sessionStorage.removeItem(ChatHistory.STORAGE_KEY);
      this._cache = [];
    } catch (error) {
      console.error("Error clearing chat history:", error);
    }
  }

  /**
   * Gets the number of messages in history
   * @returns {number}
   */
  get length() {
    return this.getAll().length;
  }

  /**
   * Checks if history is empty
   * @returns {boolean}
   */
  isEmpty() {
    return this.length === 0;
  }

  /**
   * Saves history to sessionStorage
   * @param {Array} history - The chat history array to save
   * @private
   */
  _save(history) {
    try {
      const serializable = this._sanitizeMessages(history);
      sessionStorage.setItem(
        ChatHistory.STORAGE_KEY,
        JSON.stringify(serializable),
      );
      this._cache = serializable;
    } catch (error) {
      console.error("Error saving chat history:", error);
    }
  }

  /**
   * Sanitizes messages to only include serializable properties
   * @param {Array} messages - Messages to sanitize
   * @returns {Array} Sanitized messages
   * @private
   */
  _sanitizeMessages(messages) {
    return messages.map(({ id, content, source, references }) => ({
      ...(id && { id }),
      content,
      source,
      ...(references?.length && { references }),
    }));
  }
}
// #endregion

// Create singleton instance of ChatHistory
const chatHistory = new ChatHistory();

/**
 * Decorates the ai-assistant block
 * @param {Element} block - the ai-assistant block element
 */
export default async function decorate(block) {
  addExtraScriptWithLoad(
    document.body,
    "https://unpkg.com/marked@^17/lib/marked.umd.js",
    () => {
      addExtraScriptWithLoad(
        document.body,
        "https://unpkg.com/dompurify@^3/dist/purify.min.js",
        () => {
          restoreChatHistory();
        },
      );
    },
  );

  const container = createTag("div", { class: "ai-assistant-container" });

  const chatWindow = createTag("div", {
    class: "chat-window",
    id: CHAT_WINDOW_ID,
    role: "dialog",
    "aria-modal": "false",
    "aria-labelledby": CHAT_WINDOW_LABEL_ID,
  });
  ELEMENTS.CHAT_WINDOW = chatWindow;

  chatWindow.appendChild(createChatWindowHeader());
  const content = createTag("div", { class: "chat-window-content" });
  ELEMENTS.CHAT_WINDOW_CONTENT = content;
  chatWindow.appendChild(content);
  chatWindow.appendChild(createInputSection());

  container.appendChild(createChatButton());
  container.appendChild(chatWindow);

  block.appendChild(container);

  ELEMENTS.CHAT_BUTTON.addEventListener("click", toggleChatWindow);
  ELEMENTS.CHAT_WINDOW_CLOSE_BUTTON.addEventListener("click", closeChatWindow);
  ELEMENTS.CHAT_SEND_BUTTON.addEventListener("click", sendMessage);
  ELEMENTS.CHAT_TEXTAREA.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
}

// #region Chat UI fns
/**
 * Creates the AI avatar element
 */
const createAiAvatar = () => {
  return createTag("div", {
    class: "chat-ai-avatar",
    "aria-hidden": true,
  });
};
/**
 * Creates the chat window header
 */
const createChatWindowHeader = () => {
  const chatWindowHeader = createTag("header", { class: "chat-window-header" });
  chatWindowHeader.appendChild(createAiAvatar());
  const label = createTag("h2", {
    class: "chat-window-label",
    id: CHAT_WINDOW_LABEL_ID,
  });
  label.textContent = "Adobe Developer AI assistant";
  const closeButton = createTag("button", {
    class: "chat-window-close",
    type: "button",
    "aria-label": CHAT_BUTTON_LABEL_CLOSE,
  });
  const closeButtonIcon = createTag("img", {
    src: "/hlx_statics/icons/dismiss.svg",
    alt: "",
    "aria-hidden": true,
  });
  closeButton.appendChild(closeButtonIcon);

  chatWindowHeader.appendChild(label);
  chatWindowHeader.appendChild(closeButton);
  ELEMENTS.CHAT_WINDOW_CLOSE_BUTTON = closeButton;
  return chatWindowHeader;
};

/**
 * Creates the input section
 */
const createInputSection = () => {
  const inputSection = createTag("div", { class: "chat-window-input-section" });
  const textarea = createTag("textarea", {
    placeholder: "Type your message...",
    rows: "4",
    "aria-label": "Type your message",
  });
  const disclaimerText = createTag("div", { class: "chat-disclaimer-text" });
  disclaimerText.innerHTML = `By using AI Assistant, you agree to the <a href="https://www.adobe.com/legal/licenses-terms/adobe-gen-ai-user-guidelines.html" target="_blank" rel="noopener noreferrer">Generative AI User Guidelines</a>.`;
  const sendButton = createTag("button", {
    class: "chat-send-button",
    type: "button",
    "aria-label": "Send message",
  });
  sendButton.innerHTML = `<svg width="20" height="20" viewBox="0 0 20 20" focusable="false" aria-hidden="true" role="img" class="spectrum-Icon spectrum-Icon--sizeXL"><path d="M18.6485 9.97369C18.6482 9.67918 18.4769 9.41125 18.2059 9.29075L4.05752 2.93301C3.80133 2.81769 3.50129 2.85602 3.28171 3.03141C3.06178 3.20784 2.95889 3.49165 3.01516 3.76752L4.28678 10.0082L3.06488 16.2386C3.0162 16.4854 3.09492 16.7382 3.27031 16.9136C3.29068 16.9339 3.31278 16.9533 3.33522 16.9716C3.55619 17.1456 3.85519 17.1822 4.11069 17.0662L18.2086 10.658C18.4773 10.5358 18.6489 10.2682 18.6485 9.97369ZM14.406 9.22735L5.66439 9.25398L4.77705 4.90103L14.406 9.22735ZM4.81711 15.0974L5.6694 10.7531L14.4323 10.7265L4.81711 15.0974Z" fill="#ffffff"/></svg>`;

  inputSection.appendChild(textarea);
  inputSection.appendChild(disclaimerText);
  inputSection.appendChild(sendButton);
  ELEMENTS.CHAT_SEND_BUTTON = sendButton;
  ELEMENTS.CHAT_TEXTAREA = textarea;
  return inputSection;
};

/**
 * Creates the chat button
 */
const createChatButton = () => {
  const chatButton = createTag("button", {
    class: "chat-button",
    type: "button",
    "aria-controls": CHAT_WINDOW_ID,
    "aria-expanded": "false",
    "aria-haspopup": "dialog",
    "aria-label": CHAT_BUTTON_LABEL_OPEN,
  });
  chatButton.innerHTML = `<svg width="26" height="26" viewBox="0 0 26 26" focusable="false" aria-hidden="true" role="img" class="spectrum-Icon spectrum-Icon--sizeXL"><path d="M8.1248 24.6977C7.99531 24.6977 7.86582 24.6723 7.74267 24.6202C7.38339 24.4666 7.1498 24.1137 7.1498 23.7227V19.4977H6.1748C3.48721 19.4977 1.2998 17.3103 1.2998 14.6227V7.47266C1.2998 4.78506 3.48721 2.59766 6.1748 2.59766H11.3139C11.8521 2.59766 12.2889 3.03438 12.2889 3.57266C12.2889 4.11093 11.8521 4.54766 11.3139 4.54766H6.1748C4.56251 4.54766 3.2498 5.86036 3.2498 7.47266V14.6227C3.2498 16.235 4.56251 17.5477 6.1748 17.5477H8.1248C8.66308 17.5477 9.0998 17.9844 9.0998 18.5227V21.4299L12.8487 17.8206C13.0303 17.6454 13.2728 17.5477 13.5254 17.5477H19.8248C21.4371 17.5477 22.7498 16.235 22.7498 14.6227V12.9697C22.7498 12.4315 23.1865 11.9947 23.7248 11.9947C24.2631 11.9947 24.6998 12.4315 24.6998 12.9697V14.6227C24.6998 17.3103 22.5124 19.4977 19.8248 19.4977H13.9189L8.80147 24.4247C8.61611 24.6037 8.37236 24.6977 8.1248 24.6977Z" fill="#292929"/><path d="M17.2617 11.8078C17.0167 11.8078 16.7704 11.7443 16.5482 11.6161C16.0074 11.3051 15.7332 10.6868 15.8639 10.0774L16.4619 7.31493L14.5639 5.22147C14.145 4.75936 14.0726 4.08778 14.3837 3.54823C14.696 3.00868 15.3206 2.73446 15.9223 2.86395L18.6848 3.4619L20.7783 1.56395C21.2404 1.14627 21.9158 1.07517 22.4515 1.38368C22.9924 1.69472 23.2666 2.31297 23.1358 2.92234L22.5379 5.68484L24.4358 7.7783C24.8548 8.24041 24.9271 8.91199 24.6161 9.45154C24.3038 9.99237 23.6843 10.2691 23.0774 10.1358L20.3149 9.53788L18.2215 11.4358C17.9511 11.6808 17.6083 11.8078 17.2617 11.8078ZM17.0979 5.11355L18.0856 6.2028C18.3929 6.53796 18.5211 7.01022 18.4246 7.46218L18.1136 8.90184L19.2028 7.91414C19.5392 7.60691 20.0166 7.47996 20.4622 7.57517L21.9018 7.88621L20.9141 6.79696C20.6069 6.4618 20.4787 5.98954 20.5752 5.53758L20.8862 4.09793L19.797 5.08564C19.4618 5.39413 18.987 5.52362 18.5376 5.4246L17.0979 5.11355Z" fill="#292929"/><path d="M10.3125 14.9542C10.1449 14.9542 9.97734 14.911 9.82499 14.8234C9.45809 14.6114 9.2702 14.1874 9.35907 13.7735L9.59012 12.7071L8.8576 11.8997C8.57322 11.5861 8.5237 11.124 8.73572 10.7571C8.94774 10.3902 9.37429 10.2099 9.78563 10.2912L10.852 10.5222L11.6594 9.78972C11.9743 9.50535 12.4339 9.45583 12.802 9.66785C13.1689 9.87987 13.3568 10.3039 13.2679 10.7178L13.0369 11.7842L13.7694 12.5916C14.0538 12.9051 14.1033 13.3673 13.8913 13.7342C13.6793 14.1011 13.2515 14.2851 12.8414 14.2001L11.775 13.969L10.9676 14.7016C10.7835 14.8679 10.5486 14.9542 10.3125 14.9542Z" fill="#292929"/></svg>`;
  ELEMENTS.CHAT_BUTTON = chatButton;
  return chatButton;
};
// #endregion

const openChatWindow = () => {
  ELEMENTS.CHAT_BUTTON.setAttribute("aria-expanded", "true");
  ELEMENTS.CHAT_BUTTON.ariaLabel = CHAT_BUTTON_LABEL_CLOSE;
  ELEMENTS.CHAT_WINDOW.classList.add("show");

  // Initial messages
  if (chatHistory.isEmpty()) {
    window.setTimeout(() => {
      const bubble = new ChatBubble({
        content: "Hello, welcome to Adobe Developer Website!",
        source: "ai",
      });
      ELEMENTS.CHAT_WINDOW_CONTENT.appendChild(bubble.element);
      chatHistory.add({
        content: "Hello, welcome to Adobe Developer Website!",
        source: "ai",
      });
    }, 250);
    window.setTimeout(() => {
      const bubble = new ChatBubble({
        content: "What would you like to know today?",
        source: "ai",
        isContinuingConversation: true,
      });
      ELEMENTS.CHAT_WINDOW_CONTENT.appendChild(bubble.element);
      chatHistory.add({
        content: "What would you like to know today?",
        source: "ai",
      });
    }, 500);
  }
};

const closeChatWindow = () => {
  ELEMENTS.CHAT_BUTTON.setAttribute("aria-expanded", "false");
  ELEMENTS.CHAT_BUTTON.ariaLabel = CHAT_BUTTON_LABEL_OPEN;
  ELEMENTS.CHAT_WINDOW.classList.remove("show");
};

const toggleChatWindow = () => {
  if (ELEMENTS.CHAT_WINDOW.classList.contains("show")) {
    closeChatWindow();
  } else {
    openChatWindow();
  }
};

/**
 * Sends a message to the content area and scrolls to the bottom.
 * If no options are provided, the content of the textarea will be used and the source will be set to "user".
 * @param {Object} [options] - The options for the message
 * @param {string} [options.content] - The content of the message
 * @param {"user" | "ai"} [options.source] - The source of the
 * @param {boolean} [options.isContinuingConversation = false] - Whether the message is continuing a conversation
 * @returns {boolean | ChatBubble} - A ChatBubble instance if the message was sent successfully, false otherwise
 */
const sendMessage = ({
  content,
  source = "user",
  isContinuingConversation = false,
} = {}) => {
  let messageContent = content;
  if (!content && source === "user") {
    messageContent = ELEMENTS.CHAT_TEXTAREA.value.trim();
    ELEMENTS.CHAT_TEXTAREA.value = "";
  }

  if (!messageContent) return false;

  const bubble = new ChatBubble({
    content: messageContent,
    source,
    isContinuingConversation,
  });

  chatHistory.add({
    content: messageContent,
    source,
  });

  ELEMENTS.CHAT_WINDOW_CONTENT.appendChild(bubble.element);
  ELEMENTS.CHAT_WINDOW_CONTENT.scrollTop =
    ELEMENTS.CHAT_WINDOW_CONTENT.scrollHeight;

  if (source === "user") {
    retrieveAiResponse(messageContent);
  }

  return bubble;
};

const retrieveAiResponse = async (messageContent) => {
  /** @type {ChatBubble} */
  const targetBubble = sendMessage({ content: "Thinking", source: "ai" });
  targetBubble.showThinking();

  const showErrorMessage = (message = GENERIC_ERROR_MESSAGE) => {
    targetBubble.hideThinking();
    targetBubble.updateContent(message);
    return;
  };

  // TODO: We'll have to decide how much context to send to the AI.
  // -2 because we want to exclude the current user message and the thinking message
  const queryContext = chatHistory.getContextForAI(2);

  try {
    const response = await fetch(
      `${AI_API_BASE_URL}/v1/inference/retrieve/generate/stream`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": AI_API_KEY,
        },
        body: JSON.stringify({
          query: `
          <system>
            Use markdown formatting for the response.
            ALWAYS provide a follow up question.
          </system>
          <history>
            ${queryContext}
          </history>
          <question>
            ${messageContent}
          </question>
          `,
        }),
      },
    );

    if (!response.ok) {
      // TODO: Log error somehow somewhere?
      showErrorMessage();
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let responseContent = "";
    /** @type {string | null} */
    let currentSessionId = null;
    /** @type {Array<{url: string, title: string}>} */
    let accumulatedReferences = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        chatHistory.updateLast({
          content: responseContent,
          references: accumulatedReferences,
        });
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const event = line.replace("data: ", "").trim();
          if (event.length === 0) {
            continue;
          }

          try {
            /**
             * @type {Object}
             * @property {'metadata' | 'content' | 'timing' | 'citation' | 'complete'} type
             * @property {string} [text] - The text of the event
             */
            const data = JSON.parse(event);

            if (data.type === "metadata" && data.sessionId) {
              currentSessionId = data.sessionId;
              chatHistory.updateLast({ id: data.sessionId });
              targetBubble.setMessageId(data.sessionId);
            }

            if (data.type === "content" && data.text) {
              responseContent += data.text;
              targetBubble.hideThinking();
              targetBubble.updateContent(responseContent);
              targetBubble.scrollIntoView();
            }

            if (
              data.type === "citation" &&
              data.citation?.retrievedReferences?.length
            ) {
              const refs = data.citation.retrievedReferences;
              const seen = new Set();
              const references = refs
                .map((ref) => {
                  const url = ref.metadata?.url;
                  if (!url || seen.has(url)) return null;
                  seen.add(url);
                  const title = ref.metadata?.title || url;
                  return { url, title };
                })
                .filter(Boolean);
              if (references.length) {
                accumulatedReferences = references;
                targetBubble.appendReferences(references);
                chatHistory.updateLast({
                  content: responseContent,
                  references,
                });
                targetBubble.scrollIntoView();
              }
            }

            if (data.type === "complete") {
              chatHistory.updateLast({
                content: responseContent,
                references: accumulatedReferences,
              });
              if (currentSessionId) {
                targetBubble.showCopyButton();
                targetBubble.scrollIntoView();
              }
              return;
            }
          } catch (parseError) {
            // TODO: Log error somehow somewhere?
            showErrorMessage();
            return;
          }
        }
      }
    }
  } catch (error) {
    // TODO: Log error somehow somewhere?
    showErrorMessage();
    return;
  }
};

const restoreChatHistory = () => {
  const messages = chatHistory.getAll();
  if (messages.length > 0) {
    for (const [
      index,
      { id, content, source, references },
    ] of messages.entries()) {
      const bubble = new ChatBubble({
        id,
        content,
        source,
        isContinuingConversation:
          index > 0 && source === messages[index - 1]?.source,
      });
      ELEMENTS.CHAT_WINDOW_CONTENT.appendChild(bubble.element);
      if (source === "ai" && references?.length) {
        bubble.appendReferences(references);
      }
    }
    ELEMENTS.CHAT_WINDOW_CONTENT.scrollTop =
      ELEMENTS.CHAT_WINDOW_CONTENT.scrollHeight;
  }
};

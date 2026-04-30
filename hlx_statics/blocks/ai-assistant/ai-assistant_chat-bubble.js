// @ts-check
import { createTag } from "../../scripts/lib-adobeio.js";
import { chatHistory } from "./ai-assistant_chat-history.js";
import { createAiAvatar } from "./ai-assistant_chat-ui.js";

export class ChatBubble {
  /**
   * Creates a chat bubble for a single message.
   * @param {Object} options - Constructor options
   * @param {string} options.content - The message content (markdown-supported)
   * @param {'user' | 'ai'} options.source - Who sent the message
   * @param {boolean} [options.isContinuingConversation=false] - True if the previous message was from the same source
   * @param {string} [options.id] - Optional message ID (used for AI messages and copy button)
   * @param {number|null} [options.timestamp] - Optional Unix timestamp in ms; when nullish, no timestamp is shown
   */
  constructor({
    content,
    source,
    isContinuingConversation = false,
    id,
    timestamp,
  }) {
    this.content = content;
    this.source = source;
    this.isContinuingConversation = isContinuingConversation;
    this.id = id;
    this.timestamp = timestamp;
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
      }
    } else if (this.source === "user") {
      bubble.classList.add("chat-bubble-user");
    }

    if (this.isContinuingConversation) {
      bubble.style.marginTop = "12px";
    } else {
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

    if (this.timestamp !== null) {
      const timestampEl = createTag("p", {
        class: `chat-bubble-timestamp chat-bubble-timestamp-${this.source}`,
      });
      timestampEl.textContent = new Date(this.timestamp)
        .toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
        .toLowerCase();
      bubble.appendChild(timestampEl);
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
   * Shows the streaming cursor (call when streaming starts)
   */
  showStreamingCursor() {
    if (this.source === "ai") {
      this.element.classList.add("streaming");
    }
  }

  /**
   * Hides the streaming cursor (call when streaming completes)
   */
  hideStreamingCursor() {
    this.element.classList.remove("streaming");
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

    // Hide the streaming cursor when streaming completes
    this.hideStreamingCursor();

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

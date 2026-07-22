// @ts-check
import { createTag } from "../../scripts/lib-adobeio.js";
import decoratePreformattedCode from "../../components/code.js";
import { ensurePrismLoaded } from "../../scripts/prism-loader.js";
import { aiApiClient } from "./ai-assistant_api-client.js";
import { chatHistory } from "./ai-assistant_chat-history.js";
import { createAiAvatar } from "./ai-assistant_chat-ui.js";
import {
  CHAT_BUBBLE_AI_LABEL,
  CHAT_BUBBLE_USER_LABEL,
} from "./ai-assistant_constants.js";

export class ChatBubble {
  /** Incrementing id so each bubble's speaker label has a unique DOM id for aria-labelledby. */
  static #labelCounter = 0;

  /**
   * Creates a chat bubble for a single message.
   * @param {Object} options - Constructor options
   * @param {string} options.content - The message content (markdown-supported)
   * @param {'user' | 'ai'} options.source - Who sent the message
   * @param {boolean} [options.isContinuingConversation=false] - True if the previous message was from the same source
   * @param {string} [options.id] - Optional message ID (used for AI messages and copy button)
   * @param {string|number|null} [options.timestamp] - Optional Unix timestamp in ms; when nullish, no timestamp is shown
   * @param {import('./ai-assistant_chat-history.js').ChatMessage['feedback']} [options.feedback]
   */
  constructor({
    content,
    source,
    isContinuingConversation = false,
    id,
    timestamp,
    feedback,
  }) {
    this.content = content;
    this.source = source;
    this.isContinuingConversation = isContinuingConversation;
    this.id = id;
    this.timestamp = timestamp;
    this.feedback = feedback;
    this.references = null;
    this._actionsContainer = null;
    this._speakerLabelId = `chat-bubble-speaker-${ChatBubble.#labelCounter++}`;
    /** @type {HTMLElement} */
    this.element = this.#_init();
  }

  /**
   * Creates the DOM element
   */
  #_init() {
    const bubble = createTag("div", {
      class: "chat-bubble",
      role: "article",
      "aria-labelledby": this._speakerLabelId,
    });
    const speakerLabel = createTag("span", {
      class: "chat-bubble-speaker",
      id: this._speakerLabelId,
      "aria-hidden": "true",
    });
    speakerLabel.textContent =
      this.source === "user" ? CHAT_BUBBLE_USER_LABEL : CHAT_BUBBLE_AI_LABEL;
    bubble.appendChild(speakerLabel);

    const contentElement = createTag("div", {
      class: "chat-bubble-content",
    });

    if (this.source === "user") {
      bubble.classList.add("chat-bubble-user");
    }

    if (this.isContinuingConversation) {
      bubble.style.marginTop = "12px";
    }

    this.#_renderContent(contentElement);
    bubble.appendChild(contentElement);

    // Create actions for AI messages
    if (this.source === "ai") {
      this._actionsContainer = createTag("div", {
        class: "chat-bubble-actions",
      });
      this._actionsContainer.append(
        ...this.#_createFeedbackButtons(),
        this.#_createCopyButton(),
      );

      if (this.id) {
        bubble.dataset.messageId = this.id;
        // If we have an ID already (e.g., restored from history), append the actions
        contentElement.appendChild(this._actionsContainer);
        // Restored-history bubbles never call completeBubble(), so decorate here.
        this.#_decorateCodeBlocks(contentElement);
      }
      // Otherwise, the actions will be appended when completeBubble is called
    }

    if (this.timestamp) {
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
   * @returns {HTMLButtonElement} The copy button element
   */
  #_createCopyButton() {
    const COPY_BUTTON_LABEL = "Copy response";
    const COPY_BUTTON_LABEL_COPIED = "Copied to clipboard";
    const COPY_BUTTON_LABEL_FAILED = "Copy failed";
    const COPY_FEEDBACK_REVERT_MS = 2000;
    const COPY_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" focusable="false" aria-hidden="true" role="img" class="chat-bubble-actions-icon"><path fill="currentColor" d="M11.75 18h-7.5C3.01 18 2 16.99 2 15.75v-7.5C2 7.01 3.01 6 4.25 6c.414 0 .75.336.75.75s-.336.75-.75.75c-.413 0-.75.337-.75.75v7.5c0 .413.337.75.75.75h7.5c.413 0 .75-.337.75-.75 0-.414.336-.75.75-.75s.75.336.75.75c0 1.24-1.01 2.25-2.25 2.25M6.75 5C6.336 5 6 4.664 6 4.25 6 3.01 7.01 2 8.25 2c.414 0 .75.336.75.75s-.336.75-.75.75c-.413 0-.75.337-.75.75 0 .414-.336.75-.75.75M13 3.5h-2c-.414 0-.75-.336-.75-.75S10.586 2 11 2h2c.414 0 .75.336.75.75s-.336.75-.75.75"/><path fill="currentColor" d="M13 14h-2c-.414 0-.75-.336-.75-.75s.336-.75.75-.75h2c.414 0 .75.336.75.75s-.336.75-.75.75M15.75 14c-.414 0-.75-.336-.75-.75s.336-.75.75-.75c.413 0 .75-.337.75-.75 0-.414.336-.75.75-.75s.75.336.75.75c0 1.24-1.01 2.25-2.25 2.25M17.25 5c-.414 0-.75-.336-.75-.75 0-.413-.337-.75-.75-.75-.414 0-.75-.336-.75-.75s.336-.75.75-.75C16.99 2 18 3.01 18 4.25c0 .414-.336.75-.75.75M17.25 9.75c-.414 0-.75-.336-.75-.75V7c0-.414.336-.75.75-.75s.75.336.75.75v2c0 .414-.336.75-.75.75M6.75 9.75C6.336 9.75 6 9.414 6 9V7c0-.414.336-.75.75-.75s.75.336.75.75v2c0 .414-.336.75-.75.75M8.25 14C7.01 14 6 12.99 6 11.75c0-.414.336-.75.75-.75s.75.336.75.75c0 .413.337.75.75.75.414 0 .75.336.75.75s-.336.75-.75.75"/></svg>`;
    const CHECK_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" focusable="false" aria-hidden="true" role="img" class="chat-bubble-actions-icon chat-bubble-copy-icon-check"><path fill="currentColor" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>`;

    const button =
      /** @type {HTMLButtonElement & {_copyRevertTimeout?: NodeJS.Timeout | null}} */ (
        createTag("button", {
          class: "chat-bubble-copy",
          type: "button",
          "aria-label": COPY_BUTTON_LABEL,
          "daa-ll": "DevsiteAI Assistant:Message:Button:Copy",
        })
      );
    button.innerHTML = COPY_ICON_SVG;

    button.addEventListener("click", () => {
      const id = this.element.dataset.messageId;
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

  #_createFeedbackButtons() {
    const THUMB_UP_LABEL = "Upvote answer";
    const THUMB_DOWN_LABEL = "Downvote answer";
    const THUMB_UP_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" focusable="false" aria-hidden="true" role="img" class="chat-bubble-actions-icon"><path fill="currentColor" d="M18.53 8.225C18.02 7.458 17.164 7 16.242 7h-3.045c-.387 0-.715-.303-.747-.688l-.2-2.38c.002-.052-.002-.138-.01-.189-.112-.653-.373-2.183-2.175-2.183-1.482 0-1.79 1.669-2.087 3.284C7.638 6.69 7.32 7.997 6.318 8H4.25C3.01 8 2 9.01 2 10.25v5.5C2 16.99 3.01 18 4.25 18h7.5q.052 0 .1-.007h1.44c1.52 0 2.877-.908 3.46-2.31l2.03-4.876c.355-.851.261-1.816-.25-2.582M3.5 15.75v-5.5c0-.413.336-.75.75-.75h1v7h-1c-.414 0-.75-.337-.75-.75m13.896-5.52-2.03 4.877c-.35.841-1.165 1.385-2.076 1.386h-1.54q-.052 0-.1.007h-4.9V9.467c1.956-.3 2.385-2.624 2.704-4.352.122-.667.351-1.909.611-2.055.36 0 .53 0 .686.877l.001.042.203 2.456c.095 1.158 1.08 2.065 2.242 2.065h3.045c.425 0 .804.203 1.04.557s.278.78.114 1.173"></path></svg>`;
    const THUMB_DOWN_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" focusable="false" aria-hidden="true" role="img" class="chat-bubble-actions-icon"><path fill="currentColor" d="m18.78 9.194-2.03-4.877C16.165 2.911 14.807 2.001 13.29 2H4.25C3.01 2 2 3.01 2 4.251v5.5c0 1.24 1.01 2.25 2.25 2.25h2.066c.99.003 1.286 1.246 1.624 3.144.281 1.573.6 3.355 2.125 3.355 1.85 0 2.063-1.47 2.18-2.275l.205-2.536c.032-.385.36-.688.747-.688h3.045c.922 0 1.777-.458 2.288-1.225s.605-1.731.25-2.582M3.5 9.751v-5.5c0-.414.336-.751.75-.751h1v7.001h-1c-.414 0-.75-.337-.75-.75m13.782 1.193c-.236.354-.615.557-1.04.557h-3.045c-1.162 0-2.147.907-2.242 2.066 0 0-.195 2.414-.197 2.457-.141.976-.26.962-.714.974-.268-.106-.51-1.464-.627-2.117-.308-1.725-.723-4.044-2.667-4.346V3.5h6.54c.909.001 1.724.548 2.076 1.394l2.03 4.877c.164.392.122.82-.114 1.173"></path></svg>`;

    const thumbUpButton = /** @type {HTMLButtonElement} */ (
      createTag("button", {
        class: "chat-bubble-feedback",
        type: "button",
        "aria-label": THUMB_UP_LABEL,
        "daa-ll": "DevsiteAI Assistant:Message:Button:Upvote",
      })
    );
    thumbUpButton.innerHTML = THUMB_UP_ICON_SVG;
    thumbUpButton.addEventListener("click", (e) =>
      this.#_feedbackButtonClickListener(e, 1),
    );

    const thumbDownButton = /** @type {HTMLButtonElement} */ (
      createTag("button", {
        class: "chat-bubble-feedback",
        type: "button",
        "aria-label": THUMB_DOWN_LABEL,
        "daa-ll": "DevsiteAI Assistant:Message:Button:Downvote",
      })
    );
    thumbDownButton.innerHTML = THUMB_DOWN_ICON_SVG;
    thumbDownButton.addEventListener("click", (e) =>
      this.#_feedbackButtonClickListener(e, 0),
    );

    if (this.feedback) {
      const selectedButton =
        this.feedback.score === 1 ? thumbUpButton : thumbDownButton;
      selectedButton.dataset.selected = "true";
    }

    return [thumbUpButton, thumbDownButton];
  }

  /**
   * @param {PointerEvent} event
   * @param {0|1} score
   */
  async #_feedbackButtonClickListener(event, score) {
    const requestId = this.id;
    const button = /** @type {HTMLButtonElement} */ (event.target);

    if (!requestId) return;
    // don't unselect on click
    if (button.dataset.selected === "true") return;

    const success = await aiApiClient.submitFeedback({
      score,
      requestId,
    });

    if (success) {
      this._actionsContainer
        ?.querySelectorAll("button.chat-bubble-feedback")
        .forEach((button) => {
          button.removeAttribute("data-selected");
        });
      button.dataset.selected = "true";
      chatHistory.updateById(requestId, {
        feedback: { type: "THUMBS_UP_DOWN", score },
      });
    }
  }

  /**
   * Renders this.content into a content element via marked + DOMPurify.
   * @param {Element} contentElement
   */
  #_renderContent(contentElement) {
    // @ts-expect-error - DOMPurify is not on the Window object
    contentElement.innerHTML = window.DOMPurify.sanitize(
      // @ts-expect-error - marked is not on the Window object
      window.marked.parse(this.content),
    );
  }

  /**
   * Updates the content of the chat bubble
   * @param {string} content
   */
  updateContent(content) {
    this.content = content;
    const contentElement = this.element.querySelector(".chat-bubble-content");
    if (contentElement) {
      this.#_renderContent(contentElement);
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
  }

  /**
   * Final processing that needs to be done after streaming finishes.
   */
  completeBubble() {
    if (this.source !== "ai" || !this._actionsContainer) return;

    this.hideStreamingCursor();

    const contentElement = this.element.querySelector(".chat-bubble-content");
    contentElement?.appendChild(this._actionsContainer);
    if (contentElement) {
      this.#_decorateCodeBlocks(contentElement);
    }
  }

  /**
   * @param {Element} contentElement - The `.chat-bubble-content` element
   */
  #_decorateCodeBlocks(contentElement) {
    const preBlocks = contentElement.querySelectorAll("pre");
    if (!preBlocks.length) return;

    let decoratedAny = false;
    preBlocks.forEach((pre) => {
      // decoratePreformattedCode dereferences a <code> child unconditionally.
      if (!pre.querySelector("code")) return;
      // The chat panel is narrow, so use the icon-only copy button.
      pre.classList.add("copy-condensed");
      decoratePreformattedCode(pre);
      decoratedAny = true;
    });

    if (!decoratedAny) return;

    ensurePrismLoaded().then(() => {
      // @ts-expect-error - Prism is not on the Window type
      window.Prism?.highlightAllUnder?.(contentElement);
    });
  }

  /**
   * Recomputes Prism's line-number row heights for every decorated code block
   * inside a container.
   * This is required to correctly align line numbers after restoring history.
   * @param {Element | null | undefined} container
   */
  static resizeCodeBlockLineNumbers(container) {
    const preBlocks = container?.querySelectorAll("pre.line-numbers");
    if (!preBlocks?.length) return;

    ensurePrismLoaded().then(() => {
      // @ts-expect-error - Prism is not on the Window type
      const resize = window.Prism?.plugins?.lineNumbers?.resize;
      if (typeof resize !== "function") return;
      preBlocks.forEach((pre) => {
        resize(pre);
      });
    });
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

    const wrapper = createTag("div", {
      class: "chat-bubble-sources",
    });
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
      a.setAttribute(
        "daa-ll",
        `DevsiteAI Assistant:Message:Sources:Link`,
      );
      li.appendChild(a);
      list.appendChild(li);
    });
    wrapper.appendChild(list);
    this.element.appendChild(wrapper);
  }
}

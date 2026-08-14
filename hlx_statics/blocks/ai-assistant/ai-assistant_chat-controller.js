// @ts-check
import { aiApiClient } from "./ai-assistant_api-client.js";
import { ChatBubble } from "./ai-assistant_chat-bubble.js";
import { chatHistory } from "./ai-assistant_chat-history.js";
import {
  CHAT_BUBBLE_AI_LABEL,
  CHAT_BUBBLE_USER_LABEL,
  CHAT_BUTTON_LABEL_MINIMIZE,
  CHAT_BUTTON_LABEL_OPEN,
  ELEMENTS,
  GENERIC_ERROR_MESSAGE,
  INITIAL_SUGGESTED_QUESTIONS,
  SEND_ICON_SRC,
  STOP_ICON_SRC,
} from "./ai-assistant_constants.js";
import {
  hideSuggestedQuestions,
  showSuggestedQuestions,
  updateSuggestedQuestions,
} from "./ai-assistant_suggested-questions.js";
import { announce, setResponding } from "./ai-assistant_announcer.js";

let userScrolledUp = false;
let lastScrollTop = 0;
let isResponding = false;

/** @param {KeyboardEvent} e */
const escapeKeyHandler = (e) => {
  if (e.key === 'Escape') minimizeChatWindow();
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Returns the currently visible, focusable descendants of a container, in DOM order.
 * @param {HTMLElement} container
 * @returns {HTMLElement[]}
 */
export const getFocusableElements = (container) =>
  Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (/** @type {HTMLElement} */ el) => el.offsetParent !== null,
  );

/**
 * Wraps Tab/Shift-Tab at the boundaries of a container's focusable elements,
 * so focus cycles within it instead of escaping. Call this from a keydown
 * listener scoped to whatever should currently own the tab order (the chat
 * window, or an overlay like the clear-confirmation dialog).
 * @param {KeyboardEvent} e
 * @param {HTMLElement} container
 */
export const trapTabFocus = (e, container) => {
  if (e.key !== 'Tab') return;

  const focusable = getFocusableElements(container);
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
};

/** @param {KeyboardEvent} e */
const trapFocusHandler = (e) => {
  if (!ELEMENTS.CHAT_WINDOW) return;
  trapTabFocus(e, /** @type {HTMLElement} */ (ELEMENTS.CHAT_WINDOW));
};

/**
 * Handles scroll events in the chat window to detect when the user scrolls up or back to the bottom.
 * Sets/resets a flag to pause or resume auto-scrolling during streaming.
 * Uses scroll direction rather than absolute position so programmatic downward scrolls
 * during streaming don't mask the user's upward intent.
 *
 * @param {Event} event - The scroll event from the chat container element
 */
export const onUserScroll = (event) => {
  if (event.type !== "scroll" || !event.target) {
    return;
  }
  const container = /** @type {HTMLDivElement} */ (event.target);
  const distanceFromBottom =
    container.scrollHeight - container.clientHeight - container.scrollTop;
  const scrolledUp = container.scrollTop < lastScrollTop;
  lastScrollTop = container.scrollTop;

  if (userScrolledUp && distanceFromBottom < 10) {
    userScrolledUp = false;
  } else if (!userScrolledUp && scrolledUp && distanceFromBottom > 100) {
    userScrolledUp = true;
  }
};

/**
 * Scrolls the chat content area to the bottom.
 * @param {Object} [options]
 * @param {boolean} [options.force=false] - Scroll even if the user has scrolled up
 */
const scrollToBottom = ({ force = false } = {}) => {
  if (!ELEMENTS.CHAT_WINDOW_CONTENT) {
    return;
  }

  if (force || !userScrolledUp) {
    ELEMENTS.CHAT_WINDOW_CONTENT.scrollTop =
      ELEMENTS.CHAT_WINDOW_CONTENT.scrollHeight;
  }
};

/**
 * @param {Partial<{delay: number}>} [options]
 */
const sendInitialMessages = ({ delay = 250 } = {}) => {
  hideSuggestedQuestions();
  updateSuggestedQuestions(INITIAL_SUGGESTED_QUESTIONS);
  window.setTimeout(() => {
    sendMessage({
      content: "Hello, welcome to Adobe Developer Website!",
      source: "ai",
      timestamp: null,
    });
  }, delay);
  window.setTimeout(() => {
    sendMessage({
      content: "What would you like to know today?",
      source: "ai",
      isContinuingConversation: true,
    });
  }, delay * 2);
  window.setTimeout(showSuggestedQuestions, delay * 3);
};

export const openChatWindow = () => {
  if (
    !ELEMENTS.CHAT_BUTTON ||
    !ELEMENTS.CHAT_WINDOW ||
    !ELEMENTS.CHAT_TEXTAREA
  ) {
    return;
  }

  ELEMENTS.CHAT_BUTTON.setAttribute("aria-expanded", "true");
  ELEMENTS.CHAT_BUTTON.ariaLabel = CHAT_BUTTON_LABEL_MINIMIZE;
  ELEMENTS.CHAT_WINDOW.classList.add("show");
  ELEMENTS.CHAT_BUTTON.classList.add("hidden");
  ELEMENTS.CHAT_BUTTON_BADGE?.classList.add("hidden");

  // Code blocks in restored-history bubbles are decorated while the window is
  // hidden (scaled to 0), so Prism's line-number rows collapse onto line 1.
  // Recompute them once the open transition settles and the window has real
  // layout. transitionend is the precise signal; the timeout is a fallback in
  // case the transition is skipped (e.g. reduced motion / 0s duration).
  const chatWindow = ELEMENTS.CHAT_WINDOW;
  let fixedLineNumbers = false;
  const fixLineNumbers = (event) => {
    // transitionend bubbles, so ignore descendant transitions and only react to
    // the window's own transform settling (or the timeout, which has no event).
    if (event && (event.target !== chatWindow || event.propertyName !== "transform")) return;
    if (fixedLineNumbers) return;
    fixedLineNumbers = true;
    chatWindow.removeEventListener("transitionend", fixLineNumbers);
    ChatBubble.resizeCodeBlockLineNumbers(ELEMENTS.CHAT_WINDOW_CONTENT);
  };
  chatWindow.addEventListener("transitionend", fixLineNumbers);
  window.setTimeout(fixLineNumbers, 400);

  // Initial messages
  if (chatHistory.isEmpty()) {
    sendInitialMessages();
  }

  ELEMENTS.CHAT_WINDOW?.parentElement?.addEventListener('keydown', escapeKeyHandler);
  ELEMENTS.CHAT_WINDOW?.parentElement?.addEventListener('keydown', trapFocusHandler);

  ELEMENTS.CHAT_TEXTAREA.focus();
};

export const minimizeChatWindow = () => {
  ELEMENTS.CHAT_BUTTON?.setAttribute("aria-expanded", "false");
  // @ts-expect-error - CHAT_BUTTON has to be defined for us to get this far
  ELEMENTS.CHAT_BUTTON.ariaLabel = CHAT_BUTTON_LABEL_OPEN;
  ELEMENTS.CHAT_BUTTON?.classList.remove("hidden");
  ELEMENTS.CHAT_WINDOW?.classList.remove("show");

  ELEMENTS.CHAT_WINDOW?.parentElement?.removeEventListener('keydown', escapeKeyHandler);
  ELEMENTS.CHAT_WINDOW?.parentElement?.removeEventListener('keydown', trapFocusHandler);

  focusChatButtonAfterClose();
  restoreBadgeAfterClose();
};

/**
 * Focuses the chat button once its visibility transition delay clears after close.
 */
const focusChatButtonAfterClose = () => {
  const chatWindow = ELEMENTS.CHAT_WINDOW;
  const btn = /** @type {HTMLElement | null} */ (ELEMENTS.CHAT_BUTTON);
  if (!chatWindow || !btn) return;

  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if (prefersReducedMotion) {
    btn.focus();
    return;
  }

  /** @param {TransitionEvent} event */
  const onTransitionEnd = (event) => {
    if (event.target !== chatWindow || event.propertyName !== 'transform') return;
    chatWindow.removeEventListener('transitionend', onTransitionEnd);
    if (!chatWindow.classList.contains('show')) {
      btn.focus();
    }
  };
  chatWindow.addEventListener('transitionend', onTransitionEnd);
};

/**
 * Restores the beta badge after the chat window's collapse (transform) transition
 * completes.
 */
const restoreBadgeAfterClose = () => {
  const chatWindow = ELEMENTS.CHAT_WINDOW;
  if (!chatWindow) return;

  // With reduced motion the window collapses instantly (no transform transition),
  // so `transitionend` may never fire — restore the badge right away instead.
  const prefersReducedMotion = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  )?.matches;
  if (prefersReducedMotion) {
    if (!chatWindow.classList.contains("show")) {
      ELEMENTS.CHAT_BUTTON_BADGE?.classList.remove("hidden");
    }
    return;
  }

  /** @param {TransitionEvent} event */
  const onTransitionEnd = (event) => {
    // The window animates both `transform` and `visibility`; only react to the
    // transform transition, which is the visible collapse.
    if (event.target !== chatWindow || event.propertyName !== "transform") {
      return;
    }
    chatWindow.removeEventListener("transitionend", onTransitionEnd);
    if (!chatWindow.classList.contains("show")) {
      ELEMENTS.CHAT_BUTTON_BADGE?.classList.remove("hidden");
    }
  };

  chatWindow.addEventListener("transitionend", onTransitionEnd);
};

export const clearConversation = () => {
  chatHistory.clear();
  hideSuggestedQuestions();
  ELEMENTS.CHAT_WINDOW_CONTENT?.replaceChildren(
    ELEMENTS.CHAT_SUGGESTED_QUESTIONS ?? "",
  );
  sendInitialMessages({ delay: 0 });
};

export const toggleChatWindow = () => {
  if (!ELEMENTS.CHAT_WINDOW) return;

  if (ELEMENTS.CHAT_WINDOW.classList.contains("show")) {
    minimizeChatWindow();
  } else {
    openChatWindow();
  }
};

const showStopButton = () => {
  const btn = /** @type {HTMLButtonElement} */ (ELEMENTS.CHAT_SEND_BUTTON);
  const btnImage = btn.querySelector("img");
  const btnSpan = btn.querySelector("span");
  if (btnImage) {
    btnImage.src = STOP_ICON_SRC;
  }
  if (btnSpan) {
    btnSpan.textContent = "Stop response";
  }
  btn.classList.add("stop-mode");
  btn.setAttribute("aria-label", "Stop response");
  btn.disabled = false;
};

const hideStopButton = () => {
  const btn = /** @type {HTMLButtonElement} */ (ELEMENTS.CHAT_SEND_BUTTON);
  const btnImage = btn.querySelector("img");
  const btnSpan = btn.querySelector("span");
  if (btnImage) {
    btnImage.src = SEND_ICON_SRC;
  }
  if (btnSpan) {
    btnSpan.textContent = "";
  }
  btn.classList.remove("stop-mode");
  btn.setAttribute("aria-label", "Send message");
  btn.disabled =
    /** @type {HTMLTextAreaElement} */ (ELEMENTS.CHAT_TEXTAREA).value.trim() ===
    "";
};

/**
 * Gets the user's query, sends it to the AI, and displays the response.
 * @param {string} [messageContentOverride] - Optional message content; when provided, used instead of the textarea value
 * @param {string|null} [collectionId]
 */
export const handleUserQuery = async (
  messageContentOverride,
  collectionId = null,
) => {
  if (isResponding) return;

  userScrolledUp = false;
  lastScrollTop = 0;
  let messageContent = messageContentOverride;
  const textarea = /** @type {HTMLTextAreaElement} */ (ELEMENTS.CHAT_TEXTAREA);

  if (!messageContentOverride) {
    messageContent = textarea.value.trim();
    textarea.value = "";
    textarea.dispatchEvent(new Event("input"));
  }

  if (!messageContent) {
    return;
  }

  isResponding = true;

  hideSuggestedQuestions();

  // Clicking a suggested-question button then hides that button, which would
  // otherwise drop focus to the document body (the main browser window). Move
  // focus back into the chat window's input so keyboard/screen-reader users stay
  // oriented and can immediately type a follow-up. This mirrors where focus
  // already sits after a typed submission.
  textarea.focus();

  sendMessage({ content: messageContent, source: "user" });
  // a11y: confirm the message that was just sent. This matters most for
  // suggested-question clicks, where the sent text differs from the button's
  // short label and the user never typed it themselves.
  announce(`${CHAT_BUBBLE_USER_LABEL}: ${messageContent}`);

  const targetBubble = sendMessage({ content: "Thinking", source: "ai" });
  targetBubble.showThinking();
  // a11y: announce the "responding" state while thinking/streaming is active,
  setResponding(true);

  const showErrorMessage = (message = GENERIC_ERROR_MESSAGE) => {
    setResponding(false);
    targetBubble.hideThinking();
    targetBubble.hideStreamingCursor();
    targetBubble.updateContent(message, { alert: true });
    return;
  };

  let responseContent = "";
  /** @type {import('./ai-assistant_chat-history.js').ChatReference[]} */
  let accumulatedReferences = [];
  // The backend marks the answer done with an `answerComplete` event and sends
  // follow-ups in a later `followupQuestions` event; 
  // These flags let `onComplete` act as a safety net
  // when the stream is aborted so we always
  // finalize the bubble and show some suggestions.
  let answerFinalized = false;
  let followupsReceived = false;

  const showFallbackSuggestions = () => {
    updateSuggestedQuestions(INITIAL_SUGGESTED_QUESTIONS);
    showSuggestedQuestions({ shouldScrollIntoView: !userScrolledUp });
  };

  // Marks the bubble complete: reveals the feedback/copy buttons, decorates code
  // blocks and persists the final content.
  const finalizeAnswer = () => {
    if (answerFinalized) return;
    answerFinalized = true;
    targetBubble.hideThinking();
    targetBubble.completeBubble();
    chatHistory.updateLast({
      content: responseContent,
      references: accumulatedReferences,
    });
    scrollToBottom();
  };

  // Ends the visible "responding" state: reverts the stop button to send,
  // clears the a11y busy indicator and announces the finished reply.
  let respondingEnded = false;
  const endResponding = () => {
    if (respondingEnded) return;
    respondingEnded = true;
    hideStopButton();
    setResponding(false);
    // a11y: announce the completed reply once, as plain text.
    announce(`${CHAT_BUBBLE_AI_LABEL}: ${targetBubble.getPlainText()}`);
  };

  showStopButton();

  await aiApiClient.query({
    query: messageContent,
    collectionId,
    sessionId: chatHistory.getSessionId(),
    callbacks: {
      onMetadata: (data) => {
        // Persist the session id so the next request continues the same Bedrock session.
        if (data.sessionId) {
          chatHistory.setSessionId(data.sessionId);
        }
        if (data.requestId) {
          chatHistory.updateLast({ id: data.requestId });
          targetBubble.setMessageId(data.requestId);
        }
      },
      onContent: (data) => {
        if (data.text) {
          responseContent += data.text;
          targetBubble.hideThinking();
          targetBubble.showStreamingCursor();
          targetBubble.updateContent(responseContent);
          scrollToBottom();
        }
      },
      onCitation: (data) => {
        if (data.citation?.retrievedReferences?.length) {
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
            .filter((r) => !!r);
          if (references?.length) {
            accumulatedReferences = references;
            targetBubble.appendReferences(references);
            chatHistory.updateLast({
              content: responseContent,
              references,
            });
            scrollToBottom();
          }
        }
      },
      // Fired once the answer text is complete, before the follow-up questions.
      onAnswerComplete: () => {
        finalizeAnswer();
        endResponding();
        updateSuggestedQuestions(null);
        showSuggestedQuestions({ shouldScrollIntoView: !userScrolledUp });
      },
      // Fired with the backend-generated follow-up questions.
      onFollowupQuestions: (data) => {
        followupsReceived = true;
        const questions = (data.followupQuestions ?? [])
          .map(({ label, text }) => ({ label, question: text }))
          .filter(({ label, question }) => label && question);
        updateSuggestedQuestions(
          questions.length > 0 ? questions : INITIAL_SUGGESTED_QUESTIONS,
        );
      },
      // This covers aborted/partial streams where onAnswerComplete
      // event never fired, and always reveals the suggestions.
      onComplete: () => {
        if (!responseContent) {
          targetBubble.hideThinking();
          targetBubble.hideStreamingCursor();
          responseContent = "_Response stopped by user._";
          targetBubble.updateContent(responseContent);
          endResponding();
          showFallbackSuggestions();
          return;
        }
        finalizeAnswer();
        endResponding();
        if (!followupsReceived) {
          showFallbackSuggestions();
        } else {
          showSuggestedQuestions({ shouldScrollIntoView: !userScrolledUp });
        }
      },
      onError: (error) => {
        hideStopButton();
        // TODO: Log error somehow somewhere?
        console.error("[AI Assistant] Error:", error);
        showErrorMessage();
        showFallbackSuggestions();
      },
    },
  }).finally(() => {
    isResponding = false;
  });
};

/**
 * @typedef {Object} SendMessageOptions
 * @property {boolean} [isContinuingConversation=false] - Set to `true` if the previous message was from the same source
 * @property {boolean} [shouldAppendToHistory=true] - Set to `false` when restoring history to avoid duplicating entries
 *
 * Sends a message to the content area and scrolls to the bottom. Also adds the message to the chat history.
 * @param {import('./ai-assistant_chat-history.js').ChatMessage & SendMessageOptions} options - The options for the message
 */
const sendMessage = ({
  id,
  content,
  source,
  isContinuingConversation = false,
  shouldAppendToHistory = true,
  timestamp = Date.now(),
  feedback,
}) => {
  const bubble = new ChatBubble({
    id,
    content,
    source,
    isContinuingConversation,
    timestamp,
    feedback,
  });

  if (shouldAppendToHistory) {
    chatHistory.add({
      id,
      content,
      source,
      timestamp,
    });
  }

  const contentContainer = ELEMENTS.CHAT_WINDOW_CONTENT;
  const insertBefore = ELEMENTS.CHAT_SUGGESTED_QUESTIONS;

  if (contentContainer) {
    // Basically we have to insert the new messages before the suggestion question section
    // but since this is used for initial messages and history restoration we need to check if the section exists
    if (insertBefore) {
      contentContainer.insertBefore(bubble.element, insertBefore);
    } else {
      contentContainer.appendChild(bubble.element);
    }
    scrollToBottom({ force: true });
  }

  return bubble;
};

export const restoreChatHistory = async () => {
  const messages = chatHistory.getAll();
  if (messages.length > 0) {
    for (const [
      index,
      { id, content, source, references, timestamp, feedback },
    ] of messages.entries()) {
      const isLastOfGroup =
        index === messages.length - 1 || messages[index + 1]?.source !== source;
      const bubble = sendMessage({
        id,
        content,
        source,
        timestamp: isLastOfGroup ? timestamp : null,
        isContinuingConversation:
          index > 0 && source === messages[index - 1]?.source,
        shouldAppendToHistory: false,
        feedback,
      });
      if (references?.length) {
        bubble.appendReferences(references);
      }
    }
    scrollToBottom({ force: true });
  }
  const lastMessage = chatHistory.getAll().pop();
  if (lastMessage?.source === "ai") {
    updateSuggestedQuestions(
      chatHistory.getSuggestedQuestions() ?? INITIAL_SUGGESTED_QUESTIONS,
    );
    showSuggestedQuestions();
  } else {
    hideSuggestedQuestions();
  }
};

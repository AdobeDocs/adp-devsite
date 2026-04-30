// @ts-check
import { aiApiClient } from "./ai-assistant_api-client.js";
import { ChatBubble } from "./ai-assistant_chat-bubble.js";
import { chatHistory } from "./ai-assistant_chat-history.js";
import {
  CHAT_BUTTON_LABEL_MINIMIZE,
  CHAT_BUTTON_LABEL_OPEN,
  ELEMENTS,
  GENERIC_ERROR_MESSAGE,
  SEND_ICON_SRC,
  STOP_ICON_SRC,
} from "./ai-assistant_constants.js";
import {
  getCollectionsQuestions,
  hideSuggestedQuestions,
  parseAiSuggestedQuestions,
  showSuggestedQuestions,
  updateSuggestedQuestions,
} from "./ai-assistant_suggested-questions.js";

export const openChatWindow = () => {
  ELEMENTS.CHAT_BUTTON.setAttribute("aria-expanded", "true");
  ELEMENTS.CHAT_BUTTON.ariaLabel = CHAT_BUTTON_LABEL_MINIMIZE;
  ELEMENTS.CHAT_WINDOW.classList.add("show");
  ELEMENTS.CHAT_BUTTON.classList.add("hidden");

  // Initial messages
  if (chatHistory.isEmpty()) {
    hideSuggestedQuestions();
    window.setTimeout(() => {
      sendMessage({
        content: "Hello, welcome to Adobe Developer Website!",
        source: "ai",
        timestamp: null,
      });
    }, 250);
    window.setTimeout(() => {
      sendMessage({
        content: "What would you like to know today?",
        source: "ai",
        isContinuingConversation: true,
      });
    }, 500);
    window.setTimeout(showSuggestedQuestions, 750);
  }

  ELEMENTS.CHAT_TEXTAREA.focus();
};

export const minimizeChatWindow = () => {
  ELEMENTS.CHAT_BUTTON.setAttribute("aria-expanded", "false");
  ELEMENTS.CHAT_BUTTON.ariaLabel = CHAT_BUTTON_LABEL_OPEN;
  ELEMENTS.CHAT_BUTTON.classList.remove("hidden");
  ELEMENTS.CHAT_WINDOW.classList.remove("show");
};

export const closeChatWindow = () => {
  minimizeChatWindow();
  chatHistory.clear();
  ELEMENTS.CHAT_WINDOW_CONTENT.addEventListener(
    "transitionend",
    () => {
      ELEMENTS.CHAT_WINDOW_CONTENT.replaceChildren(
        ELEMENTS.CHAT_SUGGESTED_QUESTIONS,
      );
    },
    { once: true },
  );
};

export const toggleChatWindow = () => {
  if (!ELEMENTS.CHAT_WINDOW) return;

  if (ELEMENTS.CHAT_WINDOW.classList.contains("show")) {
    minimizeChatWindow();
  } else {
    openChatWindow();
  }
};

/**
 * Fetches AI-generated follow-up questions and updates the suggestions panel.
 * Falls back to static questions on any error or parse failure.
 */
export const fetchAiSuggestedQuestions = async () => {
  const query = `Please suggest 2 follow-up questions based on our conversation to make the users.`;
  const systemPrompt = `
  Structured questions format:
    ---question---
    label: <short summary describing the question>
    text: <full question to send to the AI>
    ---question---
  This will make the users happy and keep the conversation going and we want our users to be happy!`;

  const context = chatHistory.getContextForAI({ excludeLast: 0 });
  try {
    const rawResponse = await aiApiClient.collectResponse({
      query,
      systemPrompt,
      context,
    });
    const parsed = parseAiSuggestedQuestions(rawResponse);
    if (parsed.length > 0) {
      updateSuggestedQuestions(parsed);
    } else {
      updateSuggestedQuestions(await getCollectionsQuestions());
    }
  } catch (error) {
    console.warn(
      "[AI Assistant] Failed to fetch AI suggested questions:",
      error,
    );
    updateSuggestedQuestions(await getCollectionsQuestions());
  }
};

const showStopButton = () => {
  const btn = ELEMENTS.CHAT_SEND_BUTTON;
  btn.querySelector("img").src = STOP_ICON_SRC;
  btn.querySelector("span").textContent = "Stop response";
  btn.classList.add("stop-mode");
  btn.setAttribute("aria-label", "Stop response");
  btn.disabled = false;
};

const hideStopButton = () => {
  const btn = ELEMENTS.CHAT_SEND_BUTTON;
  btn.querySelector("img").src = SEND_ICON_SRC;
  btn.querySelector("span").textContent = "";
  btn.classList.remove("stop-mode");
  btn.setAttribute("aria-label", "Send message");
  btn.disabled = ELEMENTS.CHAT_TEXTAREA.value.trim() === "";
};

/**
 * Gets the user's query, sends it to the AI, and displays the response.
 * @param {string} [messageContentOverride] - Optional message content; when provided, used instead of the textarea value
 */
export const handleUserQuery = async (
  messageContentOverride,
  collectionId = null,
) => {
  let messageContent = messageContentOverride;

  if (!messageContentOverride) {
    messageContent = ELEMENTS.CHAT_TEXTAREA.value.trim();
    ELEMENTS.CHAT_TEXTAREA.value = "";
    ELEMENTS.CHAT_TEXTAREA.dispatchEvent(new Event("input"));
  }

  if (!messageContent) {
    return;
  }

  hideSuggestedQuestions();

  const suggestedQuestionsDelayMs = 600;

  sendMessage({ content: messageContent, source: "user" });

  const targetBubble = sendMessage({ content: "Thinking", source: "ai" });
  targetBubble.showThinking();

  const showErrorMessage = (message = GENERIC_ERROR_MESSAGE) => {
    targetBubble.hideThinking();
    targetBubble.hideStreamingCursor();
    targetBubble.updateContent(message);
    return;
  };

  // TODO: We'll have to decide how much context to send to the AI.
  // -2 because we want to exclude the current user message and the thinking message
  const queryContext = chatHistory.getContextForAI({ excludeLast: 2 });

  let responseContent = "";
  let accumulatedReferences = [];

  showStopButton();

  await aiApiClient.query({
    query: messageContent,
    context: queryContext,
    collectionId,
    callbacks: {
      onMetadata: (data) => {
        if (data.sessionId) {
          chatHistory.updateLast({ id: data.sessionId });
          targetBubble.setMessageId(data.sessionId);
        }
      },
      onContent: (data) => {
        if (data.text) {
          responseContent += data.text;
          targetBubble.hideThinking();
          targetBubble.showStreamingCursor();
          targetBubble.updateContent(responseContent);
          targetBubble.scrollIntoView();
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
      },
      onComplete: async () => {
        hideStopButton();
        if (!responseContent) {
          targetBubble.hideThinking();
          responseContent = "_Response stopped by user._";
          targetBubble.updateContent(responseContent);
          updateSuggestedQuestions(await getCollectionsQuestions());
          window.setTimeout(showSuggestedQuestions, suggestedQuestionsDelayMs);
          return;
        }
        targetBubble.hideStreamingCursor();
        targetBubble.showCopyButton();
        chatHistory.updateLast({
          content: responseContent,
          references: accumulatedReferences,
        });
        targetBubble.scrollIntoView();

        updateSuggestedQuestions(null);
        window.setTimeout(showSuggestedQuestions, suggestedQuestionsDelayMs);
        await fetchAiSuggestedQuestions();
      },
      onError: (error) => {
        hideStopButton();
        // TODO: Log error somehow somewhere?
        console.error("[AI Assistant] Error:", error);
        showErrorMessage();
        getCollectionsQuestions().then(updateSuggestedQuestions);
        window.setTimeout(showSuggestedQuestions, suggestedQuestionsDelayMs);
      },
    },
  });
};

/**
 * Sends a message to the content area and scrolls to the bottom. Also adds the message to the chat history.
 * @param {Object} options - The options for the message
 * @param {string} [options.id] - The ID of the message (used for AI messages)
 * @param {string} options.content - The content of the message
 * @param {'user' | 'ai'} options.source - Who sent the message
 * @param {boolean} [options.isContinuingConversation=false] - Set to `true` if the previous message was from the same source
 * @param {boolean} [options.shouldAppendToHistory=true] - Set to `false` when restoring history to avoid duplicating entries
 * @param {number|null} [options.timestamp=Date.now()] - Unix timestamp in ms; when nullish, no timestamp is shown
 */
const sendMessage = ({
  id,
  content,
  source,
  isContinuingConversation = false,
  shouldAppendToHistory = true,
  timestamp = Date.now(),
}) => {
  const bubble = new ChatBubble({
    id,
    content,
    source,
    isContinuingConversation,
    timestamp,
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

  // Basically we have to insert the new messages before the suggestion question section
  // but since this is used for initial messages and history restoration we need to check if the section exists
  if (insertBefore) {
    contentContainer.insertBefore(bubble.element, insertBefore);
  } else {
    contentContainer.appendChild(bubble.element);
  }
  contentContainer.scrollTop = contentContainer.scrollHeight;

  return bubble;
};

export const restoreChatHistory = async () => {
  const messages = chatHistory.getAll();
  if (messages.length > 0) {
    for (const [
      index,
      { id, content, source, references, timestamp },
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
      });
      if (references?.length) {
        bubble.appendReferences(references);
      }
    }
    ELEMENTS.CHAT_WINDOW_CONTENT.scrollTop =
      ELEMENTS.CHAT_WINDOW_CONTENT.scrollHeight;
  }
  const lastMessage = chatHistory.getAll().pop();
  if (lastMessage?.source === "ai") {
    updateSuggestedQuestions(await getCollectionsQuestions());
    showSuggestedQuestions();
  } else {
    hideSuggestedQuestions();
  }
};

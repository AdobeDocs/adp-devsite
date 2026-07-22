// @ts-check
export const CHAT_BUTTON_LABEL_OPEN = "Open AI Assistant";
export const CHAT_BUTTON_LABEL_CLOSE = "Close AI Assistant";
export const CHAT_BUTTON_LABEL_MINIMIZE = "Minimize AI Assistant";
export const CHAT_BUTTON_LABEL_CLEAR = "Clear AI Assistant";
export const CHAT_SKIP_BUTTON_LABEL = "Skip to AI Assistant";
export const CHAT_BUTTON_ID = "ai-assistant-chat-button";
export const CHAT_WINDOW_ID = "ai-assistant-chat-window";
export const CHAT_WINDOW_LABEL_ID = "ai-assistant-label";
export const CHAT_BUBBLE_USER_LABEL = "Your message";
export const CHAT_BUBBLE_AI_LABEL = "Assistant";
/**
 * @type {Record<string, HTMLElement | null>}
 */
export const ELEMENTS = {
  CHAT_BUTTON: null,
  CHAT_BUTTON_BADGE: null,
  CHAT_WINDOW_CLOSE_BUTTON: null,
  CHAT_WINDOW_CLEAR_BUTTON: null,
  CHAT_SEND_BUTTON: null,
  CHAT_TEXTAREA: null,
  CHAT_WINDOW: null,
  CHAT_WINDOW_CONTENT: null,
  CHAT_SUGGESTED_QUESTIONS: null,
};
/**
 * @type {Array<{id?: string | null; label: string; question: string;}>}
 */
export const INITIAL_SUGGESTED_QUESTIONS = [
  {
    label: "What Adobe APIs and SDKs are available",
    question: "What Adobe APIs and SDKs are available",
  },
  {
    label: "How do I get credentials",
    question: "How do I get credentials",
  },
  {
    label: "What is Adobe Developer App Builder",
    question: "What is Adobe Developer App Builder",
  },
  {
    label: "Firefly Services and how can I use them",
    question: "Firefly Services and how can I use them",
  }
];
export const GENERIC_ERROR_MESSAGE =
  "Sorry, I encountered an error. Please try again later.";
export const SEND_ICON_SRC = "/hlx_statics/icons/send-message.svg";
export const STOP_ICON_SRC = "/hlx_statics/icons/stop-response.svg";

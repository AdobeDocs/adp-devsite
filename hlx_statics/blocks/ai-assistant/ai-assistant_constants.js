// @ts-check
export const CHAT_BUTTON_LABEL_OPEN = "Open AI Assistant";
export const CHAT_BUTTON_LABEL_CLOSE = "Close AI Assistant";
export const CHAT_BUTTON_LABEL_MINIMIZE = "Minimize AI Assistant";
export const CHAT_BUTTON_LABEL_CLEAR = "Clear AI Assistant";
export const CHAT_WINDOW_ID = "ai-assistant-chat-window";
export const CHAT_WINDOW_LABEL_ID = "ai-assistant-label";
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
    label: "Adobe APIs and SDKs",
    question: "Tell me about what Adobe APIs and SDKs are available",
  },
  {
    label: "How do I get credentials?",
    question: "How do I get credentials?",
  },
  {
    label: "Adobe Developer App Builder",
    question: "What is Adobe Developer App Builder?",
  },
  {
    label: "Firefly Services",
    question: "What are Firefly Services and how can I use them?",
  },
  {
    label: "Adobe Express",
    question: "How do I delevelop Adobe Express addons",
  },
  {
    label: "Adobe for Creativity",
    question: "How can I use Adobe for Creativity in Claude?",
  },
];
export const GENERIC_ERROR_MESSAGE =
  "Sorry, I encountered an error. Please try again later.";
export const SEND_ICON_SRC = "/hlx_statics/icons/send-message.svg";
export const STOP_ICON_SRC = "/hlx_statics/icons/stop-response.svg";

// @ts-check
/** TODO: This should be different based on the environment */
export const AI_API_BASE_URL =
  "https://devsite-rag.stg.app-builder.corp.adp.adobe.io";
export const AI_API_KEY = "ai-assistant-devsite-rag-demo-01";
export const CHAT_BUTTON_LABEL_OPEN = "Open AI Assistant";
export const CHAT_BUTTON_LABEL_CLOSE = "Close and clear AI Assistant";
export const CHAT_BUTTON_LABEL_MINIMIZE = "Minimize AI Assistant";
export const CHAT_WINDOW_ID = "ai-assistant-chat-window";
export const CHAT_WINDOW_LABEL_ID = "ai-assistant-label";
/**
 * @type {Record<string, HTMLElement | null>}
 */
export const ELEMENTS = {
  CHAT_BUTTON: null,
  CHAT_WINDOW_CLOSE_BUTTON: null,
  CHAT_WINDOW_MINIMIZE_BUTTON: null,
  CHAT_SEND_BUTTON: null,
  CHAT_TEXTAREA: null,
  CHAT_WINDOW: null,
  CHAT_WINDOW_CONTENT: null,
  CHAT_SUGGESTED_QUESTIONS: null,
};
/**
 * @type {Array<{id?: string | null; label: string; question: string;}>}
 */
export const FALLBACK_SUGGESTED_QUESTIONS = [
  {
    label: "Express Add-ons",
    question: "What can I do with Express Add-ons?",
  },
  {
    label: "App Builder application",
    question: "How do I build an App Builder application?",
  },
];
export const GENERIC_ERROR_MESSAGE =
  "Sorry, I encountered an error. Please try again later.";
export const SEND_ICON_SRC = "/hlx_statics/icons/send-message.svg";
export const STOP_ICON_SRC = "/hlx_statics/icons/stop-response.svg";

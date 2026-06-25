// @ts-check
import {
  addExtraScriptWithLoad,
  createTag,
} from "../../scripts/lib-adobeio.js";

import {
  onUserScroll,
  restoreChatHistory,
  toggleChatWindow,
} from "./ai-assistant_chat-controller.js";
import {
  createClearDialog,
  createChatButton,
  createChatWindowHeader,
  createInputSection,
} from "./ai-assistant_chat-ui.js";
import {
  CHAT_WINDOW_ID,
  CHAT_WINDOW_LABEL_ID,
  ELEMENTS,
} from "./ai-assistant_constants.js";
import { createSuggestedQuestionsSection } from "./ai-assistant_suggested-questions.js";

/**
 * Decorates the ai-assistant block
 * @param {Element} block - the ai-assistant block element
 */
export default async function decorate(block) {
  addExtraScriptWithLoad(
    document.body,
    "https://unpkg.com/marked@18.0.5/lib/marked.umd.js",
    () => {
      // @ts-expect-error - marked is not on the Window object
      window.marked.use({
        renderer: {
          /**
           * @param {Object} options
           * @param {string} options.href
           * @param {string} options.title
           * @param {string} options.text
           */
          link({ href, title, text }) {
            const analyticsLabel = `DevsiteAI Assistant:Message:Link:${title || text}|${href}`;
            return `<a href="${href}" title="${title || text}" data-ll="${analyticsLabel}" target="_blank" rel="noopener noreferrer">${text}</a>`;
          },
        },
      });
      addExtraScriptWithLoad(
        document.body,
        "https://unpkg.com/dompurify@3.4.11/dist/purify.min.js",
        () => {
          // @ts-expect-error - DOMPurify is not on the Window object
          window.DOMPurify.setConfig({ ADD_ATTR: ["daa-ll", "daa-lh", "target"] });
          // @ts-expect-error - DOMPurify is not on the Window object
          window.DOMPurify.addHook('afterSanitizeAttributes', (node) => {
            console.log('afterSanitizeAttributes')
            if ('data-ll' in node) {
              node.setAttribute('daa-ll', node.getAttribute('data-ll'));
            }
          });
          restoreChatHistory();
        },
      );
    },
  );

  const panel = createTag("div", { class: "ai-assistant-panel" });

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
  content.appendChild(createSuggestedQuestionsSection());
  chatWindow.appendChild(content);
  chatWindow.appendChild(createInputSection());

  panel.appendChild(createChatButton());
  panel.appendChild(chatWindow);

  block.appendChild(panel);

  ELEMENTS.CHAT_WINDOW_CONTENT?.addEventListener("scroll", onUserScroll);
  ELEMENTS.CHAT_BUTTON?.addEventListener("click", toggleChatWindow);
  ELEMENTS.CHAT_WINDOW_CLEAR_BUTTON?.addEventListener("click", () =>
    chatWindow.appendChild(createClearDialog()),
  );
  ELEMENTS.CHAT_WINDOW_CLOSE_BUTTON?.addEventListener(
    "click",
    toggleChatWindow,
  );
}

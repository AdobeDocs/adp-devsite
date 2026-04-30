// @ts-check
import { createTag } from "../../scripts/lib-adobeio.js";
import { aiApiClient } from "./ai-assistant_api-client.js";
import { handleUserQuery } from "./ai-assistant_chat-controller.js";
import {
  ELEMENTS,
  FALLBACK_SUGGESTED_QUESTIONS,
} from "./ai-assistant_constants.js";

/**
 * Parses AI-generated suggested questions from the ---question--- delimited format.
 * @param {string} responseText - Raw text from the AI
 * @returns {Array<{label: string, question: string}>} Parsed questions, or empty array on failure
 */
export const parseAiSuggestedQuestions = (responseText) => {
  if (!responseText) return [];
  const questions = [];
  const segments = responseText.split(/---question---/);
  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    const labelMatch = trimmed.match(/^label:\s*(.+)$/m);
    const textMatch = trimmed.match(/^text:\s*(.+)$/m);
    if (labelMatch && textMatch) {
      const label = labelMatch[1].trim();
      const question = textMatch[1].trim();
      if (label && question) {
        questions.push({ label, question });
      }
    }
  }
  return questions;
};

/**
 * Updates the suggested questions list with new questions or a loading skeleton.
 * @param {Array<{label: string, question: string}>|null} questions - Questions to show, or null for skeleton
 */
export const updateSuggestedQuestions = (questions) => {
  const wrapper = ELEMENTS.CHAT_SUGGESTED_QUESTIONS;
  if (!wrapper) return;
  const list = wrapper.querySelector(".chat-suggested-questions-list");
  if (!list) return;

  list.replaceChildren();

  if (questions === null) {
    const loadingEl = createTag("p", {
      class: "chat-suggested-questions-loading",
    });
    loadingEl.textContent = "Generating suggestions";
    list.appendChild(loadingEl);
    return;
  }

  questions.forEach(({ id, label, question }) => {
    const button = createTag("button", {
      type: "button",
      class: "chat-suggested-questions-button",
    });
    const icon = createTag("img", {
      src: "/hlx_statics/icons/arrow-curved.svg",
      alt: "",
      "aria-hidden": true,
    });
    button.appendChild(icon);
    button.appendChild(document.createTextNode(label));
    button.addEventListener("click", () => {
      handleUserQuery(question, id ?? null);
    });
    list.appendChild(button);
  });
};

/**
 * Fetches collections and returns them as suggestion question objects.
 * Falls back to SUGGESTED_QUESTIONS if the API returns no results.
 * @returns {Promise<Array<{id?: string|null, label: string, question: string}>>}
 */
export const getCollectionsQuestions = async () => {
  const rawCollections = await aiApiClient.getCollections();
  const questions = rawCollections
    .filter((c) => c.id !== "__all-collections__" && !c.referencedCollectionIds)
    .map((c) => ({
      id: c.id,
      label: c.name,
      question: `What can I learn about ${c.name}?`,
    }));
  return questions.length > 0 ? questions : FALLBACK_SUGGESTED_QUESTIONS;
};

/**
 * Creates the suggested questions section with topic buttons.
 * @returns {HTMLElement} The suggested questions wrapper element
 */
export const createSuggestedQuestionsSection = () => {
  const wrapper = createTag("div", { class: "chat-suggested-questions" });
  const title = createTag("p", { class: "chat-suggested-questions-title" });
  title.textContent = "or choose from the following:";
  const list = createTag("div", { class: "chat-suggested-questions-list" });

  wrapper.appendChild(title);
  wrapper.appendChild(list);
  ELEMENTS.CHAT_SUGGESTED_QUESTIONS = wrapper;

  getCollectionsQuestions().then(updateSuggestedQuestions);

  return wrapper;
};

export const showSuggestedQuestions = () => {
  const el = ELEMENTS.CHAT_SUGGESTED_QUESTIONS;
  if (el) {
    el.classList.remove("hidden");
    el.classList.remove("animate-fade-in");
    requestAnimationFrame(() => {
      el.classList.add("animate-fade-in");
      el.scrollIntoView({ behavior: "smooth" });
    });
  }
};

export const hideSuggestedQuestions = () => {
  const el = ELEMENTS.CHAT_SUGGESTED_QUESTIONS;
  if (el) {
    el.classList.remove("animate-fade-in");
    el.classList.add("hidden");
  }
};

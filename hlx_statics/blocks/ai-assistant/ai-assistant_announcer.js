// @ts-check
import { createTag } from "../../scripts/lib-adobeio.js";
import {
  CHAT_ANNOUNCER_ID,
  CHAT_STATUS_ID,
  CHAT_STATUS_RESPONDING,
  ELEMENTS,
} from "./ai-assistant_constants.js";

/**
 * How long an appended announcement node lingers in the DOM before it is
 * removed. Mirrors @react-aria/live-announcer's LIVEREGION_TIMEOUT_DELAY (7s):
 * long enough for the screen reader to read it, short enough that the log
 * doesn't grow unbounded.
 */
const ANNOUNCEMENT_TIMEOUT_MS = 30_000;

/**
 * Creates the visually-hidden live regions used to announce assistant activity
 * to screen readers, kept deliberately separate from the visible transcript.
 *
 * The visible `.chat-bubble-content` gets a full `innerHTML` replace on every
 * streamed chunk (see `updateContent`), so it must never itself be a live
 * region, that would announce every partial word. Instead this mirrors
 * Adobe's own `@react-aria/live-announcer` pattern:
 *   - a `role="log"` region (implicit `aria-live="polite"`,
 *     `aria-atomic="false"`) that announces by appending a fresh node per
 *     completed message, and
 *   - a separate `role="status"` region for the transient "Assistant is
 *     responding…" indicator.
 *
 * @returns {HTMLElement} container holding both regions, ready to append to the DOM
 */
export function createAnnouncerRegions() {
  const container = createTag("div", { class: "chat-announcer" });

  const announcer = createTag("div", {
    id: CHAT_ANNOUNCER_ID,
    role: "log",
    "aria-live": "polite",
    "aria-atomic": "false",
    "aria-relevant": "additions",
  });

  const status = createTag("div", {
    id: CHAT_STATUS_ID,
    role: "status",
  });

  container.appendChild(announcer);
  container.appendChild(status);

  ELEMENTS.CHAT_ANNOUNCER = announcer;
  ELEMENTS.CHAT_STATUS = status;

  return container;
}

/**
 * Announces a completed message to screen readers by appending a brand-new node
 * (rather than mutating an existing node's `textContent`), so repeated or
 * similar replies still trigger re-announcement. The node is removed after a
 * timeout to keep the log from growing unbounded.
 *
 * @param {string} message - plain-text message to announce
 */
export function announce(message) {
  const announcer = ELEMENTS.CHAT_ANNOUNCER;
  if (!announcer || !message) return;

  const node = createTag("div", {});
  node.textContent = message;
  announcer.appendChild(node);

  window.setTimeout(() => node.remove(), ANNOUNCEMENT_TIMEOUT_MS);
}

/**
 * Toggles the "Assistant is responding…" status indicator. This is a single,
 * transient status value (not sequential history), so it lives in the
 * `role="status"` region (implicit `aria-live="polite"`), decoupled from the
 * announcer log.
 *
 * @param {boolean} isResponding
 */
export function setResponding(isResponding) {
  const status = ELEMENTS.CHAT_STATUS;
  if (!status) return;

  status.textContent = isResponding ? CHAT_STATUS_RESPONDING : "";
}

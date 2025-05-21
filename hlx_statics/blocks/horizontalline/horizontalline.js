import {
  createTag
} from "../../scripts/lib-adobeio.js";

export default async function decorate(block) {
  const horizontalLine = createTag("hr");
  block.prepend(horizontalLine);
}

import { loadEmbed } from "../embed/embed";

export default function decorate(block) {
  const wrapper = block.querySelector('.media > div > div');
  const youtubeUrl = wrapper?.textContent.trim();

  if (youtubeUrl) {
    const match = youtubeUrl.match(/https:\/\/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (match) {
      wrapper.innerHTML = `
        <div class="youtube-mdx-embed" style="width: 100%; position: relative; padding-top: 56.25%;"><iframe data-testid="youtube" title="youTube-AwL0QRxH9JQ" src="https://www.youtube.com/embed/${match[1]}" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen="true" style="position: absolute; top: 0px; left: 0px; width: 100%; height: 100%;" spellcheck="false"></iframe></div>
        `;
    }
    loadEmbed(block , youtubeUrl)
  }
}

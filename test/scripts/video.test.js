import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';
import {
  buildVideoContainer,
  buildVideoMarkup,
  getYoutubeVideoId,
  parseVideoSource,
} from '../../hlx_statics/scripts/video.js';

describe('video utilities', () => {
  describe('getYoutubeVideoId', () => {
    it('extracts id from youtu.be URLs', () => {
      expect(getYoutubeVideoId('https://youtu.be/4haZJxpf9Bo?si=dZ33RmLQ5CoLoB1G')).to.equal('4haZJxpf9Bo');
    });
  });

  describe('parseVideoSource', () => {
    it('parses a raw YouTube URL in a paragraph', () => {
      const container = document.createElement('div');
      container.innerHTML = '<p>https://youtu.be/4haZJxpf9Bo?si=dZ33RmLQ5CoLoB1G</p>';

      const source = parseVideoSource(container);
      expect(source.url).to.equal('https://youtu.be/4haZJxpf9Bo?si=dZ33RmLQ5CoLoB1G');
    });
  });

  describe('buildVideoMarkup', () => {
    it('renders a YouTube iframe for YouTube URLs', () => {
      const html = buildVideoMarkup({
        url: 'https://youtu.be/4haZJxpf9Bo?si=dZ33RmLQ5CoLoB1G',
        title: 'Feature video',
      });

      expect(html).to.include('video-embed-youtube');
      expect(html).to.not.include('<video');
    });

    it('renders an Instagram embed with the captioned iframe URL', () => {
      const html = buildVideoMarkup({
        url: 'https://www.instagram.com/reel/ABC123/',
        title: 'Instagram reel',
      });

      expect(html).to.include('video-embed-instagram');
      expect(html).to.include('embed/captioned');
    });

    it('renders a Twitter widget embed', () => {
      const html = buildVideoMarkup({
        url: 'https://twitter.com/adobe/status/1234567890',
        title: 'Adobe tweet',
      });

      expect(html).to.include('video-embed-twitter');
      expect(html).to.include('twitter-tweet');
      expect(html).to.include('https://twitter.com/adobe/status/1234567890');
    });

    it('wraps markup in a shared video container', () => {
      const html = buildVideoContainer({
        url: 'https://video.tv.adobe.com/v/3483378',
        title: 'Custom Content Advisor UE',
      });

      expect(html).to.match(/^<div class="video-container">/);
      expect(html).to.include('video-embed-adobe-tv');
      expect(html).to.include('video-embed-landscape');
    });
  });

  describe('video layout styles', () => {
    it('gives landscape embeds a non-zero 16:9 box without a black background', async () => {
      let css = await readFile({ path: '../../hlx_statics/styles/styles.css' });
      css = css.replace(/@import[^;]+;/g, '');
      const style = document.createElement('style');
      style.textContent = css.slice(css.indexOf(':root'));
      document.head.appendChild(style);

      document.body.innerHTML = `
        <div style="width:640px">
          <div class="video-container">
            <div class="video-embed video-embed-landscape video-embed-youtube">
              <iframe title="test"></iframe>
            </div>
          </div>
        </div>
      `;

      const embed = document.querySelector('.video-embed');
      const { width, height } = embed.getBoundingClientRect();
      expect(width).to.be.greaterThan(300);
      expect(height).to.be.greaterThan(150);
      expect(Math.abs((width / height) - (16 / 9))).to.be.lessThan(0.02);
      expect(getComputedStyle(embed).backgroundColor).to.equal('rgba(0, 0, 0, 0)');
    });
  });
});

import { createTag, getResourceUrl } from '../../scripts/lib-adobeio.js';

const DEFAULT_OPTIONS = {
  src: 'https://raw.githubusercontent.com/AdobeDocs/adp-devsite-github-actions-test/refs/heads/main/static/openapi.yaml',
  width: '500px',
  typography: 'fontFamily: `adobe-clean, "Source Sans Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, "Trebuchet MS", "Lucida Grande", sans-serif`',
  codeBlock: 'tokens: { punctuation: { color: "white" }}',
  disableSidebar: false,
  disableSearch: false,
  hideTryItPanel: false,
  scrollYOffset: 0,
  sortOperationsAlphabetically: false,
  sortTagsAlphabetically: false,
  jsonSampleExpandLevel: 2,
  generateCodeSamples: 'languages: [], skipOptionalParameters: false,',
  requestInterceptor: '',
};

function parseOptions(block) {
  // start with default options
  const options = Object.assign({}, DEFAULT_OPTIONS);

  // overwrite with options from user
  Object.keys(options).forEach((key) => {
    const name = `data-${key}`;
    const value = block.getAttribute(name);
    if (value != null) {
      options[key] = value;
    }
  });

  return options;
}

export default function decorate(block) {
  const { 
      src,
      width,
      typography,
      codeBlock,
      disableSidebar,
      disableSearch,
      hideTryItPanel,
      scrollYOffset,
      sortOperationsAlphabetically,
      sortTagsAlphabetically,
      jsonSampleExpandLevel,
      generateCodeSamples,
      requestInterceptor,
    } = parseOptions(block);
  
  const absoluteSrc = getResourceUrl(src);

  // https://redocly.com/docs/api-reference-docs/guides/on-premise-html-element#steps
  const redocly_container = createTag('div', {id: 'redocly_container'});
  block.appendChild(redocly_container);

  const redocly = createTag('script', {
      src: 'https://cdn.redoc.ly/reference-docs/latest/redocly-reference-docs.min.js', 
      async: true
    });  

  const console = createTag('script', {
      src: 'https://cdn.redoc.ly/reference-docs/latest/console.redocly-reference-docs.min.js',
      async: true
    });

  document.head.appendChild(redocly);
  document.head.appendChild(console);

  redocly.addEventListener("load", () => {
    const init = createTag('script');
    init.innerHTML = `
      RedoclyReferenceDocs.init(
        '${absoluteSrc}',
        {
          licenseKey: '${window.REDOCLY}',
          disableSidebar: ${disableSidebar}, 
          disableSearch: ${disableSearch},
          hideTryItPanel: ${hideTryItPanel},
          scrollYOffset: ${scrollYOffset},
          sortOperationsAlphabetically: ${sortOperationsAlphabetically},
          sortTagsAlphabetically: ${sortTagsAlphabetically},
          jsonSampleExpandLevel: ${jsonSampleExpandLevel === 'all' ? `'${jsonSampleExpandLevel}'` : jsonSampleExpandLevel},
          ${generateCodeSamples ? "generateCodeSamples: { " + generateCodeSamples + "}," : ''}
          ${requestInterceptor ? "requestInterceptor: " + requestInterceptor + "," : ''}
          hideLoading: true,
          theme: {
          ${typography ? "typography: { " + typography + "}," : ''}
          rightPanel: {
            width: '${width}',
            },
            ${codeBlock ? "codeBlock: { " + codeBlock + "}," : ''}
          },
        },
        document.querySelector('#redocly_container')
      );
    `;
    block.appendChild(init);
  });

  redocly.addEventListener("error", (err) => {
    // eslint-disable-next-line no-console
    console.error(err);
  });
}
  
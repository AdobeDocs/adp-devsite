import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.DEV_PORT || 3000;

const corsOptions = {
  origin: 'http://127.0.0.1:3000/',
  credentials: true,
};

const app = express();
app.use(cors(corsOptions));

// TODO: use devsitepaths.json instead
const pathPrefixMap = {
  '/commerce/webapi': {
    pathPrefix: '/commerce/webapi',
    repo: 'commerce-webapi',
    owner: 'AdobeDocs',
    root: '/src/pages/',
    branch: '',
  },
  '/github-actions-test': {
    pathPrefix: '/github-actions-test',
    repo: 'adp-devsite-github-actions-test',
    owner: 'AdobeDocs',
    root: '/src/pages/',
  },
  '/express/add-ons/docs': {
    pathPrefix: '/express/add-ons/docs/',
    repo: 'express-add-ons-docs',
    owner: 'AdobeDocs',
    root: '/src/pages/',
  },
};

app.use(async (req, res) => {
  // if path prefix matches something in the pathPrefixMap
  // route request to the connector on port 3002
  // otherwise serve from aem-cli on port 3001
  const prefix = Object.keys(pathPrefixMap).find((prefix) => req.path.startsWith(prefix));


  let upstreamUrl;
  let source;
  if (prefix && prefix !== 'undefined' && !req.path.endsWith('/config.plain.html')) {
    source = 'docs';
    upstreamUrl = `http://127.0.0.1:3002${req.path}`;
  } else {
    source = 'aem';
    upstreamUrl = `http://127.0.0.1:3001${req.path}`;
  }

  console.log(`Fetching upstream url: ${upstreamUrl}`);

  // For font files, request uncompressed data to avoid decoding issues
  const fetchOptions = {};
  if (req.path.includes('.otf') || req.path.includes('.woff2') || req.path.includes('.ttf')) {
    fetchOptions.headers = {
      'Accept-Encoding': 'identity'
    };
  }

  const resp = await fetch(upstreamUrl, fetchOptions);
  let body;
  const contentType = resp.headers.get('content-type') || '';
  const isFont = contentType.includes('font') || contentType.includes('woff2') || contentType.includes('otf');

  // Handle headers differently for fonts vs other files
  const headers = new Map();
  if (isFont) {
    // For fonts, only copy essential headers and ensure no compression
    headers.set('content-type', contentType);
    headers.set('content-length', resp.headers.get('content-length') || '');
    // Explicitly remove any compression headers
    headers.delete('content-encoding');
  } else {
    // For non-fonts, copy all headers
    resp.headers.forEach((value, key) => headers.set(key, value));
  }

  if (source === 'docs' && contentType.includes('text/html')) {
    body = await resp.text();
    // inject the head.html
    const [pre, post] = body.split('</head>');
    body = `${pre}
    <link rel="stylesheet" href="/hlx_statics/styles/styles.css"/>
    <script src="/hlx_statics/scripts/scripts.js" type="module"></script>
    </head>
    ${post}`;
  } else {
    // Handle binary files (like fonts) properly
    if (isFont) {
      // For font files, preserve content-encoding and get binary data
      body = await resp.arrayBuffer();
    } else {
      // For text files, get as text and remove content-encoding if needed
      body = await resp.text();
      headers.delete('content-encoding');
    }
  }

  res.status(resp.status);

  // Set headers properly for Express
  headers.forEach((value, key) => {
    res.set(key, value);
  });

  if (isFont) {
    res.send(Buffer.from(body));
  } else {
    res.send(body);
  }

});

app.listen(PORT, () => {
  console.debug(`Website dev server is running on port ${PORT}`);
});

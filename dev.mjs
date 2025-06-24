import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.DEV_PORT || 3000;

const corsOptions = {
  origin: 'http://127.0.0.1:3000/', // Replace with your frontend origin
  credentials: true, // Allow credentials
};

const app = express();
app.use(cors(corsOptions));

// TODO: fetch the path prefix map and use that to route the request
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

  if (prefix) {
    source = 'docs';
    upstreamUrl = `http://127.0.0.1:3002${req.path}`;
  } else {
    source = 'aem';
    upstreamUrl = `http://127.0.0.1:3001${req.path}`;
  }

  console.log(`Fetching upstream url: ${upstreamUrl}`);
  const resp = await fetch(upstreamUrl);
  let body;
  const headers = new Map(resp.headers.entries());

  if (source === 'docs' && resp.headers.get('content-type')?.includes('text/html')) {
    body = await resp.text();
    // inject the head.html
    const [pre, post] = body.split('</head>');
    body = `${pre}
    <link rel="stylesheet" href="/hlx_statics/styles/styles.css"/>
    <script src="/hlx_statics/scripts/scripts.js" type="module"></script>
    </head>
    ${post}`;
  } else {
    body = await resp.text();
    // may cause problems with other encoded files?
    headers.delete('content-encoding');
  }

  res.status(resp.status);
  res.setHeaders(headers);
  res.send(body);

});

app.listen(PORT, () => {
  console.debug(`Website dev server is running on port ${PORT}`);
});

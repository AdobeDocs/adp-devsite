// site == 3000 
// - browse in browser

// site contentn

// connector == 3002

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.DEV_PORT || 3000;

// TODO: ensure `DOCS_DIRECTORY` starts with `/`
const DOCS_DIRECTORY = process.env.DIRECTORY ||  './src/pages';
const OWNER = process.env.OWNER || 'AdobeDocs';
const REPO = process.env.OWNER || 'adp-devsite-github-actions-test';
const REF = process.env.OWNER || 'main';

const app = express();

// TODO: fetch the path prefix map and use that to route the request
const pathPrefixMap = {
  '/commerce/webapi':  {
    'pathPrefix': '/commerce/webapi',
    'repo': 'commerce-webapi',
    'owner': 'AdobeDocs',
    'root': '/src/pages/',
    'branch': ''
  },
}

app.use((req, res) => {
  // if path prefix matches something in the pathPrefixMap
  // route request to the connector on port 3002
  // otherwise serve from aem-cli on port 3001
  const pathPrefix = Object.keys(pathPrefixMap).find(prefix => req.path.startsWith(prefix));
  if (pathPrefix) {
    const { pathPrefix, repo, owner, root, branch } = pathPrefixMap[pathPrefix];
    const connectorUrl = `http://localhost:3002/${req.path}`;
    res.redirect(connectorUrl);
    // res.status();
    // res.setHeader('Content-Type', 'application/json');
    // return res.send(body);
  } else {
    res.redirect(`http://localhost:3001/${req.path}`);
  }
})

app.listen(PORT, () => {
  console.debug(`Website dev server is running on port ${PORT}`);
});
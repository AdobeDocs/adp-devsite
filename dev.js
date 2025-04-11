// site == 3000 
// - browse in browser

// site contentn

// connector == 3002

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Request, Response } from '@adobe/fetch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.DEV_PORT || 3000;

// TODO: ensure `DOCS_DIRECTORY` starts with `/`
const DOCS_DIRECTORY = process.env.DIRECTORY ||  './src/pages';
const OWNER = process.env.OWNER || 'AdobeDocs';
const REPO = process.env.OWNER || 'adp-devsite-github-actions-test';
const REF = process.env.OWNER || 'main';

const app = express();

// TODO: fetch the path prefix map and use that to route the request

// const pathPrefixMap = {
//   '/commerce/webapi':  {
//     'pathPrefix': '/commerce/webapi',
//     'repo': 'commerce-webapi',
//     'owner': 'AdobeDocs',
//     'root': '/src/pages/',
//     'branch': ''
//   },
//   '/github-actions-test':  {
//     'pathPrefix': '/github-actions-test',
//     'repo': 'adp-devsite-github-actions-test',
//     'owner': 'AdobeDocs',
//     'root': '/src/pages/',
//     'branch': ''
//   },
// }

let devsitePathMatch;

// get these based on stage or prod but default to prod for now
let devsitePathsUrl = `https://main--adp-devsite--adobedocs.aem.live/franklin_assets/devsitepaths.json`;

await fetch(devsitePathsUrl)
.then(function(response) {
  if (response.ok) {
    return response.json();
  } else {
    throw new Error('Unable to fetch ${}');
  }
}).then(function(data) {
  devsitePaths = data?.data;
});

// use path prefix matcher to figure out path on 3000
app.use((req, res) => {

  const suffixSplit = req.path.split('/');
  let suffixSplitRest = suffixSplit.slice(1);
  if (suffixSplit.length > 2) {
    devsitePathMatch = devsitePaths.find((element) => element.pathPrefix === `/${suffixSplit[1]}/${suffixSplit[2]}/${suffixSplit[3]}`);
    devsitePathMatchFlag = !!devsitePathMatch;
    if (devsitePathMatchFlag) {
      console.log('rest 3');
      suffixSplitRest = suffixSplit.slice(4);
    }
  }
  if (suffixSplit.length > 1 && !devsitePathMatchFlag) {
    devsitePathMatch = devsitePaths.find((element) => element.pathPrefix === `/${suffixSplit[1]}/${suffixSplit[2]}`);
    devsitePathMatchFlag = !!devsitePathMatch;
    if (devsitePathMatchFlag) {
      console.log('rest 2');
      suffixSplitRest = suffixSplit.slice(3);
    }
  }
  if (suffixSplit.length > 0 && !devsitePathMatchFlag) {
    devsitePathMatch = devsitePaths.find((element) => element.pathPrefix === `/${suffixSplit[1]}`);
    devsitePathMatchFlag = !!devsitePathMatch;
    if (devsitePathMatchFlag) {
      console.log('rest 1');
      suffixSplitRest = suffixSplit.slice(2);
    }
  }

  if(devsitePathMatch){

  // // if path prefix matches something in the pathPrefixMap
  // // route request to the connector on port 3002
  // // otherwise serve from aem-cli on port 3001
  // console.log('req.path:');
  // console.log(req.path);
  // const pathPrefix = Object.keys(pathPrefixMap).find(prefix => req.path.startsWith(prefix));
  // if (pathPrefix) {
  //   console.log('match path prefix:')
  //   console.log(prefix)
  //   const { pathPrefix, repo, owner, root, branch } = pathPrefixMap[pathPrefix];
  //   const connectorUrl = `http://localhost:3002/${req.path}`;
  //   res.redirect(connectorUrl);
  //   // res.status();
  //   // res.setHeader('Content-Type', 'application/json');
  //   // return res.send(body);


  } else {
    res.redirect(`http://localhost:3001/${req.path}`);
  }
})

app.listen(PORT, () => {
  console.debug(`Website dev server is running on port ${PORT}`);
});
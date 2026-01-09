const { Octokit } = require('@octokit/rest');
const generateCoverageReport = require('./coverage-generate.js');

const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
});

const owner = 'AdobeDocs';
const repo = 'adp-devsite';
const pull_number = process.env.PR_ID;

async function createComment(comment) {
    // Github API Doc: https://docs.github.com/en/rest/pulls/comments?apiVersion=2022-11-28#list-review-comments-in-a-repository

    // looks like github changed the name of the function from rest.pulls.createComment to rest.issues.createComment 
    // and the parameter name pull_number to issue_number 
    // :<
    await octokit.rest.issues.createComment({
        owner: owner,
        repo: repo,
        issue_number: pull_number,
        body: comment
    });
    console.log('Coverage report comment posted successfully.');
}

createComment(generateCoverageReport());

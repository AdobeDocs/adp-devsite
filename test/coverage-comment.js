const generateCoverageReport = require('./coverage-generate.js');
const generateTestReport = require('./test-report-generate.js');

const owner = 'AdobeDocs';
const repo = 'adp-devsite';
const pull_number = process.env.PR_ID;
const testOutcome = process.env.TEST_OUTCOME; // 'success' or 'failure'

async function createComment(comment) {
    // Github API Doc: https://docs.github.com/en/rest/pulls/comments?apiVersion=2022-11-28#create-a-review-comment-for-a-pull-request
    // note that "issue" is used to create general comments on pr
    // and "pulls" is used to create code review/code change suggestions on pr
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${pull_number}/comments`, {
        method: "POST",
        headers: {
            "Accept": "application/vnd.github+json",
            "Authorization": `Bearer ${process.env.GITHUB_TOKEN}`,
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ body: comment })
    });

    if (!response.ok) {
        const errorMessage = await response.text();
        throw new Error(`Failed to post comment: ${response.status} - ${errorMessage}`);
    }
    console.log('Coverage report comment posted successfully.');
}

// Build the full comment with test results and coverage
let fullComment = '';

// Add test results first (most important info)
fullComment += generateTestReport(testOutcome);

// Add coverage report
try {
    fullComment += generateCoverageReport();
} catch (error) {
    fullComment += `\n⚠️ Coverage report could not be generated: ${error.message}\n`;
}

createComment(fullComment);

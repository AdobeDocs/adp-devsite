/* This is a script to generate test results report for github action */

const fs = require('fs');
const path = require('path');

/**
 * Parses test output and extracts failed test cases with their failure details
 * @param {string} testOutput - Raw test output string
 * @returns {Array} Array of failed test case objects with title and failures
 */
function parseFailedTestCases(testOutput) {
    const failedCasesMap = new Map(); // Group by test file
    
    // Clean up ANSI escape codes for easier parsing
    // eslint-disable-next-line no-control-regex
    const cleanOutput = testOutput.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
    const lines = cleanOutput.split('\n');
    
    let currentTestFile = null;
    let currentFailure = [];
    let isInFailureBlock = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check if this line is a test file header (e.g., "test/blocks/tab/tab.test.js:")
        // It should be at the start of the line and end with a colon
        const testFileMatch = line.match(/^(test\/[^\s:]+\.test\.js):$/);
        if (testFileMatch) {
            // Save previous failure if exists
            if (currentFailure.length > 0 && currentTestFile) {
                const failureText = currentFailure.join('\n').trim();
                if (failureText) {
                    if (!failedCasesMap.has(currentTestFile)) {
                        failedCasesMap.set(currentTestFile, []);
                    }
                    failedCasesMap.get(currentTestFile).push(failureText);
                }
                currentFailure = [];
            }
            
            currentTestFile = testFileMatch[1];
            isInFailureBlock = false;
            continue;
        }
        
        // Only process if we have a current test file
        if (!currentTestFile) continue;
        
        // Check if this line starts a new failure (contains ❌)
        if (line.includes('❌')) {
            // Save previous failure if exists
            if (currentFailure.length > 0) {
                const failureText = currentFailure.join('\n').trim();
                if (failureText) {
                    if (!failedCasesMap.has(currentTestFile)) {
                        failedCasesMap.set(currentTestFile, []);
                    }
                    failedCasesMap.get(currentTestFile).push(failureText);
                }
                currentFailure = [];
            }
            currentFailure.push(line);
            isInFailureBlock = true;
        } else if (isInFailureBlock) {
            // Check for section markers that indicate end of failure block
            if (line.includes('🚧') || line.match(/^Chrome:/) || line.match(/^Error while/)) {
                // New section, save current failure
                if (currentFailure.length > 0) {
                    const failureText = currentFailure.join('\n').trim();
                    if (failureText) {
                        if (!failedCasesMap.has(currentTestFile)) {
                            failedCasesMap.set(currentTestFile, []);
                        }
                        failedCasesMap.get(currentTestFile).push(failureText);
                    }
                    currentFailure = [];
                }
                isInFailureBlock = false;
            } else if (line.match(/^\s/) || line.trim() === '') {
                // Indented content or empty line - part of failure details
                currentFailure.push(line);
            } else {
                // Non-indented, non-empty line might end the failure block
                if (currentFailure.length > 0) {
                    const failureText = currentFailure.join('\n').trim();
                    if (failureText) {
                        if (!failedCasesMap.has(currentTestFile)) {
                            failedCasesMap.set(currentTestFile, []);
                        }
                        failedCasesMap.get(currentTestFile).push(failureText);
                    }
                    currentFailure = [];
                }
                isInFailureBlock = false;
            }
        }
    }
    
    // Don't forget the last failure
    if (currentFailure.length > 0 && currentTestFile) {
        const failureText = currentFailure.join('\n').trim();
        if (failureText) {
            if (!failedCasesMap.has(currentTestFile)) {
                failedCasesMap.set(currentTestFile, []);
            }
            failedCasesMap.get(currentTestFile).push(failureText);
        }
    }
    
    // Convert map to array, only include test files with failures
    const failedCases = [];
    for (const [title, failures] of failedCasesMap) {
        if (failures.length > 0) {
            failedCases.push({ title: title + ':', failures });
        }
    }
    
    return failedCases;
}

/**
 * Generates a markdown-formatted test results report from the test output file
 * @param {string} testOutcome - The test outcome ('success' or 'failure')
 * @returns {string} Markdown-formatted test results section
 */
function generateTestReport(testOutcome) {
    const testOutputPath = path.join(__dirname, '..', 'test-output.txt');
    let testResultsSection = '';

    const statusEmoji = testOutcome === 'success' ? '✅' : '❌';
    const statusText = testOutcome === 'success' ? 'All tests passed!' : 'Some tests failed!';

    testResultsSection += `## ${statusEmoji} Test Results\n\n`;
    testResultsSection += `**Status:** ${statusText}\n\n`;

    try {
        if (fs.existsSync(testOutputPath)) {
            const testOutput = fs.readFileSync(testOutputPath, 'utf8');
            
            // Extract summary line (e.g., "X passing, Y failing")
            const summaryMatch = testOutput.match(/(\d+\s+passing.*?)(?:\n|$)/);
            const failingMatch = testOutput.match(/(\d+\s+failing.*?)(?:\n|$)/);
            
            if (summaryMatch) {
                testResultsSection += `📊 **Summary:** ${summaryMatch[1]}`;
                if (failingMatch) {
                    testResultsSection += `, ${failingMatch[1]}`;
                }
                testResultsSection += '\n\n';
            }

            // If tests failed, include failure details using new parsing logic
            if (testOutcome === 'failure') {
                const failedCases = parseFailedTestCases(testOutput);
                
                if (failedCases.length > 0) {
                    testResultsSection += '<details>\n<summary>🔍 Click to view failed tests</summary>\n\n';
                    
                    let failureContent = '';
                    for (const testCase of failedCases) {
                        failureContent += `📁 ${testCase.title}\n\n`;
                        for (const failure of testCase.failures) {
                            failureContent += `${failure}\n\n`;
                        }
                        failureContent += '\n'; // Add extra newline between test cases
                    }
                    
                    // Limit output to avoid very long comments
                    testResultsSection += '```\n';
                    testResultsSection += failureContent.substring(0, 5000);
                    if (failureContent.length > 5000) {
                        testResultsSection += '\n... (truncated, see full output in Actions log)';
                    }
                    testResultsSection += '\n```\n\n</details>\n\n';
                } else {
                    // If we can't parse failures, include last portion of output
                    testResultsSection += '<details>\n<summary>🔍 Click to view test output</summary>\n\n';
                    testResultsSection += '```\n';
                    const lastOutput = testOutput.slice(-3000); // Last 3000 chars
                    testResultsSection += lastOutput;
                    testResultsSection += '\n```\n\n</details>\n\n';
                }
            }
        }
    } catch (error) {
        testResultsSection += `⚠️ Could not read test output: ${error.message}\n\n`;
    }

    return testResultsSection;
}

// Export the function for use in other scripts
module.exports = generateTestReport;

// Debug Usage: If run directly, print the report to console
if (require.main === module) {
    try {
        // Default to 'failure' for testing purposes when run directly
        const outcome = process.argv[2] || 'failure';
        const report = generateTestReport(outcome);
        console.log(report);
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
}

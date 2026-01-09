/* This is a script to generate coverage report for the test files in github action*/

const fs = require('fs');
const path = require('path');

/**
 * Generates a markdown-formatted coverage report from the HTML coverage file
 * @param {string} coverageFilePath - Optional path to the coverage HTML file
 * @returns {string} Markdown-formatted coverage report
 */

function generateCoverageReport() {
  // Path to the coverage HTML report
  const coverageFile = path.join(__dirname, '..', 'coverage', 'lcov-report', 'index.html');

  try {
    // Read the HTML file
    const html = fs.readFileSync(coverageFile, 'utf8');

    // Extract overall coverage summary
    const summaryRegex = /<div class='fl pad1y space-right2'>\s*<span class="strong">([\d.]+)%\s*<\/span>\s*<span class="quiet">(\w+)<\/span>\s*<span class='fraction'>([\d/]+)<\/span>/g;
    
    const overallCoverage = [];
    let match;
    
    while ((match = summaryRegex.exec(html)) !== null) {
      const [, percentage, metric, fraction] = match;
      overallCoverage.push({
        Metric: metric,
        Percentage: `${percentage}%`,
        Coverage: fraction
      });
    }

    // Extract per-file coverage data
    const fileRegex = /<tr>\s*<td class="file \w+" data-value="([^"]+)">.*?<\/a><\/td>\s*<td data-value="([\d.]+)" class="pic \w+">.*?<\/td>\s*<td data-value="([\d.]+)" class="pct \w+">([\d.]+)%<\/td>\s*<td data-value="(\d+)" class="abs \w+">(\d+)\/(\d+)<\/td>\s*<td data-value="([\d.]+)" class="pct \w+">([\d.]+)%<\/td>\s*<td data-value="(\d+)" class="abs \w+">(\d+)\/(\d+)<\/td>\s*<td data-value="([\d.]+)" class="pct \w+">([\d.]+)%<\/td>\s*<td data-value="(\d+)" class="abs \w+">(\d+)\/(\d+)<\/td>\s*<td data-value="([\d.]+)" class="pct \w+">([\d.]+)%<\/td>\s*<td data-value="(\d+)" class="abs \w+">(\d+)\/(\d+)<\/td>/gs;
    
    const filesCoverage = [];
    
    while ((match = fileRegex.exec(html)) !== null) {
      const [, file, , stmtPct, , , , , , branchPct, , , , , funcPct, , , , , linePct] = match;
      filesCoverage.push({
        File: file,
        Statements: `${stmtPct}%`,
        Branches: `${branchPct}%`,
        Functions: `${funcPct}%`,
        Lines: `${linePct}%`
      });
    }

    // Build markdown output
    let output = '## Test Coverage Report\n\n';
    
    // Overall coverage summary
    output += '### Overall Coverage Summary\n\n';
    output += '| Metric | Percentage | Coverage |\n';
    output += '|--------|------------|----------|\n';
    overallCoverage.forEach(item => {
      output += `| ${item.Metric} | ${item.Percentage} | ${item.Coverage} |\n`;
    });
    
    output += '\n';
    
    // Coverage by file/directory
    output += '### Coverage by File/Directory\n\n';
    output += '| File | Statements | Branches | Functions | Lines |\n';
    output += '|------|------------|----------|-----------|-------|\n';
    filesCoverage.forEach(item => {
      output += `| ${item.File} | ${item.Statements} | ${item.Branches} | ${item.Functions} | ${item.Lines} |\n`;
    });
    
    output += '\n---\n';
    output += '*Coverage report generated at ' + new Date().toISOString() + '*\n';
    
    return output;

  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`Coverage report not found at: ${coverageFile}. Please run "npm test" first to generate the coverage report.`);
    } else {
      throw new Error(`Error reading coverage report: ${error.message}`);
    }
  }
}

// Export the function for use in other scripts
module.exports = generateCoverageReport;

// Debug Usage: If run directly, print the report to console
if (require.main === module) {
  try {
    const report = generateCoverageReport();
    console.log(report);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
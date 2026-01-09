/* This is a script to generate coverage report for the test files in github action*/

const fs = require('fs');
const path = require('path');

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

  // Display results
  console.log('\n' + '='.repeat(50));
  console.log('         OVERALL COVERAGE SUMMARY');
  console.log('='.repeat(50) + '\n');
  console.table(overallCoverage);

  console.log('\n' + '='.repeat(50));
  console.log('         COVERAGE BY FILE/DIRECTORY');
  console.log('='.repeat(50) + '\n');
  console.table(filesCoverage);

  console.log('\n' + '='.repeat(50));
  console.log('Coverage report generated successfully!');
  console.log('='.repeat(50) + '\n');

} catch (error) {
  if (error.code === 'ENOENT') {
    console.error('Error: Coverage report not found at:', coverageFile);
    console.error('Please run "npm test" first to generate the coverage report.');
  } else {
    console.error('Error reading coverage report:', error.message);
  }
  process.exit(1);
}
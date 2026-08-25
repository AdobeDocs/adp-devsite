# Contributing to Project Helix

This project (like almost all of Project Helix) is an Open Development project and welcomes contributions from everyone who finds it useful or lacking.

## Code Of Conduct

This project adheres to the Adobe [code of conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to cstaub at adobe dot com.

## Contributor License Agreement

All third-party contributions to this project must be accompanied by a signed contributor license. This gives Adobe permission to redistribute your contributions as part of the project. [Sign our CLA](http://opensource.adobe.com/cla.html)! You only need to submit an Adobe CLA one time, so if you have submitted one previously, you are good to go!

## Things to Keep in Mind

This project uses a **commit then review** process, which means that for approved maintainers, changes can be merged immediately, but will be reviewed by others.

For other contributors, a maintainer of the project has to approve the pull request.

# Before You Contribute

* Check that there is an existing issue in GitHub issues
* Check if there are other pull requests that might overlap or conflict with your intended contribution

# How to Contribute

1. Fork the repository
2. Make some changes on a branch on your fork
3. Create a pull request from your branch

In your pull request, outline:

* What the changes intend
* How they change the existing code
* If (and what) they breaks
* Start the pull request with the GitHub issue ID, e.g. #123

Lastly, please follow the [pull request template](.github/pull_request_template.md) when submitting a pull request!

Each commit message that is not part of a pull request:

* Should contain the issue ID like `#123`
* Can contain the tag `[trivial]` for trivial changes that don't relate to an issue



## Coding Styleguides

We enforce a coding styleguide using `eslint`. As part of your build, run `npm run lint` to check if your code is conforming to the style guide. We do the same for every PR in our CI, so PRs will get rejected if they don't follow the style guide.

You can fix some of the issues automatically by running `npx eslint . --fix`.

## Playwright end-to-end and visual tests

Pull requests run Playwright against the AEM preview for the pull request's branch. The workflow derives the preview URL from the selected branch using this pattern:

```text
https://<branch>--adp-devsite-stage--adobedocs.aem.page
```

The workflow tests the component reference pages under `/dev-docs-reference/blocks/`. Playwright reports and failure diagnostics are available as workflow artifacts.

### When to update visual snapshots

Do not update a snapshot merely because a visual test failed. First determine whether the difference is an unintended regression or an intentional design change.

- **Unintended difference:** fix the implementation and leave the existing snapshot unchanged.
- **Intentional visual change:** generate, inspect, and commit an updated Linux snapshot.
- **Behavior-only change:** do not update snapshots unless the rendered component intentionally changed.

Snapshot updates are never accepted automatically by pull request CI. The changed PNG files are part of the reviewable pull request.

### Generate snapshots with GitHub Actions

GitHub Actions is the canonical way to generate snapshots:

1. Push the component changes to your branch. The branch must be available remotely before AEM can serve its scripts and styles.
2. Open **Actions → Playwright → Run workflow**.
3. Select the branch containing your changes.
4. Enable **Generate Linux visual baselines instead of comparing them**.
5. Run the workflow. The AEM base URL is derived from the selected branch; no URL needs to be entered.
6. Download the `playwright-linux-snapshots-<commit>` artifact.
7. Inspect every generated image. Confirm that it represents the intended design rather than a loading failure, missing font, or unrelated page change.
8. Copy the images into the corresponding `tests/playwright/**/*-snapshots/` directory, then commit and push them.
9. Let the normal pull request workflow run again. It must pass by comparing the branch against the committed snapshots.

For example, Accordion baselines belong in:

```text
tests/playwright/blocks/accordion.spec.mjs-snapshots/
```

### Generate snapshots locally with Act

Act is an optional faster path for contributors with Docker installed. The repository's `.actrc` forces Linux AMD64 and the workflow uses the same pinned Playwright Docker image as GitHub Actions.

To generate snapshots from unpushed changes, start the local AEM development server in one terminal:

```bash
npm run dev:aem
```

After the server is available at `http://localhost:3001`, run the workflow from another terminal:

```bash
rm -rf .act-artifacts
act workflow_dispatch \
  -W .github/workflows/playwright.yml \
  --input playwright_base_url=http://host.docker.internal:3001 \
  --input update_snapshots=true
```

`host.docker.internal` lets the Playwright container reach port 3001 on the host when using Docker Desktop. Do not use `localhost` for this case because it refers to the workflow container itself.

Act writes the generated snapshot and report artifacts under `.act-artifacts/`. Extract the snapshot artifact directly into the Playwright test directory, then inspect every PNG before committing it:

```bash
snapshot_artifact=$(find .act-artifacts -name 'playwright-linux-snapshots-*.zip' -print -quit)
unzip -o "$snapshot_artifact" -d tests/playwright
```

To run Act against the current branch's deployed AEM preview instead, omit `playwright_base_url`. This requires pushing the branch first so that its preview is available.

GitHub Actions remains authoritative: after pushing locally generated snapshots, the normal pull request workflow must still pass.

### Run Playwright during development

With the local AEM server running at the configured default URL:

```bash
npm run test:e2e
```

To test an explicit deployed preview locally without Act:

```bash
PLAYWRIGHT_BASE_URL='https://<branch>--adp-devsite-stage--adobedocs.aem.page' npm run test:e2e
```

Useful commands:

```bash
npm run test:e2e:ui
npx playwright show-report
npx playwright show-trace test-results/**/trace.zip
```

## Commit Message Format

This project uses a structured commit changelog format that should be used for every commit. Use `npm run commit` instead of your usual `git commit` to generate commit messages using a wizard.

```bash
# either add all changed files
$ git add -A
# or selectively add files
$ git add package.json
# then commit using the wizard
$ npm run commit
```

# How Contributions get Reviewed

One of the maintainers will look at the pull request within one week. Feedback on the pull request will be given in writing, in GitHub.

# Release Management

The project's committers will release to the [Adobe organization on npmjs.org](https://www.npmjs.com/org/adobe).
Please contact the [Adobe Open Source Advisory Board](https://git.corp.adobe.com/OpenSourceAdvisoryBoard/discuss/issues) to get access to the npmjs organization.

The release process is fully automated using `semantic-release`, increasing the version numbers, etc. based on the contents of the commit messages found.

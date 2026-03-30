# EDS Release Notes

Source: [PR #579 — EDS release March 30th, 2026](https://github.com/AdobeDocs/adp-devsite/pull/579) (`stage` → `main`).

## 3/30/26 EDS Release:

- GetCredential Fixes:

  - **Fix:** credential design issue

  - **Fix:** sign-in component problem

  - **Fix:** component loading issue

  - **Fix:** populate `templateData.apis` from the template response before credential creation (template install / license configuration)

    - `fetchTemplateEntitlement()` loads the full template, including APIs with `licenseConfigs`, but that data was not always stored on `templateData`, leaving `templateData.apis` undefined.
    - The `/install` endpoint could receive an empty `apis` array and fail with errors such as “Service CJA SDK requires selection of a product”.
    - Ensures `fetchTemplateEntitlement()` runs in the relevant auth flows so API data is available, and maps only the required `licenseConfig` fields (`id`, `productId`, `op`) in the install request payload.

- **Fix:** “On this page” styles

- Data Playground Fixes:

  - **Fix:** code playground metadata and script updates

    - [DEVSITE-2304](https://jira.corp.adobe.com/browse/DEVSITE-2304)

- **Fix:** dropdown width, selector, and description max width

  - [DEVSITE-2295](https://jira.corp.adobe.com/browse/DEVSITE-2295), [DEVSITE-2305](https://jira.corp.adobe.com/browse/DEVSITE-2305)

- **Feat:** enforce Node 24+ via `.npmrc` and the `engines` field

  - [DEVSITE-2296](https://jira.corp.adobe.com/browse/DEVSITE-2296)

- **Fix:** reverse image and text order in columns

  - [DEVSITE-2301](https://jira.corp.adobe.com/browse/DEVSITE-2301), [DEVSITE-2303](https://jira.corp.adobe.com/browse/DEVSITE-2303)

- **Fix:** rename `B_app_PremierePro.svg` to `premierepro.svg`

- Embed and media fixes:

  - **Fix:** embed layout and related design issues

    - [DEVSITE-2276](https://jira.corp.adobe.com/browse/DEVSITE-2276), [DEVSITE-2303](https://jira.corp.adobe.com/browse/DEVSITE-2303)

  - **Fix:** video layout (including extra letterboxing) and shorts vs video behavior

    - [DEVSITE-2276](https://jira.corp.adobe.com/browse/DEVSITE-2276), [DEVSITE-2303](https://jira.corp.adobe.com/browse/DEVSITE-2303)

  - **Fix:** remove stray console logging in embed/video paths

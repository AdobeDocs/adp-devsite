# Adobe Developer Website

This repository provides the shared theme and page elements for the Adobe Developer Website on AEM Edge Delivery Services (EDS). A page is classified as either DevDocs or DevBiz, never both.

## Language

**DevDocs**:
Pages whose content is authored as Markdown in a GitHub repository. The term identifies an authoring path, not necessarily the subject of the page or the team that wrote it.

**DevBiz**:
Pages whose content is authored as Google Docs files in Google Drive. The term identifies an authoring path, not necessarily the subject of the page or the team that wrote it.

**Block**:
A reusable page element used in DevDocs, DevBiz, or both; its available options can differ between the two.
_Avoid_: component (a broader term that also covers code under `hlx_statics/components/`)

**EDS**:
AEM Edge Delivery Services, the platform on which both DevDocs and DevBiz pages are delivered.

**dev-docs-reference**:
The [reference site](https://main--adp-devsite-stage--adobedocs.aem.page/dev-docs-reference/) for DevDocs blocks, available only on stage URLs. Its content lives in the [dev-docs-reference repository](https://github.com/AdobeDocs/dev-docs-reference).

**sidekick-library**:
The [AEM Sidekick Library](https://main--adp-devsite--adobedocs.aem.page/tools/sidekick/library.html) used to explore blocks for DevBiz pages during Google Docs authoring. It is available only on production URLs.

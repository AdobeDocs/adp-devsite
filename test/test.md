## Test Instructions

### Terminal Commands:
- `npm run test` : run all tests once and gernate test coverage report at coverage/lcov-report/index.html
- `npm run test:watch`: run all(or focused only) test on any(or focused only) test file changes

## Issues Found During Test
### Common Issues:
- Error *Cannot access 'IS_DEV_DOCS' before initialization*
    - Circular Dependency Invovled
    - Test files import {decorateBlock, loadBlock } from lib-helix.js.  
    lib-helix exports const IS_DEV_DOCS, which is imported by scripts.js.  
    So node.js will eagerly run all lines of code in scripts.js, including the last line `loadPage()`  
    loadPage() will use IS_DEV_DOCS before its value is ready.
- Manual Decoration Required
    - To load the correct blocks, test file should call **EVERY** necessary decorate function in lib-helix.js, including `decorateBlock()` and `decorateButton()`.

### Blcok Specific Issues
**announcement.js**  
- line 17 - 31
    - Function `rearrangeLinks()` not testable
    - The source code heml is no longer using `<ul>` tag for link list
    - `leftDiv.querySelectorAll('ul')` will get null and can not run through the forEach

**product-card.js**
- line 17
    - Linter will insert a line break between "View" and "doc" in product-card.js

**mini-resource-card.js**
- line 49 - 55:
    - The parent-child relation has been changed here
    - To test if the `up` and `container` is correctly appended, need to store up and conainter before decoration

- line 90 - 92:
    - `para.scrollHeight` and `para.clientHeight` are both 0 in the test case
    - Can't run through the if statement to cover line 91

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
    - The source code html is no longer using `<ul>` tag for link list
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


**link-block.js**
- line 13 - 24
    - The source code html is no longer using `<li>` tag for link list
    - `block.querySelectorAll('li')` will get null and can not run through the forEach
- line 33 -37
    - The source code html is no longer using class `sub-parent`
    - `document.querySelector('.sub-parent')` will get null in line 26
    - Can't run through `Array.from(subParent.children).forEach` if subParent is null

**summary.js**
- line 24 - 28:
    - Parent-child relation is changed
    - Need to reserve the innerDiv and outerDiv before decoration to test
- line 34 - 35, 42, 45:
    - Class `pirmarybutton` is assigned to block
    - The block with `primaybutton` does not have `<p>` tag, so cann't go through the forEach at line 34
    - Should check `block.classList.contains('primarybutton')` outside any contional statement

**title.js**:
- line 8 & 16 - 18:
    - No element has attribute `data-Padding`
    - The `if(padding)` will always be false
- line 9 & 19 - 21:
    - No element has attribute `data-ContentAlign`

**info-columns.js**
- line 29 - 37:
    - The div `info-column` does not have any `<p>` child
    - The  `querySelectorAll('p')` will get null in line 29
    - Can't run through the forEach()
- line 42 - 48:
    - The `querySelectorAll('div > div.info-column')` statement are inside the forEach of `info-column`
    - The querySelector will get null
    - Should move this outside of `info-column`'s forEach and do querySelector for block instead of column

**card.js**:
- line 58 - 62:
    - This can be safely deleted without effecting the display of block

**columns.js**
- line 40 - 43:
    - Class name 'columns-container' is assigned by the wrapper function
    - If remove the parent div of the block, the console.error will trigger

- line 60 - 64:
    - The if statement always gets false

- line 99 - 106:
    - No element had class name "button"
    - `querySelectorAll('.button')` gets empty list

- line 112 - 119:
    - Block class list does not contain 'test-align-center'

- line 124 - 128:
    - All section have at least a `<h3>` tag
    - The if statement always get false

**info-card.js**
- line 14 & 85
    - No element has class name `primarybutton`
- line 45
    - uncessary `row.querySelector('a')`
- line 47
    - Inappropriate naming `anchorHref`, should be `anchor` instead
- line 54
    - `row.querySelector('a')` never gets `null`
    - Unreachable `else` statement
-line 60
    - unnecessary `row.querySelector('.info-card > div > div:last-child');`
- line 77 - 83
    - No element has class name `icon`



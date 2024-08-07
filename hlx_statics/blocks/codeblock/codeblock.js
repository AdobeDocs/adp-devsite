import { toClassName } from '../../scripts/lib-helix.js';
import decoratePreformattedCode from '../../components/code.js';

// copied from https://github.com/adobe/aem-block-collection/blob/main/blocks/tabs/tabs.js, then edited
function decorateTabs(block) {
  // build tablist
  const tablist = document.createElement('div');
  tablist.className = 'tabs-list';
  // tablist.classList.add('spectrum-Tabs', 'spectrum-Tabs--sizeM', 'spectrum-Tabs--horizontal', 'spectrum-Tabs--quiet');
  tablist.setAttribute('role', 'tablist');

  // decorate tabs and tabpanels
  const tabs = [...block.children].map((child) => child.firstElementChild);
  tabs.forEach((tab, i) => {
    const id = toClassName(tab.textContent);

    // decorate tabpanel
    const tabpanel = block.children[i];
    tabpanel.className = 'tabs-panel';
    tabpanel.id = `tabpanel-${id}`;
    tabpanel.setAttribute('aria-hidden', !!i);
    tabpanel.setAttribute('aria-labelledby', `tab-${id}`);
    tabpanel.setAttribute('role', 'tabpanel');
    decoratePreformattedCode({ block: tabpanel, language: 'javascript' });

    // build tab button
    const button = document.createElement('button');
    button.className = 'tabs-tab';
    // button.classList.add('spectrum-Tabs-itemLabel');
    button.id = `tab-${id}`;
    button.innerHTML = tab.innerHTML;
    button.setAttribute('aria-controls', `tabpanel-${id}`);
    button.setAttribute('aria-selected', !i);
    button.setAttribute('role', 'tab');
    button.setAttribute('type', 'button');
    button.addEventListener('click', () => {
      block.querySelectorAll('[role=tabpanel]').forEach((panel) => {
        panel.setAttribute('aria-hidden', true);
      });
      tablist.querySelectorAll('button').forEach((btn) => {
        btn.setAttribute('aria-selected', false);
      });
      tabpanel.setAttribute('aria-hidden', false);
      button.setAttribute('aria-selected', true);
    });
    tablist.append(button);
    tab.remove();
  });

  block.prepend(tablist);
}

export default function decorate(block) {
  const slots = block?.parentElement?.parentElement?.getAttribute('data-slots');
  const repeat = block?.parentElement?.parentElement?.getAttribute('data-repeat');
  const languages = block?.parentElement?.parentElement?.getAttribute('data-languages');
  console.log('~~ ', { slots, repeat, languages });
  decorateTabs(block);
}

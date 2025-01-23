import { toClassName } from '../../scripts/lib-helix.js';
import decoratePreformattedCode from '../../components/code.js';

export default function decorate(block) {
  const handleSelectChange = () => {
    // show tabpanel associated with selected option
    const panels = [...block.querySelectorAll('[role=tabpanel]')];
    panels.forEach((panel, i) => {
      panel.classList.toggle('hidden', i !== select.selectedIndex);
    });
  }

  const filterSelectOptions = (clickedTabId) => {
    const clickedTab = block.querySelector(`[role=tab][id='${clickedTabId}']`);
    const clickedTabIndex = clickedTab.getAttribute('index');
    let panelIndexToShow;
    if(areTabsGrouped) {
      // one (grouped) tab maps to many options
      const options = [...select.options];   
      // show options associated with the clicked tab
      const clickedTabHeading = options[clickedTabIndex].getAttribute('heading');   
      options.forEach((option, i) => { 
        const heading =  options[i].getAttribute('heading');
        option.classList.toggle('hidden', heading !== clickedTabHeading);
      });
      // select the first option 
      const firstVisibleOptionIndex =  options.findIndex(option => !option.classList.contains('hidden'));
      panelIndexToShow = firstVisibleOptionIndex;
    } else {
      // one (non-grouped) tab maps to one option
      panelIndexToShow = clickedTabIndex;
    }
    select.selectedIndex = panelIndexToShow;
    handleSelectChange();
  }

  const handleTabClick = (event) => {
    const clickedTab = event.target.closest('[role=tab]');
    const clickedTabIndex = clickedTab.getAttribute('index');
    const tabs = [...block.querySelectorAll('[role=tab]')];
    tabs.forEach(tab => {
      const tabIndex = tab.getAttribute('index');
      tab.setAttribute('aria-selected', tabIndex === clickedTabIndex);
    });
    filterSelectOptions(clickedTab.id);
  }
  
  // remove from block as these divs will be recreated as buttons
  const tabContents = [...block.children].map(child => child.firstElementChild);
  tabContents.forEach((tabContent) => {
    tabContent.remove();
  });

  // get from block before additional children are added
  const panels = [...block.children].slice(0, tabContents.length);

  const languages = block.getAttribute('data-languages')?.split(',').map(language => language.trim()) ?? [];
  const areTabsGrouped = languages.length > 0;
  const selectId = 'select-language';
  
  const controlBar = document.createElement('div');
  controlBar.className = 'control-bar';
  block.prepend(controlBar);

  const tabs = document.createElement('div');
  tabs.className = 'tabs-list';
  tabs.setAttribute('role', 'tablist');
  controlBar.append(tabs);
  
  tabContents.forEach((tabContent, i) => {
    const tab = document.createElement('button');
    tab.className = 'tabs-tab';
    tab.id = `tab-${i}`;
    tab.setAttribute('index', i);
    tab.setAttribute('aria-controls', selectId);
    tab.setAttribute('role', 'tab');
    tab.setAttribute('type', 'button');
    tab.innerHTML = tabContent.innerHTML;
    tab.addEventListener('click', handleTabClick);

    const isGroupAdded = [...tabs.children].find(existingTab => tab.textContent === existingTab.textContent);
    if(!areTabsGrouped || !isGroupAdded) {
      tabs.append(tab);
    }
  });
  
  const select = document.createElement('select');
  select.id = selectId;
  select.classList.toggle('hidden', !areTabsGrouped);
  select.addEventListener('change', handleSelectChange);
  controlBar.append(select);

  tabContents.forEach((tabContent, i) => {
    const option = document.createElement('option');
    option.id = `option-${i}`;
    option.value = i;
    option.setAttribute('heading', toClassName(tabContent.textContent));
    option.setAttribute('aria-controls', `tabpanel-${i}`);
    option.text = languages[i] ?? i;
    select.append(option); 
  })

  panels.forEach((panel, i) => {
    panel.className = 'tabs-panel';
    panel.id = `tabpanel-${i}`;
    panel.setAttribute('aria-labelledby', `tab-${i} option-${i}`);
    panel.setAttribute('role', 'tabpanel');
    decoratePreformattedCode(panel);
  });

  // initialize by simulating a click on the first tab
  document.getElementById('tab-0').click();
}

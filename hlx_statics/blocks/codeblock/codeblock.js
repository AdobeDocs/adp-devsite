import { toClassName } from '../../scripts/lib-helix.js';
import decoratePreformattedCode from '../../components/code.js';

export default function decorate(block) {
  const handleSelectChange = () => {
    const selectedOption = select.options[select.selectedIndex];
    const selectedHeading = selectedOption?.getAttribute('heading');
    const panels = [...block.querySelectorAll('[role=tabpanel]')];
    const tabs = [...block.querySelectorAll('[role=tab]')];
    const tabIndexToSelect = areTabsGrouped
      ? tabs.findIndex((tab) => tab.getAttribute('heading') === selectedHeading)
      : select.selectedIndex;

    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', i === tabIndexToSelect);
    });

    panels.forEach((panel, i) => {
      panel.classList.toggle('hidden', i !== select.selectedIndex);
    });
  };

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

  const languages = block.getAttribute('data-languages')?.split(',').map((language) => language.trim()).filter(Boolean) ?? [];
  const areTabsGrouped = languages.length > 1 && languages.length === tabContents.length;
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
    tab.setAttribute('heading', toClassName(tab.textContent));
    tab.addEventListener('click', handleTabClick);

    const isGroupAdded = [...tabs.children].find(existingTab => tab.textContent === existingTab.textContent);
    if(!areTabsGrouped || !isGroupAdded) {
      tabs.append(tab);
    }
  });
  
  const rightControls = document.createElement('div');
  rightControls.className = 'right-controls';
  controlBar.append(rightControls);

  const select = document.createElement('select');
  select.id = selectId;
  if(!hasLanguagesParam) {
    select.style.display = 'none';
  } else {
    select.addEventListener('change', handleSelectChange);
  }
  rightControls.append(select);

  // set up customizable select (as opposed to classic which can't be styled) as described in https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Customizable_select
  const selectButton = document.createElement('button');
  selectButton.append(document.createElement('selectedcontent'));
  select.append(selectButton);

  tabContents.forEach((tabContent, i) => {
    const option = document.createElement('option');
    option.id = `option-${i}`;
    option.value = i;
    option.setAttribute('heading', toClassName(tabContent.textContent));
    option.setAttribute('aria-controls', `tabpanel-${i}`);
    option.text = languages[i] || tabContent.textContent.trim() || `Tab ${i + 1}`;
    select.append(option); 
  });

  panels.forEach((panel, i) => {
    panel.className = 'tabs-panel';
    panel.id = `tabpanel-${i}`;
    panel.setAttribute('aria-labelledby', `tab-${i} option-${i}`);
    panel.setAttribute('role', 'tabpanel');
    decoratePreformattedCode(panel);
  });

  const collapseToggle = document.createElement('button');
  collapseToggle.className = 'collapse-toggle';
  collapseToggle.setAttribute('type', 'button');
  collapseToggle.setAttribute('aria-label', 'Collapse code');
  collapseToggle.setAttribute('aria-expanded', 'true');
  collapseToggle.textContent = 'Hide';
  collapseToggle.addEventListener('click', () => {
    const isCollapsed = block.classList.toggle('collapsed');
    collapseToggle.setAttribute('aria-expanded', String(!isCollapsed));
    collapseToggle.setAttribute('aria-label', isCollapsed ? 'Expand code' : 'Collapse code');
    collapseToggle.textContent = isCollapsed ? 'Show' : 'Hide';
  });
  rightControls.append(collapseToggle);

  // initialize by simulating a click on the first tab
    const firstTab = block.querySelector('[role=tab]');
    if (firstTab) {
      firstTab.click();
    }
}

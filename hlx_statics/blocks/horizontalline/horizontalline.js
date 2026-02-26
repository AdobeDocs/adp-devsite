/**
 * Builds all hr blocks inside a container
 * @param {*} container The container to inspect
 */
export default async function decorate(block) {
  const hrWrappers = block.querySelectorAll('main div.horizontalline-wrapper div.horizontalline');

  hrWrappers.forEach(hrWrapper => {
    const hr = document.createElement('hr');
    hrWrapper.innerHTML = ''
    hrWrapper.appendChild(hr)
  });
}

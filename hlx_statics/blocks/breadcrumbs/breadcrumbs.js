import { getMetadata, 
  // fetchNavHtml 
} from '../../scripts/lib-helix.js';

export default async function decorate(block) {
  const icon = `
      <svg aria-hidden='true' role='img' class='spectrum-Breadcrumbs-itemSeparator spectrum-Icon spectrum-UIIcon-ChevronRight75'>
        <path
          d="M7.482 4.406l-.001-.001L3.86.783a.84.84 0 00-1.188 1.188L5.702 5l-3.03 3.03A.84.84 0 003.86 9.216l3.621-3.622h.001a.84.84 0 000-1.19z">
        </path>
      </svg>
    `;

  const expectedPages = [
    {title: "Products", href: "/apis/"},
    {title: "Developer Console", href: "/developer-console/"},
    {title: "Documentation", href: "/developer-console/docs/guides/"},
    {title: "Developer Console", href: "/developer-console/docs/guides/"},
    {title: "Getting Started", href: "/developer-console/docs/guides/getting-started/"},
  ];

  const pages = expectedPages; // TODO

  const pathPrefix = getMetadata('pathprefix');
  console.log('~~ location', window.location.pathname, pathPrefix);

  // const html = await fetchNavHtml();  
  // var doc = new DOMParser().parseFromString(html, "text/xml");
  // console.log('~~ document', doc);

  const showBreadcrumbs = getMetadata('hideBreadcrumbNav') !== 'true'; // TODO
  if(showBreadcrumbs) {
    const nav = document.createElement('nav');
    nav.ariaLabel = "Breadcrumb";
    nav.role = "navigation";
    block.append(nav);

    const ul = document.createElement('ul');
    ul.classList.add('spectrum-Breadcrumbs');
    nav.append(ul);

    const lis = pages.map(page => {
      const a = document.createElement('a');
      a.classList.add('spectrum-Breadcrumbs-itemLink');
      a.innerText = page.title;
      a.href = page.href;

      const li = document.createElement('li');
      li.classList.add('spectrum-Breadcrumbs-item');
      li.append(a);
      li.insertAdjacentHTML("beforeend", icon);

      return li;
    })
    ul.append(...lis);
  }
}
  
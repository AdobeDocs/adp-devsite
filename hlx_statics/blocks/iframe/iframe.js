import {
  createTag,
  addExtraScriptWithReturn,
} from "../../scripts/lib-adobeio.js";
import { IS_DEV_DOCS } from "../../scripts/lib-helix.js";

function penpalOnLoad() {
  const createConnection = () => {
    const penpalIframe = document.querySelector("#penpalIframe");
    const connection = window.Penpal.connectToChild({
      // The iframe to which a connection should be made
      iframe: penpalIframe,
      // Manually set origin as auto-detection may fail, as the src of the iframe is set later
      //childOrigin: isExternalLink(src) ? new URL(src).origin : window.origin,
      // Methods the parent is exposing to the child
      methods: {
        setOverflow(overflow) {
          document.body.style.overflow = overflow;
        },
        scrollTop(position = 0) {
          if (document?.scrollingElement) {
            document.scrollingElement.scrollTop = position;
          }
        },
        getURL() {
          return window?.location?.href;
        },
        setURL(url) {
          if (window?.location) {
            window.location = url;
          }
        },
        setHash(hash) {
          if (window?.location) {
            window.location.hash = hash;
          }
        },
        setQueryParams(queryString) {
          if (window?.history) {
            const url = new URL(window.location.href);
            new URLSearchParams(queryString).forEach((v, k) => {
              url.searchParams.set(k, v);
            });
            window.history.replaceState(null, "", url.toString());
          }
        },
        setHeight(height) {
          penpalIframe.style.height = height;
        },
        getIMSAccessToken() {
          if (window.adobeIMS?.isSignedInUser()) {
            return window.adobeIMS.getAccessToken();
          }

          return null;
        },
        getIMSProfile() {
          if (window.adobeIMS?.isSignedInUser()) {
            return window.adobeIMS.getProfile();
          }

          return null;
        },
        signIn() {
          if (window.adobeIMS && !window.adobeIMS.isSignedInUser()) {
            window.adobeIMS.signIn();
          }
        },
        signOut() {
          if (window.adobeIMS && window.adobeIMS.isSignedInUser()) {
            window.adobeIMS.signOut();
          }
        },
        getIMSClientId() {
          if (window.adobeIMS) {
            return window.adobeIMS.adobeIdData.client_id;
          } else {
            return null;
          }
        },
        onSignIn(signinCallback) {
          window.addEventListener("imsSignIn", signinCallback);
        },
      },
    });

    connection.promise.then((child) => {
      if (penpalIframe.clientHeight === 0) {
        child.onHide();
      } else {
        child.onShow();
      }

      // Notify child when user navigates Back/Forward and the hash changes.
      // Uses optional chaining — safe for iframes that don't implement onHashChange.
      window.addEventListener("hashchange", () => {
        child.onHashChange?.(window.location.hash);
      });
    });

    return connection;
  };

  if (window.Penpal) {
    const connection = createConnection();
  }
}

/**
 * decorates the iframe
 * @param {Element} block The hero block element
 */
export default async function decorate(block) {
  const penpalScript = addExtraScriptWithReturn(
    document.body,
    "https://unpkg.com/penpal@^6/dist/penpal.min.js",
  );
  const iframeSrc = block.querySelector("a");
  const iframeContainer = block.parentElement;
  const title =
    block?.parentElement?.parentElement?.attributes.getNamedItem(
      "data-title",
    )?.value;

  // get all the block options and add them to the iframe class list
  const classListArray = [...block.classList];
  const classesToExclude = ["iframe", "block"];

  let filteredClassList = classListArray.filter((theClass) => {
    return !classesToExclude.some((excludedClass) =>
      theClass.includes(excludedClass),
    );
  });
  filteredClassList.push("iframe-container");

  const params = new URLSearchParams(window.location.search);

  const currentHash = window.location.hash; // e.g. "#section" or ""

  // Build iframe src using URL constructor to safely handle any pre-existing
  // hash or query params in the authored src value.
  let iframeSrcUrl;
  if (IS_DEV_DOCS) {
    iframeSrcUrl = new URL(block.getAttribute("data-src"));
  } else {
    iframeSrcUrl = new URL(iframeSrc.href);
    params.forEach((value, key) => iframeSrcUrl.searchParams.set(key, value));
  }
  if (currentHash) {
    iframeSrcUrl.hash = currentHash;
  }

  const iframe = createTag("iframe", {
    title: title,
    class: filteredClassList.join(" "),
    src: iframeSrcUrl.toString(),
    id: "penpalIframe",
  });

  penpalScript.onload = () => {
    iframeContainer.append(iframe);
    penpalOnLoad();
  };
  block.remove();
}

import { setConfig as setNxConfig } from 'https://da.live/nx2/scripts/nx.js';
import { loadArea, loadBlock, setConfig, loadStyle } from './nx.js';
import { setPlaceholders } from './lab-placeholders.js';

await loadStyle('https://da.live/nx2/styles/styles.css');

const hostnames = ['adobelabs.dev'];

// Supported locales
const locales = { '': { ietf: 'en', title: 'English', lang: 'en', tk: 'etj3wuq.css' } };

const linkBlocks = [];

const imsClientId = 'adobelabs';
const imsScope = 'ab.manage,AdobeID,gnav,openid,org.read,read_organizations,session,additional_info.ownerOrg,additional_info.projectedProductContext,account_cluster.read';

// Widget patterns to look for
const widgets = [
  { fragment: '/fragments/' },
  { youtube: 'https://www.youtube' },
];

const conf = {
  hostnames,
  locales,
  imsClientId,
  imsScope,
  linkBlocks,
};

const initIms = (() => {
  let details;
  return () => {
    details ??= (async () => {
      try {
        const module = await import('https://da.live/nx2/utils/ims.js');
        const loaded = await module.loadIms();
        return loaded;
      } catch {
        return null;
      }
    })();
    return details;
  };
})();

function decorateLinks(area) {
  const anchors = area.querySelectorAll('a');
  for (const a of anchors) {
    const { href } = a;
    const url = new URL(href);
    if (url.origin.includes('.da.') && url.hostname.includes('--')) {
      url.hostname = url.hostname.replace('.da.', '.aem.');
      a.href = url.toString();
    }
    if (url.origin !== window.location.origin) {
      a.setAttribute('target', '_blank');
    }
  }
}

// How to decorate an area before loading it
const decorateArea = async ({ area = document }) => {
  const eagerLoad = (parent, selector) => {
    const img = parent.querySelector(selector);
    img?.removeAttribute('loading');
  };

  decorateLinks(area);
  eagerLoad(area, 'img');

  // Set IMS-based placeholders
  const details = await initIms();
  if (details) setPlaceholders(area, details.email);
};

function detectTutorial() {
  const { classList } = document.body;
  if (!classList.contains('tutorial-template')) return;
  const section = document.createElement('div');
  const block = document.createElement('div');
  block.className = 'tutorial-nav';
  section.append(block);
  document.querySelector('main').append(section);
}

const loadNav = async (name) => {
  const position = name === 'sitenav' ? 'beforebegin' : 'afterend';
  const main = document.querySelector('main');
  const nav = document.createElement('nav');
  nav.dataset.status = 'decorated';
  nav.className = name;
  main.insertAdjacentElement(position, nav);
  await loadBlock(nav);
};

function setColorScheme() {
  const { classList } = document.body;
  const hasScheme = classList.contains('light-theme') || classList.contains('dark-theme');
  if (hasScheme) return;
  const scheme = matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark-theme'
    : 'light-theme';
  classList.add(scheme);
}

(async function loadPage() {
  if (localStorage.getItem('sitenav-collapsed') === 'true') {
    document.body.classList.add('sitenav-collapsed');
  }
  await setNxConfig(conf);
  setColorScheme();
  detectTutorial();

  setConfig({ locales, widgets, decorateArea });

  // AK functions
  await loadArea();

  // Lazy project functions
  loadNav('sitenav');
  loadNav('pagenav');
}());

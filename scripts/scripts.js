import { loadArea, loadBlock, setConfig } from './nx.js';

// Supported locales
const locales = {
  '': { ietf: 'en', tk: 'etj3wuq.css' },
  '/de': { ietf: 'de', tk: 'etj3wuq.css' },
};

// Widget patterns to look for
const widgets = [
  { fragment: '/fragments/' },
  { youtube: 'https://www.youtube' },
];

// How to decorate an area before loading it
const decorateArea = ({ area = document }) => {
  const eagerLoad = (parent, selector) => {
    const img = parent.querySelector(selector);
    img?.removeAttribute('loading');
  };

  eagerLoad(area, 'img');
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
  setConfig({ locales, widgets, decorateArea });

  // Project functions
  setColorScheme();
  detectTutorial();

  // AK functions
  await loadArea();

  // Lazy project functions
  loadNav('sitenav');
  loadNav('pagenav');
}());

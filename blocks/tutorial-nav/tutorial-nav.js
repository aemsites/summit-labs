import { getConfig } from '../../scripts/nx.js';

const { codeBase } = getConfig();

function getNumber(text) {
  const num = Number(text);
  const isNum = Number.isFinite(num);
  if (!isNum) return null;
  return num;
}

async function fetchSiteData() {
  const resp = await fetch(`${codeBase}/query-index.json`);
  if (!resp.ok) throw Error('Could not fetch query index');
  const { data } = await resp.json();
  return data;
}

function buildCard(direction, entry) {
  const { path, title } = entry;
  const dirEl = document.createElement('p');
  dirEl.className = 'tutorial-card-direction';
  dirEl.textContent = direction;

  const titleEl = document.createElement('p');
  titleEl.className = 'tutorial-card-desc';
  titleEl.textContent = title;

  const a = document.createElement('a');
  a.className = 'tutorial-nav-card';
  a.href = path;
  a.append(dirEl, titleEl);

  return a;
}

function getMainNext(pageList, pathname) {
  // Determine if the tree is index based (page-name/) or name base (page-name)
  const sanitizedPath = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  let nextEntry = pageList.find((page) => page.path === `${sanitizedPath}/1`);
  if (!nextEntry) {
    return null;
  }
  const nextCard = buildCard('Next', nextEntry);
  const nav = document.createElement('nav');
  nav.className = 'tutorial-nav one-card';
  nav.append(nextCard);
  return nav;
}

function getNumNextPrev(pageList, pathSplit, pagenum) {
  const cards = [];

  const basePath = `/${pathSplit.join('/')}`;

  const prevPath = pagenum === 1 ? basePath : `${basePath}/${pagenum - 1}`;
  console.log(prevPath);

  const prevEntry = pageList.find((page) => page.path === prevPath || page.path === `${prevPath}/`);
  if (prevEntry) cards.push(buildCard('Previous', prevEntry));

  const nextPath = `${basePath}/${pagenum + 1}`;
  let nextEntry = pageList.find((page) => page.path === nextPath || page.path === `${basePath}/conclusion`);
  if (nextEntry) cards.push(buildCard('Next', nextEntry));

  const cardCountClass = cards.length === 1 ? 'one-card' : '';

  const nav = document.createElement('nav');
  nav.className = `tutorial-nav ${cardCountClass}`;
  nav.append(...cards);

  return nav;
}

export default async function init(el) {
  const pageList = await fetchSiteData();

  const { pathname } = window.location;

  const toSplit = pathname.endsWith('/') ? pathname.slice(1).slice(0, -1) : pathname.slice(1);

  const pathSplit = toSplit.split('/');

  const pagename = pathSplit.pop();
  
  const pagenum = getNumber(pagename);
  const nav = pagenum
    ? getNumNextPrev(pageList, pathSplit, pagenum)
    : getMainNext(pageList, pathname);

  // If no nav, do nothing
  if (!nav) return;
  el.append(nav);
}

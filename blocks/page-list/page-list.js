import { getConfig } from '../../scripts/nx.js';

const { codeBase } = getConfig();

const DEFAULT_IMAGE = 'https://adobelabs.dev/media_197fd103d3332517ce59fb4590f838b4290bae8f9.png';

async function fetchSiteData() {
  const resp = await fetch(`${codeBase}/query-index.json`);
  if (!resp.ok) throw Error('Could not fetch query index');
  const { data } = await resp.json();
  return data.sort((a, b) => {
    const segmentsA = a.path.split('/').length - 1;
    const segmentsB = b.path.split('/').length - 1;
    return segmentsA - segmentsB;
  });
}

function createCards(siteData) {
  const cards = Object.keys(siteData).reduce((acc, key) => {
    const isPage = siteData[key].path === window.location.pathname;
    const notDescendant = !siteData[key].path.startsWith(window.location.pathname);
    const lastSegment = siteData[key].path.split('/').pop();
    const isNumberOnly = /^\d+$/.test(lastSegment);

    if (isPage || notDescendant || isNumberOnly) return acc;

    const card = document.createElement('li');
    card.classList.add('docket-page-list-card');

    const link = document.createElement('a');
    link.href = siteData[key].path;

    const imgContainer = document.createElement('div');
    imgContainer.className = 'docket-page-list-card-image';
    const img = document.createElement('img');
    img.src = DEFAULT_IMAGE;
    imgContainer.append(img);
    const textContainer = document.createElement('div');
    textContainer.className = 'docket-page-list-card-text-container';

    const title = document.createElement('p');
    title.classList.add('docket-page-list-card-title');
    title.innerText = siteData[key].title;

    const description = document.createElement('p');
    description.classList.add('docket-page-list-card-description');
    description.innerText = siteData[key].description;

    textContainer.append(title, description);
    link.append(imgContainer, textContainer);
    card.append(link);
    acc.push(card);

    return acc;
  }, []);
  const ul = document.createElement('ul');
  ul.classList.add('docket-page-list');
  ul.append(...cards);
  return ul;
}

export default async function init(el) {
  try {
    const siteData = await fetchSiteData();
    const cards = createCards(siteData);
    el.append(cards);
  } catch (err) {
    console.error(err);
  }
}

import { loadStyle } from '../../scripts/nx.js';
import { setConfig } from 'https://da.live/nx2/scripts/nx.js';

const hostnames = ['adobelabs.dev'];

const locales = {
  '': { title: 'English', lang: 'en' },
};

const linkBlocks = [
  { fragment: '/fragments/' },
];

const imsClientId = 'adobelabs';
const imsScope = 'ab.manage,AdobeID,gnav,openid,org.read,read_organizations,session,additional_info.ownerOrg,additional_info.projectedProductContext,account_cluster.read';

// How to decorate an area before loading it
const decorateArea = ({ area = document }) => {
  const eagerLoad = (parent, selector) => {
    const img = parent.querySelector(selector);
    if (!img) return;
    img.removeAttribute('loading');
    img.fetchPriority = 'high';
  };

  eagerLoad(area, 'img');
};

const conf = {
  hostnames,
  locales,
  imsClientId,
  imsScope,
  linkBlocks,
  decorateArea,
};

export default async function init() {
  await setConfig(conf);
  await loadStyle('https://da.live/nx2/styles/styles.css');
  await import('https://da.live/nx2/blocks/profile/profile.js');
  return document.createElement('nx-profile');
}

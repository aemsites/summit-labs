import { readAllSettings } from './workbook-settings.js';

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE']);
const PLACEHOLDER_ATTRS = ['href', 'placeholder', 'title', 'aria-label'];

function parseCredentials(email) {
  if (!email) return null;
  const match = email.match(/^(L\d+)-(\d+)@/);
  if (!match) return null;
  return { email, labId: match[1], seat: match[2] };
}

// IMS credential keys use different placeholder names than their object keys.
const CRED_KEY_MAP = { email: 'adobeid', labId: 'lab' };

function buildPlaceholderMap(values = {}) {
  const map = {};
  for (const [key, value] of Object.entries(values)) {
    if (!value) continue;
    const token = CRED_KEY_MAP[key] ?? key;
    map[`{${token}}`] = value;
    map[`%7B${token}%7D`] = value;
  }
  return map;
}

function replaceAll(text, map) {
  return Object.entries(map).reduce(
    (acc, [k, v]) => acc.split(k).join(v),
    text,
  );
}

function replaceInElement(area, creds) {
  if (!area) return;

  const map = buildPlaceholderMap(creds);

  (function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (SKIP_TAGS.has(node.parentElement?.tagName)) return;
      const replaced = replaceAll(node.textContent, map);
      if (replaced !== node.textContent) node.textContent = replaced;
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE && !SKIP_TAGS.has(node.tagName)) {
      for (const attr of PLACEHOLDER_ATTRS) {
        const val = node.getAttribute(attr);
        if (val) {
          const replaced = replaceAll(val, map);
          if (replaced !== val) node.setAttribute(attr, replaced);
        }
      }
    }
    node.childNodes.forEach(walk);
  }(area));
}

function needsSettings(area) {
  if (!area) return false;
  const html = area.innerHTML || area.documentElement?.innerHTML || '';
  // Any {token} or URL-encoded %7Btoken%7D pattern that isn't an IMS credential
  return /\{[a-zA-Z][a-zA-Z0-9]*\}|%7B[a-zA-Z][a-zA-Z0-9]*%7D/.test(html);
}

export function setPlaceholders(area, email) {
  const creds = parseCredentials(email);
  const workbookSettings = readAllSettings();

  if (!creds && !workbookSettings) return null;

  // Build extended creds object: IMS creds + any stored workbook settings
  const values = { ...creds };
  if (workbookSettings) Object.assign(values, workbookSettings);

  replaceInElement(area, values);
  return values;
}

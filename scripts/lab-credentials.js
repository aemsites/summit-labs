const SKIP_TAGS = new Set(['SCRIPT', 'STYLE']);
const PLACEHOLDER_ATTRS = ['href', 'placeholder', 'title', 'aria-label'];

function parseCredentials(email) {
  const match = email.match(/^(L\d+)-(\d+)@/);
  if (!match) return null;
  return { email, labId: match[1], seat: match[2] };
}

function buildPlaceholderMap({ email, labId, seat }) {
  return { '{adobeid}': email, '{lab}': labId, '{seat}': seat };
}

function replaceAll(text, map) {
  return Object.entries(map).reduce(
    (acc, [k, v]) => acc.split(k).join(v),
    text,
  );
}

function replacePlaceholdersInElement(creds, root = null) {
  const el = root ?? document.querySelector('main') ?? document.body;
  if (!el) return;

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
  }(el));
}

export function initLabCredentials(email) {
  const creds = parseCredentials(email);
  if (!creds) return null;
  replacePlaceholdersInElement(creds);
  return creds;
}

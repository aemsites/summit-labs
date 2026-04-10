const SKIP_TAGS = new Set(['SCRIPT', 'STYLE']);
const PLACEHOLDER_ATTRS = ['href', 'placeholder', 'title', 'aria-label'];

function parseCredentials(email) {
  if (!email) return null;
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

export function setPlaceholders(area, email) {
  const creds = parseCredentials(email);
  if (!creds) return null;
  replaceInElement(area, creds);
  return creds;
}

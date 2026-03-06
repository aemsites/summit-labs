/**
 * Adobe Lab Credentials Manager
 * Fetches and manages lab credentials from localhost server
 */

const CRED_SERVER_PORT = 8762;

export class LabCredentials {
  constructor() {
    this.email = null;
    this.labId = null;
    this.seatNumber = null;
  }

  /**
   * Load credentials from localhost server
   * @returns {Promise<boolean>} true if successful
   */
  async load() {
    try {
      const response = await fetch(`http://localhost:${CRED_SERVER_PORT}`, {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(3000)
      });
      
      if (response.ok) {
        this.email = (await response.text()).trim();
        
        if (!this.email) {
          console.warn('Received empty credentials from server');
          return false;
        }
        
        this.parseEmail();
        return true;
      } else if (response.status === 503) {
        console.warn('Lab credentials not yet available');
        return false;
      }
    } catch (error) {
      console.error('Could not load lab credentials:', error);
      return false;
    }
    return false;
  }

  /**
   * Parse email to extract lab ID and seat number
   * Format: L120-05@adobeeventlab.com
   */
  parseEmail() {
    const match = this.email.match(/^(L\d+)-(\d+)@/);
    if (match) {
      this.labId = match[1];        // "L120"
      this.seatNumber = match[2];   // "05" (already padded)
    }
  }

  /**
   * Get full email address
   * @returns {string|null} Email address (e.g., "L120-05@adobeeventlab.com")
   */
  getEmail() { 
    return this.email; 
  }
  
  /**
   * Get lab ID
   * @returns {string|null} Lab ID (e.g., "L120")
   */
  getLabId() { 
    return this.labId; 
  }
  
  /**
   * Get seat number
   * @returns {string|null} Seat number (e.g., "05")
   */
  getSeatNumber() { 
    return this.seatNumber; 
  }
  
  /**
   * Get consistent identifier for naming resources
   * @param {string} suffix - Optional suffix to append
   * @returns {string} Formatted identifier (e.g., "L120_S05_Segment")
   */
  getIdentifier(suffix = '') {
    return suffix ? `${this.labId}_S${this.seatNumber}_${suffix}` : `${this.labId}_S${this.seatNumber}`;
  }
}

/**
 * Build placeholder map for {seat}, {adobeid}, {lab}
 * @param {LabCredentials} creds
 * @returns {Object.<string, string>}
 */
function getPlaceholderMap(creds) {
  const seat = creds.getSeatNumber() ?? '';
  const adobeid = creds.getEmail() ?? '';
  const lab = creds.getLabId() ?? '';
  return {
    '{seat}': seat,
    '{adobeid}': adobeid,
    '{lab}': lab
  };
}

/**
 * Replace a string's placeholders with values from the map
 * @param {string} text
 * @param {Object.<string, string>} map
 * @returns {string}
 */
function replacePlaceholderString(text, map) {
  let result = text;
  Object.entries(map).forEach(([placeholder, value]) => {
    result = result.split(placeholder).join(value);
  });
  return result;
}

/** Elements we skip when walking (no placeholder replacement inside) */
const SKIP_TAG_NAMES = new Set(['SCRIPT', 'STYLE']);

/** Attributes in which we replace placeholders (e.g. href for login links) */
const PLACEHOLDER_ATTRS = ['href', 'placeholder', 'title', 'aria-label'];

/**
 * Replace {seat}, {adobeid}, {lab} in text nodes and safe attributes under root.
 * Skips SCRIPT and STYLE. Used for DA-authored content where authors type placeholders in prose and links.
 * @param {LabCredentials} creds
 * @param {Element} [root] - Defaults to main or document.body
 */
export function replacePlaceholdersInElement(creds, root = null) {
  const el = root ?? document.querySelector('main') ?? document.body;
  if (!el) return;

  const map = getPlaceholderMap(creds);

  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement;
      if (parent && SKIP_TAG_NAMES.has(parent.tagName)) return;
      const replaced = replacePlaceholderString(node.textContent, map);
      if (replaced !== node.textContent) node.textContent = replaced;
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (SKIP_TAG_NAMES.has(node.tagName)) return;
      PLACEHOLDER_ATTRS.forEach(attr => {
        const val = node.getAttribute(attr);
        if (val) {
          const replaced = replacePlaceholderString(val, map);
          if (replaced !== val) node.setAttribute(attr, replaced);
        }
      });
    }
    node.childNodes.forEach(walk);
  }

  walk(el);
}

/**
 * Initialize lab credentials and populate page
 * @returns {Promise<LabCredentials>} Credentials instance
 */
export async function initLabCredentials() {
  const creds = new LabCredentials();
  const success = await creds.load();
  
  if (success) {
    populateEmailFields(creds.getEmail());
    updateLoginLinks(creds.getEmail());
    displayCredentials(creds);
    replacePlaceholdersInElement(creds);

    // Make credentials available globally
    window.labCredentials = creds;
    
    // Dispatch event for other scripts that need credentials
    window.dispatchEvent(new CustomEvent('lab-credentials-loaded', {
      detail: { credentials: creds }
    }));
  } else {
    showCredentialsNotReady();
  }
  
  return creds;
}

/**
 * Auto-populate email input fields
 */
function populateEmailFields(email) {
  // Auto-fill any input fields marked with data-lab-email
  document.querySelectorAll('input[data-lab-email]').forEach(input => {
    input.value = email;
    input.setAttribute('readonly', true);
    input.classList.add('auto-populated');
  });
  
  // Display email in text elements
  document.querySelectorAll('[data-lab-email-display]').forEach(elem => {
    elem.textContent = email;
  });
}

/**
 * Update links with pre-filled credentials
 */
function updateLoginLinks(email) {
  document.querySelectorAll('a[data-auto-login]').forEach(link => {
    const url = new URL(link.href);
    url.searchParams.set('username', email);
    link.href = url.toString();
    link.classList.add('personalized-link');
  });
}

/**
 * Display credentials panel
 */
function displayCredentials(creds) {
  const display = document.querySelector('[data-credentials-display]');
  if (display) {
    display.innerHTML = `
      <div class="credentials-panel">
        <strong>Your Lab Credentials</strong>
        <div class="cred-row">
          <span class="label">Lab:</span>
          <code>${creds.getLabId()}</code>
        </div>
        <div class="cred-row">
          <span class="label">Seat:</span>
          <code>${creds.getSeatNumber()}</code>
        </div>
        <div class="cred-row">
          <span class="label">Email:</span>
          <code>${creds.getEmail()}</code>
          <button class="copy-btn" onclick="navigator.clipboard.writeText('${creds.getEmail()}'); this.textContent='✓ Copied'; setTimeout(() => this.textContent='Copy', 2000)">Copy</button>
        </div>
      </div>
    `;
  }
}

/**
 * Show waiting state when credentials not ready
 */
function showCredentialsNotReady() {
  const display = document.querySelector('[data-credentials-display]');
  if (display) {
    display.innerHTML = `
      <div class="credentials-waiting">
        <strong>⏳ Waiting for lab credentials...</strong>
        <p>The lab will begin shortly.</p>
      </div>
    `;
  }
}

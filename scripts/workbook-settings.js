export const STORAGE_PREFIX = 'workbook-setting-';

/**
 * Parse a type string that may carry an argument, e.g. "relative-path('/content')".
 * Returns { baseType, arg } where arg is null when no argument is present.
 */
function parseType(type = 'text') {
  const match = type.match(/^([\w-]+)\((['"])(.*)\2\)$/);
  if (match) return { baseType: match[1], arg: match[3] };
  return { baseType: type, arg: null };
}

// --- Type handlers ---
// A type handler receives the raw input value and returns an object with
// key/value pairs to add to the placeholder map (may include derived keys).

export const TYPES = {
  /**
   * text (default): stores the raw value as-is under the given key.
   */
  text(key, rawValue) {
    const trimmed = rawValue?.trim();
    if (!trimmed) return null;
    return { [key]: trimmed };
  },

  /**
   * relative-path: strips a configurable prefix before storing.
   * Use as: relative-path('/content')
   * Display/edit always restores the prefix.
   * Falls back to stripping '/content' when no argument provided.
   */
  'relative-path'(key, rawValue, prefix = '/content') {
    const trimmed = rawValue?.trim();
    if (!trimmed) return null;
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const stored = trimmed
      .replace(new RegExp(`^${escaped}/`), '')
      .replace(new RegExp(`^${escaped}$`), '');
    if (!stored) return null;
    return { [key]: stored };
  },
};

/**
 * Given a stored value and its type, return the value as it should be shown
 * to the user in the UI (restoring any prefix that was stripped on save).
 */
export function toDisplayValue(storedValue, type) {
  if (!storedValue) return storedValue;
  const { baseType, arg } = parseType(type);
  if (baseType === 'relative-path') {
    const prefix = arg || '/content';
    return `${prefix}/${storedValue}`;
  }
  return storedValue;
}

// --- Computed field functions ---
const FUNCTIONS = {
  split(value, delimiter = '/') {
    if (!value) return { first: '', last: '' };
    const parts = String(value).split(delimiter).filter(Boolean);
    return {
      first: parts[0] || '',
      last: parts[parts.length - 1] || '',
      all: parts,
    };
  },
};

/**
 * Parse and evaluate a function expression like "@split({contentRoot}, '/').last"
 * Handles function calls with argument substitution and property access.
 * On error, gracefully returns empty string.
 */
function evaluateFunction(expr, context = {}) {
  try {
    let code = expr.trim();
    if (!code.startsWith('@')) return null;
    code = code.slice(1); // remove @

    // Parse: functionName(args).property
    // e.g., split({contentRoot}, '/').last → split, {contentRoot}, '/', last
    const match = code.match(/^(\w+)\((.*?)\)(?:\.(\w+))?$/);
    if (!match) {
      console.warn(`Invalid computed field expression: "${expr}"`);
      return '';
    }

    const [, funcName, argsStr, propName] = match;
    const func = FUNCTIONS[funcName];
    if (!func) {
      console.warn(`Unknown function in computed field: "${funcName}"`);
      return '';
    }

    // Parse and resolve arguments
    const args = [];
    const argParts = argsStr.split(',').map((s) => s.trim());
    for (const argPart of argParts) {
      if (argPart.startsWith('{') && argPart.endsWith('}')) {
        // {key} reference — substitute from context
        const key = argPart.slice(1, -1);
        args.push(context[key] || null);
      } else if (argPart.startsWith("'") && argPart.endsWith("'")) {
        // String literal
        args.push(argPart.slice(1, -1));
      } else if (argPart.startsWith('"') && argPart.endsWith('"')) {
        // String literal
        args.push(argPart.slice(1, -1));
      } else {
        // Try to parse as number or boolean
        const lower = argPart.toLowerCase();
        if (lower === 'true') args.push(true);
        else if (lower === 'false') args.push(false);
        else if (!Number.isNaN(Number(argPart))) args.push(Number(argPart));
        else args.push(argPart);
      }
    }

    // Call function
    let result = func(...args);

    // Access property if specified
    if (propName) {
      result = result[propName];
    }

    return result || '';
  } catch (e) {
    console.warn(`Failed to evaluate function "${expr}":`, e.message);
    return '';
  }
}

function getStorage(storage) {
  if (storage) return storage;
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  return null;
}

function storageKey(key) {
  return `${STORAGE_PREFIX}${key}`;
}

/**
 * Persist a single setting. Returns the resolved placeholder map (may contain
 * derived keys) or null when the value is invalid / empty.
 */
export function saveSetting(key, rawValue, type = 'text', storage) {
  const activeStorage = getStorage(storage);
  if (!activeStorage) return null;
  const { baseType, arg } = parseType(type);
  const handler = TYPES[baseType] || TYPES.text;
  const resolved = handler(key, rawValue, ...(arg !== null ? [arg] : []));
  if (!resolved) return null;
  // Store the resolved value (handler may have transformed it, e.g. stripped a prefix)
  activeStorage.setItem(storageKey(key), resolved[key]);
  return resolved;
}

/**
 * Read one persisted setting back and resolve it through its type handler.
 * Returns the placeholder map object or null.
 */
export function readSetting(key, type = 'text', storage) {
  const activeStorage = getStorage(storage);
  if (!activeStorage) return null;
  const raw = activeStorage.getItem(storageKey(key));
  if (!raw) return null;
  // For relative-path, reading back stored value — just return as plain text
  const { baseType } = parseType(type);
  const handler = TYPES[baseType] || TYPES.text;
  return handler(key, raw);
}

/**
 * Remove a persisted setting.
 */
export function clearSetting(key, storage) {
  const activeStorage = getStorage(storage);
  if (!activeStorage) return;
  activeStorage.removeItem(storageKey(key));
}

/**
 * Read all persisted workbook settings and merge them into a single map.
 * Returns an object of { token: value, ... } ready for placeholder replacement,
 * or null when nothing is stored.
 */
export function readAllSettings(storage) {
  const activeStorage = getStorage(storage);
  if (!activeStorage) return null;
  const result = {};
  let found = false;
  for (let i = 0; i < activeStorage.length; i += 1) {
    const k = activeStorage.key(i);
    if (!k?.startsWith(STORAGE_PREFIX)) continue;
    const settingKey = k.slice(STORAGE_PREFIX.length);
    const resolved = readSetting(settingKey, 'text', activeStorage);
    if (resolved) {
      Object.assign(result, resolved);
      found = true;
    }
  }
  return found ? result : null;
}

/**
 * Evaluate computed fields given their function expressions and a context of input values.
 * @param {Array} computedFields - Array of { key, expr } where expr starts with @
 * @param {Object} context - Input values available to functions
 * @returns {Object} - Map of { key: computedValue, ... }
 */
export function evaluateComputedFields(computedFields = [], context = {}) {
  const result = {};
  for (const field of computedFields) {
    const value = evaluateFunction(field.expr, context);
    if (value !== null) result[field.key] = value;
  }
  return result;
}

// ---- legacy convenience wrappers (kept for backwards-compat) ---------------

export function readWorkbookSettings(storage) {
  return readSetting('contentRoot', 'text', storage);
}

export function saveContentRoot(value, storage) {
  return saveSetting('contentRoot', value, 'text', storage);
}

export function clearContentRoot(storage) {
  clearSetting('contentRoot', storage);
}
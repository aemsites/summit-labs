import {
  saveSetting,
  readSetting,
  clearSetting,
  evaluateComputedFields,
  toDisplayValue,
} from '../../scripts/workbook-settings.js';
import { setPlaceholders } from '../../scripts/lab-placeholders.js';

/**
 * Parse block rows into field definitions.
 *
 * Row format: label | key | content | type?
 *
 * Special keys in first column:
 * - title: renders heading text from second column
 * - instructions: renders instructions text from second column
 *
 * If the first non-special row has a single cell, it is treated as instructions.
 *
 * @param {HTMLElement} el
 * @returns {{ heading: string|null, instructions: string|null, inputs: Array, computed: Array }}
 */
function parseBlock(el) {
  const rows = [...el.querySelectorAll(':scope > div')];
  let heading = null;
  let instructions = null;
  const inputs = [];
  const computed = [];
  let firstDataRowSeen = false;

  for (const row of rows) {
    const cells = [...row.querySelectorAll(':scope > div')];
    if (!cells.length) continue;

    if (cells.length === 1) {
      const text = cells[0].textContent.trim();
      if (!firstDataRowSeen && text) instructions = text;
      firstDataRowSeen = true;
      continue;
    }

    const col1 = cells[0].textContent.trim();
    const col2 = cells[1].textContent.trim();

    if (!col1 && !col2) continue;

    if (col1.toLowerCase() === 'title') {
      heading = col2;
      continue;
    }

    if (col1.toLowerCase() === 'instructions') {
      instructions = col2;
      continue;
    }

    firstDataRowSeen = true;

    if (cells.length < 3) continue;

    const label = col1;
    const key = col2;
    const content = cells[2].textContent.trim();
    const type = cells[3]?.textContent.trim() || 'text';

    if (!key) continue;

    const def = {
      label,
      key,
      type,
      hidden: !label,
    };

    if (content.startsWith('@')) {
      computed.push({ ...def, expr: content });
    } else {
      inputs.push({ ...def, placeholder: content });
    }
  }

  return { heading, instructions, inputs, computed };
}

function renderInputField(def) {
  const {
    key,
    label,
    placeholder,
    type,
    hidden,
  } = def;

  const row = document.createElement('div');
  row.className = 'workbook-settings-row';
  if (hidden) row.classList.add('is-hidden-field');

  const labelEl = document.createElement('label');
  labelEl.className = 'workbook-settings-label';
  labelEl.textContent = label;

  const input = document.createElement('input');
  input.className = 'workbook-settings-input';
  input.placeholder = placeholder;
  input.dataset.key = key;
  input.dataset.type = type;

  const valueEl = document.createElement('span');
  valueEl.className = 'workbook-settings-value-text';

  // Hydrate from storage
  const stored = readSetting(key, type);
  const storedValue = stored ? Object.values(stored)[0] : '';
  const isSaved = Boolean(storedValue);
  const displayValue = toDisplayValue(storedValue, type);

  if (displayValue) {
    input.value = displayValue;
    valueEl.textContent = displayValue;
  } else {
    valueEl.textContent = '';
  }

  row.append(labelEl, input, valueEl);
  return {
    row,
    input,
    valueEl,
    key,
    label,
    hidden,
    isSaved,
  };
}

function renderComputedField(def, context = {}) {
  const {
    key,
    label,
    expr,
    hidden,
  } = def;

  const row = document.createElement('div');
  row.className = 'workbook-settings-row workbook-settings-computed-row';
  if (hidden) row.classList.add('is-hidden-field');

  const labelEl = document.createElement('label');
  labelEl.className = 'workbook-settings-label';
  labelEl.textContent = label;

  // Compute initial value
  const computed = evaluateComputedFields([{ key, expr }], context);
  const value = computed[key] || '';
  const valueEl = document.createElement('span');
  valueEl.className = 'workbook-settings-value-text workbook-settings-computed-value';
  valueEl.textContent = value;

  row.append(labelEl, valueEl);
  return {
    row,
    key,
    label,
    hidden,
    input: valueEl,
    isSaved: Boolean(value),
    isComputed: true,
    valueEl,
  };
}

function getInputContext(inputRows) {
  return inputRows.reduce((acc, row) => {
    acc[row.def.key] = row.input.value;
    return acc;
  }, {});
}

export default function init(el) {
  const {
    heading,
    instructions,
    inputs,
    computed,
  } = parseBlock(el);

  // Clear block content
  el.innerHTML = '';

  if (!inputs.length) {
    el.textContent = 'workbook-settings: no input fields configured.';
    return;
  }

  if (heading) {
    const h = document.createElement('h3');
    h.textContent = heading;
    el.append(h);
  }

  if (instructions) {
    const text = document.createElement('p');
    text.className = 'workbook-settings-instructions';
    text.textContent = instructions;
    el.append(text);
  }

  const form = document.createElement('div');
  form.className = 'workbook-settings-form';

  const inputRows = inputs.map((def) => {
    const rendered = renderInputField(def);
    form.append(rendered.row);
    return { def, ...rendered };
  });

  const computedRows = computed.map((def) => {
    const context = getInputContext(inputRows);
    const rendered = renderComputedField(def, context);
    form.append(rendered.row);
    return { def, ...rendered };
  });

  // Do not display fields that have no label (hidden internal fields).
  [...inputRows, ...computedRows].forEach(({ row, def }) => {
    if (def.hidden) row.style.display = 'none';
  });

  const actions = document.createElement('div');
  actions.className = 'workbook-settings-actions';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'workbook-settings-save';
  saveBtn.textContent = 'Save';

  const editBtn = document.createElement('button');
  editBtn.className = 'workbook-settings-edit-all';
  editBtn.textContent = 'Edit';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'workbook-settings-cancel';
  cancelBtn.textContent = 'Cancel';

  const resetBtn = document.createElement('button');
  resetBtn.className = 'workbook-settings-reset';
  resetBtn.textContent = 'Reset';

  const applyPagePlaceholders = () => {
    // Re-run replacements after settings change so page content updates immediately.
    setPlaceholders(document);
  };

  const refreshComputedRows = () => {
    const context = getInputContext(inputRows);
    computedRows.forEach((rowData) => {
      const { def, input } = rowData;
      const result = evaluateComputedFields([def], context);
      const value = result[def.key] || '';

      input.value = value;
      rowData.isSaved = Boolean(value);

      if (value) saveSetting(def.key, value, 'text');
      else clearSetting(def.key);
    });
  };

  const hasStoredValue = (def) => {
    const stored = readSetting(def.key, def.type || 'text');
    return Boolean(stored && Object.values(stored)[0]);
  };

  const visibleInputRows = () => inputRows.filter(({ def }) => !def.hidden);
  const hasAnyStored = () => [...inputs, ...computed].some((def) => hasStoredValue(def));
  const hasSavedVisible = () => visibleInputRows().some((row) => row.isSaved);

  let isGlobalEditMode = false;

  const updateViewMode = () => {
    // In edit mode: show inputs, hide text
    // In readonly mode: hide inputs, show text
    visibleInputRows().forEach((rowData) => {
      const { input, valueEl } = rowData;
      if (isGlobalEditMode) {
        input.style.display = '';
        valueEl.style.display = 'none';
      } else {
        input.style.display = 'none';
        valueEl.style.display = '';
      }
    });
  };

  const renderActions = () => {
    actions.innerHTML = '';

    if (isGlobalEditMode) {
      actions.append(saveBtn, cancelBtn);
    } else {
      if (hasSavedVisible()) {
        actions.append(editBtn);
      }
      if (hasAnyStored()) {
        actions.append(resetBtn);
      }
    }
  };

  editBtn.addEventListener('click', () => {
    isGlobalEditMode = true;
    updateViewMode();
    renderActions();
  });

  cancelBtn.addEventListener('click', () => {
    // Revert unsaved changes by reloading input values from storage
    inputRows.forEach((rowData) => {
      const { def, input } = rowData;
      const stored = readSetting(def.key, def.type || 'text');
      const storedValue = stored ? Object.values(stored)[0] : '';
      input.value = toDisplayValue(storedValue, def.type || 'text');
    });
    isGlobalEditMode = false;
    updateViewMode();
    renderActions();
  });

  // Start in edit mode if no saved values (fresh form or after reset)
  if (!hasSavedVisible()) {
    isGlobalEditMode = true;
  }

  updateViewMode();
  renderActions();

  saveBtn.addEventListener('click', () => {
    // Save all input fields
    inputRows.forEach((rowData) => {
      const { def, input } = rowData;
      const value = input.value.trim();

      if (!value) {
        clearSetting(def.key);
        rowData.isSaved = false;
        return;
      }

      saveSetting(def.key, value, def.type); // type handler strips prefix if needed
      rowData.isSaved = true;
      // Display the user-facing value (with any prefix restored for relative-path type)
      const stored2 = readSetting(def.key, def.type);
      const storedAfterSave = stored2 ? Object.values(stored2)[0] : value;
      rowData.valueEl.textContent = toDisplayValue(storedAfterSave, def.type);
    });

    // Compute and persist computed fields
    refreshComputedRows();

    applyPagePlaceholders();

    isGlobalEditMode = false;
    updateViewMode();
    renderActions();

    window.location.reload();
  });

  resetBtn.addEventListener('click', () => {
    inputRows.forEach((rowData) => {
      const { def, input } = rowData;
      clearSetting(def.key);
      input.value = '';
      rowData.valueEl.textContent = '';
      rowData.isSaved = false;
    });

    // Clear computed fields
    computedRows.forEach(({ def, input }) => {
      clearSetting(def.key);
      input.textContent = '';
    });

    applyPagePlaceholders();

    isGlobalEditMode = false;
    updateViewMode();
    renderActions();

    // Force full redraw so previously replaced tokens return to source state.
    window.location.reload();
  });

  el.append(form);
  if (actions.childElementCount) el.append(actions);
}



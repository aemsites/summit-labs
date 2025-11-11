function updatePlaceHolder(input, preview) {
  if (!(input || preview)) {
    localStorage.removeItem('lab-org');
    localStorage.removeItem('lab-site');
    return;
  }

  const { value } = input;
  const { hostname } = new URL(value);
  const [, site, org] = hostname.split('.')[0].split('--');
  preview.textContent = preview.textContent.replace('{org}', org);
  preview.textContent = preview.textContent.replace('{site}', site);
  localStorage.setItem('lab-org', org);
  localStorage.setItem('lab-site', site);
}

const getMetadata = (el) => [...el.childNodes].reduce((rdx, row) => {
  if (row.children) {
    const key = row.children[0].textContent.trim().toLowerCase();
    const content = row.children[1];
    const text = content?.textContent.trim().toLowerCase();
    if (key && text) rdx[key] = { text };
  }
  return rdx;
}, {});

export default function init(el) {
  // Get text details
  const metadata = getMetadata(el);
  const placeholderText = metadata.placeholder.text;
  const previewText = metadata.preview.text;

  // Pull the heading out of its div
  const heading = el.querySelector('h1, h2, h3, h4, h5, h6');
  el.append(heading);

  // Blow away all child divs
  el.querySelectorAll('div').forEach((div) => { div.remove(); });

  const inputWrapper = document.createElement('div');
  inputWrapper.className = 'replacer-input-wrapper';

  const input = document.createElement('input');
  input.className = 'replacer-input';
  input.placeholder = placeholderText;

  const actions = document.createElement('div');
  actions.className = 'replacer-actions';

  const reset = document.createElement('button');
  reset.className = 'replacer-reset';
  reset.textContent = 'Reset';

  const save = document.createElement('button');
  save.className = 'replacer-save';
  save.textContent = 'Save';

  actions.append(reset, save);

  const preview = document.createElement('p');
  preview.className = 'replacer-preview';
  preview.textContent = previewText;

  save.addEventListener('click', () => {
    updatePlaceHolder(input, preview);
  });

  reset.addEventListener('click', () => {
    updatePlaceHolder();
  });

  inputWrapper.append(input, actions);
  el.append(inputWrapper, preview);
}

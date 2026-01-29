import observe from '../../scripts/utils/intOb.js';

const prism = import('prismjs');
const languages = {};

function decorateTabs(tabsRow, panels) {
  tabsRow.classList.add('code-tabs-container');

  const tabsList = tabsRow.querySelector('ul');
  tabsList.classList.add('code-tabs-list');

  const tabs = [...tabsList.querySelectorAll('li')];
  return tabs.map((tab, index) => {
    const [text, lang] = tab.textContent.split(' ');
    const language = lang ? lang.match(/\((.*)\)/).pop() : text;
    const btn = document.createElement('button');
    btn.textContent = text;
    tab.innerHTML = '';
    tab.append(btn);

    if (index === 0) tab.classList.add('is-active');
    btn.addEventListener('click', () => {
      tabs.forEach((offTab, idx) => {
        offTab.classList.remove('is-active');
        panels[idx].classList.remove('is-active');
      });
      tab.classList.add('is-active');
      panels[index].classList.add('is-active');
    });

    return language.toLowerCase();
  });
}

async function decorate(el) {
  await prism;

  const rows = [...el.querySelectorAll(':scope > div')];

  const tabsRow = rows.shift();
  const tabsArr = decorateTabs(tabsRow, rows);

  const tabPanel = document.createElement('div');
  tabPanel.classList.add('code-tabs-panel-container');
  el.append(tabPanel);

  const highlights = rows.map(async (row, idx) => {
    if (idx === 0) row.classList.add('is-active');

    tabPanel.append(row);
    row.classList.add('code-tabs-panel');
    const type = tabsArr[idx];
    languages[type] ??= {};

    if (!languages[type].module) languages[type].module = import(`/deps/prismjs/components/prism-${type}.min.js`);
    await languages[type].module;

    const code = row.querySelector('code');
    code.classList.add(`language-${type}`);

    // Get the text before the code block is decorated
    const toCopy = code.textContent;

    const codeContainer = code.closest('div');
    codeContainer.classList.add('code-container');

    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-code-btn';
    copyBtn.textContent = 'Copy';
    copyBtn.addEventListener('click', () => {
      const blob = new Blob([toCopy], { type: 'text/plain' });
      const data = [new ClipboardItem({ [blob.type]: blob })];
      navigator.clipboard.write(data);
      copyBtn.textContent = 'Copied';
      copyBtn.classList.toggle('is-copied');
      setTimeout(() => {
        copyBtn.textContent = 'Copy';
        copyBtn.classList.toggle('is-copied');
      }, 2000);
    });
    codeContainer.append(copyBtn);

    return new Promise((resolve) => {
      window.Prism.highlightElement(code, false, () => { resolve(); });
    });
  });

  await Promise.all(highlights);
  el.classList.add('is-highlighted');
}

export default async function init(el) {
  observe(el, decorate);
}

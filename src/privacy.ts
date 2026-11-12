export const eventTypes = ['focusin', 'focusout', 'click', 'keydown'] as const;
export type EventType = typeof eventTypes[number];

export const standardTags = new Set([
  'a', 'article', 'body', 'button', 'canvas', 'details', 'dialog', 'div', 'fieldset',
  'form', 'h1', 'h2', 'h3', 'iframe', 'img', 'input', 'label', 'li', 'main', 'nav',
  'ol', 'option', 'p', 'section', 'select', 'span', 'summary', 'svg', 'textarea', 'ul',
]);

const ariaValues = {
  'aria-hidden': ['true', 'false'],
  'aria-disabled': ['true', 'false'],
  'aria-expanded': ['true', 'false'],
  'aria-selected': ['true', 'false'],
  'aria-checked': ['true', 'false', 'mixed'],
  'aria-pressed': ['true', 'false', 'mixed'],
  'aria-current': ['true', 'false', 'page', 'step', 'location', 'date', 'time'],
} as const;

export const labelForTag = (tag: string) => standardTags.has(tag) ? tag : 'element';

export const readAria = (read: (name: string) => string | null) =>
  Object.entries(ariaValues).flatMap(([name, allowed]) => {
    const value = read(name);
    if (value === null) return [];
    return [[name, (allowed as readonly string[]).includes(value) ? value : '(invalid token)']];
  });

export const readTabIndex = (value: string | null) => {
  if (value === null) return '(absent)';
  const trimmed = value.trim();
  if (!/^[+-]?\d+$/.test(trimmed)) return '(invalid integer)';
  const number = Number(trimmed);
  return number === -1 || number === 0 ? String(number) : number < 0 ? '< −1' : '> 0';
};

export const classifyModality = (type: EventType) => {
  if (type === 'keydown') return 'Keyboard';
  return 'Undetermined';
};

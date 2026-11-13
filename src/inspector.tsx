import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import styles from './inspector.scss?inline';
import { classifyModality, eventTypes, labelForTag, readAria, readTabIndex } from './privacy';
import type { EventType } from './privacy';


type Entry = { id: number; elapsed: number; type: EventType; target: string; targetId: number };
type Snapshot = {
  tag: string;
  focused: boolean;
  focusVisible: boolean;
  tabIndex: string;
  aria: string[][];
  namingAttributes: string[];
  rolePresent: boolean;
};

const eventElement = (event: Event) =>
  event.composedPath().find((node): node is Element => node instanceof Element) ?? null;

const snapshot = (element: Element): Snapshot => ({
  tag: labelForTag(element.localName),
  focused: element.matches(':focus'),
  focusVisible: element.matches(':focus-visible'),
  tabIndex: readTabIndex(element.getAttribute('tabindex')),
  aria: readAria((name) => element.getAttribute(name)),
  namingAttributes: ['aria-label', 'aria-labelledby', 'aria-describedby'].filter((name) =>
    element.hasAttribute(name),
  ),
  rolePresent: element.hasAttribute('role'),
});

const mount = () => {
  const host = document.createElement('div');
  host.dataset.oddmashInspector = '';
  const shadow = host.attachShadow({ mode: 'closed' });
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(styles);
  shadow.adoptedStyleSheets = [sheet];
  const container = document.createElement('div');
  const overlay = document.createElement('div');
  overlay.className = 'highlight';
  overlay.hidden = true;
  shadow.append(overlay, container);
  document.documentElement.append(host);

  let recording: AbortController | null = null;
  let picker: AbortController | null = null;
  let watching: AbortController | null = null;
  let sequence = 0;
  let startTime = 0;
  let selected: Element | null = null;
  let targetIds = new WeakMap<Element, number>();
  let nextTargetId = 0;
  const identify = (element: Element) => {
    const id = targetIds.get(element);
    if (id !== undefined) return id;
    const newId = ++nextTargetId;
    targetIds.set(element, newId);
    return newId;
  };
  let frame = 0;
  const root = createRoot(container);

  const Inspector = () => {
    const [active, setActive] = useState(false);
    const [picking, setPicking] = useState(false);
    const [entries, setEntries] = useState<Entry[]>([]);
    const [current, setCurrent] = useState<Snapshot | null>(null);
    const [eventFilter, setEventFilter] = useState<EventType | 'all'>('all');
    const [selectedOnly, setSelectedOnly] = useState(false);

    const highlight = (element: Element | null) => {
      overlay.hidden = !element?.isConnected;
      if (!element?.isConnected) return;
      const rect = element.getBoundingClientRect();
      Object.assign(overlay.style, {
        left: `${rect.left}px`, top: `${rect.top}px`,
        width: `${rect.width}px`, height: `${rect.height}px`,
      });
    };

    const refresh = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (selected && !selected.isConnected) {
          watching?.abort();
          watching = null;
          selected = null;
        }
        setCurrent(selected ? snapshot(selected) : null);
        if (!picker) highlight(selected);
      });
    };

    const clearSelection = () => {
      watching?.abort();
      watching = null;
      selected = null;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      setCurrent(null);
      highlight(null);
    };

    const select = (element: Element) => {
      clearSelection();
      selected = element;
      setCurrent(snapshot(element));
      highlight(element);
      watching = new AbortController();
      const signal = watching.signal;
      for (const name of ['focusin', 'focusout', 'scroll', 'resize']) {
        window.addEventListener(name, refresh, { capture: true, signal });
      }
      const observer = new MutationObserver(refresh);
      observer.observe(element, {
        attributeFilter: ['tabindex', 'role', 'aria-label', 'aria-labelledby', 'aria-describedby',
          'aria-hidden', 'aria-disabled', 'aria-expanded', 'aria-selected', 'aria-checked',
          'aria-pressed', 'aria-current'],
      });
      const layout = new ResizeObserver(refresh);
      layout.observe(element);
      signal.addEventListener('abort', () => {
        observer.disconnect();
        layout.disconnect();
      }, { once: true });
    };

    const endPick = () => {
      picker?.abort();
      picker = null;
      setPicking(false);
      highlight(selected);
    };

    const pick = () => {
      if (picker) {
        endPick();
        return;
      }
      picker = new AbortController();
      setPicking(true);
      const options = { capture: true, signal: picker.signal };
      window.addEventListener('pointermove', (event) => {
        if (!event.composedPath().includes(host)) highlight(eventElement(event));
      }, options);
      window.addEventListener('click', (event) => {
        const target = eventElement(event);
        if (!target || !event.isTrusted || event.composedPath().includes(host)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        endPick();
        select(target);
      }, options);
      window.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape' || !event.isTrusted) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        endPick();
      }, options);
    };

    const record = (event: Event) => {
      if (picker || !event.isTrusted || event.composedPath().includes(host)) return;
      const target = eventElement(event);
      if (!target || target.matches('input[type="password"]')) return;
      if (event.type === 'keydown' && event.composedPath().some((node) =>
        node instanceof HTMLElement && (node.isContentEditable || node.matches('input, textarea, [role="textbox"]')),
      )) return;
      const entry: Entry = {
        id: ++sequence,
        elapsed: Math.round(performance.now() - startTime),
        type: event.type as EventType,
        target: labelForTag(target.localName),
        targetId: identify(target),
      };
      setEntries((previous) => [...previous.slice(-199), entry]);
    };

    const stop = () => {
      recording?.abort();
      recording = null;
      setActive(false);
    };

    const start = () => {
      if (recording) return;
      recording = new AbortController();
      if (sequence === 0) startTime = performance.now();
      for (const name of eventTypes) {
        window.addEventListener(name, record, { capture: true, signal: recording.signal });
      }
      setActive(true);
    };

    const reset = () => {
      stop();
      endPick();
      clearSelection();
      sequence = 0;
      setEntries([]);
      setEventFilter('all');
      setSelectedOnly(false);
      targetIds = new WeakMap();
      nextTargetId = 0;
    };

    const close = () => {
      root.unmount();
      host.remove();
      delete scope.oddmashInspector;
    };

    useEffect(() => {
      const hide = (event: PageTransitionEvent) => {
        if (event.persisted) reset();
        else close();
      };
      window.addEventListener('pagehide', hide);
      return () => {
        window.removeEventListener('pagehide', hide);
        recording?.abort();
        picker?.abort();
        watching?.abort();
        if (frame) cancelAnimationFrame(frame);
      };
    }, []);

    const selectedId = selected ? identify(selected) : undefined;
    const visibleEntries = entries.filter(({ type, targetId }) =>
      (eventFilter === 'all' || type === eventFilter) &&
      (!selectedOnly || selectedId === undefined || targetId === selectedId),
    );
    const latest = visibleEntries.at(-1);
    return (
      <section aria-label="Interaction Inspector" className="panel">
        <header><h1>Interaction Inspector</h1><button onClick={close} aria-label="Close inspector">×</button></header>
        <div className="controls">
          <button onClick={pick} aria-pressed={picking}>{picking ? 'Cancel pick' : 'Pick element'}</button>
          <button onClick={active ? stop : start}>{active ? 'Stop' : 'Start'}</button>
          <button onClick={reset}>Reset</button>
        </div>
        <p role="status">{picking ? 'Click an element or press Escape.' : active ? 'Recording' : 'Recording stopped'}</p>
        <h2>Element state</h2>
        {current ? (
          <dl>
            <dt>Element</dt><dd>{current.tag}</dd>
            <dt>:focus</dt><dd>{String(current.focused)}</dd>
            <dt>:focus-visible</dt><dd>{String(current.focusVisible)}</dd>
            <dt>tabindex</dt><dd>{current.tabIndex}</dd>
            <dt>role attribute</dt><dd>{current.rolePresent ? 'Present' : 'Absent'}</dd>
            {current.aria.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}
            {current.namingAttributes.map((name) => <div key={name}><dt>{name}</dt><dd>Present</dd></div>)}
          </dl>
        ) : <p>Pick an element to inspect its state.</p>}
        <h2>Observed events <span>· {entries.length} / 200</span></h2>
        <div className="filters">
          <label>Event type
            <select value={eventFilter} onChange={(event) =>
              setEventFilter(event.target.value as EventType | 'all')}>
              <option value="all">All events</option>
              {eventTypes.map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>
          <label>
            <input type="checkbox" checked={selectedOnly && selectedId !== undefined}
              disabled={selectedId === undefined} onChange={(event) => setSelectedOnly(event.target.checked)} />
            Selected element
          </label>
        </div>
        {visibleEntries.length ? (
          <ol aria-label="Event timeline" className="timeline">
            {[...visibleEntries].reverse().map(({ id, elapsed, type, target }) =>
              <li key={id}><time>{elapsed} ms</time><strong>{type}</strong><code>{target}</code></li>,
            )}
          </ol>
        ) : <p>{entries.length ? 'No events match these filters.' : 'No events recorded.'}</p>}
        <h2>Inference</h2>
        <p>{latest ? `Latest visible event modality: ${classifyModality(latest.type)}` : 'No interaction to classify.'}</p>
      </section>
    );
  };

  root.render(<Inspector />);
  return host;
};

const scope = globalThis as typeof globalThis & { oddmashInspector?: HTMLElement };
if (!scope.oddmashInspector?.isConnected) scope.oddmashInspector = mount();

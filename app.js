(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const key = 'the-garden-v1-demo';
  let state = { thoughts: [], toggles: {}, focus: null, started: false };
  let storageAvailable = true, loadError = false; let savedThreads, savedMonthly, savedPlanner, savedMovement, savedNourish, savedWorkroom, savedStillness;
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved && typeof saved === 'object') {
      state.thoughts = Array.isArray(saved.thoughts) ? saved.thoughts.filter(t => t && typeof t.text === 'string' && typeof t.id === 'string') : [];
      state.toggles = saved.toggles && typeof saved.toggles === 'object' ? saved.toggles : {};
      state.focus = typeof saved.focus === 'string' ? saved.focus : null;
      state.started = saved.started === true; savedThreads = saved.threads; savedMonthly = saved.monthly; savedPlanner = saved.planner; savedMovement = saved.movement; savedNourish = saved.nourish; savedWorkroom = saved.workroom; savedStillness = saved.stillness;
    }
  } catch (_) { storageAvailable = false; loadError = true; }
  function save() {
    if (loadError) { $('storage-status').textContent = 'Saved Garden data could not be read. Nothing will be replaced; use Garden tools to import a valid backup.'; return false; }
    try { localStorage.setItem(key, JSON.stringify(state)); storageAvailable = true; }
    catch (_) { storageAvailable = false; }
    $('storage-status').textContent = storageAvailable ? '' : 'This browser couldn’t save changes. You can keep using this page, but new changes may disappear when it closes.';
    return storageAvailable;
  }
  const focuses = {
    clearing: { title: 'Make a little room.', description: 'Choose one small corner. Clear just enough space to feel a little more here.' },
    five: { title: 'A small opening.', description: 'Put away one thing within reach. You can let that be the whole thing.' },
    phone: { title: 'Send a small hello.', description: 'Think of someone you’d like to reconnect with. Draft a simple hello, if it feels right.' },
    body: { title: 'Come back to yourself.', description: 'Let your shoulders soften. Notice how you’re sitting, and find a position that feels a little kinder.' },
    make: { title: 'Let a little thing exist.', description: 'Find a scrap of paper. Draw a shape, write a line, or begin something with no need to finish it.' },
    admin: { title: 'Loosen one knot.', description: 'Choose one loose end. Find only the next piece of information you need.' },
    rest: { title: 'Enough for now.', description: 'Find somewhere comfortable. Let yourself spend a little time without making anything happen.' },
    window: { title: 'A softer windowsill', description: 'Pick up from the space beside the lamp. A measurement is enough for today.', stop: 'Stopped at: measure the space beside the lamp.' },
    story: { title: 'The story with the blue door', description: 'Return to the visitor at the blue door. Write the next sentence, if you’d like.', stop: 'Stopped at: the visitor hasn’t knocked yet.' },
    paper: { title: 'A little less paper', description: 'Return to the envelope on the desk. Opening it can be the whole next step.', stop: 'Stopped at: one unopened envelope on the desk.' }
  };
  function renderFocus() {
    const focus = currentFocus();
    $('focus-heading').textContent = focus.title;
    $('focus-description').textContent = focus.description;
    $('focus-stop').hidden = !focus.stop;
    $('focus-stop').textContent = focus.stop || '';
    $('begin').replaceChildren(document.createTextNode(state.started ? 'Resume ' : 'Begin '));
    const arrow = document.createElement('span'); arrow.textContent = '↗'; arrow.setAttribute('aria-hidden', 'true'); $('begin').append(arrow);
    $('focus-note').textContent = state.started ? 'Your place is saved. Come back anytime.' : 'No timer. No catching up.';
    const pinned = state.threads.filter(pinnedActive).sort((a, b) => Date.parse(b.touched) - Date.parse(a.touched));
    $('focus-picker').hidden = !pinned.length; $('focus-thread-select').replaceChildren();
    const prompt = document.createElement('option'); prompt.value = ''; prompt.textContent = 'Choose a pinned thread'; $('focus-thread-select').append(prompt);
    pinned.forEach(thread => { const option = document.createElement('option'); option.value = thread.id; option.textContent = thread.title + (thread.example ? ' · Example' : ''); $('focus-thread-select').append(option); });
    $('focus-thread-select').value = pinned.some(thread => thread.id === state.focus) ? state.focus : '';
  }
  function chooseFocus(id) {
    const requestedThread = state.threads.find(t => t.id === id);
    if (requestedThread && !pinnedActive(requestedThread)) return;
    state.focus = id; state.started = false; const selected = state.threads.find(t => t.id === id); if (selected) selected.touched = new Date().toISOString(); save(); renderAll();
    $('path-status').textContent = currentFocus().title + ' Selected as your current focus.';
    $('begin').focus({ preventScroll: true });
    document.querySelector('.focus').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' });
  }
  document.querySelectorAll('[data-path]').forEach(button => button.addEventListener('click', () => {
    const path = button.dataset.path;
    const rooms = { body: 'move', admin: 'monthly', rest: 'stillness' };
    if (rooms[path]) { location.hash = '#' + rooms[path]; showView(rooms[path]); $('path-status').textContent = 'Opened ' + button.querySelector('strong').textContent + '.'; return; }
    state.focus = path; state.started = true; save(); renderAll();
    const focus = currentFocus(); $('dialog-title').textContent = focus.title; $('dialog-description').textContent = focus.description;
    $('focus-dialog').showModal(); $('path-status').textContent = focus.title + ' is ready.';
  }));
  $('focus-thread-select').addEventListener('change', () => { if ($('focus-thread-select').value) chooseFocus($('focus-thread-select').value); });
  document.querySelectorAll('[data-thread]').forEach(button => button.addEventListener('click', () => chooseFocus(button.dataset.thread)));
  $('begin').addEventListener('click', () => {
    state.started = true; const selected = state.threads.find(t => t.id === state.focus); if (selected) selected.touched = new Date().toISOString(); save(); renderAll();
    const focus = currentFocus();
    $('dialog-title').textContent = focus.title;
    $('dialog-description').textContent = focus.description;
    $('focus-dialog').showModal();
  });
  $('pause').addEventListener('click', () => $('focus-dialog').close());
  function renderThoughts() {
    $('thought-count').textContent = String(state.thoughts.length);
    $('thought-list').replaceChildren();
    if (!state.thoughts.length) {
      const empty = document.createElement('li'); empty.textContent = 'A little space for whatever arrives.'; empty.className = 'quiet-note'; $('thought-list').append(empty);
    }
    [...state.thoughts].reverse().forEach(thought => {
      const item = document.createElement('li');
      const text = document.createElement('span'); text.className = 'thought-text'; text.textContent = thought.text;
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'remove-thought'; remove.textContent = 'Dismiss'; remove.setAttribute('aria-label', 'Dismiss thought: ' + thought.text.slice(0, 60));
      remove.addEventListener('click', () => { state.thoughts = state.thoughts.filter(t => t.id !== thought.id); save(); renderThoughts(); $('thoughts-drawer').querySelector('summary').focus(); $('capture-status').textContent = 'Thought dismissed.'; });
      const convert = document.createElement('button'); convert.type = 'button'; convert.className = 'remove-thought'; convert.textContent = 'Make a thread'; convert.addEventListener('click', () => openEditor(null, thought)); item.append(text, convert, remove); $('thought-list').append(item);
    });
  }
  $('capture-form').addEventListener('submit', event => {
    event.preventDefault();
    const text = $('thought').value.trim();
    if (!text) { $('capture-status').textContent = 'A word or two is enough, whenever you’re ready.'; $('thought').focus(); return; }
    state.thoughts.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2), text });
    save(); renderThoughts(); $('thought').value = '';
    $('capture-status').textContent = storageAvailable ? 'Set down. Saved here for later.' : 'Set down for this visit.';
    $('thought').focus();
  });
  document.querySelectorAll('[data-toggle]').forEach(input => {
    input.checked = state.toggles[input.dataset.toggle] === true;
    input.addEventListener('change', () => { state.toggles[input.dataset.toggle] = input.checked; save(); });
  });
  $('today-date').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  const areas = ['Work', 'Job Search', 'Health & Fitness', 'Home & Pets', 'Learning', 'Creative Worlds', 'Continuity', 'Curiosity'];
  const states = ['Active', 'Waiting', 'Parked', 'Hibernating', 'Complete', 'Archived'];
  const now = () => new Date().toISOString();
  const uid = () => 'thread-' + Date.now().toString(36) + Math.random().toString(36).slice(2);
  const seeds = [
    { id: 'window', title: 'A softer windowsill', area: 'Home & Pets', state: 'Active', next: 'Measure the space beside the lamp.', stop: 'Measure the space beside the lamp.', pinned: true },
    { id: 'story', title: 'The story with the blue door', area: 'Creative Worlds', state: 'Parked', next: 'Write the visitor’s first sentence.', stop: 'The visitor hasn’t knocked yet.', pinned: false },
    { id: 'paper', title: 'A little less paper', area: 'Home & Pets', state: 'Waiting', next: 'Open the envelope on the desk.', stop: 'One unopened envelope on the desk.', pinned: false }
  ].map(t => ({ ...t, example: true, touched: now() }));
  state.threads = Array.isArray(savedThreads) ? savedThreads.filter(t => t && typeof t.id === 'string' && typeof t.title === 'string').map(t => ({
    id: t.id, title: t.title, area: areas.includes(t.area) ? t.area : 'Curiosity', state: states.includes(t.state) ? t.state : 'Parked', next: typeof t.next === 'string' ? t.next : '', stop: typeof t.stop === 'string' ? t.stop : '', touched: Number.isFinite(Date.parse(t.touched)) ? t.touched : now(), pinned: t.pinned === true, example: t.example === true
  })) : seeds;
  const eligible = t => !['Complete', 'Archived'].includes(t.state);
  const pinnedActive = t => t.pinned && t.state === 'Active';
  function currentFocus() {
    const thread = state.threads.find(t => t.id === state.focus && pinnedActive(t));
    if (thread) return { title: thread.title + (thread.example ? ' · Example' : ''), description: thread.next || 'No next move needed yet. You can add one in Threads.', stop: thread.stop ? 'Stopped at: ' + thread.stop : '' };
    return focuses[state.focus] && !['window', 'story', 'paper'].includes(state.focus) ? focuses[state.focus] : focuses.clearing;
  }
  function reconcileFocus() {
    const selected = state.threads.find(t => t.id === state.focus);
    if ((selected && !pinnedActive(selected)) || (!selected && !focuses[state.focus]) || !state.focus || (['window', 'story', 'paper'].includes(state.focus) && !selected)) {
      state.focus = state.threads.find(pinnedActive)?.id || 'clearing'; state.started = false;
    }
  }
  function el(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }
  function action(label, callback) { const button = el('button', 'secondary', label); button.type = 'button'; button.addEventListener('click', callback); return button; }
  function touch(thread) { thread.touched = now(); }
  function renderThreads() {
    $('thread-groups').replaceChildren();
    areas.forEach(area => {
      const threads = state.threads.filter(t => t.area === area).sort((a, b) => Number(b.pinned) - Number(a.pinned) || Date.parse(b.touched) - Date.parse(a.touched));
      if (!threads.length) return;
      const group = el('section', 'thread-group'); group.append(el('h2', '', area));
      const grid = el('div', 'garden-grid');
      threads.forEach(thread => {
        const card = el('article', 'garden-thread card');
        card.dataset.threadId = thread.id; card.tabIndex = -1;
        const meta = el('div', 'thread-meta'); meta.append(el('span', 'state-badge', thread.state)); if (thread.example) meta.append(el('span', 'example-label', 'FICTIONAL EXAMPLE'));
        card.append(meta, el('h3', '', thread.title), el('p', 'next-move', 'Next tiny move: ' + (thread.next || 'Room to decide later.')));
        if (thread.stop) card.append(el('p', 'thread-stop', 'Where I stopped: ' + thread.stop));
        const date = el('time', 'touched', 'Last touched ' + new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(thread.touched))); date.dateTime = thread.touched; card.append(date);
        const actions = el('div', 'thread-actions');
        actions.append(action('Edit', () => openEditor(thread)), action(thread.pinned ? 'Unpin' : 'Pin to Landing Pad', () => { thread.pinned = !thread.pinned; touch(thread); if (pinnedActive(thread)) { state.focus = thread.id; state.started = false; } reconcileFocus(); save(); renderAll(); $('thread-status').textContent = thread.pinned ? (pinnedActive(thread) ? 'Pinned to your Landing Pad.' : 'Pinned for when this thread is Active again.') : 'Pin removed.'; }));
        if (pinnedActive(thread)) actions.append(action('Bring into focus ↗', () => { location.hash = '#landing'; showView('landing'); chooseFocus(thread.id); }));
        if (eligible(thread) && thread.next) actions.append(action('Plan next move', () => openAnchorEditor(null, thread)));
        card.append(actions); grid.append(card);
      });
      group.append(grid); $('thread-groups').append(group);
    });
    if (!state.threads.length) $('thread-groups').append(el('p', 'quiet-note', 'Nothing planted yet. A title is enough to begin.'));
    const activeShelf = $('active-resume-list'), pausedShelf = $('paused-list'); activeShelf.replaceChildren(); pausedShelf.replaceChildren();
    const active = state.threads.filter(pinnedActive).sort((a, b) => Date.parse(b.touched) - Date.parse(a.touched)).slice(0, 5);
    active.forEach(thread => {
      const button = el('button', 'thread'); button.type = 'button';
      const content = el('span'); content.append(el('strong', '', thread.title + (thread.example ? ' · Example' : '')), el('small', '', thread.stop ? 'Stopped at: ' + thread.stop : 'Next: ' + (thread.next || 'Room to decide later.')));
      button.append(content, el('span', '', '↗')); button.addEventListener('click', () => chooseFocus(thread.id)); activeShelf.append(button);
    });
    const paused = state.threads.filter(t => ['Parked', 'Hibernating'].includes(t.state) && t.stop).sort((a,b) => Date.parse(b.touched) - Date.parse(a.touched)).slice(0, 4);
    paused.forEach(thread => {
      const button = el('button', 'thread paused-thread'); button.type = 'button'; button.setAttribute('aria-label', 'Review ' + thread.title + ' in Threads');
      const content = el('span'); content.append(el('strong', '', thread.title + (thread.example ? ' · Example' : '') + ' · ' + thread.state), el('small', '', 'Stopped at: ' + thread.stop));
      button.append(content, el('span', '', '↗')); button.addEventListener('click', () => { location.hash = '#threads'; showView('threads'); openEditor(thread); }); pausedShelf.append(button);
    });
    $('active-resume-section').hidden = !active.length; $('recently-paused-section').hidden = !paused.length; $('resume-empty').hidden = !!(active.length || paused.length);
  }
  const defaultCloseItems = [
    { id: 'close-housing', name: 'Housing payment or check-in', dueDay: null },
    { id: 'close-utilities', name: 'Utilities checked', dueDay: null },
    { id: 'close-insurance', name: 'Insurance checked', dueDay: null },
    { id: 'close-household', name: 'Household essentials handled', dueDay: null },
    { id: 'close-custom', name: 'Something worth remembering', dueDay: null }
  ];
  const cleanCloseItem = item => ({
    id: typeof item?.id === 'string' ? item.id : 'close-' + Date.now().toString(36) + Math.random().toString(36).slice(2),
    name: typeof item?.name === 'string' && item.name.trim() ? item.name.trim().slice(0, 120) : 'Untitled monthly item',
    dueDay: Number.isInteger(Number(item?.dueDay)) && Number(item.dueDay) >= 1 && Number(item.dueDay) <= 31 ? Number(item.dueDay) : null
  });
  const currentMonthKey = () => {
    const date = new Date();
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
  };
  const monthParts = key => { const [year, month] = key.split('-').map(Number); return { year, month }; };
  const shiftMonth = (key, amount) => {
    const { year, month } = monthParts(key); const date = new Date(year, month - 1 + amount, 1);
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
  };
  const monthName = key => { const { year, month } = monthParts(key); return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1)); };
  const monthlySource = savedMonthly && typeof savedMonthly === 'object' ? savedMonthly : {};
  state.monthly = {
    template: Array.isArray(monthlySource.template) ? monthlySource.template.map(cleanCloseItem) : defaultCloseItems.map(cleanCloseItem),
    months: monthlySource.months && typeof monthlySource.months === 'object' ? monthlySource.months : {}
  };
  Object.keys(state.monthly.months).forEach(key => {
    const month = state.monthly.months[key];
    if (!month || typeof month !== 'object') { delete state.monthly.months[key]; return; }
    month.entries = Array.isArray(month.entries) ? month.entries.map(entry => ({
      ...cleanCloseItem(entry), completed: entry.completed === true, resolution: ['handled', 'carried', 'snoozed', 'removed'].includes(entry.resolution) ? entry.resolution : null
    })) : [];
    month.reflection = typeof month.reflection === 'string' ? month.reflection.slice(0, 280) : '';
  });
  function ensureMonth(key) {
    if (!state.monthly.months[key]) state.monthly.months[key] = { entries: state.monthly.template.map(item => ({ ...item, completed: false, resolution: null })), reflection: '' };
    return state.monthly.months[key];
  }
  function carriedReflectionFor(key) {
    const sourceKey = shiftMonth(key, -1), text = state.monthly.months[sourceKey]?.reflection?.trim() || '';
    return text ? { sourceKey, text } : null;
  }
  let viewedMonth = currentMonthKey();
  ensureMonth(viewedMonth);
  let editingCloseId = null, editingCloseList = false;
  function setCloseComplete(itemId, completed, monthKey = viewedMonth) {
    const month = ensureMonth(monthKey); const item = month.entries.find(entry => entry.id === itemId);
    if (!item) return;
    item.completed = completed; item.resolution = completed ? 'handled' : null; save(); renderMonthly(); renderMonthlyPreview();
    $('monthly-status').textContent = completed ? 'Sealed with care.' : 'Opened again. Nothing lost.';
  }
  function ritualSeal(item, interactive, compact = false) {
    const seal = el('button', 'ritual-seal' + (item.completed ? ' is-complete' : '') + (compact ? ' compact-seal' : ''));
    seal.type = 'button'; seal.setAttribute('aria-pressed', String(item.completed)); seal.setAttribute('aria-label', (item.completed ? 'Reopen ' : 'Mark handled: ') + item.name);
    seal.textContent = item.completed ? '✦' : ''; seal.disabled = !interactive;
    if (interactive) seal.addEventListener('click', () => setCloseComplete(item.id, !item.completed, compact ? currentMonthKey() : viewedMonth));
    return seal;
  }
  function renderMonthlyPreview() {
    const month = ensureMonth(currentMonthKey()); const completed = month.entries.filter(item => item.completed).length;
    $('monthly-preview-count').textContent = completed + ' of ' + month.entries.length + ' settled';
    $('monthly-preview-note').textContent = month.entries.length && completed === month.entries.length ? 'The month is resting in a quiet glow.' : 'Keep what matters. Let the rest settle.';
    $('monthly-preview-items').replaceChildren();
    month.entries.forEach(item => {
      const row = el('div', 'preview-ritual-item' + (item.completed ? ' is-complete' : ''));
      row.append(ritualSeal(item, true, true), el('span', '', item.name));
      if (item.dueDay) row.append(el('small', '', 'day ' + item.dueDay));
      $('monthly-preview-items').append(row);
    });
    if (!month.entries.length) $('monthly-preview-items').append(el('p', 'section-intro', 'A clear little clearing. Add an item whenever you need one.'));
  }
  function closeItemActions(item, index, month) {
    const controls = el('div', 'close-item-actions');
    const edit = action('Rename', () => openCloseEditor(item));
    const up = action('↑', () => moveCloseItem(index, -1)); up.setAttribute('aria-label', 'Move ' + item.name + ' up'); up.disabled = index === 0;
    const down = action('↓', () => moveCloseItem(index, 1)); down.setAttribute('aria-label', 'Move ' + item.name + ' down'); down.disabled = index === month.entries.length - 1;
    controls.append(edit, up, down); return controls;
  }
  function resolveOldItem(item, choice) {
    const pastMonth = ensureMonth(viewedMonth);
    if (choice === 'handled') { item.completed = true; item.resolution = 'handled'; }
    if (choice === 'carried') {
      item.resolution = 'carried'; const current = ensureMonth(currentMonthKey());
      if (!current.entries.some(entry => entry.id === item.id)) current.entries.push({ ...cleanCloseItem(item), completed: false, resolution: null });
      if (!state.monthly.template.some(entry => entry.id === item.id)) state.monthly.template.push(cleanCloseItem(item));
    }
    if (choice === 'snoozed') item.resolution = 'snoozed';
    if (choice === 'removed') {
      item.resolution = 'removed'; state.monthly.template = state.monthly.template.filter(entry => entry.id !== item.id);
      ensureMonth(currentMonthKey()).entries = ensureMonth(currentMonthKey()).entries.filter(entry => entry.id !== item.id);
    }
    save(); renderMonthly(); renderMonthlyPreview();
    $('monthly-status').textContent = choice === 'handled' ? 'Marked handled, with no fuss.' : choice === 'carried' ? 'Carried forward gently.' : choice === 'snoozed' ? 'Resting for now.' : 'Released from the live checklist.';
  }
  function monthEndChoices(item) {
    const wrap = el('div', 'month-end-choices');
    if (item.resolution === 'snoozed') {
      wrap.append(el('span', 'resolution-note', 'Resting for now.'), action('Revisit', () => { item.resolution = null; save(); renderMonthly(); })); return wrap;
    }
    if (item.resolution) {
      const labels = { handled: 'Handled', carried: 'Carried into ' + monthName(currentMonthKey()), removed: 'Released from the live checklist' };
      wrap.append(el('span', 'resolution-note', labels[item.resolution] || 'Settled')); return wrap;
    }
    wrap.append(el('span', 'choice-prompt', 'What feels right?'), action('Mark handled', () => resolveOldItem(item, 'handled')), action('Carry forward', () => resolveOldItem(item, 'carried')), action('Snooze', () => resolveOldItem(item, 'snoozed')), action('Remove', () => resolveOldItem(item, 'removed')));
    return wrap;
  }
  function renderMonthly() {
    const month = ensureMonth(viewedMonth); const current = viewedMonth === currentMonthKey(), future = viewedMonth > currentMonthKey(), live = current || future;
    $('month-label').textContent = monthName(viewedMonth); $('month-kind').textContent = current ? 'the living month' : future ? 'a month ahead' : 'a quiet history';
    $('month-next').disabled = false; $('edit-close-list').hidden = !current; $('edit-close-list').textContent = editingCloseList ? 'Done editing' : 'Edit list'; $('edit-close-list').setAttribute('aria-pressed', String(editingCloseList)); $('add-close-item').hidden = !current || !editingCloseList;
    $('ritual-guidance').textContent = current ? (editingCloseList ? 'Rename, reorder, add, or release what no longer belongs.' : 'Touch a seal when something is handled. No score is being kept.') : future ? 'Room to tend ahead. A seal here belongs to this future month.' : 'The unfinished pieces can be settled, carried, rested, or released.';
    $('monthly-items').replaceChildren();
    month.entries.forEach((item, index) => {
      const row = el('article', 'monthly-item' + (item.completed ? ' is-complete' : ''));
      row.append(ritualSeal(item, live));
      const copy = el('div', 'monthly-item-copy'); copy.append(el('strong', '', item.name));
      if (item.dueDay) copy.append(el('small', 'due-day', 'due day ' + item.dueDay));
      row.append(copy);
      if (current) {
        if (editingCloseList) row.append(closeItemActions(item, index, month));
      } else if (!future && !item.completed) row.append(monthEndChoices(item));
      else if (!future) row.append(el('span', 'resolution-note', 'Sealed'));
      $('monthly-items').append(row);
    });
    if (!month.entries.length) $('monthly-items').append(el('p', 'quiet-note', live ? 'Nothing needs tending here yet.' : 'This month is an open clearing.'));
    const carried = carriedReflectionFor(viewedMonth);
    $('monthly-carried-note').hidden = !carried;
    $('monthly-carried-source').textContent = carried ? 'CARRIED FROM ' + monthName(carried.sourceKey).toUpperCase() : '';
    $('monthly-carried-text').textContent = carried?.text || '';
    $('reflection-target').textContent = 'For ' + monthName(shiftMonth(viewedMonth, 1));
    $('monthly-reflection').value = month.reflection; $('monthly-reflection').readOnly = false;
    $('reflection-status').textContent = '';
  }
  function moveCloseItem(index, direction) {
    const month = ensureMonth(currentMonthKey()); const target = index + direction;
    if (target < 0 || target >= month.entries.length) return;
    [month.entries[index], month.entries[target]] = [month.entries[target], month.entries[index]];
    const order = month.entries.map(item => item.id);
    state.monthly.template.sort((a, b) => {
      const ai = order.indexOf(a.id), bi = order.indexOf(b.id); return (ai < 0 ? 9999 : ai) - (bi < 0 ? 9999 : bi);
    });
    save(); renderMonthly(); renderMonthlyPreview(); $('monthly-status').textContent = 'The order shifted softly.';
  }
  function openCloseEditor(item = null) {
    editingCloseId = item?.id || null; $('close-item-form').reset(); $('close-item-name').setCustomValidity('');
    $('close-item-title').textContent = item ? 'Tend this item' : 'Add an item'; $('close-item-name').value = item?.name || ''; $('close-item-due').value = item?.dueDay || '';
    $('remove-close-item').hidden = !item; $('close-item-editor').showModal(); $('close-item-name').focus();
  }
  const anchorTypes = ['Appointment', 'Event', 'Hard deadline', 'Focus block', 'Gentle reminder', 'Rest / protected time'];
  const plannerSource = savedPlanner && typeof savedPlanner === 'object' ? savedPlanner : {};
  const validDateKey = value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number); const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  };
  const validTime = value => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  const todayKey = () => {
    const date = new Date(); return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  };
  const plannerDate = key => { const [year, month, day] = key.split('-').map(Number); return new Date(year, month - 1, day); };
  const plannerDateKey = date => date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  const addPlannerDays = (key, amount) => { const date = plannerDate(key); date.setDate(date.getDate() + amount); return plannerDateKey(date); };
  const startOfPlannerWeek = key => { const date = plannerDate(key); const mondayOffset = (date.getDay() + 6) % 7; date.setDate(date.getDate() - mondayOffset); return plannerDateKey(date); };
  const plannerMonthKey = key => key.slice(0, 7);
  const anchorTypeClass = type => ['Appointment', 'Event', 'Hard deadline'].includes(type) ? 'is-hard' : type === 'Focus block' ? 'is-focus' : type === 'Rest / protected time' ? 'is-rest' : 'is-gentle';
  const anchorTypeShort = type => type === 'Rest / protected time' ? 'Protected time' : type;
  function usHolidayName(key) {
    const [year, month, day] = key.split('-').map(Number);
    const nthWeekday = (y, m, weekday, n) => 1 + (weekday - new Date(y, m - 1, 1).getDay() + 7) % 7 + (n - 1) * 7;
    const lastWeekday = (y, m, weekday) => new Date(y, m, 0).getDate() - (new Date(y, m, 0).getDay() - weekday + 7) % 7;
    const names = [];
    const moving = [
      [1, nthWeekday(year, 1, 1, 3), 'Martin Luther King Jr. Day'],
      [2, nthWeekday(year, 2, 1, 3), 'Presidents’ Day'],
      [5, lastWeekday(year, 5, 1), 'Memorial Day'],
      [5, nthWeekday(year, 5, 0, 2), 'Mother’s Day'],
      [6, nthWeekday(year, 6, 0, 3), 'Father’s Day'],
      [9, nthWeekday(year, 9, 1, 1), 'Labor Day'],
      [10, nthWeekday(year, 10, 1, 2), 'Columbus Day / Indigenous Peoples’ Day'],
      [11, nthWeekday(year, 11, 4, 4), 'Thanksgiving']
    ];
    moving.forEach(([m, d, name]) => { if (m === month && d === day) names.push(name); });
    const fixed = [[1, 1, 'New Year’s Day'], [6, 19, 'Juneteenth'], [7, 4, 'Independence Day'], [11, 11, 'Veterans Day'], [12, 25, 'Christmas Day']];
    for (const y of [year - 1, year, year + 1]) for (const [m, d, name] of fixed) {
      const actual = new Date(y, m - 1, d), observed = new Date(actual);
      if (actual.getDay() === 6) observed.setDate(observed.getDate() - 1);
      if (actual.getDay() === 0) observed.setDate(observed.getDate() + 1);
      if (plannerDateKey(actual) === key) names.push(name);
      if (plannerDateKey(observed) === key && observed.getTime() !== actual.getTime()) names.push(name + ' observed');
    }
    const observances = [[2, 14, 'Valentine’s Day'], [3, 17, 'St. Patrick’s Day'], [4, 22, 'Earth Day'], [10, 31, 'Halloween'], [12, 24, 'Christmas Eve'], [12, 31, 'New Year’s Eve']];
    observances.forEach(([m, d, name]) => { if (m === month && d === day) names.push(name); });
    return names.join(' · ');
  }
  const cleanAnchor = anchor => ({
    id: typeof anchor?.id === 'string' ? anchor.id : 'anchor-' + Date.now().toString(36) + Math.random().toString(36).slice(2),
    title: typeof anchor?.title === 'string' && anchor.title.trim() ? anchor.title.trim().slice(0, 160) : 'Untitled anchor',
    date: validDateKey(anchor?.date) ? anchor.date : todayKey(),
    endDate: validDateKey(anchor?.date) && validDateKey(anchor?.endDate) && anchor.endDate >= anchor.date ? anchor.endDate : '',
    start: validTime(anchor?.start) ? anchor.start : '', end: validTime(anchor?.end) ? anchor.end : '',
    type: anchorTypes.includes(anchor?.type) ? anchor.type : 'Gentle reminder',
    threadId: typeof anchor?.threadId === 'string' ? anchor.threadId : '', note: typeof anchor?.note === 'string' ? anchor.note.slice(0, 1000) : '',
    repeat: ['daily', 'weekly', 'monthly', 'yearly'].includes(anchor?.repeat) ? anchor.repeat : 'none',
    repeatUntil: validDateKey(anchor?.repeatUntil) && anchor.repeatUntil >= anchor.date ? anchor.repeatUntil : '',
    excludedDates: Array.isArray(anchor?.excludedDates) ? [...new Set(anchor.excludedDates.filter(validDateKey))] : [],
    createdAt: Number.isFinite(Date.parse(anchor?.createdAt)) ? anchor.createdAt : now(), updatedAt: Number.isFinite(Date.parse(anchor?.updatedAt)) ? anchor.updatedAt : now()
  });
  state.planner = { events: Array.isArray(plannerSource.events) ? plannerSource.events.filter(event => event && typeof event === 'object').map(cleanAnchor) : [] };
  let selectedPlannerDate = todayKey(), plannerMonthCursor = plannerMonthKey(todayKey()), editingAnchorId = null, editingOccurrenceDate = null, editingViewedDate = null, anchorSourceThreadId = null;
  function anchorSort(a, b) { return a.date.localeCompare(b.date) || (a.start || '99:99').localeCompare(b.start || '99:99') || a.title.localeCompare(b.title); }
  function plannerDayDistance(start, end) { return Math.round((plannerDate(end) - plannerDate(start)) / 86400000); }
  function anchorOccurrenceStart(anchor, date) {
    if (date < anchor.date) return null;
    const spanDays = anchor.endDate ? Math.max(0, plannerDayDistance(anchor.date, anchor.endDate)) : 0;
    if (anchor.repeat === 'none') return date <= (anchor.endDate || anchor.date) && !anchor.excludedDates.includes(anchor.date) ? anchor.date : null;
    if (anchor.repeatUntil && date > addPlannerDays(anchor.repeatUntil, spanDays)) return null;
    for (let offset = 0; offset <= spanDays; offset += 1) {
      const start = addPlannerDays(date, -offset);
      if (start < anchor.date) break;
      if ((anchor.repeatUntil && start > anchor.repeatUntil) || anchor.excludedDates.includes(start)) continue;
      if (anchor.repeat === 'daily' || anchor.repeat === 'weekly' && plannerDayDistance(anchor.date, start) % 7 === 0 || anchor.repeat === 'monthly' && start.slice(8) === anchor.date.slice(8) || anchor.repeat === 'yearly' && start.slice(5) === anchor.date.slice(5)) return start;
    }
    return null;
  }
  function anchorOccursOn(anchor, date) { return anchorOccurrenceStart(anchor, date) !== null; }
  function anchorsForDate(date) { return state.planner.events.map(anchor => { const start = anchorOccurrenceStart(anchor, date); return start ? { ...anchor, date, occurrenceDate: start, occurrenceEnd: anchor.endDate ? addPlannerDays(start, plannerDayDistance(anchor.date, anchor.endDate)) : start } : null; }).filter(Boolean); }
  function timeText(anchor) {
    const nice = value => { const [hour, minute] = value.split(':').map(Number); return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(2000, 0, 1, hour, minute)); };
    if (anchor.start && anchor.end) return nice(anchor.start) + '–' + nice(anchor.end);
    if (anchor.start) return 'from ' + nice(anchor.start); if (anchor.end) return 'until ' + nice(anchor.end); return 'any time';
  }
  function anchorDateTimeText(anchor) {
    if (!anchor.endDate) return formatAnchorDate(anchor.date, true) + ' · ' + timeText(anchor);
    const start = anchor.occurrenceDate || anchor.date, end = anchor.occurrenceEnd || anchor.endDate;
    return formatAnchorDate(start, true) + (anchor.start ? ' ' + timeText({ start: anchor.start, end: '' }).replace('from ', '') : '') + '–' + formatAnchorDate(end, true) + (anchor.end ? ' ' + timeText({ start: '', end: anchor.end }).replace('until ', '') : '');
  }
  function formatAnchorDate(key, compact = false) {
    return new Intl.DateTimeFormat(undefined, compact ? { month: 'short', day: 'numeric' } : { weekday: 'long', month: 'long', day: 'numeric' }).format(plannerDate(key));
  }
  function renderUpcoming() {
    const upcoming = [];
    for (let offset = 0; offset < 370; offset += 1) upcoming.push(...anchorsForDate(addPlannerDays(todayKey(), offset)));
    upcoming.sort(anchorSort);
    const seenOccurrences = new Set();
    const distinctUpcoming = upcoming.filter(anchor => { const identity = anchor.id + '|' + anchor.occurrenceDate; if (seenOccurrences.has(identity)) return false; seenOccurrences.add(identity); return true; });
    const hard = distinctUpcoming.filter(anchor => ['Appointment', 'Event', 'Hard deadline'].includes(anchor.type)).slice(0, 4);
    const flexible = distinctUpcoming.filter(anchor => anchor.type === 'Focus block').slice(0, 2);
    $('upcoming-preview').replaceChildren(); $('flexible-preview-items').replaceChildren();
    function previewButton(anchor) {
      const button = el('button', 'upcoming-anchor ' + anchorTypeClass(anchor.type)); button.type = 'button';
      const marker = el('span', 'anchor-marker', anchor.type === 'Focus block' ? '◇' : anchor.type === 'Rest / protected time' ? '☾' : '●'); marker.setAttribute('aria-hidden', 'true');
      const copy = el('span', 'upcoming-copy'); copy.append(el('strong', '', anchor.title), el('small', '', anchorDateTimeText(anchor)));
      button.append(marker, copy); button.addEventListener('click', () => { selectedPlannerDate = anchor.date; plannerMonthCursor = plannerMonthKey(anchor.date); location.hash = '#planner'; showView('planner'); renderPlanner(); });
      return button;
    }
    const today = hard.filter(anchor => anchor.date === todayKey()), later = hard.filter(anchor => anchor.date !== todayKey());
    if (today.length) { $('upcoming-preview').append(el('p', 'preview-group-label', 'TODAY')); today.forEach(anchor => $('upcoming-preview').append(previewButton(anchor))); }
    if (later.length) { $('upcoming-preview').append(el('p', 'preview-group-label', 'ON THE HORIZON')); later.forEach(anchor => $('upcoming-preview').append(previewButton(anchor))); }
    if (!hard.length) $('upcoming-preview').append(el('p', 'open-time-note', 'No appointments or deadlines ahead. The open space can remain open.'));
    flexible.forEach(anchor => $('flexible-preview-items').append(previewButton(anchor)));
    $('flexible-preview').hidden = !flexible.length;
  }
  function plannerEventButton(anchor) {
    const button = el('button', 'planner-event ' + anchorTypeClass(anchor.type)); button.type = 'button'; button.setAttribute('aria-label', 'Edit ' + anchor.title);
    const meta = el('span', 'planner-event-meta', (anchor.endDate ? anchorDateTimeText(anchor) : timeText(anchor)) + ' · ' + anchorTypeShort(anchor.type) + (anchor.repeat !== 'none' ? ' · repeats ' + anchor.repeat : ''));
    button.append(meta, el('strong', '', anchor.title));
    const linkedThread = state.threads.find(thread => thread.id === anchor.threadId); if (linkedThread) button.append(el('span', 'planner-thread-link', 'Thread · ' + linkedThread.title));
    if (anchor.note) button.append(el('small', '', anchor.note));
    button.addEventListener('click', () => openAnchorEditor(state.planner.events.find(item => item.id === anchor.id), null, anchor.occurrenceDate, anchor.date)); return button;
  }
  function renderPlannerWeek() {
    const start = startOfPlannerWeek(selectedPlannerDate), end = addPlannerDays(start, 6); const startDate = plannerDate(start), endDate = plannerDate(end);
    const sameMonth = startDate.getMonth() === endDate.getMonth();
    $('week-label').textContent = sameMonth ? new Intl.DateTimeFormat(undefined, { month: 'long' }).format(startDate) + ' ' + startDate.getDate() + '–' + endDate.getDate() + ', ' + endDate.getFullYear() : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(startDate) + ' – ' + new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(endDate);
    $('week-grid').replaceChildren();
    for (let offset = 0; offset < 7; offset += 1) {
      const key = addPlannerDays(start, offset), holiday = usHolidayName(key); const day = el('article', 'planner-day' + (key === todayKey() ? ' is-today' : '') + (key === selectedPlannerDate ? ' is-selected' : ''));
      const heading = el('button', 'planner-day-heading'); heading.type = 'button'; heading.setAttribute('aria-label', 'Select ' + formatAnchorDate(key) + (holiday ? ', ' + holiday : ''));
      heading.append(el('span', 'day-name', new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(plannerDate(key))), el('span', 'day-number', String(plannerDate(key).getDate())));
      heading.addEventListener('click', () => { selectedPlannerDate = key; plannerMonthCursor = plannerMonthKey(key); renderPlanner(); }); day.append(heading);
      const events = anchorsForDate(key).sort(anchorSort); const eventList = el('div', 'planner-day-events'); events.forEach(anchor => eventList.append(plannerEventButton(anchor)));
      if (!events.length) eventList.append(el('span', 'open-time-note', 'open time'));
      day.append(eventList); if (holiday) day.append(el('p', 'planner-holiday', '✧ ' + holiday)); $('week-grid').append(day);
    }
  }
  function renderPlannerMonth() {
    const { year, month } = monthParts(plannerMonthCursor); const first = new Date(year, month - 1, 1); const days = new Date(year, month, 0).getDate(); const blanks = (first.getDay() + 6) % 7;
    $('planner-month-label').textContent = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(first); $('planner-month-grid').replaceChildren();
    for (let blank = 0; blank < blanks; blank += 1) { const space = el('span', 'mini-day is-blank'); space.setAttribute('aria-hidden', 'true'); $('planner-month-grid').append(space); }
    for (let day = 1; day <= days; day += 1) {
      const key = year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0'); const hasEvents = state.planner.events.some(anchor => anchorOccursOn(anchor, key)), holiday = usHolidayName(key);
      const button = el('button', 'mini-day' + (key === todayKey() ? ' is-today' : '') + (key === selectedPlannerDate ? ' is-selected' : '') + (hasEvents ? ' has-events' : '') + (holiday ? ' has-holiday' : ''), String(day)); button.type = 'button'; button.setAttribute('aria-label', formatAnchorDate(key) + (holiday ? ', ' + holiday : '') + (hasEvents ? ', has anchors' : '')); if (holiday) button.title = holiday;
      button.addEventListener('click', () => { selectedPlannerDate = key; renderPlanner(); }); $('planner-month-grid').append(button);
    }
  }
  function renderPlanner() { renderPlannerWeek(); renderPlannerMonth(); renderUpcoming(); }
  function populateAnchorThreads(selected = '') {
    $('anchor-thread').replaceChildren(); const none = el('option', '', 'No linked thread'); none.value = ''; $('anchor-thread').append(none);
    state.threads.filter(thread => eligible(thread) || thread.id === selected).sort((a, b) => a.title.localeCompare(b.title)).forEach(thread => { const option = el('option', '', thread.title + (thread.example ? ' · Example' : '')); option.value = thread.id; $('anchor-thread').append(option); });
    $('anchor-thread').value = selected;
    $('anchor-open-thread').hidden = !state.threads.some(thread => thread.id === selected);
  }
  function syncAnchorRepeat() {
    const repeating = $('anchor-repeat').value !== 'none'; $('anchor-repeat-until-wrap').hidden = !repeating; $('anchor-repeat-help').hidden = !repeating;
    $('anchor-repeat-help').textContent = 'Changes update the whole series. End repeating limits new starts; a span may finish later. Monthly and yearly repeats skip dates missing from a shorter month.';
    $('skip-anchor-occurrence').hidden = !repeating || !editingAnchorId || !editingOccurrenceDate;
    $('remove-anchor').textContent = repeating ? 'Delete series' : 'Delete';
  }
  function openAnchorEditor(anchor = null, thread = null, occurrenceDate = null, viewedDate = null) {
    editingAnchorId = anchor?.id || null; editingOccurrenceDate = occurrenceDate || null; editingViewedDate = viewedDate || null; anchorSourceThreadId = thread?.id || null; $('anchor-form').reset(); $('anchor-title').setCustomValidity(''); $('anchor-date').setCustomValidity(''); $('anchor-end-date').setCustomValidity(''); $('anchor-end').setCustomValidity(''); $('anchor-repeat-until').setCustomValidity('');
    $('anchor-editor-title').textContent = anchor?.repeat && anchor.repeat !== 'none' ? 'Tend this repeating anchor' : anchor ? 'Tend this anchor' : thread ? 'Place this next move' : 'Add an anchor';
    $('anchor-title').value = anchor?.title || thread?.next || ''; $('anchor-date').value = anchor?.date || selectedPlannerDate || todayKey(); $('anchor-end-date').value = anchor?.endDate || '';
    $('anchor-start').value = anchor?.start || ''; $('anchor-end').value = anchor?.end || ''; $('anchor-type').value = anchor?.type || (thread ? 'Focus block' : 'Appointment');
    syncAnchorPicker('start'); syncAnchorPicker('end');
    $('anchor-note').value = anchor?.note || (thread ? 'From thread: ' + thread.title : ''); populateAnchorThreads(anchor?.threadId || thread?.id || '');
    $('anchor-repeat').value = anchor?.repeat || 'none'; $('anchor-repeat-until').value = anchor?.repeatUntil || '';
    $('skip-anchor-occurrence').textContent = anchor?.endDate ? 'Skip this span only' : 'Skip ' + formatAnchorDate(occurrenceDate || anchor?.date || todayKey(), true) + ' only';
    $('remove-anchor').hidden = !anchor; syncAnchorRepeat(); $('anchor-editor').showModal(); $('anchor-title').focus();
  }
  const moveFits = ['full', 'short', 'indoor', 'solo', 'mobility', 'rest'];
  const moveFitNames = { full: 'Full session', short: 'Short session', indoor: 'Indoor option', solo: 'Solo option', mobility: 'Gentle mobility', rest: 'Intentional rest' };
  const moveTemplateFits = moveFits.filter(fit => fit !== 'rest');
  function inferredMoveFits(idea) {
    const name = idea.name.toLowerCase(), id = idea.id;
    if (id === 'move-custom') return [...moveTemplateFits];
    if (id === 'move-recovery' || /mobility|stretch|recovery|yoga/.test(name)) return ['short', 'indoor', 'solo', 'mobility'];
    if (id === 'move-outdoor-walk' || /outdoor walk/.test(name)) return ['full', 'short', 'solo'];
    if (id === 'move-walk-jog' || /walk|jog|run|trail/.test(name)) return ['full', 'short', 'solo'];
    if (id === 'move-indoor-movement' || /row/.test(name)) return ['full', 'short', 'indoor', 'solo'];
    if (id === 'move-cardio' || id === 'move-dance' || /strength|lifting|boxing|dance|cardio/.test(name)) return ['full', 'short', 'indoor', 'solo'];
    return ['full'];
  }
  function cleanMoveFits(fits, idea) {
    const valid = Array.isArray(fits) ? [...new Set(fits.filter(fit => moveTemplateFits.includes(fit)))] : [];
    return valid.length ? valid : inferredMoveFits(idea);
  }
  const moveStatuses = ['Completed', 'Modified', 'Partial', 'Skipped', 'Canceled', 'Rest'];
  const strengthANotes = 'Editable example structure: lower-body movement, a push, a pull, and a hinge. Replace any part to fit you.';
  const strengthBNotes = 'Editable example structure: a step or balance movement, a push, a glute movement, and a pull. Replace any part to fit you.';
  const moveSeeds = [
    { id: 'move-strength-a', name: 'Strength A', notes: strengthANotes, historical: false },
    { id: 'move-strength-b', name: 'Strength B', notes: strengthBNotes, historical: false },
    { id: 'move-cardio', name: 'Indoor cardio' }, { id: 'move-dance', name: 'Dance or music movement' },
    { id: 'move-walk-jog', name: 'Walk or walk-jog' }, { id: 'move-indoor-movement', name: 'Indoor machine or circuit' },
    { id: 'move-outdoor-walk', name: 'Outdoor walk' }, { id: 'move-recovery', name: 'Recovery / mobility' },
    { id: 'move-custom', name: 'Custom activity' }
  ].map(idea => ({ ...idea, notes: idea.notes || '', historical: idea.historical === true, example: false, fits: inferredMoveFits(idea) }));
  const moveStarterIds = new Set(moveSeeds.map(idea => idea.id));
  const movementSource = savedMovement && typeof savedMovement === 'object' ? savedMovement : {};
  const legacyMoveExampleIds = new Set(Array.isArray(movementSource.ideas) ? movementSource.ideas.filter(idea => idea?.example === true).map(idea => idea.id) : []);
  const savedIdeas = Array.isArray(movementSource.ideas) ? movementSource.ideas.filter(idea => idea && typeof idea.id === 'string' && typeof idea.name === 'string').map(idea => ({ id: idea.id, name: idea.name.slice(0, 100), notes: typeof idea.notes === 'string' ? idea.notes.slice(0, 3000) : '', historical: idea.historical === true, example: false, fits: cleanMoveFits(idea.fits, idea) })) : null;
  const moveIdeas = savedIdeas || moveSeeds.map(idea => ({ ...idea }));
  if (savedIdeas && movementSource.templateVersion !== 3) moveSeeds.forEach(seed => {
    const existing = moveIdeas.find(idea => idea.id === seed.id);
    if (!existing) moveIdeas.push({ ...seed });
    else if (seed.historical && legacyMoveExampleIds.has(seed.id) && !existing.notes) Object.assign(existing, { notes: seed.notes, historical: true, example: false });
  });
  const moveContextSource = movementSource.context || {};
  state.movement = {
    templateVersion: 3,
    ideas: moveIdeas,
    choice: movementSource.choice && moveFits.includes(movementSource.choice.fit) ? { fit: movementSource.choice.fit, ideaId: typeof movementSource.choice.ideaId === 'string' ? movementSource.choice.ideaId : null, customName: typeof movementSource.choice.customName === 'string' ? movementSource.choice.customName.slice(0, 100) : '' } : null,
    context: {
      energy: ['High', 'Medium', 'Low', 'Rest'].includes(moveContextSource.energy) ? moveContextSource.energy : '',
      time: ['5', '10', '20', '45+'].includes(moveContextSource.time) ? moveContextSource.time : '',
      location: ['Indoor', 'Garage', 'Outside', 'Friend gym'].includes(moveContextSource.location) ? moveContextSource.location : '',
      heat: moveContextSource.heat === true, pain: moveContextSource.pain === true, social: moveContextSource.social === true,
      originalId: typeof moveContextSource.originalId === 'string' ? moveContextSource.originalId : ''
    },
    logs: Array.isArray(movementSource.logs) ? movementSource.logs.filter(log => log && typeof log.id === 'string' && validDateKey(log.date) && (moveStatuses.includes(log.status) || ['activity', 'rest'].includes(log.kind))).map(log => ({
      id: log.id, status: moveStatuses.includes(log.status) ? log.status : log.kind === 'rest' ? 'Rest' : 'Completed',
      activityId: typeof log.activityId === 'string' ? log.activityId : null, activityName: typeof log.activityName === 'string' ? log.activityName : '',
      minutes: Number.isInteger(log.minutes) && log.minutes >= 1 && log.minutes <= 600 ? log.minutes : null,
      note: typeof log.note === 'string' ? log.note.slice(0, 180) : '', rpe: Number.isInteger(log.rpe) && log.rpe >= 1 && log.rpe <= 10 ? log.rpe : null,
      details: typeof log.details === 'string' ? log.details.slice(0, 3000) : '', date: log.date, at: Number.isFinite(Date.parse(log.at)) ? log.at : now()
    })) : []
  };
  let editingMoveIdeaId = null, editingMoveIdeas = false, editingMoveLogId = null, pendingMoveDeleteId = null;
  function moveIdea(id) { return state.movement.ideas.find(idea => idea.id === id); }
  function sortedMoveIdeas() { return [...state.movement.ideas].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })); }
  function isCustomMoveValue(value) { return value === 'custom' || value === 'move-custom'; }
  function moveFitIdeas(fit) { return sortedMoveIdeas().filter(idea => idea.fits.includes(fit)); }
  function firstMoveIdea(fit, ...ids) { return ids.map(moveIdea).find(idea => idea?.fits.includes(fit)) || moveFitIdeas(fit).find(idea => !isCustomMoveValue(idea.id)) || null; }
  function moveSuggestedIdea(fit) {
    const c = state.movement.context, indoors = c.heat || c.location === 'Garage' || c.location === 'Indoor';
    if (fit === 'rest') return null;
    if (fit === 'mobility') return firstMoveIdea(fit, 'move-recovery', 'move-stretch');
    if (fit === 'indoor') return firstMoveIdea(fit, 'move-indoor-movement', 'move-rowing', 'move-cardio', 'move-recovery');
    if (fit === 'solo' && c.social && moveIdea(c.originalId)?.fits.includes(fit)) return moveIdea(c.originalId);
    if (fit === 'solo') return indoors ? firstMoveIdea(fit, 'move-indoor-movement', 'move-cardio') : firstMoveIdea(fit, 'move-walk-jog', 'move-walk', 'move-outdoor-walk');
    if (fit === 'short') return c.social && moveIdea(c.originalId)?.fits.includes(fit) ? moveIdea(c.originalId) : c.energy === 'Low' ? firstMoveIdea(fit, 'move-outdoor-walk', 'move-recovery') : indoors ? firstMoveIdea(fit, 'move-cardio', 'move-indoor-movement') : firstMoveIdea(fit, 'move-outdoor-walk', 'move-walk-jog');
    return indoors ? firstMoveIdea(fit, 'move-cardio', 'move-indoor-movement') : firstMoveIdea(fit, 'move-dance', 'move-walk-jog');
  }
  function renderMovePreview() {
    const choice = state.movement.choice;
    if (!choice || choice.fit === 'rest') { $('move-preview-choice').textContent = 'Rest is available. Choose a path only if one fits.'; return; }
    const idea = moveIdea(choice.ideaId), available = idea?.fits.includes(choice.fit);
    $('move-preview-choice').textContent = moveFitNames[choice.fit] + (available ? ' · ' + (isCustomMoveValue(idea.id) && choice.customName ? choice.customName : idea.name) : choice.ideaId === 'custom' && choice.customName ? ' · ' + choice.customName : ' · an open possibility.');
  }
  function renderMoveContext() {
    const c = state.movement.context;
    $('move-energy').value = c.energy; $('move-time').value = c.time; $('move-location').value = c.location;
    $('move-heat').checked = c.heat; $('move-pain').checked = c.pain; $('move-social').checked = c.social;
    $('move-original-wrap').hidden = !c.social; $('move-original').replaceChildren();
    const blank = el('option', '', 'Choose one, if useful'); blank.value = ''; $('move-original').append(blank);
    sortedMoveIdeas().forEach(idea => { const option = el('option', '', idea.name); option.value = idea.id; $('move-original').append(option); });
    $('move-original').value = moveIdea(c.originalId) ? c.originalId : '';
    const summary = [c.energy && c.energy + ' energy', c.time && c.time + ' minutes', c.location, c.heat && 'prefer indoors', c.pain && 'gentler day', c.social && 'plans changed'].filter(Boolean);
    $('move-context-summary').textContent = summary.length ? summary.join(' · ') : 'Energy, time, and place if useful';
    $('move-context-note').textContent = c.pain ? 'A smaller choice or rest can fit today.' : c.heat || c.location === 'Garage' ? 'Indoor options can stay near the front today.' : c.social ? 'The original, an indoor swap, ten minutes, or rest can all fit.' : c.energy === 'Low' ? 'A short walk, a little mobility, or rest can all be enough.' : '';
  }
  function renderMoveChoice() {
    const choice = state.movement.choice, c = state.movement.context;
    const order = c.pain || c.energy === 'Rest' ? ['rest', 'mobility', 'short', 'indoor', 'solo', 'full']
      : c.heat || c.location === 'Garage' || c.location === 'Indoor' ? ['indoor', 'short', 'mobility', 'rest', 'solo', 'full']
      : c.social ? ['solo', 'indoor', 'short', 'rest', 'full', 'mobility']
      : c.energy === 'Low' || ['5', '10'].includes(c.time) ? ['short', 'mobility', 'rest', 'indoor', 'solo', 'full']
      : c.location === 'Outside' ? ['solo', 'short', 'full', 'mobility', 'rest', 'indoor']
      : c.time === '20' ? ['short', 'full', 'solo', 'indoor', 'mobility', 'rest'] : moveFits;
    const grid = document.querySelector('.move-choice-grid');
    order.forEach(fit => { const button = grid.querySelector('[data-move-fit="' + fit + '"]'); grid.append(button); button.classList.toggle('is-chosen', fit === choice?.fit); button.setAttribute('aria-pressed', String(fit === choice?.fit)); });
    const solo = grid.querySelector('[data-move-fit="solo"] strong'), short = grid.querySelector('[data-move-fit="short"] small'), indoor = grid.querySelector('[data-move-fit="indoor"] small');
    solo.textContent = c.social && moveIdea(c.originalId)?.fits.includes('solo') ? 'Solo original' : 'Solo option';
    short.textContent = c.social ? 'A 10-minute version' : 'Just a small opening'; indoor.textContent = c.social ? 'An indoor version' : 'Stay close to home';
    $('move-selection').hidden = !choice;
    if (!choice) return;
    $('move-selection-text').textContent = choice.fit === 'rest' ? 'Rest can be the entire answer today.' : moveFitNames[choice.fit] + ' is one possible shape. Nothing has been logged.';
    $('move-idea-label').hidden = choice.fit === 'rest'; $('move-idea-choice').replaceChildren();
    const available = moveFitIdeas(choice.fit);
    const blank = el('option', '', available.length ? 'Choose a template' : 'Choose or name an activity'); blank.value = ''; $('move-idea-choice').append(blank);
    available.forEach(idea => { const option = el('option', '', idea.name); option.value = idea.id; $('move-idea-choice').append(option); });
    if (!available.some(idea => isCustomMoveValue(idea.id)) && choice.fit !== 'rest') { const custom = el('option', '', 'Custom activity'); custom.value = 'custom'; $('move-idea-choice').append(custom); }
    const selectedChoice = choice.ideaId === 'custom' && available.some(idea => idea.id === 'move-custom') ? 'move-custom' : choice.ideaId;
    $('move-idea-choice').value = available.some(idea => idea.id === selectedChoice) || selectedChoice === 'custom' ? selectedChoice : '';
    $('move-choice-custom').hidden = !isCustomMoveValue(choice.ideaId); $('move-choice-custom').value = choice.customName || '';
  }
  function renderMoveLogOptions() {
    const prior = $('move-log-activity').value; $('move-log-activity').replaceChildren();
    const blank = el('option', '', 'Choose what actually happened'); blank.value = ''; $('move-log-activity').append(blank);
    const choices = sortedMoveIdeas().filter(idea => !isCustomMoveValue(idea.id));
    choices.push({ id: moveIdea('move-custom') ? 'move-custom' : 'custom', name: 'Custom activity' });
    choices.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    choices.forEach(idea => { const option = el('option', '', idea.name); option.value = idea.id; $('move-log-activity').append(option); });
    $('move-log-activity').value = moveIdea(prior) ? prior : prior === 'custom' ? (moveIdea('move-custom') ? 'move-custom' : 'custom') : ''; renderMoveLogStatus();
  }
  function renderMoveLogStatus() {
    $('move-log-activity-wrap').hidden = !['Completed', 'Modified', 'Partial'].includes($('move-log-status-choice').value);
    $('move-custom-name').hidden = !isCustomMoveValue($('move-log-activity').value) || $('move-log-activity-wrap').hidden;
  }
  function renderMoveIdeas() {
    $('move-edit-ideas').textContent = editingMoveIdeas ? 'Done editing' : 'Edit templates'; $('move-edit-ideas').setAttribute('aria-pressed', String(editingMoveIdeas)); $('move-add-idea').hidden = !editingMoveIdeas;
    $('move-idea-list').replaceChildren();
    const appendIdea = idea => {
      const row = el('div', 'move-idea-row'); const copy = el('div');
      copy.append(el('strong', '', idea.name));
      if (idea.historical) copy.append(el('small', '', 'Source notes · edit as you like'));
      copy.append(el('small', 'move-template-paths', 'Paths: ' + idea.fits.map(fit => fit[0].toUpperCase() + fit.slice(1)).join(' · ')));
      if (idea.notes) { const details = el('details', 'move-template-detail'); details.append(el('summary', '', 'Reference notes'), el('p', '', idea.notes)); copy.append(details); }
      else if (idea.historical) copy.append(el('small', '', 'Original exercise order can be added when found.'));
      row.append(copy);
      if (editingMoveIdeas) {
        const actions = el('div', 'move-idea-actions');
        actions.append(action('Edit', () => openMoveIdeaEditor(idea)), action('Remove', () => {
          state.movement.ideas = state.movement.ideas.filter(item => item.id !== idea.id);
          if (state.movement.choice?.ideaId === idea.id) state.movement.choice.ideaId = null;
          if (state.movement.context.originalId === idea.id) state.movement.context.originalId = '';
          const saved = save(); renderMove(); $('move-idea-status').textContent = saved ? 'Template removed. Earlier notes keep their original wording.' : 'The change is visible for now, but the browser could not save it.';
        })); row.append(actions);
      }
      $('move-idea-list').append(row);
    };
    const currentIdeas = state.movement.ideas.filter(idea => !idea.historical), historicalIdeas = state.movement.ideas.filter(idea => idea.historical);
    if (currentIdeas.length) { $('move-idea-list').append(el('p', 'move-template-group-label', 'CURRENT POSSIBILITIES')); currentIdeas.forEach(appendIdea); }
    if (historicalIdeas.length) { $('move-idea-list').append(el('p', 'move-template-group-label is-history', 'SOURCE MATERIAL')); historicalIdeas.forEach(appendIdea); }
    if (!state.movement.ideas.length) $('move-idea-list').append(el('p', 'open-time-note', 'An open list. Add one template whenever you like.'));
  }
  function renderMoveHistory() {
    const history = [...state.movement.logs].sort((a, b) => b.date.localeCompare(a.date) || Date.parse(b.at) - Date.parse(a.at));
    const last = history.find(log => ['Completed', 'Modified', 'Partial', 'Rest'].includes(log.status));
    const daysSince = last ? Math.floor((plannerDate(todayKey()) - plannerDate(last.date)) / 86400000) : Infinity;
    $('move-return').hidden = daysSince <= 28; $('move-history-list').replaceChildren();
    history.forEach(log => {
      const row = el('article', 'move-history-item' + (log.status === 'Rest' ? ' is-rest' : ''));
      const date = el('time', '', new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(plannerDate(log.date))); date.dateTime = log.date;
      const title = log.status + (log.activityName && log.status !== 'Rest' ? ' · ' + log.activityName : '');
      row.append(date, el('strong', '', title));
      if (log.minutes) row.append(el('span', 'move-duration', log.minutes + ' min'));
      if (log.note) row.append(el('p', '', log.note));
      if (log.rpe || log.details) { const details = el('details', 'move-history-detail'); details.append(el('summary', '', 'Optional details')); if (log.rpe) details.append(el('p', '', 'Effort / RPE: ' + log.rpe)); if (log.details) details.append(el('p', '', log.details)); row.append(details); }
      const actions = el('div', 'move-history-actions');
      actions.append(action('Edit', () => editMoveLog(log)), action('Delete', () => openMoveDelete(log)));
      row.append(actions);
      $('move-history-list').append(row);
    });
    if (!history.length) $('move-history-list').append(el('p', 'open-time-note', 'No moments saved yet. This room is here whenever you want it.'));
  }
  function renderMove() { renderMovePreview(); renderMoveContext(); renderMoveChoice(); renderMoveLogOptions(); renderMoveIdeas(); renderMoveHistory(); if (!$('move-log-date').value) $('move-log-date').value = todayKey(); }
  function chooseMoveFit(fit) {
    if (!moveFits.includes(fit)) return;
    state.movement.choice = { fit, ideaId: moveSuggestedIdea(fit)?.id || null, customName: '' }; save(); renderMovePreview(); renderMoveChoice();
    $('move-selection').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
  }
  function openMoveIdeaEditor(idea = null) {
    editingMoveIdeaId = idea?.id || null; $('move-idea-form').reset(); $('move-idea-name').setCustomValidity('');
    $('move-idea-editor-title').textContent = idea ? 'Edit a template' : 'Add a template'; $('move-idea-name').value = idea?.name || '';
    $('move-idea-notes').value = idea?.notes || ''; $('move-idea-historical').checked = idea?.historical || false;
    $('move-idea-fit-status').textContent = '';
    document.querySelectorAll('[data-template-fit]').forEach(input => { input.checked = (idea?.fits || ['full']).includes(input.value); });
    $('move-idea-editor').showModal(); $('move-idea-name').focus();
  }
  function openMoveDelete(log) {
    pendingMoveDeleteId = log.id;
    $('move-delete-description').textContent = 'Remove ' + (log.activityName || log.status.toLowerCase()) + ' from ' + new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long', day: 'numeric' }).format(plannerDate(log.date)) + '? This only removes the selected saved moment.';
    $('move-delete-confirm').showModal(); $('move-delete-cancel').focus();
  }
  function editMoveLog(log) {
    editingMoveLogId = log.id; $('move-log-cancel-edit').hidden = false; $('move-templates-panel').open = false;
    $('move-log-status-choice').value = log.status;
    const savedIdea = moveIdea(log.activityId);
    $('move-log-activity').value = savedIdea && !isCustomMoveValue(savedIdea.id) ? savedIdea.id : log.activityName ? (moveIdea('move-custom') ? 'move-custom' : 'custom') : '';
    $('move-custom-name').value = savedIdea && !isCustomMoveValue(savedIdea.id) ? '' : log.activityName;
    $('move-log-date').value = log.date; $('move-log-duration').value = log.minutes || ''; $('move-log-note').value = log.note || '';
    $('move-log-rpe').value = log.rpe || ''; $('move-log-exercises').value = log.details || '';
    renderMoveLogStatus(); $('move-log-status').textContent = 'Editing this saved moment. Change only what you want.';
    $('move-log-form').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    $('move-log-date').focus({ preventScroll: true });
  }
  const nourishTags = ['fast', 'low-energy', 'protein', 'leftovers', 'lunch', 'dinner', 'snack', 'prep-friendly'];
  const nourishTagNames = { fast: 'Fast', 'low-energy': 'Low energy', protein: 'Protein', leftovers: 'Leftovers', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack', 'prep-friendly': 'Prep friendly' };
  const groceryCategories = ['', 'protein', 'produce', 'pantry', 'freezer', 'household'];
  function cleanIngredients(items) {
    if (!Array.isArray(items)) return [];
    const seen = new Set(); return items.map(item => typeof item === 'string' ? item.trim().slice(0, 80) : '').filter(item => { const key = item.toLocaleLowerCase(); if (!item || seen.has(key)) return false; seen.add(key); return true; }).slice(0, 30);
  }
  const parseIngredients = text => cleanIngredients(String(text).split(/[,;\n]+/));
  const nourishSeeds = [
    { id: 'nourish-rice', name: 'Rice and beans bowl', note: 'Warm rice and beans; add a topping or sauce if you like.', tags: ['fast', 'low-energy', 'protein', 'lunch', 'dinner'], ingredients: ['rice', 'beans'] },
    { id: 'nourish-pasta', name: 'Pasta with sauce', note: 'A familiar, easy meal that can take whatever additions sound good.', tags: ['low-energy', 'dinner', 'prep-friendly'], ingredients: ['pasta', 'sauce'] },
    { id: 'nourish-eggs', name: 'Eggs and toast', note: 'Eggs cooked your way with bread or another easy side.', tags: ['fast', 'protein', 'lunch'], ingredients: ['eggs', 'bread'] },
    { id: 'nourish-yogurt', name: 'Yogurt and fruit', note: 'Add granola or nuts if they are around.', tags: ['fast', 'low-energy', 'snack'], ingredients: ['yogurt', 'fruit'] },
    { id: 'nourish-soup', name: 'Soup and bread', note: 'A simple pantry or freezer fallback.', tags: ['fast', 'low-energy', 'lunch', 'dinner'], ingredients: ['soup', 'bread'] },
    { id: 'nourish-freezer', name: 'Freezer fallback', note: 'A frozen meal that sounds welcoming. Heat and eat is enough.', tags: ['fast', 'low-energy', 'dinner'], ingredients: ['frozen meal'] }
  ].map(idea => ({ ...idea, favorite: false, archived: false, example: true }));
  const nourishStarterIds = new Set(nourishSeeds.map(idea => idea.id));
  const nourishSource = savedNourish && typeof savedNourish === 'object' && !Array.isArray(savedNourish) ? savedNourish : {};
  let needsNourishMigration = Array.isArray(nourishSource.leftovers) && nourishSource.leftovers.some(item => item && item.status && item.status !== 'available' && !Number.isFinite(Date.parse(item.resolvedAt)));
  state.nourish = {
    ideas: Array.isArray(nourishSource.ideas) ? nourishSource.ideas.filter(idea => idea && typeof idea.id === 'string' && typeof idea.name === 'string').map(idea => ({
      id: idea.id, name: idea.name.slice(0, 100), note: typeof idea.note === 'string' ? idea.note.slice(0, 300) : '',
      tags: Array.isArray(idea.tags) ? [...new Set(idea.tags.filter(tag => nourishTags.includes(tag)))] : [],
      ingredients: cleanIngredients(idea.example && nourishSeeds.some(seed => seed.id === idea.id) ? nourishSeeds.find(seed => seed.id === idea.id).ingredients : idea.ingredients),
      favorite: idea.favorite === true, archived: idea.archived === true, example: idea.example === true
    })) : nourishSeeds.map(idea => ({ ...idea, tags: [...idea.tags], ingredients: [...idea.ingredients] })),
    leftovers: Array.isArray(nourishSource.leftovers) ? nourishSource.leftovers.filter(item => item && typeof item.id === 'string' && typeof item.name === 'string').map(item => ({
      id: item.id, name: item.name.slice(0, 100), note: typeof item.note === 'string' ? item.note.slice(0, 180) : '',
      useBy: validDateKey(item.useBy) ? item.useBy : '', status: ['available', 'eaten', 'discarded', 'saved'].includes(item.status) ? item.status : 'available',
      addedAt: Number.isFinite(Date.parse(item.addedAt)) ? item.addedAt : now(), resolvedAt: Number.isFinite(Date.parse(item.resolvedAt)) ? item.resolvedAt : item.status && item.status !== 'available' ? now() : ''
    })) : [],
    groceries: Array.isArray(nourishSource.groceries) ? nourishSource.groceries.filter(item => item && typeof item.id === 'string' && typeof item.name === 'string').map(item => ({
      id: item.id, name: item.name.slice(0, 100), category: groceryCategories.includes(item.category) ? item.category : '', checked: item.checked === true
    })) : [],
    recipes: Array.isArray(nourishSource.recipes) ? nourishSource.recipes.filter(recipe => recipe && typeof recipe.id === 'string' && typeof recipe.name === 'string').map(recipe => ({
      id: recipe.id, name: recipe.name.slice(0, 100), ingredients: cleanIngredients(recipe.ingredients), method: typeof recipe.method === 'string' ? recipe.method.slice(0, 1200) : '', createdAt: Number.isFinite(Date.parse(recipe.createdAt)) ? recipe.createdAt : now()
    })) : [],
    dailyNotes: nourishSource.dailyNotes && typeof nourishSource.dailyNotes === 'object' && !Array.isArray(nourishSource.dailyNotes)
      ? Object.fromEntries(Object.entries(nourishSource.dailyNotes).filter(([date, note]) => validDateKey(date) && typeof note === 'string').map(([date, note]) => [date, note.slice(0, 180)])) : {}
  };
  let nourishPath = null, editingNourishIdeaId = null, editingLeftoverId = null, editingNourishRecipeId = null;
  const nourishId = kind => kind + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2);
  const nourishIdea = id => state.nourish.ideas.find(idea => idea.id === id);
  const nourishRecipe = id => state.nourish.recipes.find(recipe => recipe.id === id);
  function pruneSettledLeftovers() {
    const before = state.nourish.leftovers.length, threeDays = 3 * 24 * 60 * 60 * 1000;
    state.nourish.leftovers = state.nourish.leftovers.filter(item => item.status === 'available' || Date.now() - Date.parse(item.resolvedAt) < threeDays);
    if (state.nourish.leftovers.length !== before || needsNourishMigration) { if (save()) needsNourishMigration = false; }
  }
  function addIngredientsToGroceries(ingredients) {
    let added = 0;
    cleanIngredients(ingredients).forEach(ingredient => {
      const name = ingredient.split(/\s+or\s+|\//i)[0].trim();
      if (state.nourish.groceries.some(item => item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) return;
      state.nourish.groceries.push({ id: nourishId('grocery'), name, category: '', checked: false }); added++;
    });
    const saved = save(); renderNourish();
    return saved ? added ? added + ' ingredient' + (added === 1 ? '' : 's') + ' added to groceries.' : 'Those ingredients are already on your grocery list.' : 'The list changed for now, but the browser could not save it.';
  }
  function sortedNourishIdeas(ideas) { return [...ideas].sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name)); }
  function useSoonText(item) {
    if (!item.useBy) return '';
    if (item.useBy < todayKey()) return 'Date passed · check if still good';
    if (item.useBy <= addPlannerDays(todayKey(), 2)) return 'Use soon';
    return 'Use by ' + formatAnchorDate(item.useBy, true);
  }
  function renderNourishPreview() {
    const soon = state.nourish.leftovers.filter(item => item.status === 'available' && item.useBy && item.useBy <= addPlannerDays(todayKey(), 2)).sort((a, b) => a.useBy.localeCompare(b.useBy))[0];
    const groceries = state.nourish.groceries.filter(item => !item.checked);
    const favorite = sortedNourishIdeas(state.nourish.ideas.filter(idea => !idea.archived && idea.favorite))[0];
    $('nourish-preview-text').textContent = soon ? 'A leftover to check: ' + soon.name + '.' : groceries.length ? groceries.length + ' thing' + (groceries.length === 1 ? '' : 's') + ' on your grocery list.' : favorite ? 'An easy favorite: ' + favorite.name + '.' : 'Nothing urgent here. Easy ideas are waiting if useful.';
  }
  function renderNourishSuggestions() {
    document.querySelectorAll('[data-nourish-path]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.nourishPath === nourishPath)));
    $('nourish-suggestions').hidden = !nourishPath;
    if (!nourishPath) return;
    const list = $('nourish-suggestion-list'); list.replaceChildren();
    const jump = $('nourish-suggestion-jump');
    if (nourishPath === 'groceries') {
      $('nourish-suggestion-intro').textContent = 'A look at what might make feeding yourself easier later.';
      const items = state.nourish.groceries.filter(item => !item.checked).slice(0, 3);
      items.forEach(item => list.append(el('p', 'nourish-suggestion-line', item.name)));
      const easyIdeas = sortedNourishIdeas(state.nourish.ideas.filter(idea => !idea.archived && idea.tags.some(tag => ['fast', 'low-energy'].includes(tag)))).slice(0, 2);
      easyIdeas.forEach(idea => { const card = el('div', 'nourish-suggestion-idea'); card.append(el('strong', '', idea.name), el('span', '', idea.note)); list.append(card); });
      if (!items.length && !easyIdeas.length) list.append(el('p', 'nourish-suggestion-line', 'Your list is open. Add something whenever it comes to mind.'));
      jump.textContent = 'Open grocery list ↘'; return;
    }
    if (nourishPath === 'leftovers') {
      $('nourish-suggestion-intro').textContent = 'Start with what is already here, or turn a little of it into a meal.';
      const items = state.nourish.leftovers.filter(item => item.status === 'available').sort((a, b) => (a.useBy || '9999').localeCompare(b.useBy || '9999')).slice(0, 3);
      items.forEach(item => list.append(el('p', 'nourish-suggestion-line', item.name + (useSoonText(item) ? ' · ' + useSoonText(item) : ''))));
      const leftoverIdeas = sortedNourishIdeas(state.nourish.ideas.filter(idea => !idea.archived && idea.tags.includes('leftovers'))).slice(0, 2);
      leftoverIdeas.forEach(idea => { const card = el('div', 'nourish-suggestion-idea'); card.append(el('strong', '', idea.name), el('span', '', idea.note)); list.append(card); });
      if (!items.length && !leftoverIdeas.length) list.append(el('p', 'nourish-suggestion-line', 'No leftovers need remembering right now.'));
      jump.textContent = 'Open leftovers ↘'; return;
    }
    const matching = state.nourish.ideas.filter(idea => !idea.archived && (nourishPath === 'meal' ? idea.tags.some(tag => ['lunch', 'dinner'].includes(tag)) : nourishPath === 'fast' ? idea.tags.some(tag => ['fast', 'low-energy'].includes(tag)) : nourishPath === 'protein' ? idea.tags.includes('protein') : idea.tags.includes('snack')));
    const intros = { meal: 'A real meal can still be simple.', fast: 'Low effort is a good reason to choose an easier door.', protein: 'A few protein-friendly possibilities, without any targets to meet.', snack: 'Something small now can make the next hour kinder.' };
    $('nourish-suggestion-intro').textContent = intros[nourishPath];
    sortedNourishIdeas(matching).slice(0, 4).forEach(idea => { const card = el('div', 'nourish-suggestion-idea'); card.append(el('strong', '', idea.name), el('span', '', idea.note)); list.append(card); });
    if (!matching.length) list.append(el('p', 'nourish-suggestion-line', 'No idea on this shelf yet. You can add one that feels like yours.'));
    jump.textContent = 'Open food ideas ↘';
  }
  function nourishIdeaCard(idea) {
    const card = el('article', 'nourish-idea-card');
    const heading = el('div', 'nourish-idea-top'); heading.append(el('strong', '', idea.name));
    if (idea.example) heading.append(el('small', 'nourish-example-label', 'Editable example'));
    card.append(heading);
    if (idea.note) card.append(el('p', '', idea.note));
    if (idea.ingredients.length) card.append(el('p', 'nourish-ingredients', 'Ingredients: ' + idea.ingredients.join(', ')));
    const tags = el('div', 'nourish-tags'); idea.tags.forEach(tag => tags.append(el('span', '', nourishTagNames[tag]))); card.append(tags);
    const actions = el('div', 'nourish-idea-actions');
    const groceries = action(idea.ingredients.length ? 'Add to grocery list' : 'Add ingredients in Edit', () => { $('nourish-idea-status').textContent = addIngredientsToGroceries(idea.ingredients); });
    groceries.disabled = !idea.ingredients.length; if (groceries.disabled) groceries.title = 'Edit this idea to add ingredients first'; actions.append(groceries);
    const favorite = action(idea.favorite ? '★ Easy favorite' : '☆ Favorite', () => { idea.favorite = !idea.favorite; idea.example = false; save(); renderNourish(); $('nourish-idea-status').textContent = idea.favorite ? 'Kept close for easier choosing.' : 'Favorite set aside.'; });
    favorite.setAttribute('aria-pressed', String(idea.favorite));
    actions.append(favorite, action('Edit', () => openNourishIdeaEditor(idea)), action(idea.archived ? 'Restore' : 'Archive', () => { idea.archived = !idea.archived; idea.example = false; save(); renderNourish(); $('nourish-idea-status').textContent = idea.archived ? 'Idea tucked away. You can restore it here.' : 'Idea returned to the shelf.'; }));
    card.append(actions); return card;
  }
  function renderNourishIdeas() {
    const active = sortedNourishIdeas(state.nourish.ideas.filter(idea => !idea.archived));
    const archived = sortedNourishIdeas(state.nourish.ideas.filter(idea => idea.archived));
    $('nourish-idea-list').replaceChildren(); active.forEach(idea => $('nourish-idea-list').append(nourishIdeaCard(idea)));
    if (!active.length) $('nourish-idea-list').append(el('p', 'open-time-note', 'An open shelf. Add one meal or snack that has helped you before.'));
    $('nourish-archive-count').textContent = archived.length; $('nourish-archive-list').replaceChildren(); archived.forEach(idea => $('nourish-archive-list').append(nourishIdeaCard(idea)));
    if (!archived.length) $('nourish-archive-list').append(el('p', 'open-time-note', 'Nothing is tucked away.'));
  }
  function renderNourishRecipes() {
    $('nourish-recipe-list').replaceChildren();
    [...state.nourish.recipes].sort((a, b) => a.name.localeCompare(b.name)).forEach(recipe => {
      const card = el('article', 'nourish-recipe-card'); card.append(el('strong', '', recipe.name));
      if (recipe.ingredients.length) card.append(el('p', 'nourish-ingredients', 'Ingredients: ' + recipe.ingredients.join(', ')));
      if (recipe.method) { const details = el('details', 'nourish-recipe-method'); details.append(el('summary', '', 'How I made it'), el('p', '', recipe.method)); card.append(details); }
      const actions = el('div', 'nourish-idea-actions');
      const groceries = action(recipe.ingredients.length ? 'Add to grocery list' : 'Add ingredients in Edit', () => { $('nourish-recipe-status').textContent = addIngredientsToGroceries(recipe.ingredients); });
      groceries.disabled = !recipe.ingredients.length; if (groceries.disabled) groceries.title = 'Edit this recipe to add ingredients first';
      actions.append(groceries, action('Edit', () => openNourishRecipeEditor(recipe))); card.append(actions); $('nourish-recipe-list').append(card);
    });
    if (!state.nourish.recipes.length) $('nourish-recipe-list').append(el('p', 'open-time-note', 'A blank recipe shelf. Add a meal you enjoyed whenever one comes to mind.'));
  }
  function renderNourishLeftovers() {
    const active = state.nourish.leftovers.filter(item => item.status === 'available').sort((a, b) => (a.useBy || '9999').localeCompare(b.useBy || '9999') || a.name.localeCompare(b.name));
    const settled = state.nourish.leftovers.filter(item => item.status !== 'available').sort((a, b) => b.resolvedAt.localeCompare(a.resolvedAt));
    $('nourish-leftover-list').replaceChildren();
    active.forEach(item => {
      const card = el('article', 'nourish-leftover-item'); card.append(el('strong', '', item.name));
      if (item.note) card.append(el('p', '', item.note));
      const soon = useSoonText(item); if (soon) card.append(el('span', 'nourish-use-soon', soon));
      const actions = el('div', 'nourish-leftover-actions');
      actions.append(action('Edit', () => editNourishLeftover(item)));
      [['Eaten', 'eaten'], ['Discarded', 'discarded'], ['Saved for later', 'saved']].forEach(([label, status]) => actions.append(action(label, () => { item.status = status; item.resolvedAt = now(); save(); renderNourish(); $('nourish-leftover-status').textContent = status === 'saved' ? 'Set aside for later.' : 'Noted, without judgment.'; })));
      card.append(actions); $('nourish-leftover-list').append(card);
    });
    if (!active.length) $('nourish-leftover-list').append(el('p', 'open-time-note', 'Nothing needs remembering here yet.'));
    $('nourish-leftover-settled-count').textContent = settled.length; $('nourish-leftover-settled').replaceChildren();
    $('nourish-leftover-settled').parentElement.hidden = !settled.length;
    settled.forEach(item => { const row = el('div', 'nourish-settled-item'); row.append(el('strong', '', item.name), el('span', '', item.status === 'saved' ? 'Saved for later' : item.status === 'eaten' ? 'Eaten' : 'Discarded')); row.append(action('Bring back', () => { item.status = 'available'; item.resolvedAt = ''; save(); renderNourish(); $('nourish-leftover-status').textContent = 'Back on the shelf.'; })); $('nourish-leftover-settled').append(row); });
  }
  function renderNourishGroceries() {
    $('nourish-grocery-list').replaceChildren();
    const sorted = [...state.nourish.groceries].sort((a, b) => Number(a.checked) - Number(b.checked) || a.name.localeCompare(b.name));
    sorted.forEach(item => {
      const row = el('div', 'nourish-grocery-item' + (item.checked ? ' is-checked' : ''));
      const label = el('label'); const box = document.createElement('input'); box.type = 'checkbox'; box.checked = item.checked; box.setAttribute('aria-label', 'On hand: ' + item.name);
      box.addEventListener('change', () => { item.checked = box.checked; save(); renderNourish(); $('nourish-grocery-status').textContent = item.checked ? 'Kept on hand.' : 'Back on the list.'; });
      label.append(box, el('span', '', item.name)); row.append(label);
      if (item.category) row.append(el('small', 'nourish-grocery-category', item.category));
      const remove = action('Delete', () => { state.nourish.groceries = state.nourish.groceries.filter(entry => entry.id !== item.id); save(); renderNourish(); $('nourish-grocery-status').textContent = 'Removed from the list.'; });
      remove.setAttribute('aria-label', 'Delete ' + item.name + ' from grocery list'); row.append(remove); $('nourish-grocery-list').append(row);
    });
    if (!sorted.length) $('nourish-grocery-list').append(el('p', 'open-time-note', 'The list is clear. Add something whenever it would help.'));
  }
  function renderNourishNotes() {
    const date = todayKey(); $('nourish-note-date').textContent = 'Today · ' + formatAnchorDate(date, true);
    $('nourish-daily-note').value = state.nourish.dailyNotes[date] || '';
    $('nourish-note-history').replaceChildren();
    const earlier = Object.entries(state.nourish.dailyNotes).filter(([day, note]) => day !== date && note.trim()).sort((a, b) => b[0].localeCompare(a[0]));
    earlier.forEach(([day, note]) => { const row = el('div', 'nourish-earlier-note'); row.append(el('time', '', new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(plannerDate(day))), el('p', '', note)); $('nourish-note-history').append(row); });
    if (!earlier.length) $('nourish-note-history').append(el('p', 'open-time-note', 'No earlier notes. There is nothing to catch up on.'));
  }
  function renderNourish() { pruneSettledLeftovers(); renderNourishPreview(); renderNourishSuggestions(); renderNourishIdeas(); renderNourishLeftovers(); renderNourishRecipes(); renderNourishGroceries(); renderNourishNotes(); if (!$('nourish-combine-results').hidden) renderCombineResults(); }
  function openNourishIdeaEditor(idea = null) {
    editingNourishIdeaId = idea?.id || null; $('nourish-idea-form').reset(); $('nourish-idea-editor-title').textContent = idea ? 'Edit an idea' : 'Add an idea';
    $('nourish-idea-name').value = idea?.name || ''; $('nourish-idea-note').value = idea?.note || ''; $('nourish-idea-ingredients').value = idea?.ingredients.join('\n') || ''; $('nourish-idea-favorite').checked = idea?.favorite || false;
    document.querySelectorAll('[data-nourish-tag]').forEach(input => { input.checked = idea?.tags.includes(input.value) || false; });
    $('nourish-idea-editor').showModal(); $('nourish-idea-name').focus();
  }
  function openNourishRecipeEditor(recipe = null) {
    editingNourishRecipeId = recipe?.id || null; $('nourish-recipe-form').reset();
    $('nourish-recipe-editor-title').textContent = recipe ? 'Edit a saved recipe' : 'Save a recipe';
    $('nourish-recipe-name').value = recipe?.name || ''; $('nourish-recipe-ingredients').value = recipe?.ingredients.join('\n') || ''; $('nourish-recipe-method').value = recipe?.method || '';
    $('nourish-recipe-delete').hidden = !recipe; $('nourish-recipe-editor').showModal(); $('nourish-recipe-name').focus();
  }
  function foodTokens(value) {
    const aliases = { tortilla: 'wrap', flatbread: 'wrap', pita: 'bread', bun: 'bread', roll: 'bread', noodle: 'pasta', spaghetti: 'pasta', marinara: 'sauce', pesto: 'sauce', dressing: 'sauce', cheddar: 'cheese', mozzarella: 'cheese', parmesan: 'cheese', spinach: 'greens', kale: 'greens', lettuce: 'greens', salad: 'greens', green: 'greens', berry: 'fruit', banana: 'fruit', apple: 'fruit', grape: 'fruit', carrot: 'vegetable', broccoli: 'vegetable', veggie: 'vegetable', vegetable: 'vegetable' };
    return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(word => word.length > 2 && !['with', 'some', 'fresh', 'cooked', 'frozen', 'soft', 'familiar', 'favorite', 'easy', 'the', 'and'].includes(word)).map(word => {
      const singular = word.endsWith('ies') ? word.slice(0, -3) + 'y' : word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us') ? word.slice(0, -1) : word;
      return aliases[singular] || singular;
    });
  }
  function ingredientAvailable(ingredient, onHand) {
    return ingredient.split(/\s+or\s+|\//i).some(choice => {
      const needed = foodTokens(choice); return needed.length && onHand.some(have => { const words = foodTokens(have); return needed.every(word => words.includes(word)); });
    });
  }
  function renderCombineResults() {
    const remembered = $('nourish-use-remembered-leftovers').checked ? state.nourish.leftovers.filter(item => item.status === 'available').map(item => item.name) : [];
    const onHand = cleanIngredients([...parseIngredients($('nourish-have').value), ...remembered]).slice(0, 20), results = $('nourish-combine-list'); results.replaceChildren();
    $('nourish-combine-results').hidden = false;
    if (!onHand.length) { $('nourish-combine-intro').textContent = 'Name one or two foods that are here, and we’ll look for a simple possibility.'; return; }
    const has = ingredient => ingredientAvailable(ingredient, onHand);
    const quickCombos = [
      { ready: () => has('rice') && has('beans'), name: 'A rice and beans bowl', note: 'Warm the rice and beans; add a topping or sauce if one sounds good.' },
      { ready: () => has('pasta') && has('sauce'), name: 'Pasta with sauce', note: 'Cook the pasta and add the sauce you named.' },
      { ready: () => has('eggs') && has('bread'), name: 'Eggs and toast', note: 'Cook the eggs as you like and pair them with bread.' },
      { ready: () => has('soup') && has('bread'), name: 'Soup and bread', note: 'Warm the soup and add bread on the side.' },
      { ready: () => has('yogurt') && has('fruit'), name: 'Yogurt and fruit', note: 'Spoon together the yogurt and fruit you named.' }
    ];
    const quick = quickCombos.filter(combo => combo.ready()).slice(0, 2);
    if (!quick.length && (has('bread') || has('wrap') || has('cracker')) && (has('tuna') || has('hummus') || has('peanut butter') || has('turkey'))) quick.push({ name: 'A simple plate or wrap', note: 'Pair the filling and bread, wrap, or crackers you named. That can be enough.' });
    quick.forEach(combo => { const card = el('article', 'nourish-combine-card'); card.append(el('strong', '', combo.name), el('small', '', 'simple combination'), el('p', '', combo.note)); results.append(card); });
    const quickNames = new Set(quick.map(combo => combo.name.toLowerCase().replace(/^(a|an)\s+/, '')));
    const candidates = [
      ...state.nourish.recipes.map(recipe => ({ ...recipe, source: 'saved recipe' })),
      ...state.nourish.ideas.filter(idea => !idea.archived && idea.ingredients.length).map(idea => ({ ...idea, source: idea.example ? 'editable example' : 'food idea' }))
    ].filter(item => item.ingredients.length && !quickNames.has(item.name.toLowerCase().replace(/^(a|an)\s+/, ''))).map(item => ({ item, matched: item.ingredients.filter(ingredient => ingredientAvailable(ingredient, onHand)), missing: item.ingredients.filter(ingredient => !ingredientAvailable(ingredient, onHand)) }))
      .filter(result => result.matched.length >= Math.ceil(result.item.ingredients.length / 2) && result.missing.length <= 2)
      .sort((a, b) => a.missing.length - b.missing.length || Number(b.item.source === 'saved recipe') - Number(a.item.source === 'saved recipe') || Number(b.item.favorite) - Number(a.item.favorite) || b.matched.length - a.matched.length || a.item.name.localeCompare(b.item.name)).slice(0, 3 - quick.length);
    $('nourish-combine-intro').textContent = candidates.length || quick.length ? 'Matched against what you named' + (remembered.length ? ' and your noted leftovers' : '') + '. A near match says exactly what is missing; choose only what sounds good.' : 'No close match yet. Add another food, or browse your ideas below.';
    candidates.forEach(({ item, matched, missing }) => {
      const card = el('article', 'nourish-combine-card'); card.append(el('strong', '', item.name), el('small', '', (missing.length === 1 ? 'one possible addition · ' : missing.length ? 'a couple of additions · ' : 'ready from your list · ') + item.source));
      card.append(el('p', '', 'Matched: ' + matched.join(', ')));
      if (missing.length) card.append(el('p', 'nourish-missing', 'If useful, add: ' + missing.join(', ')));
      if (item.note) card.append(el('p', '', item.note));
      if (item.method) { const details = el('details', 'nourish-recipe-method'); details.append(el('summary', '', 'How I made it'), el('p', '', item.method)); card.append(details); }
      if (missing.length) card.append(action('Add missing to groceries', () => { $('nourish-combine-status').textContent = addIngredientsToGroceries(missing); }));
      results.append(card);
    });
  }
  function editNourishLeftover(item) {
    editingLeftoverId = item.id; $('nourish-leftover-name').value = item.name; $('nourish-leftover-note').value = item.note; $('nourish-leftover-date').value = item.useBy;
    $('nourish-leftover-submit').textContent = 'Save changes'; $('nourish-leftover-cancel').hidden = false; $('nourish-leftover-name').focus();
    $('nourish-leftover-form').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  }
  document.querySelectorAll('[data-nourish-path]').forEach(button => button.addEventListener('click', () => { nourishPath = nourishPath === button.dataset.nourishPath ? null : button.dataset.nourishPath; renderNourishSuggestions(); }));
  $('nourish-suggestion-jump').addEventListener('click', () => {
    const target = nourishPath === 'leftovers' ? 'nourish-leftovers' : nourishPath === 'groceries' ? 'nourish-groceries' : 'nourish-ideas';
    $(target).scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  });
  $('nourish-add-idea').addEventListener('click', () => openNourishIdeaEditor());
  $('nourish-combine-form').addEventListener('submit', event => { event.preventDefault(); renderCombineResults(); });
  $('nourish-use-remembered-leftovers').addEventListener('change', () => { if (!$('nourish-combine-results').hidden) renderCombineResults(); });
  $('nourish-idea-x').addEventListener('click', () => $('nourish-idea-editor').close());
  $('nourish-idea-cancel').addEventListener('click', () => $('nourish-idea-editor').close());
  $('nourish-idea-form').addEventListener('submit', event => {
    event.preventDefault(); const name = $('nourish-idea-name').value.trim(); if (!name) return;
    const tags = [...document.querySelectorAll('[data-nourish-tag]:checked')].map(input => input.value);
    let idea = nourishIdea(editingNourishIdeaId);
    if (!idea) { idea = { id: nourishId('food'), name, note: '', tags: [], ingredients: [], favorite: false, archived: false, example: false }; state.nourish.ideas.push(idea); }
    Object.assign(idea, { name, note: $('nourish-idea-note').value.trim().slice(0, 300), tags, ingredients: parseIngredients($('nourish-idea-ingredients').value), favorite: $('nourish-idea-favorite').checked, example: false });
    const saved = save(); $('nourish-idea-editor').close(); renderNourish(); $('nourish-idea-status').textContent = saved ? 'Food idea kept on your shelf.' : 'This idea is visible for now, but the browser could not save it.';
  });
  $('nourish-add-recipe').addEventListener('click', () => openNourishRecipeEditor());
  $('nourish-recipe-x').addEventListener('click', () => $('nourish-recipe-editor').close());
  $('nourish-recipe-cancel').addEventListener('click', () => $('nourish-recipe-editor').close());
  $('nourish-recipe-form').addEventListener('submit', event => {
    event.preventDefault(); const name = $('nourish-recipe-name').value.trim(); if (!name) return;
    let recipe = nourishRecipe(editingNourishRecipeId);
    if (!recipe) { recipe = { id: nourishId('recipe'), createdAt: now() }; state.nourish.recipes.push(recipe); }
    Object.assign(recipe, { name, ingredients: parseIngredients($('nourish-recipe-ingredients').value), method: $('nourish-recipe-method').value.trim().slice(0, 1200) });
    const saved = save(); $('nourish-recipe-editor').close(); renderNourish();
    $('nourish-recipe-status').textContent = saved ? 'Recipe kept for another day.' : 'This recipe is visible for now, but the browser could not save it.';
  });
  $('nourish-recipe-delete').addEventListener('click', () => {
    if (!editingNourishRecipeId) return;
    openGardenConfirmation('Remove this saved recipe?', 'This recipe will leave your local shelf. Grocery items already added stay on your list.', 'Remove recipe', { kind: 'recipe', id: editingNourishRecipeId });
  });
  $('nourish-leftover-cancel').addEventListener('click', () => { editingLeftoverId = null; $('nourish-leftover-form').reset(); $('nourish-leftover-submit').textContent = 'Keep in mind'; $('nourish-leftover-cancel').hidden = true; $('nourish-leftover-status').textContent = 'Edit set aside.'; });
  $('nourish-leftover-form').addEventListener('submit', event => {
    event.preventDefault(); const name = $('nourish-leftover-name').value.trim(), useBy = $('nourish-leftover-date').value;
    if (!name || (useBy && !validDateKey(useBy))) { $('nourish-leftover-status').textContent = 'Give this item a name and a real date, if you use one.'; return; }
    let item = state.nourish.leftovers.find(entry => entry.id === editingLeftoverId);
    if (!item) { item = { id: nourishId('leftover'), name, note: '', useBy: '', status: 'available', addedAt: now(), resolvedAt: '' }; state.nourish.leftovers.push(item); }
    item.name = name; item.note = $('nourish-leftover-note').value.trim().slice(0, 180); item.useBy = useBy;
    const saved = save(); editingLeftoverId = null; $('nourish-leftover-form').reset(); $('nourish-leftover-submit').textContent = 'Keep in mind'; $('nourish-leftover-cancel').hidden = true; renderNourish();
    $('nourish-leftover-status').textContent = saved ? 'Remembered here, without pressure.' : 'This item is visible for now, but the browser could not save it.';
  });
  $('nourish-grocery-form').addEventListener('submit', event => {
    event.preventDefault(); const name = $('nourish-grocery-name').value.trim(); if (!name) return;
    state.nourish.groceries.push({ id: nourishId('grocery'), name, category: $('nourish-grocery-category').value, checked: false });
    const saved = save(); $('nourish-grocery-form').reset(); renderNourish(); $('nourish-grocery-status').textContent = saved ? 'Added to your list.' : 'This item is visible for now, but the browser could not save it.';
  });
  $('nourish-daily-note').addEventListener('input', () => {
    const date = todayKey(), note = $('nourish-daily-note').value.slice(0, 180);
    if (note.trim()) state.nourish.dailyNotes[date] = note; else delete state.nourish.dailyNotes[date];
    const saved = save(); $('nourish-note-status').textContent = saved ? 'Kept locally.' : 'The browser could not save this note yet.';
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) renderNourish(); });
  const workCategories = ['Current Work', 'SOP / Documentation', 'Job Search', 'Interview / Follow-up', 'Learning', 'Idea'];
  const workStates = ['Active', 'Waiting On', 'Someday / Parked', 'Done', 'Archived'];
  const docStates = ['Idea', 'Drafting', 'Review Needed', 'Waiting', 'Complete'];
  const jobStates = ['Considering', 'Preparing', 'Applied', 'Interviewing', 'Waiting', 'Closed', 'Archived'];
  const evidenceKinds = ['Professional story', 'Accomplishment', 'Question to ask', 'Role-specific note'];
  const evidenceTags = ['collaboration', 'documentation', 'training', 'leadership', 'systems', 'project work', 'communication', 'interview question'];
  const workAttachmentLimit = 1024 * 1024;
  function cleanWorkAttachment(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || typeof value.name !== 'string' || typeof value.data !== 'string' || typeof value.mime !== 'string' || !Number.isInteger(value.size) || value.size < 1 || value.size > workAttachmentLimit) return null;
    const name = value.name.split(/[\\/]/).pop().slice(0, 160);
    if (!/\.(pdf|doc|docx|txt|md|rtf|odt)$/i.test(name) || !/^data:(?:[a-z0-9.+/-]+)?(?:;[a-z0-9-]+=[a-z0-9-]+)*;base64,[a-z0-9+/=]+$/i.test(value.data) || value.data.length > 1_500_000) return null;
    return { name, mime: value.mime.slice(0, 100), size: value.size, data: value.data };
  }
  const workroomSource = savedWorkroom && typeof savedWorkroom === 'object' && !Array.isArray(savedWorkroom) ? savedWorkroom : {};
  const workroomExamples = [
    { id: 'evidence-demo-project', title: 'Fictional example · A project I helped improve', note: 'Editable prompt: What was confusing, what small change did you help make, and what became easier?', tags: ['project work'] }
  ].map(card => ({ ...card, kind: 'Professional story', example: true, touched: now() }));
  const workStarterIds = new Set(workroomExamples.map(card => card.id));
  const workStamp = value => Number.isFinite(Date.parse(value)) ? value : now();
  const workDate = value => validDateKey(value) ? value : '';
  state.workroom = {
    items: Array.isArray(workroomSource.items) ? workroomSource.items.filter(item => item && typeof item.id === 'string' && typeof item.title === 'string').map(item => ({ id: item.id, title: item.title.slice(0, 160), detail: typeof item.detail === 'string' ? item.detail.slice(0, 1200) : '', category: workCategories.includes(item.category) ? item.category : 'Current Work', state: workStates.includes(item.state) ? item.state : 'Active', next: typeof item.next === 'string' ? item.next.slice(0, 180) : '', due: workDate(item.due), urgency: ['Soon', 'Whenever'].includes(item.urgency) ? item.urgency : '', createdAt: workStamp(item.createdAt), touched: workStamp(item.touched) })) : [],
    docs: Array.isArray(workroomSource.docs) ? workroomSource.docs.filter(doc => doc && typeof doc.id === 'string' && typeof doc.name === 'string').map(doc => ({ id: doc.id, name: doc.name.slice(0, 160), state: docStates.includes(doc.state) ? doc.state : 'Idea', note: typeof doc.note === 'string' ? doc.note.slice(0, 500) : '', next: typeof doc.next === 'string' ? doc.next.slice(0, 180) : '', attachment: cleanWorkAttachment(doc.attachment), touched: workStamp(doc.touched) })) : [],
    jobs: Array.isArray(workroomSource.jobs) ? workroomSource.jobs.filter(job => job && typeof job.id === 'string' && typeof job.company === 'string' && typeof job.role === 'string').map(job => ({ id: job.id, company: job.company.slice(0, 120), role: job.role.slice(0, 160), location: typeof job.location === 'string' ? job.location.slice(0, 120) : '', salary: typeof job.salary === 'string' ? job.salary.slice(0, 120) : '', source: typeof job.source === 'string' ? job.source.slice(0, 160) : '', state: jobStates.includes(job.state) ? job.state : 'Considering', applied: workDate(job.applied), follow: workDate(job.follow), interview: workDate(job.interview), notes: typeof job.notes === 'string' ? job.notes.slice(0, 2000) : '', touched: workStamp(job.touched) })) : [],
    evidence: Array.isArray(workroomSource.evidence) ? workroomSource.evidence.filter(card => card && typeof card.id === 'string' && typeof card.title === 'string').map(card => ({ id: card.id, title: card.title.slice(0, 160), kind: evidenceKinds.includes(card.kind) ? card.kind : 'Professional story', note: typeof card.note === 'string' ? card.note.slice(0, 2000) : '', tags: Array.isArray(card.tags) ? [...new Set(card.tags.filter(tag => evidenceTags.includes(tag)))] : [], example: card.example === true, touched: workStamp(card.touched) })) : workroomExamples
  };
  const workId = prefix => prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2);
  const workItem = id => state.workroom.items.find(item => item.id === id);
  const workDoc = id => state.workroom.docs.find(doc => doc.id === id);
  const workJob = id => state.workroom.jobs.find(job => job.id === id);
  const workEvidence = id => state.workroom.evidence.find(card => card.id === id);
  const recentWork = (a, b) => Date.parse(b.touched) - Date.parse(a.touched);
  let editingWorkItemId = null, editingWorkDocId = null, editingWorkJobId = null, editingWorkEvidenceId = null, workDocFilter = 'all', removingDocAttachment = false;
  function downloadWorkAttachment(attachment) {
    if (!attachment) return;
    try {
      const encoded = attachment.data.slice(attachment.data.indexOf(',') + 1);
      const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/octet-stream' }));
      const link = document.createElement('a'); link.href = url; link.download = attachment.name; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (_) { $('workroom-doc-status').textContent = 'This attached file could not be downloaded. The saved document entry remains.'; }
  }
  function workItemCard(item) {
    const card = el('article', 'workroom-record'); card.append(el('strong', '', item.title));
    const meta = el('div', 'workroom-meta'); meta.append(el('span', '', item.category)); if (item.urgency) meta.append(el('span', '', item.urgency === 'Whenever' ? 'Can wait' : item.urgency)); if (item.due) meta.append(el('span', '', 'Date · ' + formatAnchorDate(item.due, true))); card.append(meta);
    if (item.next) card.append(el('p', 'workroom-next', 'Next physical step: ' + item.next));
    if (item.detail) card.append(el('p', 'workroom-detail', item.detail));
    const actions = el('div', 'workroom-actions'); actions.append(action('Edit', () => openWorkItemEditor(item)));
    if (item.state !== 'Done' && item.state !== 'Archived') actions.append(action('Resolve', () => { item.state = 'Done'; item.touched = now(); save(); renderWorkroom(); $('workroom-item-status').textContent = 'Marked resolved. It can be reopened anytime.'; }));
    if (item.state !== 'Archived') actions.append(action('Archive', () => { item.state = 'Archived'; item.touched = now(); save(); renderWorkroom(); $('workroom-item-status').textContent = 'Tucked into the archive.'; }));
    else actions.append(action('Restore', () => { item.state = 'Active'; item.touched = now(); save(); renderWorkroom(); $('workroom-item-status').textContent = 'Back on the board.'; }));
    card.append(actions); return card;
  }
  function renderWorkBoard() {
    const current = state.workroom.items.filter(item => !['Job Search', 'Interview / Follow-up'].includes(item.category));
    $('workroom-board-columns').replaceChildren();
    workStates.slice(0, 4).forEach(place => {
      const column = el('section', 'workroom-column'); column.append(el('h3', '', place));
      const items = current.filter(item => item.state === place).sort(recentWork);
      items.forEach(item => column.append(workItemCard(item)));
      if (!items.length) column.append(el('p', 'open-time-note', place === 'Active' ? 'Nothing needs this space yet.' : 'Room to leave this open.'));
      $('workroom-board-columns').append(column);
    });
    const careerItems = state.workroom.items.filter(item => ['Job Search', 'Interview / Follow-up'].includes(item.category) && item.state !== 'Archived').sort(recentWork);
    $('workroom-other-items').replaceChildren(); $('workroom-other-items').append(el('h3', '', 'Career notes & follow-ups'));
    careerItems.forEach(item => $('workroom-other-items').append(workItemCard(item)));
    if (!careerItems.length) $('workroom-other-items').append(el('p', 'open-time-note', 'A clear shelf for job-search thoughts when they arrive.'));
    const archived = state.workroom.items.filter(item => item.state === 'Archived').sort(recentWork); $('workroom-archive-count').textContent = String(archived.length); $('workroom-archive-list').replaceChildren();
    archived.forEach(item => $('workroom-archive-list').append(workItemCard(item)));
    if (!archived.length) $('workroom-archive-list').append(el('p', 'open-time-note', 'Nothing tucked away.'));
  }
  function renderWorkDocs() {
    $('workroom-doc-all').setAttribute('aria-pressed', String(workDocFilter === 'all')); $('workroom-doc-recent').setAttribute('aria-pressed', String(workDocFilter === 'working'));
    $('workroom-doc-list').replaceChildren();
    const docs = state.workroom.docs.filter(doc => workDocFilter === 'all' || ['Drafting', 'Review Needed', 'Waiting'].includes(doc.state)).sort(recentWork);
    docs.forEach(doc => { const card = el('article', 'workroom-record'); card.append(el('strong', '', doc.name), el('span', 'workroom-state', doc.state)); if (doc.note) card.append(el('p', 'workroom-detail', doc.note)); if (doc.next) card.append(el('p', 'workroom-next', 'Next: ' + doc.next)); card.append(el('small', 'workroom-touched', 'Last touched ' + formatAnchorDate(doc.touched.slice(0, 10), true))); if (doc.attachment) { card.append(el('small', 'workroom-touched', 'Attached locally: ' + doc.attachment.name)); card.append(action('Download file ↓', () => downloadWorkAttachment(doc.attachment))); } card.append(action('Edit document', () => openWorkDocEditor(doc))); $('workroom-doc-list').append(card); });
    if (!docs.length) $('workroom-doc-list').append(el('p', 'open-time-note', workDocFilter === 'working' ? 'Nothing in motion on this shelf right now.' : 'No documents here yet. A title is enough to start.'));
  }
  function careerMove() {
    const active = state.workroom.jobs.filter(job => !['Closed', 'Archived'].includes(job.state) && (!quietJob(job) || job.interview >= todayKey() || job.follow >= todayKey() && job.follow <= addPlannerDays(todayKey(), 14)));
    const dated = [];
    active.forEach(job => { if (job.interview && job.interview >= todayKey()) dated.push({ job, date: job.interview, text: 'Interview with ' + job.company + ' for ' + job.role + ' · ' + formatAnchorDate(job.interview, true) }); if (job.follow && (!quietJob(job) || job.follow >= todayKey())) dated.push({ job, date: job.follow, text: 'A follow-up to consider: ' + job.role + ' at ' + job.company + ' · ' + formatAnchorDate(job.follow, true) }); });
    dated.sort((a, b) => a.date.localeCompare(b.date)); const soon = dated.find(move => move.date <= addPlannerDays(todayKey(), 14));
    if (soon) return { ...soon, urgent: true };
    const preparing = active.filter(job => job.state === 'Preparing').sort(recentWork)[0];
    if (preparing) return { job: preparing, text: 'A possible next step: draft the application for ' + preparing.role + ' at ' + preparing.company + '.', urgent: false };
    return dated.length ? { ...dated[0], urgent: false } : null;
  }
  const quietJob = job => Date.now() - Date.parse(job.touched) >= 14 * 24 * 60 * 60 * 1000;
  function renderWorkJobs() {
    const move = careerMove(); $('workroom-career-text').textContent = move?.text || 'Nothing needs your attention right now.';
    $('workroom-career-open').hidden = !move; $('workroom-career-open').onclick = move ? () => openWorkJobEditor(move.job) : null;
    const current = state.workroom.jobs.filter(job => !['Closed', 'Archived'].includes(job.state)), active = current.filter(job => !quietJob(job)).sort(recentWork), quiet = current.filter(quietJob).sort(recentWork), closed = state.workroom.jobs.filter(job => ['Closed', 'Archived'].includes(job.state)).sort(recentWork);
    const render = (job, target) => { const card = el('article', 'workroom-record workroom-job' + (['Closed', 'Archived'].includes(job.state) ? ' is-closed' : '')); card.append(el('strong', '', job.role + ' · ' + job.company), el('span', 'workroom-state', job.state));
      const details = [job.location, job.salary, job.source ? 'Source: ' + job.source : '', job.applied ? 'Applied ' + formatAnchorDate(job.applied, true) : '', job.follow ? 'Follow-up ' + formatAnchorDate(job.follow, true) : '', job.interview ? 'Interview ' + formatAnchorDate(job.interview, true) : ''].filter(Boolean);
      if (details.length) card.append(el('p', 'workroom-detail', details.join(' · '))); if (job.notes) card.append(el('p', 'workroom-note', job.notes)); card.append(action('Edit opportunity', () => openWorkJobEditor(job))); target.append(card); };
    $('workroom-job-list').replaceChildren(); active.forEach(job => render(job, $('workroom-job-list'))); if (!active.length) $('workroom-job-list').append(el('p', 'open-time-note', quiet.length ? 'The current shelf is clear. Quiet opportunities are below whenever you want them.' : 'No active opportunities here. The shelf can stay open.'));
    $('workroom-job-quiet').hidden = !quiet.length; $('workroom-job-quiet-count').textContent = String(quiet.length); $('workroom-job-quiet-list').replaceChildren(); quiet.forEach(job => render(job, $('workroom-job-quiet-list')));
    $('workroom-job-archive-count').textContent = String(closed.length); $('workroom-job-archive-list').replaceChildren(); closed.forEach(job => render(job, $('workroom-job-archive-list'))); if (!closed.length) $('workroom-job-archive-list').append(el('p', 'open-time-note', 'No closed entries.'));
  }
  function renderWorkEvidence() {
    $('workroom-evidence-list').replaceChildren(); [...state.workroom.evidence].sort(recentWork).forEach(item => { const card = el('article', 'workroom-record'); card.append(el('strong', '', item.title)); const meta = el('div', 'workroom-meta'); meta.append(el('span', '', item.kind)); if (item.example) meta.append(el('span', 'example-label', 'EDITABLE EXAMPLE')); card.append(meta); if (item.note) card.append(el('p', 'workroom-detail', item.note)); const tags = el('div', 'workroom-tags'); item.tags.forEach(tag => tags.append(el('span', '', tag))); card.append(tags, action('Edit card', () => openWorkEvidenceEditor(item))); $('workroom-evidence-list').append(card); });
    if (!state.workroom.evidence.length) $('workroom-evidence-list').append(el('p', 'open-time-note', 'A blank notebook. A question or a small win can be the first card.'));
  }
  function renderWorkroomPreview() {
    const career = careerMove(), active = state.workroom.items.filter(item => item.state === 'Active' && item.next).sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999') || recentWork(a, b))[0];
    const doc = state.workroom.docs.filter(item => item.state === 'Drafting').sort(recentWork)[0];
    $('workroom-preview-text').textContent = career?.urgent ? career.text : active ? 'A next work step: ' + active.next : doc ? 'Drafting: ' + doc.name + (doc.next ? ' · ' + doc.next : '') : career ? career.text : 'Nothing needs your attention right now.';
  }
  function renderWorkroom() { renderWorkBoard(); renderWorkDocs(); renderWorkJobs(); renderWorkEvidence(); renderWorkroomPreview(); }
  function workOptions(id, options) { options.forEach(value => { const label = id === 'workroom-job-state' ? ({ Closed: 'Closed · opportunity ended', Archived: 'Archived · tucked away' }[value] || value) : value; const option = el('option', '', label); option.value = value; $(id).append(option); }); }
  workOptions('workroom-capture-category', workCategories); workOptions('workroom-item-category', workCategories); workOptions('workroom-item-state', workStates);
  workOptions('workroom-doc-state', docStates); workOptions('workroom-job-state', jobStates); workOptions('workroom-evidence-kind', evidenceKinds);
  evidenceTags.forEach(tag => { const label = el('label'); const input = document.createElement('input'); input.type = 'checkbox'; input.value = tag; input.dataset.workTag = ''; label.append(input, document.createTextNode(' ' + tag)); $('workroom-evidence-tags').append(label); });
  document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => $(button.dataset.closeDialog).close()));
  function openWorkItemEditor(item) {
    editingWorkItemId = item.id; $('workroom-item-form').reset(); $('workroom-item-editor-title').textContent = 'Tend this item';
    $('workroom-item-title').value = item.title; $('workroom-item-detail').value = item.detail; $('workroom-item-next').value = item.next;
    $('workroom-item-category').value = item.category; $('workroom-item-state').value = item.state; $('workroom-item-due').value = item.due; $('workroom-item-urgency').value = item.urgency;
    $('workroom-item-editor').showModal(); $('workroom-item-title').focus();
  }
  function openWorkDocEditor(doc = null) {
    editingWorkDocId = doc?.id || null; removingDocAttachment = false; $('workroom-doc-form').reset(); $('workroom-doc-editor-title').textContent = doc ? 'Tend this document' : 'Add a document';
    $('workroom-doc-name').value = doc?.name || ''; $('workroom-doc-state').value = doc?.state || 'Idea'; $('workroom-doc-note').value = doc?.note || ''; $('workroom-doc-next').value = doc?.next || '';
    $('workroom-doc-file').value = ''; $('workroom-doc-file-current').textContent = doc?.attachment ? 'Attached locally: ' + doc.attachment.name + '. Included in Garden backups.' : 'No file attached. Choose only a file you want kept in this browser and its backups.';
    $('workroom-doc-download').hidden = !doc?.attachment; $('workroom-doc-remove-file').hidden = !doc?.attachment; $('workroom-doc-file-status').textContent = '';
    $('workroom-doc-delete').hidden = !doc; $('workroom-doc-editor').showModal(); $('workroom-doc-name').focus();
  }
  function openWorkJobEditor(job = null) {
    editingWorkJobId = job?.id || null; $('workroom-job-form').reset(); $('workroom-job-editor-title').textContent = job ? 'Tend this opportunity' : 'Add an opportunity';
    ['company', 'role', 'location', 'salary', 'source', 'applied', 'follow', 'interview', 'notes'].forEach(field => { $('workroom-job-' + field).value = job?.[field] || ''; });
    $('workroom-job-state').value = job?.state || 'Considering'; $('workroom-job-delete').hidden = !job; $('workroom-job-editor').showModal(); $('workroom-job-company').focus();
  }
  function openWorkEvidenceEditor(card = null) {
    editingWorkEvidenceId = card?.id || null; $('workroom-evidence-form').reset(); $('workroom-evidence-editor-title').textContent = card ? 'Tend this card' : 'Add an evidence card';
    $('workroom-evidence-name').value = card?.title || ''; $('workroom-evidence-kind').value = card?.kind || 'Professional story'; $('workroom-evidence-note').value = card?.note || '';
    document.querySelectorAll('[data-work-tag]').forEach(input => { input.checked = card?.tags.includes(input.value) || false; });
    $('workroom-evidence-delete').hidden = !card; $('workroom-evidence-editor').showModal(); $('workroom-evidence-name').focus();
  }
  $('workroom-capture-form').addEventListener('submit', event => {
    event.preventDefault(); const title = $('workroom-capture-title').value.trim(); if (!title) return;
    const item = { id: workId('work'), title, detail: $('workroom-capture-detail').value.trim().slice(0, 1200), category: $('workroom-capture-category').value, state: 'Active', next: '', due: workDate($('workroom-capture-due').value), urgency: $('workroom-capture-urgency').value, createdAt: now(), touched: now() };
    state.workroom.items.push(item); const saved = save(); $('workroom-capture-form').reset(); renderWorkroom(); $('workroom-capture-status').textContent = saved ? 'Kept here. You can shape it later.' : 'Visible for now, but the browser could not save it.';
  });
  $('workroom-item-form').addEventListener('submit', event => {
    event.preventDefault(); const item = workItem(editingWorkItemId), title = $('workroom-item-title').value.trim(); if (!item || !title) return;
    Object.assign(item, { title, detail: $('workroom-item-detail').value.trim().slice(0, 1200), next: $('workroom-item-next').value.trim().slice(0, 180), category: $('workroom-item-category').value, state: $('workroom-item-state').value, due: workDate($('workroom-item-due').value), urgency: $('workroom-item-urgency').value, touched: now() });
    const saved = save(); $('workroom-item-editor').close(); renderWorkroom(); $('workroom-item-status').textContent = saved ? 'Work thought tended and saved.' : 'Visible for now, but the browser could not save it.';
  });
  $('workroom-add-doc').addEventListener('click', () => openWorkDocEditor());
  $('workroom-doc-file').addEventListener('change', () => {
    const file = $('workroom-doc-file').files?.[0]; if (!file) return;
    removingDocAttachment = false; $('workroom-doc-file-current').textContent = 'New attachment: ' + file.name + (workDoc(editingWorkDocId)?.attachment ? '. It will replace the earlier file when you save.' : '. It will be kept when you save.'); $('workroom-doc-file-status').textContent = '';
  });
  $('workroom-doc-download').addEventListener('click', () => downloadWorkAttachment(workDoc(editingWorkDocId)?.attachment));
  $('workroom-doc-remove-file').addEventListener('click', () => {
    removingDocAttachment = true; $('workroom-doc-file').value = ''; $('workroom-doc-file-current').textContent = 'Attachment will be removed when you save.';
    $('workroom-doc-download').hidden = true; $('workroom-doc-remove-file').hidden = true; $('workroom-doc-file-status').textContent = '';
  });
  $('workroom-doc-form').addEventListener('submit', event => {
    event.preventDefault(); const name = $('workroom-doc-name').value.trim(); if (!name) return;
    const existing = workDoc(editingWorkDocId), file = $('workroom-doc-file').files?.[0];
    const fields = { name, state: $('workroom-doc-state').value, note: $('workroom-doc-note').value.trim().slice(0, 500), next: $('workroom-doc-next').value.trim().slice(0, 180), touched: now() };
    const commit = attachment => {
      const doc = existing || { id: workId('doc') }, previous = existing ? { ...existing } : null;
      Object.assign(doc, fields, { attachment }); if (!existing) state.workroom.docs.push(doc);
      if (!save()) { if (previous) Object.assign(doc, previous); else state.workroom.docs = state.workroom.docs.filter(item => item.id !== doc.id); $('workroom-doc-file-status').textContent = 'The browser could not keep this file. The document was not changed.'; return; }
      $('workroom-doc-editor').close(); renderWorkroom(); $('workroom-doc-status').textContent = attachment ? 'Document and local file saved.' : 'Document place saved.';
    };
    if (!file) { commit(removingDocAttachment ? null : existing?.attachment || null); return; }
    if (!/\.(pdf|doc|docx|txt|md|rtf|odt)$/i.test(file.name) || file.size < 1 || file.size > workAttachmentLimit) { $('workroom-doc-file-status').textContent = 'Choose a PDF, Word, text, RTF, or ODT file under 1 MB.'; return; }
    const reader = new FileReader(); reader.onerror = () => { $('workroom-doc-file-status').textContent = 'This file could not be read. The document was not changed.'; };
    reader.onload = () => { const attachment = cleanWorkAttachment({ name: file.name, mime: file.type || 'application/octet-stream', size: file.size, data: String(reader.result) }); if (!attachment) { $('workroom-doc-file-status').textContent = 'This file could not be kept locally. The document was not changed.'; return; } commit(attachment); };
    reader.readAsDataURL(file);
  });
  $('workroom-doc-all').addEventListener('click', () => { workDocFilter = 'all'; renderWorkDocs(); });
  $('workroom-doc-recent').addEventListener('click', () => { workDocFilter = 'working'; renderWorkDocs(); });
  $('workroom-add-job').addEventListener('click', () => openWorkJobEditor());
  $('workroom-job-form').addEventListener('submit', event => {
    event.preventDefault(); const company = $('workroom-job-company').value.trim(), role = $('workroom-job-role').value.trim(); if (!company || !role) return;
    let job = workJob(editingWorkJobId); if (!job) { job = { id: workId('job') }; state.workroom.jobs.push(job); }
    Object.assign(job, { company, role, location: $('workroom-job-location').value.trim(), salary: $('workroom-job-salary').value.trim(), source: $('workroom-job-source').value.trim(), state: $('workroom-job-state').value, applied: workDate($('workroom-job-applied').value), follow: workDate($('workroom-job-follow').value), interview: workDate($('workroom-job-interview').value), notes: $('workroom-job-notes').value.trim().slice(0, 2000), touched: now() });
    const saved = save(); $('workroom-job-editor').close(); renderWorkroom(); $('workroom-job-status').textContent = saved ? 'Opportunity kept privately.' : 'Visible for now, but the browser could not save it.';
  });
  const jobCsvColumns = ['id', 'company', 'role', 'location', 'salary', 'source', 'status', 'applied', 'follow', 'interview', 'notes'];
  const jobCsvStatusHeader = 'status (choose one: ' + jobStates.join(' | ') + ')';
  const jobCsvExportColumns = jobCsvColumns.map(column => column === 'status' ? jobCsvStatusHeader : column);
  const jobCsvCell = value => { const text = String(value ?? ''); return '"' + (/^\s*[=+\-@]/.test(text) ? "'" + text : text).replaceAll('"', '""') + '"'; };
  function parseJobCsv(input) {
    const rows = []; let row = [], cell = '', quoted = false;
    const source = input.replace(/^\uFEFF/, '');
    for (let i = 0; i < source.length; i++) {
      const char = source[i];
      if (quoted) { if (char === '"' && source[i + 1] === '"') { cell += '"'; i++; } else if (char === '"') quoted = false; else cell += char; }
      else if (char === '"' && cell === '') quoted = true;
      else if (char === ',') { row.push(cell); cell = ''; }
      else if (char === '\r' || char === '\n') { if (char === '\r' && source[i + 1] === '\n') i++; row.push(cell); if (row.some(value => value.trim())) rows.push(row); row = []; cell = ''; }
      else cell += char;
    }
    if (quoted) throw new Error('Unclosed CSV quote'); row.push(cell); if (row.some(value => value.trim())) rows.push(row);
    const header = rows[0]?.map(value => value.trim().toLowerCase()).join(',');
    if (!rows.length || rows.length > 501 || (header !== jobCsvColumns.join(',') && header !== jobCsvExportColumns.join(',').toLowerCase())) throw new Error('Columns or length differ');
    const ids = new Set(); return rows.slice(1).map(fields => {
      if (fields.length !== jobCsvColumns.length) throw new Error('Column count differs');
      const values = Object.fromEntries(jobCsvColumns.map((column, index) => [column, fields[index].replace(/^'(?=\s*[=+\-@])/, '').trim()]));
      const id = values.id || workId('job');
      if (!values.company || !values.role || id.length > 150 || values.company.length > 120 || values.role.length > 160 || values.location.length > 120 || values.salary.length > 120 || values.source.length > 160 || values.notes.length > 2000 || values.status.length > 80 || ids.has(id)) throw new Error('Invalid opportunity');
      if (['applied', 'follow', 'interview'].some(field => values[field] && !validDateKey(values[field]))) throw new Error('Invalid date');
      ids.add(id); return { id, company: values.company, role: values.role, location: values.location, salary: values.salary, source: values.source, state: jobStates.find(state => state.toLowerCase() === values.status.toLowerCase()) || values.status, applied: values.applied, follow: values.follow, interview: values.interview, notes: values.notes, touched: now() };
    });
  }
  let pendingJobCsvImport = null;
  function openJobCsvConfirmation(jobs) {
    openGardenConfirmation('Replace the job-search list?', 'This CSV contains ' + jobs.length + ' opportunit' + (jobs.length === 1 ? 'y' : 'ies') + '. Importing replaces only the job-search opportunities after confirmation. Work thoughts, documents, evidence cards, and the rest of the Garden stay. Imported entries count as recently touched.', 'Replace opportunities', { kind: 'workroom-jobs', jobs });
  }
  function reviewJobCsvStatuses(jobs) {
    const unknown = [...new Set(jobs.map(job => job.state).filter(status => !jobStates.includes(status)))];
    if (!unknown.length) { openJobCsvConfirmation(jobs); return; }
    pendingJobCsvImport = { jobs, unknown };
    const list = $('workroom-job-status-review-list'); list.replaceChildren();
    unknown.forEach((status, index) => {
      const label = document.createElement('label'); label.className = 'field';
      const count = jobs.filter(job => job.state === status).length;
      const title = document.createElement('span'); title.textContent = (status || 'Blank status') + ' · ' + count + ' opportunit' + (count === 1 ? 'y' : 'ies');
      const select = document.createElement('select'); select.required = true; select.dataset.statusIndex = String(index);
      select.append(new Option('Choose a Garden status', '', true, false));
      jobStates.forEach(state => select.append(new Option(state, state)));
      label.append(title, select); list.append(label);
    });
    $('workroom-job-status-review').showModal();
  }
  $('workroom-job-status-review-form').addEventListener('submit', event => {
    event.preventDefault(); if (!pendingJobCsvImport) return;
    const { jobs, unknown } = pendingJobCsvImport;
    const mapping = new Map([...$('workroom-job-status-review-list').querySelectorAll('select')].map(select => [unknown[Number(select.dataset.statusIndex)], select.value]));
    if ([...mapping.values()].some(status => !jobStates.includes(status))) return;
    const mapped = jobs.map(job => ({ ...job, state: mapping.get(job.state) || job.state }));
    pendingJobCsvImport = null; $('workroom-job-status-review').close(); openJobCsvConfirmation(mapped);
  });
  function cancelJobCsvStatusReview() { pendingJobCsvImport = null; $('workroom-jobs-file').value = ''; }
  $('workroom-job-status-review-cancel').addEventListener('click', () => { $('workroom-job-status-review').close(); cancelJobCsvStatusReview(); });
  $('workroom-job-status-review').addEventListener('cancel', cancelJobCsvStatusReview);
  $('workroom-export-jobs').addEventListener('click', () => {
    const csv = '\uFEFF' + jobCsvExportColumns.join(',') + '\r\n' + state.workroom.jobs.map(job => [job.id, job.company, job.role, job.location, job.salary, job.source, job.state, job.applied, job.follow, job.interview, job.notes].map(jobCsvCell).join(',')).join('\r\n') + '\r\n';
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'the-garden-job-search-' + todayKey() + '.csv'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    $('workroom-job-status').textContent = 'Editable job-search CSV downloaded.';
  });
  $('workroom-import-jobs').addEventListener('click', () => $('workroom-jobs-file').click());
  $('workroom-jobs-file').addEventListener('change', () => {
    const file = $('workroom-jobs-file').files?.[0]; if (!file) return;
    if (file.size > 1024 * 1024) { $('workroom-job-status').textContent = 'Choose a job-search CSV under 1 MB.'; $('workroom-jobs-file').value = ''; return; }
    const reader = new FileReader(); reader.onerror = () => { $('workroom-job-status').textContent = 'This CSV could not be read. Your opportunities remain.'; $('workroom-jobs-file').value = ''; };
    reader.onload = () => { try { reviewJobCsvStatuses(parseJobCsv(String(reader.result))); } catch (error) { $('workroom-job-status').textContent = error.message === 'Invalid date' ? 'One or more dates need YYYY-MM-DD format. Your opportunities remain.' : 'This CSV needs the Garden job-search columns and valid entries. Your opportunities remain.'; $('workroom-jobs-file').value = ''; } };
    reader.readAsText(file);
  });
  $('workroom-add-evidence').addEventListener('click', () => openWorkEvidenceEditor());
  $('workroom-evidence-form').addEventListener('submit', event => {
    event.preventDefault(); const title = $('workroom-evidence-name').value.trim(); if (!title) return;
    let card = workEvidence(editingWorkEvidenceId); if (!card) { card = { id: workId('evidence') }; state.workroom.evidence.push(card); }
    Object.assign(card, { title, kind: $('workroom-evidence-kind').value, note: $('workroom-evidence-note').value.trim().slice(0, 2000), tags: [...document.querySelectorAll('[data-work-tag]:checked')].map(input => input.value), example: false, touched: now() });
    const saved = save(); $('workroom-evidence-editor').close(); renderWorkroom(); $('workroom-evidence-status').textContent = saved ? 'Card kept in your notebook.' : 'Visible for now, but the browser could not save it.';
  });
  [['workroom-item-delete', 'items', () => editingWorkItemId], ['workroom-doc-delete', 'docs', () => editingWorkDocId], ['workroom-job-delete', 'jobs', () => editingWorkJobId], ['workroom-evidence-delete', 'evidence', () => editingWorkEvidenceId]].forEach(([buttonId, collection, selected]) => {
    $(buttonId).addEventListener('click', () => { const id = selected(); if (!id) return; openGardenConfirmation('Remove this Workroom entry?', 'This will remove this entry from the local Workroom. Other Garden data stays.', 'Remove entry', { kind: 'workroom-delete', collection, id }); });
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) renderWorkroom(); });
  function missingStarterItems() {
    const groups = [
      { kind: 'threads', label: 'Fictional Threads', source: seeds, saved: state.threads },
      { kind: 'move', label: 'Move ideas', source: moveSeeds.filter(idea => !idea.historical), saved: state.movement.ideas },
      { kind: 'nourish', label: 'Nourish ideas', source: nourishSeeds, saved: state.nourish.ideas },
      { kind: 'workroom', label: 'Workroom prompts', source: workroomExamples, saved: state.workroom.evidence }
    ];
    return groups.flatMap(group => group.source.filter(item => !group.saved.some(saved => saved.id === item.id || (saved.title || saved.name || '').trim().toLocaleLowerCase() === (item.title || item.name).toLocaleLowerCase())).map(item => ({ kind: group.kind, group: group.label, id: item.id, title: item.title || item.name, source: item })));
  }
  function renderTools() {
    const hasFictional = state.threads.some(thread => thread.example), hasMissing = missingStarterItems().length > 0;
    $('demo-tools').hidden = loadError || !(hasFictional || hasMissing);
    $('reset-demo').hidden = !hasFictional; $('restore-starters').hidden = !hasMissing;
    $('export-garden').disabled = loadError; $('reset-demo').disabled = loadError; $('restore-starters').disabled = loadError;
  }
  const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const uniqueIds = items => new Set(items.map(item => item.id)).size === items.length;
  const validDueDay = day => day === null || (Number.isInteger(day) && day >= 1 && day <= 31);
  const validCloseEntry = item => isRecord(item) && typeof item.id === 'string' && item.id.length > 0 && typeof item.name === 'string' && item.name.length > 0 && validDueDay(item.dueDay);
  function validateGardenBackup(backup) {
    if (!isRecord(backup) || backup.format !== 'the-garden-local-backup' || backup.version !== 1 || !isRecord(backup.data)) return false;
    const data = backup.data;
    if (!Array.isArray(data.thoughts) || !Array.isArray(data.threads) || !isRecord(data.toggles) || !isRecord(data.monthly) || !isRecord(data.planner)) return false;
    if (!Array.isArray(data.monthly.template) || !isRecord(data.monthly.months) || !Array.isArray(data.planner.events)) return false;
    if (!(data.focus === null || typeof data.focus === 'string') || typeof data.started !== 'boolean') return false;
    if (!data.thoughts.every(item => isRecord(item) && typeof item.id === 'string' && item.id.length > 0 && typeof item.text === 'string') || !uniqueIds(data.thoughts)) return false;
    if (!data.threads.every(item => isRecord(item) && typeof item.id === 'string' && item.id.length > 0 && typeof item.title === 'string' && item.title.length > 0 && areas.includes(item.area) && states.includes(item.state) && typeof item.next === 'string' && typeof item.stop === 'string' && typeof item.pinned === 'boolean' && typeof item.example === 'boolean' && Number.isFinite(Date.parse(item.touched))) || !uniqueIds(data.threads)) return false;
    if (!data.monthly.template.every(validCloseEntry) || !uniqueIds(data.monthly.template)) return false;
    if (!Object.entries(data.monthly.months).every(([monthKey, month]) => /^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey) && isRecord(month) && Array.isArray(month.entries) && typeof month.reflection === 'string' && month.entries.every(item => validCloseEntry(item) && typeof item.completed === 'boolean' && (item.resolution === null || ['handled', 'carried', 'snoozed', 'removed'].includes(item.resolution))) && uniqueIds(month.entries))) return false;
    if (!data.planner.events.every(item => isRecord(item) && typeof item.id === 'string' && item.id.length > 0 && typeof item.title === 'string' && item.title.length > 0 && validDateKey(item.date) && (item.endDate === undefined || item.endDate === '' || validDateKey(item.endDate) && item.endDate >= item.date) && anchorTypes.includes(item.type) && (item.start === '' || validTime(item.start)) && (item.end === '' || validTime(item.end)) && typeof item.threadId === 'string' && typeof item.note === 'string' && (item.repeat === undefined || ['none', 'daily', 'weekly', 'monthly', 'yearly'].includes(item.repeat)) && (item.repeatUntil === undefined || item.repeatUntil === '' || validDateKey(item.repeatUntil)) && (item.excludedDates === undefined || (Array.isArray(item.excludedDates) && item.excludedDates.every(validDateKey)))) || !uniqueIds(data.planner.events)) return false;
    if (data.movement !== undefined) {
      const move = data.movement;
      if (!isRecord(move) || !Array.isArray(move.ideas) || !Array.isArray(move.logs)) return false;
      if (move.templateVersion !== undefined && ![2, 3].includes(move.templateVersion)) return false;
      if (!(move.choice === null || (isRecord(move.choice) && moveFits.includes(move.choice.fit) && (move.choice.ideaId === null || typeof move.choice.ideaId === 'string') && (move.choice.customName === undefined || typeof move.choice.customName === 'string')))) return false;
      if (move.context !== undefined && (!isRecord(move.context) || !['', 'High', 'Medium', 'Low', 'Rest'].includes(move.context.energy) || !['', '5', '10', '20', '45+'].includes(move.context.time) || !['', 'Indoor', 'Garage', 'Outside', 'Friend gym', 'Anywhere'].includes(move.context.location) || typeof move.context.heat !== 'boolean' || typeof move.context.pain !== 'boolean' || typeof move.context.social !== 'boolean' || typeof move.context.originalId !== 'string')) return false;
      if (!move.ideas.every(idea => isRecord(idea) && typeof idea.id === 'string' && idea.id.length > 0 && typeof idea.name === 'string' && idea.name.length > 0 && typeof idea.example === 'boolean' && (idea.notes === undefined || typeof idea.notes === 'string') && (idea.historical === undefined || typeof idea.historical === 'boolean') && (idea.fits === undefined || (Array.isArray(idea.fits) && idea.fits.length > 0 && idea.fits.every(fit => moveTemplateFits.includes(fit))))) || !uniqueIds(move.ideas)) return false;
      if (!move.logs.every(log => isRecord(log) && typeof log.id === 'string' && log.id.length > 0 && (moveStatuses.includes(log.status) || (log.status === undefined && ['activity', 'rest'].includes(log.kind))) && (log.activityId === null || typeof log.activityId === 'string') && typeof log.activityName === 'string' && (log.minutes === null || (Number.isInteger(log.minutes) && log.minutes >= 1 && log.minutes <= 600)) && typeof log.note === 'string' && (log.rpe === undefined || log.rpe === null || (Number.isInteger(log.rpe) && log.rpe >= 1 && log.rpe <= 10)) && (log.details === undefined || typeof log.details === 'string') && validDateKey(log.date) && Number.isFinite(Date.parse(log.at))) || !uniqueIds(move.logs)) return false;
    }
    if (data.nourish !== undefined) {
      const food = data.nourish;
      if (!isRecord(food) || !Array.isArray(food.ideas) || !Array.isArray(food.leftovers) || !Array.isArray(food.groceries) || !isRecord(food.dailyNotes)) return false;
      if (!food.ideas.every(idea => isRecord(idea) && typeof idea.id === 'string' && idea.id.length > 0 && typeof idea.name === 'string' && idea.name.length > 0 && typeof idea.note === 'string' && Array.isArray(idea.tags) && idea.tags.every(tag => nourishTags.includes(tag)) && (idea.ingredients === undefined || (Array.isArray(idea.ingredients) && idea.ingredients.every(item => typeof item === 'string'))) && typeof idea.favorite === 'boolean' && typeof idea.archived === 'boolean' && typeof idea.example === 'boolean') || !uniqueIds(food.ideas)) return false;
      if (!food.leftovers.every(item => isRecord(item) && typeof item.id === 'string' && item.id.length > 0 && typeof item.name === 'string' && item.name.length > 0 && typeof item.note === 'string' && (item.useBy === '' || validDateKey(item.useBy)) && ['available', 'eaten', 'discarded', 'saved'].includes(item.status) && Number.isFinite(Date.parse(item.addedAt)) && (item.resolvedAt === '' || Number.isFinite(Date.parse(item.resolvedAt)))) || !uniqueIds(food.leftovers)) return false;
      if (!food.groceries.every(item => isRecord(item) && typeof item.id === 'string' && item.id.length > 0 && typeof item.name === 'string' && item.name.length > 0 && groceryCategories.includes(item.category) && typeof item.checked === 'boolean') || !uniqueIds(food.groceries)) return false;
      if (food.recipes !== undefined && (!Array.isArray(food.recipes) || !food.recipes.every(item => isRecord(item) && typeof item.id === 'string' && item.id.length > 0 && typeof item.name === 'string' && item.name.length > 0 && Array.isArray(item.ingredients) && item.ingredients.every(ingredient => typeof ingredient === 'string') && typeof item.method === 'string' && Number.isFinite(Date.parse(item.createdAt))) || !uniqueIds(food.recipes))) return false;
      if (!Object.entries(food.dailyNotes).every(([date, note]) => validDateKey(date) && typeof note === 'string')) return false;
    }
    if (data.workroom !== undefined) {
      const work = data.workroom;
      if (!isRecord(work) || !Array.isArray(work.items) || !Array.isArray(work.docs) || !Array.isArray(work.jobs) || !Array.isArray(work.evidence)) return false;
      if (!work.items.every(item => isRecord(item) && typeof item.id === 'string' && item.id.length > 0 && typeof item.title === 'string' && item.title.length > 0 && typeof item.detail === 'string' && workCategories.includes(item.category) && workStates.includes(item.state) && typeof item.next === 'string' && (item.due === '' || validDateKey(item.due)) && ['', 'Soon', 'Whenever'].includes(item.urgency) && Number.isFinite(Date.parse(item.createdAt)) && Number.isFinite(Date.parse(item.touched))) || !uniqueIds(work.items)) return false;
      if (!work.docs.every(doc => isRecord(doc) && typeof doc.id === 'string' && doc.id.length > 0 && typeof doc.name === 'string' && doc.name.length > 0 && docStates.includes(doc.state) && typeof doc.note === 'string' && typeof doc.next === 'string' && (doc.attachment === undefined || doc.attachment === null || cleanWorkAttachment(doc.attachment) !== null) && Number.isFinite(Date.parse(doc.touched))) || !uniqueIds(work.docs)) return false;
      if (!work.jobs.every(job => isRecord(job) && typeof job.id === 'string' && job.id.length > 0 && typeof job.company === 'string' && job.company.length > 0 && typeof job.role === 'string' && job.role.length > 0 && jobStates.includes(job.state) && ['location', 'salary', 'source', 'notes'].every(field => typeof job[field] === 'string') && ['applied', 'follow', 'interview'].every(field => job[field] === '' || validDateKey(job[field])) && Number.isFinite(Date.parse(job.touched))) || !uniqueIds(work.jobs)) return false;
      if (!work.evidence.every(card => isRecord(card) && typeof card.id === 'string' && card.id.length > 0 && typeof card.title === 'string' && card.title.length > 0 && evidenceKinds.includes(card.kind) && typeof card.note === 'string' && Array.isArray(card.tags) && card.tags.every(tag => evidenceTags.includes(tag)) && typeof card.example === 'boolean' && Number.isFinite(Date.parse(card.touched))) || !uniqueIds(work.evidence)) return false;
    }
    if (data.stillness !== undefined) {
      const still = data.stillness;
      if (!isRecord(still) || !Number.isInteger(still.sudokuVariant) || still.sudokuVariant < 0 || still.sudokuVariant > 3 || !Array.isArray(still.sudokuBoards) || still.sudokuBoards.length !== 4 || !still.sudokuBoards.every(board => Array.isArray(board) && board.length === 81 && board.every(cell => typeof cell === 'string' && /^$|^[1-9]$/.test(cell))) || !Array.isArray(still.starPaths) || still.starPaths.length > 120 || !still.starPaths.every(path => Array.isArray(path) && path.length === 2 && path.every(index => Number.isInteger(index) && index >= 0 && index < 12))) return false;
    }
    return Object.values(data.toggles).every(value => typeof value === 'boolean');
  }
  function renderAll() { reconcileFocus(); renderFocus(); renderThreads(); renderMonthlyPreview(); renderMonthly(); renderPlanner(); renderMove(); renderNourish(); renderWorkroom(); renderTools(); }
  function currentView() { return location.hash === '#threads' ? 'threads' : location.hash === '#monthly' ? 'monthly' : location.hash === '#planner' ? 'planner' : location.hash === '#move' ? 'move' : location.hash === '#nourish' ? 'nourish' : location.hash === '#workroom' ? 'workroom' : location.hash === '#stillness' ? 'stillness' : location.hash === '#tools' ? 'tools' : 'landing'; }
  function showView(view = currentView()) {
    if (view !== 'stillness' && stayRunning) pauseStay(true);
    $('landing-view').hidden = view !== 'landing'; $('threads-view').hidden = view !== 'threads'; $('monthly-view').hidden = view !== 'monthly'; $('planner-view').hidden = view !== 'planner'; $('move-view').hidden = view !== 'move'; $('nourish-view').hidden = view !== 'nourish'; $('workroom-view').hidden = view !== 'workroom'; $('stillness-view').hidden = view !== 'stillness'; $('tools-view').hidden = view !== 'tools';
    ['landing', 'threads', 'planner', 'monthly', 'move', 'nourish', 'workroom', 'stillness'].forEach(name => $('nav-' + name).setAttribute('aria-current', view === name ? 'page' : 'false'));
    document.title = 'The Garden · ' + (view === 'threads' ? 'Threads' : view === 'monthly' ? 'Monthly Close' : view === 'planner' ? 'Planner' : view === 'move' ? 'Move' : view === 'nourish' ? 'Nourish' : view === 'workroom' ? 'Workroom' : view === 'stillness' ? 'Stillness' : view === 'tools' ? 'Garden Tools' : 'Landing Pad');
    if (view === 'monthly') renderMonthly();
    if (view === 'planner') renderPlanner();
    if (view === 'nourish') renderNourish();
    if (view === 'workroom') renderWorkroom();
  }
  window.addEventListener('hashchange', () => showView());
  $('nav-landing').addEventListener('click', () => showView('landing')); $('nav-threads').addEventListener('click', () => showView('threads')); $('nav-planner').addEventListener('click', () => showView('planner')); $('nav-monthly').addEventListener('click', () => showView('monthly')); $('nav-move').addEventListener('click', () => showView('move')); $('nav-nourish').addEventListener('click', () => showView('nourish')); $('nav-workroom').addEventListener('click', () => showView('workroom')); $('nav-stillness').addEventListener('click', () => showView('stillness'));
  $('open-tools').addEventListener('click', () => showView('tools'));
  let editingId = null, sourceThoughtId = null;
  areas.forEach(area => { const option = el('option', '', area); option.value = area; $('thread-area').append(option); });
  states.forEach(value => { const label = { Parked: 'Parked · pause for now', Hibernating: 'Hibernating · away longer' }[value] || value; const option = el('option', '', label); option.value = value; $('thread-state').append(option); });
  anchorTypes.forEach(value => { const option = el('option', '', value === 'Event' ? 'Event / gathering' : value); option.value = value; $('anchor-type').append(option); });
  ['start', 'end'].forEach(kind => {
    const picker = $('anchor-' + kind + '-picker'); const none = el('option', '', 'No time'); none.value = ''; picker.append(none);
    for (let minutes = 0; minutes < 1440; minutes += 15) { const value = String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0'); const option = el('option', '', new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60))); option.value = value; picker.append(option); }
    const custom = el('option', '', 'Exact minute…'); custom.value = 'custom'; picker.append(custom);
  });
  function openEditor(thread = null, thought = null) {
    editingId = thread?.id || null; sourceThoughtId = thought?.id || null;
    $('thread-form').reset(); $('editor-title').textContent = thread ? 'Tend a thread' : 'Add a thread';
    $('remove-thread').hidden = !thread;
    $('thread-title').value = thread?.title || thought?.text.slice(0,160) || '';
    $('thread-area').value = thread?.area || 'Curiosity'; $('thread-state').value = thread?.state || 'Active';
    $('thread-next').value = thread?.next || ''; $('thread-stop').value = thread?.stop || thought?.text || '';
    $('thread-pin').checked = thread?.pinned || false; $('thread-details').open = !!thread || !!thought;
    $('thread-editor').showModal(); $('thread-title').focus();
  }
  $('add-thread').addEventListener('click', () => openEditor());
  $('cancel-thread').addEventListener('click', () => $('thread-editor').close());
  $('remove-thread').addEventListener('click', () => {
    const thread = state.threads.find(item => item.id === editingId); if (!thread) return;
    openGardenConfirmation('Delete this thread?', 'The thread and its stopping note will be removed from this browser. Linked Planner anchors will stay, with their thread link cleared.', 'Delete thread', { kind: 'thread-delete', id: thread.id });
  });
  $('thread-form').addEventListener('submit', event => {
    event.preventDefault(); const title = $('thread-title').value.trim();
    if (!title) { $('thread-title').setCustomValidity('Give this thread a small name.'); $('thread-title').reportValidity(); return; }
    let thread = state.threads.find(t => t.id === editingId);
    if (!thread) { thread = { id: uid(), example: false }; state.threads.push(thread); }
    Object.assign(thread, { title, area: $('thread-area').value, state: $('thread-state').value, next: $('thread-next').value.trim(), stop: $('thread-stop').value.trim(), pinned: $('thread-pin').checked, touched: now() });
    if (editingId && thread.example) thread.example = false;
    if (pinnedActive(thread)) { state.focus = thread.id; state.started = false; }
    if (sourceThoughtId) state.thoughts = state.thoughts.filter(t => t.id !== sourceThoughtId);
    reconcileFocus(); save(); renderAll(); renderThoughts(); $('thread-editor').close();
    $('thread-status').textContent = 'Thread saved. There’s room to return.';
    if (sourceThoughtId) $('capture-status').textContent = 'Your thought is now a thread. Its full text is kept in “where I stopped.”';
  });
  $('thread-title').addEventListener('input', () => $('thread-title').setCustomValidity(''));
  $('month-previous').addEventListener('click', () => { editingCloseList = false; viewedMonth = shiftMonth(viewedMonth, -1); ensureMonth(viewedMonth); save(); renderMonthly(); });
  let pendingFutureMonth = null;
  $('month-next').addEventListener('click', () => {
    const next = shiftMonth(viewedMonth, 1);
    if (next > currentMonthKey()) {
      pendingFutureMonth = next; $('future-month-description').textContent = monthName(next) + ' is ahead of the living month. You can make a little room for it now; its seals and reflection will stay with that month.';
      $('future-month-confirm').showModal(); $('future-month-cancel').focus(); return;
    }
    editingCloseList = false; viewedMonth = next; ensureMonth(viewedMonth); save(); renderMonthly();
  });
  $('future-month-continue').addEventListener('click', () => {
    if (!pendingFutureMonth) return;
    editingCloseList = false; viewedMonth = pendingFutureMonth; pendingFutureMonth = null; ensureMonth(viewedMonth); save(); renderMonthly(); $('future-month-confirm').close();
    $('monthly-status').textContent = 'Way to get ahead ♡ This month is open for gentle tending.';
  });
  $('future-month-cancel').addEventListener('click', () => { pendingFutureMonth = null; $('future-month-confirm').close(); });
  $('future-month-confirm').addEventListener('cancel', () => { pendingFutureMonth = null; });
  $('edit-close-list').addEventListener('click', () => { editingCloseList = !editingCloseList; renderMonthly(); $('monthly-status').textContent = editingCloseList ? 'List editing is open.' : 'List editing tucked away.'; });
  $('add-close-item').addEventListener('click', () => openCloseEditor());
  $('cancel-close-item').addEventListener('click', () => $('close-item-editor').close());
  $('close-item-x').addEventListener('click', () => $('close-item-editor').close());
  $('close-item-name').addEventListener('input', () => $('close-item-name').setCustomValidity(''));
  $('close-item-form').addEventListener('submit', event => {
    event.preventDefault(); const name = $('close-item-name').value.trim();
    if (!name) { $('close-item-name').setCustomValidity('Give this monthly item a small name.'); $('close-item-name').reportValidity(); return; }
    const dueValue = Number($('close-item-due').value); const dueDay = dueValue >= 1 && dueValue <= 31 ? dueValue : null;
    const month = ensureMonth(currentMonthKey()); let item = month.entries.find(entry => entry.id === editingCloseId);
    if (!item) { item = { id: 'close-' + Date.now().toString(36) + Math.random().toString(36).slice(2), completed: false, resolution: null }; month.entries.push(item); }
    Object.assign(item, { name, dueDay });
    const templateItem = state.monthly.template.find(entry => entry.id === item.id);
    if (templateItem) Object.assign(templateItem, { name, dueDay }); else state.monthly.template.push(cleanCloseItem(item));
    save(); renderMonthly(); renderMonthlyPreview(); $('close-item-editor').close(); $('monthly-status').textContent = editingCloseId ? 'Item renamed and kept.' : 'A new item has a place.';
  });
  $('remove-close-item').addEventListener('click', () => {
    if (!editingCloseId) return;
    ensureMonth(currentMonthKey()).entries = ensureMonth(currentMonthKey()).entries.filter(item => item.id !== editingCloseId);
    state.monthly.template = state.monthly.template.filter(item => item.id !== editingCloseId);
    save(); renderMonthly(); renderMonthlyPreview(); $('close-item-editor').close(); $('monthly-status').textContent = 'Item released. Earlier months still remember it.';
  });
  $('monthly-reflection').addEventListener('input', () => {
    ensureMonth(viewedMonth).reflection = $('monthly-reflection').value.slice(0, 280);
    const saved = save(); $('reflection-status').textContent = saved ? 'Kept for ' + monthName(shiftMonth(viewedMonth, 1)) + '.' : 'The browser could not save this note yet.';
  });
  $('week-previous').addEventListener('click', () => { selectedPlannerDate = addPlannerDays(selectedPlannerDate, -7); plannerMonthCursor = plannerMonthKey(selectedPlannerDate); renderPlanner(); });
  $('week-next').addEventListener('click', () => { selectedPlannerDate = addPlannerDays(selectedPlannerDate, 7); plannerMonthCursor = plannerMonthKey(selectedPlannerDate); renderPlanner(); });
  $('planner-today').addEventListener('click', () => { selectedPlannerDate = todayKey(); plannerMonthCursor = plannerMonthKey(selectedPlannerDate); renderPlanner(); $('planner-status').textContent = 'Returned to this week.'; });
  $('planner-month-previous').addEventListener('click', () => { plannerMonthCursor = shiftMonth(plannerMonthCursor, -1); renderPlannerMonth(); });
  $('planner-month-next').addEventListener('click', () => { plannerMonthCursor = shiftMonth(plannerMonthCursor, 1); renderPlannerMonth(); });
  $('add-anchor').addEventListener('click', () => openAnchorEditor());
  $('cancel-anchor').addEventListener('click', () => $('anchor-editor').close());
  $('anchor-editor-x').addEventListener('click', () => $('anchor-editor').close());
  $('anchor-thread').addEventListener('change', () => { $('anchor-open-thread').hidden = !state.threads.some(thread => thread.id === $('anchor-thread').value); });
  $('anchor-repeat').addEventListener('change', syncAnchorRepeat);
  $('anchor-open-thread').addEventListener('click', () => {
    const thread = state.threads.find(item => item.id === $('anchor-thread').value); if (!thread) return;
    $('anchor-editor').close(); location.hash = '#threads'; showView('threads');
    const card = [...document.querySelectorAll('.garden-thread')].find(item => item.dataset.threadId === thread.id);
    if (card) { card.focus({ preventScroll: true }); card.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' }); }
  });
  $('anchor-title').addEventListener('input', () => $('anchor-title').setCustomValidity(''));
  function syncAnchorPicker(kind, preserveCustom = false) {
    const input = $('anchor-' + kind), picker = $('anchor-' + kind + '-picker');
    if (preserveCustom && picker.value === 'custom') { input.hidden = false; return; }
    const quarter = input.value && Number(input.value.slice(3)) % 15 === 0;
    picker.value = !input.value ? '' : quarter ? input.value : 'custom'; input.hidden = !input.value || quarter;
  }
  function suggestAnchorEnd() {
    const start = $('anchor-start').value, end = $('anchor-end').value;
    syncAnchorPicker('start', true); if (!validTime(start) || $('anchor-end-date').value > $('anchor-date').value) return;
    const [hour, minute] = start.split(':').map(Number), startMinutes = hour * 60 + minute;
    if (end && validTime(end) && Number(end.slice(0, 2)) * 60 + Number(end.slice(3)) > startMinutes) return;
    const next = Math.ceil((startMinutes + 15) / 15) * 15;
    if (next >= 1440) { $('anchor-end').value = ''; syncAnchorPicker('end'); return; }
    $('anchor-end').value = String(Math.floor(next / 60)).padStart(2, '0') + ':' + String(next % 60).padStart(2, '0');
    syncAnchorPicker('end'); $('anchor-end').setCustomValidity(''); $('anchor-end-picker').setCustomValidity('');
  }
  ['start', 'end'].forEach(kind => $('anchor-' + kind + '-picker').addEventListener('change', () => {
    const picker = $('anchor-' + kind + '-picker'), input = $('anchor-' + kind);
    if (picker.value === 'custom') { input.hidden = false; input.focus(); }
    else { input.value = picker.value; input.hidden = true; if (kind === 'start') suggestAnchorEnd(); }
    picker.setCustomValidity(''); input.setCustomValidity('');
  }));
  $('anchor-start').addEventListener('input', suggestAnchorEnd);
  $('anchor-start').addEventListener('change', suggestAnchorEnd);
  $('anchor-end').addEventListener('input', () => { syncAnchorPicker('end', true); $('anchor-end').setCustomValidity(''); $('anchor-end-picker').setCustomValidity(''); });
  $('anchor-form').addEventListener('submit', event => {
    event.preventDefault(); const title = $('anchor-title').value.trim(); const date = $('anchor-date').value;
    if (!title) { $('anchor-title').setCustomValidity('Give this anchor a small name.'); $('anchor-title').reportValidity(); return; }
    if (!validDateKey(date)) { $('anchor-date').setCustomValidity('Choose a real date.'); $('anchor-date').reportValidity(); return; }
    const endDate = $('anchor-end-date').value, start = $('anchor-start').value, end = $('anchor-end').value;
    if (endDate && (!validDateKey(endDate) || endDate < date)) { $('anchor-end-date').setCustomValidity('Choose the first date or a later one.'); $('anchor-end-date').reportValidity(); return; }
    if (start && end && end <= start && (!endDate || endDate === date)) { const control = $('anchor-end').hidden ? $('anchor-end-picker') : $('anchor-end'); control.setCustomValidity('Let the end rest after the start.'); control.reportValidity(); return; }
    const repeat = $('anchor-repeat').value, repeatUntil = repeat === 'none' ? '' : $('anchor-repeat-until').value;
    if (repeatUntil && (!validDateKey(repeatUntil) || repeatUntil < date)) { $('anchor-repeat-until').setCustomValidity('Choose a date on or after the first anchor.'); $('anchor-repeat-until').reportValidity(); return; }
    let anchor = state.planner.events.find(item => item.id === editingAnchorId); const createdAt = anchor?.createdAt || now();
    if (!anchor) { anchor = { id: 'anchor-' + Date.now().toString(36) + Math.random().toString(36).slice(2) }; state.planner.events.push(anchor); }
    const excludedDates = anchor.date === date && anchor.repeat === repeat ? (anchor.excludedDates || []) : [];
    Object.assign(anchor, { title, date, endDate, start, end, type: $('anchor-type').value, threadId: $('anchor-thread').value, note: $('anchor-note').value.trim(), repeat, repeatUntil, excludedDates, createdAt, updatedAt: now() });
    selectedPlannerDate = editingViewedDate && anchorOccursOn(anchor, editingViewedDate) ? editingViewedDate : date; plannerMonthCursor = plannerMonthKey(selectedPlannerDate); save(); renderPlanner(); $('anchor-editor').close();
    if (anchorSourceThreadId) { location.hash = '#planner'; showView('planner'); }
    $('planner-status').textContent = editingAnchorId ? 'Anchor tended and saved.' : 'Anchor placed. The surrounding time stays open.';
  });
  $('anchor-date').addEventListener('input', () => $('anchor-date').setCustomValidity(''));
  $('anchor-end-date').addEventListener('input', () => $('anchor-end-date').setCustomValidity(''));
  $('anchor-repeat-until').addEventListener('input', () => $('anchor-repeat-until').setCustomValidity(''));
  $('skip-anchor-occurrence').addEventListener('click', () => {
    const anchor = state.planner.events.find(item => item.id === editingAnchorId);
    if (!anchor || anchor.repeat === 'none' || !editingOccurrenceDate) return;
    anchor.excludedDates = [...new Set([...(anchor.excludedDates || []), editingOccurrenceDate])]; anchor.updatedAt = now();
    save(); renderPlanner(); $('anchor-editor').close(); $('planner-status').textContent = 'This date is skipped. The rest of the series remains.';
  });
  $('remove-anchor').addEventListener('click', () => {
    if (!editingAnchorId) return; const wasRepeating = state.planner.events.find(anchor => anchor.id === editingAnchorId)?.repeat !== 'none'; state.planner.events = state.planner.events.filter(anchor => anchor.id !== editingAnchorId);
    save(); renderPlanner(); $('anchor-editor').close(); $('planner-status').textContent = wasRepeating ? 'Series removed. The time is open again.' : 'Anchor removed. The time is open again.';
  });
  document.querySelectorAll('[data-move-fit]').forEach(button => button.addEventListener('click', () => chooseMoveFit(button.dataset.moveFit)));
  ['move-energy', 'move-time', 'move-location', 'move-heat', 'move-pain', 'move-social'].forEach(id => $(id).addEventListener('change', () => {
    const c = state.movement.context;
    c.energy = $('move-energy').value; c.time = $('move-time').value; c.location = $('move-location').value;
    c.heat = $('move-heat').checked; c.pain = $('move-pain').checked; c.social = $('move-social').checked;
    save(); renderMoveContext(); renderMoveChoice();
  }));
  $('move-original').addEventListener('change', () => { state.movement.context.originalId = moveIdea($('move-original').value)?.id || ''; save(); renderMoveChoice(); });
  $('move-idea-choice').addEventListener('change', () => {
    if (!state.movement.choice || state.movement.choice.fit === 'rest') return;
    const selected = $('move-idea-choice').value;
    state.movement.choice.ideaId = moveFitIdeas(state.movement.choice.fit).some(idea => idea.id === selected) || selected === 'custom' ? selected : null;
    state.movement.choice.customName = ''; save(); renderMovePreview(); renderMoveChoice();
  });
  $('move-choice-custom').addEventListener('input', () => {
    if (!state.movement.choice || !isCustomMoveValue(state.movement.choice.ideaId)) return;
    state.movement.choice.customName = $('move-choice-custom').value.trim().slice(0, 100); save(); renderMovePreview();
  });
  $('move-prefill-log').addEventListener('click', () => {
    const choice = state.movement.choice; if (!choice) return;
    editingMoveLogId = null; $('move-log-cancel-edit').hidden = true; $('move-log-form').reset(); $('move-log-date').value = todayKey();
    $('move-log-status-choice').value = choice.fit === 'rest' ? 'Rest' : '';
    $('move-log-activity').value = moveFitIdeas(choice.fit).some(idea => idea.id === choice.ideaId) ? choice.ideaId : choice.ideaId === 'custom' ? (moveIdea('move-custom') ? 'move-custom' : 'custom') : '';
    $('move-custom-name').value = choice.customName || ''; renderMoveLogStatus();
    $('move-log-status').textContent = 'Draft filled. Choose what actually happened before saving.';
    $('move-log-form').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    $('move-log-status-choice').focus({ preventScroll: true });
  });
  $('move-log-status-choice').addEventListener('change', renderMoveLogStatus);
  $('move-log-activity').addEventListener('change', renderMoveLogStatus);
  $('move-log-cancel-edit').addEventListener('click', () => {
    editingMoveLogId = null; $('move-log-cancel-edit').hidden = true; $('move-log-form').reset(); $('move-log-date').value = todayKey(); renderMoveLogStatus(); $('move-log-status').textContent = 'Edit set aside.';
  });
  $('move-log-form').addEventListener('submit', event => {
    event.preventDefault(); const status = $('move-log-status-choice').value, selected = $('move-log-activity').value, idea = moveIdea(selected), custom = isCustomMoveValue(selected);
    if (!moveStatuses.includes(status)) { $('move-log-status').textContent = 'Choose the outcome that fits what happened.'; $('move-log-status-choice').focus(); return; }
    const active = ['Completed', 'Modified', 'Partial'].includes(status), activityName = active ? custom ? $('move-custom-name').value.trim().slice(0, 100) : idea?.name || '' : '';
    if (active && !activityName) { $('move-log-status').textContent = custom ? 'Give your custom activity a small name.' : 'Choose the activity that actually happened.'; (custom ? $('move-custom-name') : $('move-log-activity')).focus(); return; }
    const date = $('move-log-date').value;
    if (!validDateKey(date)) { $('move-log-status').textContent = 'Choose a real date for this moment.'; $('move-log-date').focus(); return; }
    const rawDuration = $('move-log-duration').value.trim(), minutes = rawDuration ? Number(rawDuration) : null;
    if (minutes !== null && (!Number.isInteger(minutes) || minutes < 1 || minutes > 600)) { $('move-log-status').textContent = 'Leave minutes empty, or enter a number from 1 to 600.'; $('move-log-duration').focus(); return; }
    const rpe = $('move-log-rpe').value ? Number($('move-log-rpe').value) : null;
    const editing = state.movement.logs.find(log => log.id === editingMoveLogId);
    const log = editing || { id: 'moment-' + Date.now().toString(36) + Math.random().toString(36).slice(2), at: now() };
    Object.assign(log, { status, activityId: active && !custom ? idea.id : null, activityName, minutes,
      note: $('move-log-note').value.trim().slice(0, 180), rpe, details: $('move-log-exercises').value.trim().slice(0, 3000), date });
    if (!editing) state.movement.logs.push(log);
    const saved = save(); editingMoveLogId = null; $('move-log-cancel-edit').hidden = true; $('move-log-form').reset(); $('move-log-date').value = todayKey(); $('move-log-activity').value = ''; $('move-custom-name').value = ''; renderMoveLogStatus(); renderMoveHistory();
    $('move-log-status').textContent = saved ? (editing ? 'Moment updated and kept.' : status === 'Rest' ? 'Rest noted. It belongs here, too.' : status + ' noted without judgment.') : 'This moment is visible for now, but the browser could not save it.';
  });
  $('move-edit-ideas').addEventListener('click', () => { editingMoveIdeas = !editingMoveIdeas; renderMoveIdeas(); $('move-idea-status').textContent = editingMoveIdeas ? 'Idea editing is open.' : 'Idea editing tucked away.'; });
  $('move-add-idea').addEventListener('click', () => openMoveIdeaEditor());
  $('move-idea-close').addEventListener('click', () => $('move-idea-editor').close());
  $('move-idea-cancel').addEventListener('click', () => $('move-idea-editor').close());
  $('move-idea-name').addEventListener('input', () => $('move-idea-name').setCustomValidity(''));
  $('move-idea-form').addEventListener('submit', event => {
    event.preventDefault(); const name = $('move-idea-name').value.trim();
    if (!name) { $('move-idea-name').setCustomValidity('Give this idea a name.'); $('move-idea-name').reportValidity(); return; }
    const fits = [...document.querySelectorAll('[data-template-fit]:checked')].map(input => input.value);
    if (!fits.length) { $('move-idea-fit-status').textContent = 'Choose at least one path for this template.'; document.querySelector('[data-template-fit]').focus(); return; }
    let idea = moveIdea(editingMoveIdeaId);
    if (idea) { idea.name = name; idea.notes = $('move-idea-notes').value.trim().slice(0, 3000); idea.historical = $('move-idea-historical').checked; idea.example = false; idea.fits = fits; }
    else { idea = { id: 'move-' + Date.now().toString(36) + Math.random().toString(36).slice(2), name, notes: $('move-idea-notes').value.trim().slice(0, 3000), historical: $('move-idea-historical').checked, example: false, fits }; state.movement.ideas.push(idea); }
    if (state.movement.choice?.ideaId === idea.id && !idea.fits.includes(state.movement.choice.fit)) state.movement.choice.ideaId = null;
    const saved = save(); renderMove(); $('move-idea-editor').close(); $('move-idea-status').textContent = saved ? (editingMoveIdeaId ? 'Template edited. Earlier notes keep their original wording.' : 'A new possibility is here.') : 'The template is visible for now, but the browser could not save it.';
  });
  document.querySelectorAll('[data-template-fit]').forEach(input => input.addEventListener('change', () => { $('move-idea-fit-status').textContent = ''; }));
  $('move-delete-cancel').addEventListener('click', () => { pendingMoveDeleteId = null; $('move-delete-confirm').close(); });
  $('move-delete-confirm').addEventListener('cancel', () => { pendingMoveDeleteId = null; });
  $('move-delete-action').addEventListener('click', () => {
    if (!pendingMoveDeleteId) return;
    const previous = state.movement.logs, removing = pendingMoveDeleteId;
    state.movement.logs = previous.filter(log => log.id !== removing);
    if (save()) {
      if (editingMoveLogId === removing) { editingMoveLogId = null; $('move-log-cancel-edit').hidden = true; $('move-log-form').reset(); $('move-log-date').value = todayKey(); renderMoveLogStatus(); $('move-log-status').textContent = ''; }
      renderMoveHistory(); $('move-history-status').textContent = 'That saved moment has been removed.';
    } else { state.movement.logs = previous; $('move-history-status').textContent = 'The browser could not save this change. The moment remains.'; }
    pendingMoveDeleteId = null; $('move-delete-confirm').close();
  });
  $('move-return-short').addEventListener('click', () => chooseMoveFit('short'));
  $('move-return-rest').addEventListener('click', () => chooseMoveFit('rest'));
  const csvCell = value => '"' + String(value ?? '').replaceAll('"', '""') + '"';
  const moveCsvPathsHeader = 'paths (choose: ' + moveTemplateFits.join(' | ') + '; separate with semicolons)';
  function parseTemplateCsv(source) {
    const rows = []; let row = [], cell = '', quoted = false;
    const input = source.replace(/^\uFEFF/, '');
    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      if (quoted) {
        if (char === '"' && input[i + 1] === '"') { cell += '"'; i++; }
        else if (char === '"') quoted = false;
        else cell += char;
      } else if (char === '"' && cell === '') quoted = true;
      else if (char === ',') { row.push(cell); cell = ''; }
      else if (char === '\n' || char === '\r') {
        if (char === '\r' && input[i + 1] === '\n') i++;
        row.push(cell); if (row.some(value => value.trim())) rows.push(row);
        row = []; cell = '';
      } else cell += char;
    }
    if (quoted) throw new Error('Unclosed quote');
    row.push(cell); if (row.some(value => value.trim())) rows.push(row);
    if (!rows.length || !['id,name,notes', 'id,name,notes,paths', 'id,name,notes,' + moveCsvPathsHeader.toLowerCase()].includes(rows[0].map(value => value.trim().toLowerCase()).join(','))) throw new Error('Expected template columns');
    if (rows.length > 501) throw new Error('Too many templates');
    const hasPaths = rows[0].length === 4;
    const historicalIds = new Set(state.movement.ideas.filter(idea => idea.historical).map(idea => idea.id));
    const ids = new Set();
    return rows.slice(1).map((fields, index) => {
      if (fields.length !== rows[0].length) throw new Error('Column count differs');
      const id = fields[0].trim() || 'move-import-' + Date.now().toString(36) + '-' + index;
      const name = fields[1].trim(), notes = fields[2].trim();
      if (!name || name.length > 100 || notes.length > 3000 || id.length > 150 || ids.has(id) || historicalIds.has(id)) throw new Error('Invalid template');
      const current = moveIdea(id), idea = { id, name, notes, historical: false, example: false };
      const paths = hasPaths ? fields[3].split(';').map(fit => fit.trim().toLowerCase()).filter(Boolean) : (current?.fits || inferredMoveFits(idea));
      if (!paths.length) throw new Error('Row ' + (index + 2) + ' needs at least one path. Choose: ' + moveTemplateFits.join(', ') + '.');
      const invalidPath = paths.find(fit => !moveTemplateFits.includes(fit));
      if (invalidPath) throw new Error('Row ' + (index + 2) + ' has an unfamiliar path: ' + invalidPath.slice(0, 50) + '. Choose: ' + moveTemplateFits.join(', ') + '.');
      idea.fits = [...new Set(paths)]; ids.add(id); return idea;
    });
  }
  $('move-export-csv').addEventListener('click', () => {
    const current = state.movement.ideas.filter(idea => !idea.historical);
    const csv = '\uFEFFid,name,notes,' + moveCsvPathsHeader + '\r\n' + current.map(idea => [idea.id, idea.name, idea.notes || '', idea.fits.join(';')].map(csvCell).join(',')).join('\r\n') + '\r\n';
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'the-garden-move-templates-' + todayKey() + '.csv';
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    $('move-idea-status').textContent = 'Editable template CSV downloaded.';
  });
  $('move-choose-csv').addEventListener('click', () => $('move-import-csv').click());
  $('move-import-csv').addEventListener('change', () => {
    const file = $('move-import-csv').files?.[0]; if (!file) return;
    if (file.size > 1024 * 1024) { $('move-idea-status').textContent = 'Choose a template CSV under 1 MB.'; $('move-import-csv').value = ''; return; }
    const reader = new FileReader();
    reader.onerror = () => { $('move-idea-status').textContent = 'This CSV could not be read. Templates have not changed.'; $('move-import-csv').value = ''; };
    reader.onload = () => {
      try {
        const ideas = parseTemplateCsv(String(reader.result));
        openGardenConfirmation('Replace current movement templates?', 'This CSV has ' + ideas.length + ' current template' + (ideas.length === 1 ? '' : 's') + '. Importing will replace only the current movement templates. Source material and saved session notes remain.', 'Replace templates', { kind: 'move-templates', ideas });
      } catch (error) { $('move-idea-status').textContent = error.message.startsWith('Row ') ? error.message + ' Templates have not changed.' : 'This CSV needs valid id, name, notes, and optional paths columns. Templates have not changed.'; $('move-import-csv').value = ''; }
    };
    reader.readAsText(file);
  });
  let pendingGardenAction = null;
  function openGardenConfirmation(title, description, actionLabel, pending) {
    pendingGardenAction = pending; $('garden-confirm-title').textContent = title;
    $('garden-confirm-description').textContent = description; $('garden-confirm-action').textContent = actionLabel;
    $('garden-confirm').showModal(); $('garden-confirm-cancel').focus();
  }
  function cancelGardenConfirmation() {
    pendingGardenAction = null; $('garden-confirm').close(); $('import-garden-file').value = ''; $('import-file-name').textContent = ''; $('move-import-csv').value = ''; $('workroom-jobs-file').value = '';
  }
  $('garden-confirm-cancel').addEventListener('click', cancelGardenConfirmation);
  $('garden-confirm').addEventListener('cancel', () => { pendingGardenAction = null; $('import-garden-file').value = ''; $('import-file-name').textContent = ''; $('move-import-csv').value = ''; $('workroom-jobs-file').value = ''; });
  $('export-garden').addEventListener('click', () => {
    if (loadError) return;
    pruneSettledLeftovers();
    const backup = { format: 'the-garden-local-backup', version: 1, exportedAt: now(), data: state };
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2) + '\n'], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'the-garden-backup-' + todayKey() + '.json';
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    $('tools-status').textContent = 'A Garden backup has been downloaded.';
  });
  $('choose-import-file').addEventListener('click', () => $('import-garden-file').click());
  $('import-garden-file').addEventListener('change', () => {
    const file = $('import-garden-file').files?.[0]; if (!file) return;
    $('import-file-name').textContent = file.name;
    if (file.size > 10 * 1024 * 1024) { $('tools-status').textContent = 'This backup is too large for this browser. Choose a Garden backup under 10 MB.'; return; }
    const reader = new FileReader();
    reader.onerror = () => { $('tools-status').textContent = 'This file could not be read. Your Garden has not changed.'; };
    reader.onload = () => {
      try {
        const backup = JSON.parse(reader.result);
        if (!validateGardenBackup(backup)) throw new Error('Not a Garden backup');
        const data = backup.data;
        $('tools-status').textContent = '';
         openGardenConfirmation('Replace this local Garden?', 'The selected backup contains ' + data.thoughts.length + ' inbox thoughts, ' + data.threads.length + ' Threads, ' + data.planner.events.length + ' Planner anchors, ' + (data.movement?.logs.length || 0) + ' movement notes, ' + (data.nourish?.ideas.length || 0) + ' Nourish ideas, ' + (data.nourish?.recipes?.length || 0) + ' saved recipes, ' + (data.workroom?.items.length || 0) + ' work thoughts, ' + (data.workroom?.docs.length || 0) + ' documents, ' + (data.workroom?.jobs.length || 0) + ' opportunities, and ' + Object.keys(data.monthly.months).length + ' months of history, plus any Stillness puzzle and star paths. Importing it will replace everything currently saved by The Garden in this browser. Export your current Garden first if you want a copy.', 'Replace with backup', { kind: 'import', data });
      } catch (_) { $('tools-status').textContent = 'This is not a valid Garden backup. Your Garden has not changed.'; $('import-garden-file').value = ''; }
    };
    reader.readAsText(file);
  });
  $('reset-demo').addEventListener('click', () => {
    const threads = state.threads.filter(thread => thread.example).length;
    if (!threads || loadError) return;
    openGardenConfirmation('Remove fictional Threads?', 'This removes ' + threads + ' untouched fictional Thread' + (threads === 1 ? '' : 's') + '. Move and Nourish ideas, Workroom prompts, and your own entries stay.', 'Remove fictional Threads', { kind: 'demo' });
  });
  $('restore-starters').addEventListener('click', () => {
    const missing = missingStarterItems(), list = $('restore-starters-list'); list.replaceChildren(); $('restore-starters-status').textContent = '';
    [...new Set(missing.map(item => item.group))].forEach(group => {
      const fieldset = el('fieldset', 'restore-starter-group'); fieldset.append(el('legend', '', group));
      missing.filter(item => item.group === group).forEach(item => {
        const label = el('label', 'restore-starter-option'), input = document.createElement('input'); input.type = 'checkbox'; input.checked = item.kind !== 'threads'; input.dataset.restoreKind = item.kind; input.dataset.restoreId = item.id;
        label.append(input, el('span', '', item.title)); fieldset.append(label);
      });
      list.append(fieldset);
    });
    $('restore-starters-dialog').showModal(); (list.querySelector('input:checked') || list.querySelector('input'))?.focus();
  });
  $('restore-starters-cancel').addEventListener('click', () => $('restore-starters-dialog').close());
  $('restore-starters-form').addEventListener('submit', event => {
    event.preventDefault();
    const chosen = new Set([...$('restore-starters-list').querySelectorAll('input:checked')].map(input => input.dataset.restoreKind + ':' + input.dataset.restoreId));
    const items = missingStarterItems().filter(item => chosen.has(item.kind + ':' + item.id));
    if (!items.length) { $('restore-starters-status').textContent = 'Choose at least one starting place, or leave these aside.'; return; }
    const before = { threads: state.threads, move: state.movement.ideas, nourish: state.nourish.ideas, evidence: state.workroom.evidence, focus: state.focus, started: state.started };
    state.threads = [...state.threads]; state.movement.ideas = [...state.movement.ideas]; state.nourish.ideas = [...state.nourish.ideas]; state.workroom.evidence = [...state.workroom.evidence];
    items.forEach(item => {
      if (item.kind === 'threads') state.threads.push({ ...item.source, touched: now() });
      if (item.kind === 'move') state.movement.ideas.push({ ...item.source, fits: [...item.source.fits], example: false });
      if (item.kind === 'nourish') state.nourish.ideas.push({ ...item.source, tags: [...item.source.tags], ingredients: [...item.source.ingredients], example: false });
      if (item.kind === 'workroom') state.workroom.evidence.push({ ...item.source, tags: [...item.source.tags], touched: now(), example: false });
    });
    reconcileFocus();
    if (!save()) {
      state.threads = before.threads; state.movement.ideas = before.move; state.nourish.ideas = before.nourish; state.workroom.evidence = before.evidence; state.focus = before.focus; state.started = before.started;
      $('restore-starters-status').textContent = 'The browser could not save these starters. Your Garden remains as it was.'; return;
    }
    $('restore-starters-dialog').close(); renderAll(); $('tools-status').textContent = items.length + ' starting place' + (items.length === 1 ? '' : 's') + ' returned. Existing entries stayed as they were.';
  });
  $('garden-confirm-action').addEventListener('click', () => {
    const pending = pendingGardenAction; if (!pending) return;
    if (pending.kind === 'thread-delete') {
      const priorThreads = state.threads, priorEvents = state.planner.events, priorFocus = state.focus, priorStarted = state.started;
      state.threads = priorThreads.filter(thread => thread.id !== pending.id);
      state.planner.events = priorEvents.map(anchor => anchor.threadId === pending.id ? { ...anchor, threadId: '' } : anchor);
      reconcileFocus();
      if (save()) {
        $('thread-editor').close(); editingId = null; sourceThoughtId = null; renderAll();
        $('thread-status').textContent = 'Thread deleted. Linked Planner anchors stayed in place.';
      } else {
        state.threads = priorThreads; state.planner.events = priorEvents; state.focus = priorFocus; state.started = priorStarted;
        $('thread-status').textContent = 'The browser could not save this change. The thread remains.';
      }
      $('garden-confirm').close(); pendingGardenAction = null; return;
    }
    if (pending.kind === 'workroom-jobs') {
      const previous = state.workroom.jobs; state.workroom.jobs = pending.jobs;
      if (save()) { renderWorkroom(); $('workroom-job-status').textContent = 'Job-search list replaced from the CSV. Other Garden data stays.'; }
      else { state.workroom.jobs = previous; $('workroom-job-status').textContent = 'The browser could not keep this CSV. Your opportunities remain.'; }
      $('workroom-jobs-file').value = ''; $('garden-confirm').close(); pendingGardenAction = null; return;
    }
    if (pending.kind === 'workroom-delete') {
      const prior = state.workroom[pending.collection]; state.workroom[pending.collection] = prior.filter(item => item.id !== pending.id);
      const statusIds = { items: 'workroom-item-status', docs: 'workroom-doc-status', jobs: 'workroom-job-status', evidence: 'workroom-evidence-status' };
      const dialogIds = { items: 'workroom-item-editor', docs: 'workroom-doc-editor', jobs: 'workroom-job-editor', evidence: 'workroom-evidence-editor' };
      if (save()) { $(dialogIds[pending.collection]).close(); renderWorkroom(); $(statusIds[pending.collection]).textContent = 'Entry removed from this local shelf.'; }
      else { state.workroom[pending.collection] = prior; $(statusIds[pending.collection]).textContent = 'The browser could not save this change. The entry remains.'; }
      $('garden-confirm').close(); pendingGardenAction = null; return;
    }
    if (pending.kind === 'recipe') {
      const prior = state.nourish.recipes; state.nourish.recipes = prior.filter(recipe => recipe.id !== pending.id);
      if (save()) { $('nourish-recipe-editor').close(); renderNourish(); $('nourish-recipe-status').textContent = 'Recipe removed from your shelf.'; }
      else { state.nourish.recipes = prior; $('nourish-recipe-status').textContent = 'The browser could not save this change. The recipe remains.'; }
      $('garden-confirm').close(); pendingGardenAction = null; return;
    }
    if (pending.kind === 'move-templates') {
      const priorIdeas = state.movement.ideas, priorChoice = state.movement.choice ? { ...state.movement.choice } : null, priorOriginal = state.movement.context.originalId;
      state.movement.ideas = [...priorIdeas.filter(idea => idea.historical), ...pending.ideas];
      if (state.movement.choice && state.movement.choice.ideaId !== 'custom' && !moveIdea(state.movement.choice.ideaId)?.fits.includes(state.movement.choice.fit)) state.movement.choice.ideaId = null;
      if (!moveIdea(state.movement.context.originalId)) state.movement.context.originalId = '';
      if (save()) { renderMove(); $('move-idea-status').textContent = 'Current templates replaced. Source material and session notes remain.'; }
      else { state.movement.ideas = priorIdeas; state.movement.choice = priorChoice; state.movement.context.originalId = priorOriginal; $('move-idea-status').textContent = 'The browser could not save the templates. Nothing was replaced.'; }
      $('move-import-csv').value = ''; $('garden-confirm').close(); pendingGardenAction = null; return;
    }
    if (pending.kind === 'import') {
      try {
        localStorage.setItem(key, JSON.stringify(pending.data));
        pendingGardenAction = null; $('garden-confirm').close(); window.location.reload();
      } catch (_) { $('tools-status').textContent = 'The browser could not save this backup. Your current Garden has not changed.'; $('garden-confirm').close(); pendingGardenAction = null; }
      return;
    }
    if (pending.kind === 'demo') {
      const priorThreads = state.threads, priorFocus = state.focus, priorStarted = state.started;
      state.threads = state.threads.filter(thread => !thread.example); reconcileFocus();
      if (save()) { renderAll(); $('tools-status').textContent = 'Fictional Threads removed. Your useful starters and personal entries remain.'; }
      else { state.threads = priorThreads; state.focus = priorFocus; state.started = priorStarted; }
      $('garden-confirm').close(); pendingGardenAction = null;
    }
  });
  const sudokuPuzzle = '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
  const sudokuAnswer = '534678912672195348198342567859761423426853791713924856961537284287419635345286179';
  const stillnessSource = savedStillness && typeof savedStillness === 'object' && !Array.isArray(savedStillness) ? savedStillness : {};
  const emptySudokuBoard = () => Array(81).fill('');
  state.stillness = {
    sudokuVariant: Number.isInteger(stillnessSource.sudokuVariant) && stillnessSource.sudokuVariant >= 0 && stillnessSource.sudokuVariant < 4 ? stillnessSource.sudokuVariant : 0,
    sudokuBoards: Array.from({ length: 4 }, (_, index) => Array.isArray(stillnessSource.sudokuBoards?.[index]) && stillnessSource.sudokuBoards[index].length === 81 ? stillnessSource.sudokuBoards[index].map(cell => typeof cell === 'string' && /^[1-9]$/.test(cell) ? cell : '') : emptySudokuBoard()),
    starPaths: Array.isArray(stillnessSource.starPaths) ? stillnessSource.starPaths.filter(path => Array.isArray(path) && path.length === 2 && path.every(index => Number.isInteger(index) && index >= 0 && index < 12)).slice(-120) : []
  };
  function sudokuCell(source, index, variant) {
    let row = Math.floor(index / 9), column = index % 9;
    for (let turn = 0; turn < variant; turn += 1) [row, column] = [8 - column, row];
    const digit = source[row * 9 + column];
    return digit === '0' ? '' : String((Number(digit) - 1 + variant * 2) % 9 + 1);
  }
  function renderSudoku() {
    const grid = $('still-sudoku-grid'), variant = state.stillness.sudokuVariant, board = state.stillness.sudokuBoards[variant];
    grid.replaceChildren();
    for (let index = 0; index < 81; index += 1) {
      const row = Math.floor(index / 9), column = index % 9, given = sudokuCell(sudokuPuzzle, index, variant);
      const input = document.createElement('input'); input.type = 'text'; input.inputMode = 'numeric'; input.maxLength = 1; input.autocomplete = 'off'; input.spellcheck = false;
      input.className = 'still-sudoku-cell' + (given ? ' is-given' : '') + (column === 2 || column === 5 ? ' box-right' : '') + (row === 2 || row === 5 ? ' box-bottom' : '');
      input.setAttribute('aria-label', 'Row ' + (row + 1) + ', column ' + (column + 1) + (given ? ', given ' + given : ', empty cell'));
      input.value = given || board[index]; input.readOnly = !!given; if (given) input.tabIndex = -1;
      if (!given) input.addEventListener('input', () => { const digit = input.value.replace(/[^1-9]/g, '').slice(-1); input.value = digit; board[index] = digit; input.classList.remove('needs-another-look'); input.removeAttribute('aria-invalid'); input.setAttribute('aria-label', 'Row ' + (row + 1) + ', column ' + (column + 1) + (digit ? ', ' + digit : ', empty cell')); $('still-sudoku-status').textContent = ''; save(); });
      input.addEventListener('keydown', event => { const move = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }[event.key]; if (move === undefined) return; const next = index + move; if (next < 0 || next >= 81 || (move === -1 && column === 0) || (move === 1 && column === 8)) return; event.preventDefault(); grid.children[next].focus(); });
      grid.append(input);
    }
    $('still-sudoku-status').textContent = '';
  }
  $('still-sudoku-new').addEventListener('click', () => { state.stillness.sudokuVariant = (state.stillness.sudokuVariant + 1) % 4; save(); renderSudoku(); $('still-sudoku-status').textContent = 'Another little grid. The earlier one is kept if you return to it.'; });
  $('still-sudoku-check').addEventListener('click', () => {
    const variant = state.stillness.sudokuVariant, board = state.stillness.sudokuBoards[variant], grid = $('still-sudoku-grid');
    const full = Array.from({ length: 81 }, (_, index) => sudokuCell(sudokuPuzzle, index, variant) || board[index]);
    const misplaced = board.map((cell, index) => cell && !sudokuCell(sudokuPuzzle, index, variant) && cell !== sudokuCell(sudokuAnswer, index, variant) ? index : -1).filter(index => index >= 0);
    [...grid.children].forEach(input => { input.classList.remove('needs-another-look'); input.removeAttribute('aria-invalid'); });
    if (misplaced.length) {
      void grid.offsetWidth;
      misplaced.forEach(index => { grid.children[index].classList.add('needs-another-look'); grid.children[index].setAttribute('aria-invalid', 'true'); });
      $('still-sudoku-status').textContent = 'A few numbers want another look. Take your time.';
    } else $('still-sudoku-status').textContent = full.some(cell => !cell) ? 'There is room to keep going.' : 'Every number has found its place. You can linger here.';
  });
  const pairSymbols = [{ symbol: '☾', name: 'Moon' }, { symbol: '✧', name: 'Star' }, { symbol: '❋', name: 'Flower' }, { symbol: '◇', name: 'Stone' }, { symbol: '⌁', name: 'Breeze' }, { symbol: '❖', name: 'Seed' }];
  let pairDeck = [], pairOpen = [], pairBusy = false, pairTimer = null;
  function renderPairs() {
    const grid = $('still-pairs-grid'); grid.replaceChildren();
    pairDeck.forEach((card, index) => {
      const visible = card.open || card.matched, button = document.createElement('button'); button.type = 'button'; button.className = 'still-pair-card' + (visible ? ' is-open' : '') + (card.matched ? ' is-matched' : '');
      button.textContent = visible ? pairSymbols[card.kind].symbol : '✦'; button.setAttribute('aria-label', visible ? pairSymbols[card.kind].name + (card.matched ? ' pair settled' : ' card') : 'Hidden card ' + (index + 1)); button.disabled = card.matched;
      button.addEventListener('click', () => turnPair(index)); grid.append(button);
    });
  }
  function mixPairs() {
    if (pairTimer) clearTimeout(pairTimer); pairTimer = null; pairBusy = false; pairOpen = [];
    pairDeck = pairSymbols.flatMap((_, kind) => [{ kind, open: false, matched: false }, { kind, open: false, matched: false }]);
    for (let index = pairDeck.length - 1; index > 0; index -= 1) { const other = Math.floor(Math.random() * (index + 1)); [pairDeck[index], pairDeck[other]] = [pairDeck[other], pairDeck[index]]; }
    $('still-pairs-status').textContent = ''; renderPairs();
  }
  function turnPair(index) {
    const card = pairDeck[index]; if (pairBusy || card.open || card.matched) return;
    card.open = true; pairOpen.push(index); renderPairs(); $('still-pairs-grid').children[index].focus();
    if (pairOpen.length < 2) return;
    const [first, second] = pairOpen;
    if (pairDeck[first].kind === pairDeck[second].kind) {
      pairDeck[first].matched = true; pairDeck[second].matched = true; pairOpen = []; renderPairs();
      if (pairDeck.every(item => item.matched)) $('still-pairs-status').textContent = 'Each little shape has found its partner.';
    } else {
      pairBusy = true; pairTimer = setTimeout(() => { pairDeck[first].open = false; pairDeck[second].open = false; pairOpen = []; pairBusy = false; pairTimer = null; renderPairs(); }, 1050);
    }
  }
  $('still-pairs-new').addEventListener('click', mixPairs);
  const starPoints = [[55, 63], [138, 104], [207, 46], [294, 93], [402, 50], [518, 88], [84, 218], [182, 181], [263, 245], [354, 195], [459, 236], [548, 176]];
  let selectedStar = null;
  function renderStarPaths() {
    const svg = $('still-stars-lines'); svg.replaceChildren();
    state.stillness.starPaths.forEach(([from, to]) => { const line = document.createElementNS('http://www.w3.org/2000/svg', 'line'); line.setAttribute('x1', starPoints[from][0]); line.setAttribute('y1', starPoints[from][1]); line.setAttribute('x2', starPoints[to][0]); line.setAttribute('y2', starPoints[to][1]); svg.append(line); });
    $('still-stars-field').querySelectorAll('.still-star').forEach((button, index) => { const chosen = index === selectedStar; button.classList.toggle('is-selected', chosen); button.setAttribute('aria-pressed', String(chosen)); });
  }
  starPoints.forEach(([x, y], index) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'still-star'; button.style.left = x / 6 + '%'; button.style.top = y / 3 + '%'; button.setAttribute('aria-label', 'Star ' + (index + 1)); button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      if (selectedStar === index) { selectedStar = null; $('still-stars-status').textContent = 'The line has lifted.'; }
      else if (selectedStar === null) { selectedStar = index; $('still-stars-status').textContent = 'Choose another star to draw a line.'; }
      else { state.stillness.starPaths.push([selectedStar, index]); state.stillness.starPaths = state.stillness.starPaths.slice(-120); selectedStar = index; save(); $('still-stars-status').textContent = 'A small path in the sky.'; }
      renderStarPaths();
    });
    $('still-stars-field').append(button);
  });
  $('still-stars-lift').addEventListener('click', () => { selectedStar = null; renderStarPaths(); $('still-stars-status').textContent = 'Begin anywhere.'; });
  $('still-stars-clear').addEventListener('click', () => { state.stillness.starPaths = []; selectedStar = null; save(); renderStarPaths(); $('still-stars-status').textContent = 'A clear sky again.'; });
  const stillActivities = ['sudoku', 'pairs', 'stars'];
  function showStillActivity(activity, focus = false) {
    stillActivities.forEach(name => { const active = name === activity, tab = $('still-tab-' + name); tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1; $('still-panel-' + name).hidden = !active; });
    if (focus) $('still-tab-' + activity).focus();
  }
  document.querySelectorAll('[data-still-activity]').forEach(tab => {
    tab.addEventListener('click', () => showStillActivity(tab.dataset.stillActivity));
    tab.addEventListener('keydown', event => { const current = stillActivities.indexOf(tab.dataset.stillActivity); const next = event.key === 'ArrowRight' ? (current + 1) % stillActivities.length : event.key === 'ArrowLeft' ? (current + stillActivities.length - 1) % stillActivities.length : event.key === 'Home' ? 0 : event.key === 'End' ? stillActivities.length - 1 : -1; if (next < 0) return; event.preventDefault(); showStillActivity(stillActivities[next], true); });
  });
  renderSudoku(); mixPairs(); renderStarPaths(); showStillActivity('sudoku');
  let stayMinutes = 0, stayElapsedMs = 0, stayStartedAt = 0, stayRunning = false, stayTicker = null, stayFinished = false;
  const stillMotionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  if (stillMotionPreference.matches) {
    $('stillness-scene').dataset.still = 'true'; $('motion-toggle').disabled = true;
    $('motion-toggle').textContent = 'Still by system preference'; $('motion-toggle').setAttribute('aria-pressed', 'true');
  }
  function stayTime(ms) {
    const seconds = Math.max(0, Math.floor(ms / 1000));
    return String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
  }
  function renderStayClock() {
    if (!stayRunning && !stayElapsedMs && !stayFinished) { $('stay-clock').textContent = stayMinutes ? stayTime(stayMinutes * 60000) : 'time is open'; return; }
    const elapsed = stayElapsedMs + (stayRunning ? Date.now() - stayStartedAt : 0);
    $('stay-clock').textContent = stayTime(stayMinutes ? stayMinutes * 60000 - elapsed : elapsed);
  }
  function stopStayTicker() { if (stayTicker !== null) { clearInterval(stayTicker); stayTicker = null; } }
  function pauseStay(leaving = false) {
    if (!stayRunning) return;
    stayElapsedMs += Date.now() - stayStartedAt; stayRunning = false; stopStayTicker(); renderStayClock();
    $('stay-start').textContent = 'Resume staying'; $('stay-status').textContent = leaving ? 'Paused while you wander elsewhere.' : 'Paused. You can return in your own time.';
  }
  function tickStay() {
    if (!stayRunning) return;
    const elapsed = stayElapsedMs + Date.now() - stayStartedAt;
    if (stayMinutes && elapsed >= stayMinutes * 60000) {
      stayElapsedMs = stayMinutes * 60000; stayRunning = false; stayFinished = true; stopStayTicker();
      $('stay-start').textContent = 'Begin again'; $('stay-status').textContent = 'Your time has settled. You may stay as long as you like.';
    }
    renderStayClock();
  }
  document.querySelectorAll('[data-stay]').forEach(button => button.addEventListener('click', () => {
    if (stayRunning) pauseStay();
    stayMinutes = Number(button.dataset.stay); stayElapsedMs = 0; stayFinished = false; stopStayTicker();
    document.querySelectorAll('[data-stay]').forEach(choice => { const chosen = choice === button; choice.classList.toggle('is-chosen', chosen); choice.setAttribute('aria-pressed', String(chosen)); });
    $('stay-start').textContent = 'Begin staying'; $('stay-end').hidden = true; $('stay-status').textContent = '';
    renderStayClock();
  }));
  $('stay-start').addEventListener('click', () => {
    if (stayRunning) { pauseStay(); return; }
    if (stayFinished) { stayElapsedMs = 0; stayFinished = false; }
    stayStartedAt = Date.now(); stayRunning = true; stopStayTicker(); stayTicker = setInterval(tickStay, 250);
    $('stay-start').textContent = 'Pause here'; $('stay-end').hidden = false; $('stay-status').textContent = 'A little room has opened.'; renderStayClock();
  });
  $('stay-end').addEventListener('click', () => {
    stayRunning = false; stayElapsedMs = 0; stayFinished = false; stopStayTicker();
    $('stay-start').textContent = 'Begin staying'; $('stay-end').hidden = true; $('stay-status').textContent = 'Rest here as long as you need.'; renderStayClock();
  });
  $('motion-toggle').addEventListener('click', () => {
    if ($('motion-toggle').disabled) return;
    const still = $('stillness-scene').dataset.still !== 'true'; $('stillness-scene').dataset.still = String(still);
    $('motion-toggle').textContent = still ? 'Allow slow motion' : 'Still scene'; $('motion-toggle').setAttribute('aria-pressed', String(still));
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && stayRunning) pauseStay(true); });
  renderStayClock();
  showView(); renderAll(); renderThoughts(); save();
  if (!storageAvailable) save();
})();

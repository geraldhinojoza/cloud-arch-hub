/**
 * FreeDiagram — Visual DB/ER Schema Designer
 * CloudArch Hub branding (Azure Solution Architect Expert)
 * app.js — main application logic
 */

'use strict';

/* ═══════════════════════ CONFIG ═══════════════════════ */

const DB_DIALECTS = {
  postgresql: {
    label: 'PostgreSQL',
    icon: '🐘',
    color: '#50a8f5',
    types: ['SERIAL','BIGSERIAL','INTEGER','BIGINT','SMALLINT','NUMERIC','DECIMAL','REAL',
            'DOUBLE PRECISION','BOOLEAN','TEXT','VARCHAR(255)','CHAR(36)','UUID',
            'DATE','TIMESTAMP','TIMESTAMPTZ','JSONB','JSON','BYTEA','INET','CIDR'],
    pkDef: t => `${t} SERIAL PRIMARY KEY`,
  },
  mysql: {
    label: 'MySQL / MariaDB',
    icon: '🐬',
    color: '#34d399',
    types: ['INT','BIGINT','SMALLINT','TINYINT','DECIMAL(10,2)','FLOAT','DOUBLE',
            'BOOLEAN','TINYINT(1)','VARCHAR(255)','TEXT','MEDIUMTEXT','LONGTEXT',
            'CHAR(36)','DATE','DATETIME','TIMESTAMP','JSON','BLOB','ENUM'],
    pkDef: t => `${t} INT AUTO_INCREMENT PRIMARY KEY`,
  },
  sqlserver: {
    label: 'SQL Server',
    icon: '🟦',
    color: '#818cf8',
    types: ['INT','BIGINT','SMALLINT','TINYINT','NUMERIC(18,2)','DECIMAL(18,2)',
            'FLOAT','REAL','BIT','NVARCHAR(255)','VARCHAR(255)','CHAR(36)',
            'NCHAR','TEXT','DATE','DATETIME','DATETIME2','UNIQUEIDENTIFIER','XML','VARBINARY'],
    pkDef: t => `${t} INT IDENTITY(1,1) PRIMARY KEY`,
  },
  oracle: {
    label: 'Oracle',
    icon: '🔴',
    color: '#fb923c',
    types: ['NUMBER','INTEGER','FLOAT','BINARY_FLOAT','BINARY_DOUBLE',
            'CHAR(36)','VARCHAR2(255)','NVARCHAR2(255)','CLOB','NCLOB',
            'DATE','TIMESTAMP','INTERVAL YEAR TO MONTH','RAW','BLOB','XMLTYPE'],
    pkDef: t => `${t} NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY`,
  },
  sqlite: {
    label: 'SQLite',
    icon: '🪶',
    color: '#94a3b8',
    types: ['INTEGER','REAL','TEXT','BLOB','NUMERIC','BOOLEAN','DATE','DATETIME'],
    pkDef: t => `${t} INTEGER PRIMARY KEY AUTOINCREMENT`,
  },
  mongodb: {
    label: 'MongoDB',
    icon: '🍃',
    color: '#34d399',
    types: ['ObjectId','String','Number','Boolean','Date','Array','Object',
            'BinData','Decimal128','Int32','Int64','Double','Null','Mixed'],
    pkDef: () => `_id: ObjectId`,
  },
  databricks: {
    label: 'Databricks (Delta)',
    icon: '⚡',
    color: '#fb923c',
    types: ['BIGINT','INT','SMALLINT','TINYINT','DECIMAL(18,2)','FLOAT',
            'DOUBLE','BOOLEAN','STRING','VARCHAR(255)','CHAR(36)',
            'DATE','TIMESTAMP','BINARY','ARRAY<STRING>','MAP<STRING,STRING>','STRUCT'],
    pkDef: t => `${t} BIGINT GENERATED ALWAYS AS IDENTITY`,
  },
  bigquery: {
    label: 'BigQuery',
    icon: '🔷',
    color: '#38bdf8',
    types: ['INT64','FLOAT64','NUMERIC','BIGNUMERIC','BOOL','STRING',
            'BYTES','DATE','DATETIME','TIMESTAMP','TIME','GEOGRAPHY','JSON',
            'ARRAY<STRING>','STRUCT'],
    pkDef: t => `${t} INT64`,
  },
  snowflake: {
    label: 'Snowflake',
    icon: '❄️',
    color: '#38bdf8',
    types: ['NUMBER','DECIMAL(18,2)','INT','BIGINT','FLOAT','DOUBLE',
            'BOOLEAN','VARCHAR(255)','TEXT','CHAR(36)','DATE',
            'TIMESTAMP_NTZ','TIMESTAMP_TZ','VARIANT','OBJECT','ARRAY'],
    pkDef: t => `${t} NUMBER AUTOINCREMENT PRIMARY KEY`,
  },
  redshift: {
    label: 'Amazon Redshift',
    icon: '🌊',
    color: '#f87171',
    types: ['INTEGER','BIGINT','SMALLINT','DECIMAL(18,2)','REAL',
            'DOUBLE PRECISION','BOOLEAN','VARCHAR(255)','CHAR(36)',
            'DATE','TIMESTAMP','TIMESTAMPTZ'],
    pkDef: t => `${t} INTEGER IDENTITY(1,1) PRIMARY KEY`,
  },
  ansi: {
    label: 'Generic / ANSI SQL',
    icon: '📄',
    color: '#94a3b8',
    types: ['INTEGER','BIGINT','SMALLINT','NUMERIC','DECIMAL','FLOAT','REAL',
            'BOOLEAN','CHARACTER VARYING(255)','CHARACTER(36)','TEXT',
            'DATE','TIMESTAMP','INTERVAL','BINARY','BLOB'],
    pkDef: t => `${t} INTEGER PRIMARY KEY`,
  },
};

/* ═══════════════════════ STATE ═══════════════════════ */

const state = {
  tables: [],
  rels: [],
  nextId: 1,
  scale: 1,
  panX: 32,
  panY: 32,
  selected: null,      // table id
  fkMode: false,
  fkDrawing: false,
  fkFrom: null,        // {tableId, colId}
  fkCursorX: 0,
  fkCursorY: 0,
  db: 'postgresql',
};

let _dirty = false;  // unsaved flag

/* ═══════════════════════ HELPERS ═══════════════════════ */

function uid()   { return 'T' + (state.nextId++); }
function colId() { return 'C' + Math.random().toString(36).slice(2,8); }
function relId() { return 'R' + Math.random().toString(36).slice(2,8); }

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function defaultCols() {
  const types = DB_DIALECTS[state.db].types;
  return [
    { id: colId(), name: 'id',         type: types[0], pk: true,  notNull: true,  unique: false, fk: null },
    { id: colId(), name: 'created_at', type: types[13] || types[0], pk: false, notNull: false, unique: false, fk: null },
  ];
}

/* ═══════════════════════ DOM REFS ═══════════════════════ */

const $  = id => document.getElementById(id);
const canvasWrap  = $('canvas-wrap');
const canvasEl    = $('canvas');
const svgLines    = $('svg-lines');
const fkCursorSvg = $('fk-cursor-svg');
const sidebarTbls = $('sidebar-tables');
const panelScroll = $('panel-scroll');
const sbMode      = $('sb-mode');
const sbTables    = $('sb-tables');
const sbRels      = $('sb-rels');
const sbZoom      = $('sb-zoom');
const toastEl     = $('toast');
const dbSelect    = $('db-select');
const ctxMenu     = $('ctx-menu');

/* ═══════════════════════ TRANSFORM ═══════════════════════ */

function applyTransform() {
  const t = `translate(${state.panX}px, ${state.panY}px) scale(${state.scale})`;
  canvasEl.style.transform  = t;
  svgLines.style.transform  = t;
  $('zoom-label').textContent = Math.round(state.scale * 100) + '%';
  sbZoom.textContent = Math.round(state.scale * 100) + '%';
}

/* ═══════════════════════ TOAST ═══════════════════════ */

let _toastTimer = null;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

/* ═══════════════════════ TABLE MANAGEMENT ═══════════════════════ */

function addTable(x, y, name) {
  const t = {
    id: uid(),
    name: name || `table_${state.tables.length + 1}`,
    x: Math.round(x),
    y: Math.round(y),
    cols: defaultCols(),
    comment: '',
  };
  state.tables.push(t);
  _dirty = true;
  render();
  selectTable(t.id);
  return t;
}

function deleteTable(id) {
  state.tables = state.tables.filter(t => t.id !== id);
  state.rels   = state.rels.filter(r => r.fromT !== id && r.toT !== id);
  if (state.selected === id) state.selected = null;
  _dirty = true;
  render();
}

function selectTable(id) {
  state.selected = id;
  canvasEl.querySelectorAll('.db-table').forEach(el => {
    el.classList.toggle('selected', el.dataset.id === id);
  });
  renderSidebar();
  renderPanel();
}

/* ═══════════════════════ RENDER TABLES ═══════════════════════ */

function renderTables() {
  const existing = {};
  canvasEl.querySelectorAll('.db-table').forEach(el => {
    existing[el.dataset.id] = el;
  });

  const keep = {};
  state.tables.forEach(t => {
    keep[t.id] = true;
    let el = existing[t.id];
    if (!el) {
      el = document.createElement('div');
      el.className = 'db-table';
      el.dataset.id = t.id;
      canvasEl.appendChild(el);
      makeDraggable(el, t);
    }

    el.style.left = t.x + 'px';
    el.style.top  = t.y + 'px';
    el.classList.toggle('selected', state.selected === t.id);

    const dial = DB_DIALECTS[state.db];
    const hc   = dial.color;

    // Build inner HTML
    let html = `
      <div class="table-header" data-drag="${t.id}">
        <span class="th-icon">${dial.icon}</span>
        <span class="th-name" style="color:${hc}">${escHtml(t.name)}</span>
        <div class="th-actions">
          <button class="th-btn" data-action="rename" data-tid="${t.id}" title="Rename">✎</button>
          <button class="th-btn del" data-action="delete" data-tid="${t.id}" title="Delete">×</button>
        </div>
      </div>`;

    t.cols.forEach(c => {
      html += `
        <div class="col-row" data-tid="${t.id}" data-cid="${c.id}">
          ${c.pk  ? `<span class="col-badge badge-pk">PK</span>` : ''}
          ${c.fk  ? `<span class="col-badge badge-fk">FK</span>` : ''}
          ${c.notNull && !c.pk ? `<span class="col-badge badge-nn">NN</span>` : ''}
          ${c.unique ? `<span class="col-badge badge-uq">UQ</span>` : ''}
          <span class="col-name">${escHtml(c.name)}</span>
          <span class="col-type">${escHtml(c.type)}</span>
          <span class="col-port" data-port="right" data-tid="${t.id}" data-cid="${c.id}"></span>
          <span class="col-port col-port-left" data-port="left" data-tid="${t.id}" data-cid="${c.id}"></span>
        </div>`;
    });

    html += `
      <div class="add-col-row" data-action="addcol" data-tid="${t.id}">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        add column
      </div>`;

    el.innerHTML = html;

    // Events
    el.querySelector('.table-header').addEventListener('mousedown', e => startDrag(e, t));
    el.querySelectorAll('[data-action="delete"]').forEach(b =>
      b.addEventListener('click', e => { e.stopPropagation(); deleteTable(b.dataset.tid); }));
    el.querySelectorAll('[data-action="rename"]').forEach(b =>
      b.addEventListener('click', e => { e.stopPropagation(); inlineRename(t); }));
    el.querySelectorAll('[data-action="addcol"]').forEach(b =>
      b.addEventListener('click', e => { e.stopPropagation(); addColumn(t); }));
    el.querySelectorAll('.col-port').forEach(port =>
      port.addEventListener('mousedown', e => { e.stopPropagation(); startFkDraw(e, t.id, port.dataset.cid); }));
    el.addEventListener('click', e => {
      if (!e.target.closest('[data-action]') && !e.target.closest('.col-port')) {
        selectTable(t.id);
      }
    });
  });

  // Remove stale elements
  Object.keys(existing).forEach(id => {
    if (!keep[id]) existing[id].remove();
  });
}

function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function addColumn(t) {
  const types = DB_DIALECTS[state.db].types;
  t.cols.push({
    id: colId(), name: `col_${t.cols.length + 1}`,
    type: types[10] || types[0],
    pk: false, notNull: false, unique: false, fk: null,
  });
  _dirty = true;
  render();
}

function inlineRename(t) {
  const el = canvasEl.querySelector(`[data-id="${t.id}"] .th-name`);
  if (!el) return;
  const old = t.name;
  el.contentEditable = 'true';
  el.focus();
  document.execCommand('selectAll', false, null);
  const finish = () => {
    el.contentEditable = 'false';
    t.name = el.textContent.trim() || old;
    _dirty = true;
    render();
  };
  el.addEventListener('blur', finish, { once: true });
  el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } }, { once: true });
}

/* ═══════════════════════ DRAG TABLE ═══════════════════════ */

let _drag = null;
function startDrag(e, t) {
  if (e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();

  const rect = canvasWrap.getBoundingClientRect();
  _drag = {
    t,
    ox: (e.clientX - rect.left - state.panX) / state.scale - t.x,
    oy: (e.clientY - rect.top  - state.panY) / state.scale - t.y,
  };
  selectTable(t.id);
  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup', onDragUp, { once: true });
}

function onDragMove(e) {
  if (!_drag) return;
  const rect = canvasWrap.getBoundingClientRect();
  _drag.t.x = Math.round(((e.clientX - rect.left - state.panX) / state.scale - _drag.ox) / 8) * 8;
  _drag.t.y = Math.round(((e.clientY - rect.top  - state.panY) / state.scale - _drag.oy) / 8) * 8;
  const el = canvasEl.querySelector(`[data-id="${_drag.t.id}"]`);
  if (el) { el.style.left = _drag.t.x + 'px'; el.style.top = _drag.t.y + 'px'; }
  renderLines();
}

function onDragUp() {
  _dirty = true;
  _drag = null;
  document.removeEventListener('mousemove', onDragMove);
}

/* ═══════════════════════ PAN / ZOOM ═══════════════════════ */

let _pan = false, _panSX = 0, _panSY = 0, _panOX = 0, _panOY = 0;

canvasWrap.addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  if (e.target !== canvasWrap && e.target !== canvasEl && e.target !== svgLines) return;
  _pan = true;
  _panSX = e.clientX; _panSY = e.clientY;
  _panOX = state.panX; _panOY = state.panY;
  canvasWrap.style.cursor = 'grabbing';
  document.addEventListener('mousemove', onPanMove);
  document.addEventListener('mouseup', onPanUp, { once: true });
});

function onPanMove(e) {
  if (!_pan) return;
  state.panX = _panOX + (e.clientX - _panSX);
  state.panY = _panOY + (e.clientY - _panSY);
  applyTransform();
  renderLines();
}

function onPanUp() {
  _pan = false;
  canvasWrap.style.cursor = '';
  document.removeEventListener('mousemove', onPanMove);
}

canvasWrap.addEventListener('wheel', e => {
  e.preventDefault();
  const factor = e.deltaY > 0 ? 0.9 : 1.1;
  const rect   = canvasWrap.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  state.panX = mx - (mx - state.panX) * factor;
  state.panY = my - (my - state.panY) * factor;
  state.scale = clamp(state.scale * factor, 0.15, 3);
  applyTransform();
  renderLines();
}, { passive: false });

/* Zoom buttons */
$('btn-zoom-out').addEventListener('click', () => { state.scale = clamp(state.scale - 0.1, 0.15, 3); applyTransform(); renderLines(); });
$('btn-zoom-in').addEventListener('click',  () => { state.scale = clamp(state.scale + 0.1, 0.15, 3); applyTransform(); renderLines(); });
$('btn-zoom-fit').addEventListener('click', zoomFit);

function zoomFit() {
  if (!state.tables.length) return;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  state.tables.forEach(t => {
    const el = canvasEl.querySelector(`[data-id="${t.id}"]`);
    const w  = el ? el.offsetWidth  : 200;
    const h  = el ? el.offsetHeight : 120;
    minX = Math.min(minX, t.x);     minY = Math.min(minY, t.y);
    maxX = Math.max(maxX, t.x + w); maxY = Math.max(maxY, t.y + h);
  });
  const pad = 60;
  const sw  = canvasWrap.offsetWidth  - pad * 2;
  const sh  = canvasWrap.offsetHeight - pad * 2;
  const sc  = clamp(Math.min(sw / (maxX - minX), sh / (maxY - minY)), 0.2, 1.2);
  state.scale = sc;
  state.panX  = pad - minX * sc;
  state.panY  = pad - minY * sc;
  applyTransform();
  renderLines();
}

/* ═══════════════════════ FK LINES ═══════════════════════ */

function getPortPos(tableId, colId, side) {
  const t  = state.tables.find(x => x.id === tableId);
  if (!t) return { x: 0, y: 0 };
  const el = canvasEl.querySelector(`[data-id="${tableId}"]`);
  if (!el) return { x: t.x, y: t.y };

  const headerH = el.querySelector('.table-header') ? el.querySelector('.table-header').offsetHeight : 36;
  const rows    = el.querySelectorAll('.col-row');
  const idx     = t.cols.findIndex(c => c.id === colId);
  const rowH    = rows.length ? rows[0].offsetHeight : 26;
  const y = t.y + headerH + (idx < 0 ? 0 : idx) * rowH + rowH / 2;
  return { x: side === 'right' ? t.x + el.offsetWidth : t.x, y };
}

function renderLines() {
  svgLines.innerHTML = '';

  // defs
  const defs = makeSvgEl('defs');
  const mk   = makeSvgEl('marker');
  mk.setAttribute('id', 'arrowhead');
  mk.setAttribute('markerWidth', '8');
  mk.setAttribute('markerHeight', '8');
  mk.setAttribute('refX', '7');
  mk.setAttribute('refY', '3');
  mk.setAttribute('orient', 'auto');
  const poly = makeSvgEl('polygon');
  poly.setAttribute('points', '0 0, 7 3, 0 6');
  poly.setAttribute('fill', '#38bdf8');
  mk.appendChild(poly); defs.appendChild(mk); svgLines.appendChild(defs);

  // one-end marker (crow's foot – many)
  const mkM = makeSvgEl('marker');
  mkM.setAttribute('id', 'many');
  mkM.setAttribute('markerWidth', '10'); mkM.setAttribute('markerHeight', '10');
  mkM.setAttribute('refX', '5'); mkM.setAttribute('refY', '5');
  mkM.setAttribute('orient', 'auto');
  const lm1 = makeSvgEl('line'); lm1.setAttribute('x1','0'); lm1.setAttribute('y1','0'); lm1.setAttribute('x2','0'); lm1.setAttribute('y2','10'); lm1.setAttribute('stroke','#38bdf8'); lm1.setAttribute('stroke-width','1.5');
  const lm2 = makeSvgEl('line'); lm2.setAttribute('x1','0'); lm2.setAttribute('y1','5'); lm2.setAttribute('x2','8'); lm2.setAttribute('y2','0'); lm2.setAttribute('stroke','#38bdf8'); lm2.setAttribute('stroke-width','1.5');
  const lm3 = makeSvgEl('line'); lm3.setAttribute('x1','0'); lm3.setAttribute('y1','5'); lm3.setAttribute('x2','8'); lm3.setAttribute('y2','10'); lm3.setAttribute('stroke','#38bdf8'); lm3.setAttribute('stroke-width','1.5');
  mkM.appendChild(lm1); mkM.appendChild(lm2); mkM.appendChild(lm3);
  defs.appendChild(mkM);

  state.rels.forEach(r => {
    const fp = getPortPos(r.fromT, r.fromC, 'right');
    const tp = getPortPos(r.toT,   r.toC,   'left');
    const dx = Math.abs(tp.x - fp.x) * 0.5;

    const path = makeSvgEl('path');
    path.setAttribute('d', `M${fp.x},${fp.y} C${fp.x + dx},${fp.y} ${tp.x - dx},${tp.y} ${tp.x},${tp.y}`);
    path.setAttribute('stroke', '#38bdf8');
    path.setAttribute('stroke-width', '1.5');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-opacity', '0.7');
    path.setAttribute('marker-end', 'url(#arrowhead)');
    path.dataset.rel = r.id;
    path.style.cursor = 'pointer';
    path.title = `${r.card} — click to delete`;
    path.addEventListener('click', () => {
      if (confirm('Remove this relationship?')) {
        state.rels = state.rels.filter(x => x.id !== r.id);
        _dirty = true; render();
      }
    });
    svgLines.appendChild(path);

    // Label
    const mx = (fp.x + tp.x) / 2;
    const my = (fp.y + tp.y) / 2 - 6;
    const bg = makeSvgEl('rect');
    bg.setAttribute('x', mx - 14); bg.setAttribute('y', my - 11);
    bg.setAttribute('width', '28'); bg.setAttribute('height', '14');
    bg.setAttribute('rx', '4'); bg.setAttribute('fill', 'rgba(30,41,59,0.9)');
    bg.setAttribute('stroke', 'rgba(56,189,248,0.25)'); bg.setAttribute('stroke-width', '0.5');
    svgLines.appendChild(bg);

    const txt = makeSvgEl('text');
    txt.setAttribute('x', mx); txt.setAttribute('y', my);
    txt.setAttribute('font-size', '10'); txt.setAttribute('text-anchor', 'middle');
    txt.setAttribute('fill', '#38bdf8'); txt.setAttribute('font-family', 'Fira Code, monospace');
    txt.setAttribute('dominant-baseline', 'middle');
    txt.textContent = r.card || 'N:1';
    svgLines.appendChild(txt);
  });
}

function makeSvgEl(tag) {
  return document.createElementNS('http://www.w3.org/2000/svg', tag);
}

/* ═══════════════════════ FK DRAW MODE ═══════════════════════ */

$('btn-fk-mode').addEventListener('click', toggleFkMode);

function toggleFkMode() {
  state.fkMode = !state.fkMode;
  document.body.classList.toggle('fk-mode', state.fkMode);
  $('btn-fk-mode').classList.toggle('active', state.fkMode);
  $('btn-fk-mode').textContent = state.fkMode ? '🔗 FK: ON' : '🔗 FK link';
  sbMode.textContent = state.fkMode ? 'FK draw mode' : 'select';
}

function startFkDraw(e, tableId, cId) {
  if (!state.fkMode) return;
  e.preventDefault();
  state.fkDrawing = true;
  state.fkFrom = { tableId, colId: cId };

  const rect = canvasWrap.getBoundingClientRect();
  const pt   = getPortPos(tableId, cId, 'right');
  state.fkCursorX = pt.x;
  state.fkCursorY = pt.y;

  document.addEventListener('mousemove', onFkMove);
  document.addEventListener('mouseup', onFkUp, { once: true });
}

function onFkMove(e) {
  if (!state.fkDrawing) return;
  const rect = canvasWrap.getBoundingClientRect();
  state.fkCursorX = (e.clientX - rect.left - state.panX) / state.scale;
  state.fkCursorY = (e.clientY - rect.top  - state.panY) / state.scale;
  renderFkCursor();

  // Highlight target table
  canvasEl.querySelectorAll('.db-table').forEach(el => {
    el.classList.remove('fk-target-hover');
  });
  const hit = hitTestTable(state.fkCursorX, state.fkCursorY);
  if (hit && hit !== state.fkFrom.tableId) {
    const el = canvasEl.querySelector(`[data-id="${hit}"]`);
    if (el) el.classList.add('fk-target-hover');
  }
}

function renderFkCursor() {
  fkCursorSvg.innerHTML = '';
  if (!state.fkDrawing || !state.fkFrom) return;
  const fp = getPortPos(state.fkFrom.tableId, state.fkFrom.colId, 'right');
  const dx = Math.abs(state.fkCursorX - fp.x) * 0.5;
  const path = makeSvgEl('path');
  path.setAttribute('d', `M${fp.x},${fp.y} C${fp.x + dx},${fp.y} ${state.fkCursorX - dx},${state.fkCursorY} ${state.fkCursorX},${state.fkCursorY}`);
  path.setAttribute('stroke', '#38bdf8');
  path.setAttribute('stroke-width', '1.5');
  path.setAttribute('stroke-dasharray', '5 3');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke-opacity', '0.8');
  fkCursorSvg.appendChild(path);
}

function onFkUp(e) {
  document.removeEventListener('mousemove', onFkMove);
  fkCursorSvg.innerHTML = '';
  canvasEl.querySelectorAll('.fk-target-hover').forEach(el => el.classList.remove('fk-target-hover'));

  if (!state.fkDrawing) return;
  state.fkDrawing = false;

  const rect   = canvasWrap.getBoundingClientRect();
  const cx = (e.clientX - rect.left - state.panX) / state.scale;
  const cy = (e.clientY - rect.top  - state.panY) / state.scale;
  const targetId = hitTestTable(cx, cy);

  if (targetId && targetId !== state.fkFrom.tableId) {
    const targetTable = state.tables.find(t => t.id === targetId);
    if (targetTable) {
      const pkCol = targetTable.cols.find(c => c.pk) || targetTable.cols[0];
      if (pkCol) {
        // avoid duplicate
        const dup = state.rels.find(r =>
          r.fromT === state.fkFrom.tableId &&
          r.fromC === state.fkFrom.colId   &&
          r.toT   === targetId
        );
        if (!dup) {
          state.rels.push({
            id: relId(),
            fromT: state.fkFrom.tableId,
            fromC: state.fkFrom.colId,
            toT:   targetId,
            toC:   pkCol.id,
            card:  'N:1',
          });
          // Auto-mark source col as FK
          const srcTable = state.tables.find(t => t.id === state.fkFrom.tableId);
          const srcCol   = srcTable && srcTable.cols.find(c => c.id === state.fkFrom.colId);
          if (srcCol) srcCol.fk = { table: targetTable.name, col: pkCol.name };
          _dirty = true;
          render();
          toast(`Relationship created → ${targetTable.name}`);
        }
      }
    }
  }
  state.fkFrom = null;
}

function hitTestTable(x, y) {
  for (const t of state.tables) {
    const el = canvasEl.querySelector(`[data-id="${t.id}"]`);
    if (!el) continue;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    if (x >= t.x && x <= t.x + w && y >= t.y && y <= t.y + h) return t.id;
  }
  return null;
}

/* ═══════════════════════ SIDEBAR ═══════════════════════ */

function renderSidebar() {
  if (!state.tables.length) {
    sidebarTbls.innerHTML = '<div class="sidebar-empty">No tables yet</div>';
    sbTables.textContent = '0';
    sbRels.textContent   = '0';
    return;
  }
  sidebarTbls.innerHTML = state.tables.map(t =>
    `<div class="sidebar-item ${state.selected === t.id ? 'selected' : ''}" data-sid="${t.id}">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:13px;height:13px">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M3 10h18M3 14h18M9 4v16M15 4v16M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"/>
      </svg>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(t.name)}</span>
      <span style="font-size:10px;color:var(--text-dim)">${t.cols.length}</span>
    </div>`
  ).join('');
  sidebarTbls.querySelectorAll('[data-sid]').forEach(el => {
    el.addEventListener('click', () => {
      selectTable(el.dataset.sid);
      scrollToTable(el.dataset.sid);
    });
  });
  sbTables.textContent = state.tables.length;
  sbRels.textContent   = state.rels.length;
}

function scrollToTable(id) {
  const t  = state.tables.find(x => x.id === id);
  if (!t) return;
  const el = canvasEl.querySelector(`[data-id="${id}"]`);
  const w  = el ? el.offsetWidth  : 200;
  const h  = el ? el.offsetHeight : 120;
  state.panX = canvasWrap.offsetWidth  / 2 - (t.x + w / 2) * state.scale;
  state.panY = canvasWrap.offsetHeight / 2 - (t.y + h / 2) * state.scale;
  applyTransform();
  renderLines();
}

/* ═══════════════════════ PANEL ═══════════════════════ */

function renderPanel() {
  const t = state.tables.find(x => x.id === state.selected);
  if (!t) {
    panelScroll.innerHTML = `
      <div style="padding:16px;font-size:12px;color:var(--text-dim)">
        Select a table on the canvas to edit its properties.
      </div>`;
    return;
  }
  const types = DB_DIALECTS[state.db].types;

  const colRows = t.cols.map(c => `
    <div class="col-edit-row" data-cid="${c.id}">
      <input class="col-edit-name" value="${escHtml(c.name)}" placeholder="column name" data-cid="${c.id}" data-field="name">
      <select class="col-edit-type" data-cid="${c.id}" data-field="type">
        ${types.map(tp => `<option ${tp === c.type ? 'selected' : ''}>${escHtml(tp)}</option>`).join('')}
      </select>
      <button class="col-edit-del" data-delcol="${c.id}" title="Delete column">×</button>
    </div>
    <div class="flag-row" style="padding:0 0 6px 0">
      <button class="flag-btn ${c.pk ? 'active-pk' : ''}" data-flag="pk" data-cid="${c.id}">PK</button>
      <button class="flag-btn ${c.fk ? 'active-fk' : ''}" data-flag="fk" data-cid="${c.id}">FK</button>
      <button class="flag-btn ${c.notNull ? 'active-nn' : ''}" data-flag="nn" data-cid="${c.id}">NN</button>
      <button class="flag-btn ${c.unique  ? 'active-uq' : ''}" data-flag="uq" data-cid="${c.id}">UQ</button>
    </div>
  `).join('');

  const relRows = state.rels.filter(r => r.fromT === t.id).map(r => {
    const tt = state.tables.find(x => x.id === r.toT);
    return `<div class="rel-item">
      <span>→ ${escHtml(tt ? tt.name : '?')} <span style="color:var(--text-dim)">(${r.card})</span></span>
      <span class="rel-del" data-delrel="${r.id}">×</span>
    </div>`;
  }).join('');

  panelScroll.innerHTML = `
    <div class="panel-section">
      <div class="panel-title">Table</div>
      <div class="panel-field">
        <label class="panel-label">Name</label>
        <input class="panel-input" id="p-tname" value="${escHtml(t.name)}">
      </div>
      <div class="panel-field">
        <label class="panel-label">Comment</label>
        <textarea class="panel-textarea" id="p-tcomment" placeholder="Optional description...">${escHtml(t.comment || '')}</textarea>
      </div>
    </div>
    <div class="panel-section">
      <div class="panel-title">Columns (${t.cols.length})</div>
      ${colRows}
      <button class="panel-add-btn" id="p-addcol">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        Add column
      </button>
    </div>
    <div class="panel-section">
      <div class="panel-title">Relationships</div>
      ${relRows || '<div class="panel-empty">No FK relationships yet</div>'}
    </div>`;

  // Bind events
  const nameInput = $('p-tname');
  nameInput.addEventListener('input', () => { t.name = nameInput.value; _dirty = true; renderTables(); renderSidebar(); });

  const commentInput = $('p-tcomment');
  commentInput.addEventListener('input', () => { t.comment = commentInput.value; _dirty = true; });

  panelScroll.querySelectorAll('.col-edit-name').forEach(inp => {
    inp.addEventListener('input', e => {
      const col = t.cols.find(c => c.id === inp.dataset.cid);
      if (col) { col.name = inp.value; _dirty = true; renderTables(); renderLines(); }
    });
  });

  panelScroll.querySelectorAll('.col-edit-type').forEach(sel => {
    sel.addEventListener('change', e => {
      const col = t.cols.find(c => c.id === sel.dataset.cid);
      if (col) { col.type = sel.value; _dirty = true; renderTables(); }
    });
  });

  panelScroll.querySelectorAll('[data-delcol]').forEach(btn => {
    btn.addEventListener('click', () => {
      t.cols = t.cols.filter(c => c.id !== btn.dataset.delcol);
      state.rels = state.rels.filter(r => !(r.fromT === t.id && r.fromC === btn.dataset.delcol));
      _dirty = true; render();
    });
  });

  panelScroll.querySelectorAll('.flag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const col  = t.cols.find(c => c.id === btn.dataset.cid);
      const flag = btn.dataset.flag;
      if (!col) return;
      if (flag === 'pk') col.pk     = !col.pk;
      if (flag === 'fk') col.fk     = col.fk ? null : { table: '', col: '' };
      if (flag === 'nn') col.notNull = !col.notNull;
      if (flag === 'uq') col.unique  = !col.unique;
      _dirty = true; render();
    });
  });

  panelScroll.querySelectorAll('[data-delrel]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.rels = state.rels.filter(r => r.id !== btn.dataset.delrel);
      _dirty = true; render();
    });
  });

  const addColBtn = $('p-addcol');
  if (addColBtn) addColBtn.addEventListener('click', () => addColumn(t));
}

/* ═══════════════════════ SQL EXPORT ═══════════════════════ */

function generateSQL() {
  const d   = state.db;
  const dial = DB_DIALECTS[d];

  if (d === 'mongodb') {
    return state.tables.map(t => {
      const lines = t.cols.map(c => {
        const req  = c.notNull  ? ', required: true'  : '';
        const uniq = c.unique   ? ', unique: true'     : '';
        return `    ${c.name}: { type: "${c.type}"${req}${uniq} }`;
      }).join(',\n');
      const comment = t.comment ? `  // ${t.comment}\n` : '';
      return `${comment}const ${t.name}Schema = new Schema({\n${lines}\n});\n`;
    }).join('\n');
  }

  const lines = [];

  // Header comment
  lines.push(`-- ${dial.label} DDL — generated by FreeDiagram`);
  lines.push(`-- CloudArch Hub | Azure Solution Architect Expert`);
  lines.push(`-- Tables: ${state.tables.length}  |  Relationships: ${state.rels.length}`);
  lines.push('');

  if (d === 'mysql')      lines.push('SET FOREIGN_KEY_CHECKS = 0;\n');
  if (d === 'sqlserver')  lines.push('BEGIN TRANSACTION;\n');

  state.tables.forEach(t => {
    if (t.comment) lines.push(`-- ${t.comment}`);
    const tName = (d === 'oracle' || d === 'bigquery') ? `"${t.name}"` : t.name;

    lines.push(`CREATE TABLE ${tName} (`);

    const colDefs = t.cols.map(c => {
      if (c.pk) return `  ${dial.pkDef(c.name)}`;
      let def = `  ${c.name} ${c.type}`;
      if (c.notNull) def += ' NOT NULL';
      if (c.unique)  def += ' UNIQUE';
      return def;
    });

    // Inline FK constraints (except Databricks/BigQuery which don't enforce)
    const fkDefs = state.rels
      .filter(r => r.fromT === t.id && d !== 'databricks' && d !== 'bigquery' && d !== 'snowflake' && d !== 'redshift')
      .map(r => {
        const tt  = state.tables.find(x => x.id === r.toT);
        const tc  = tt && tt.cols.find(c => c.id === r.toC);
        const fc  = t.cols.find(c => c.id === r.fromC);
        if (!tt || !tc || !fc) return null;
        const ttName = (d === 'oracle' || d === 'bigquery') ? `"${tt.name}"` : tt.name;
        return `  CONSTRAINT fk_${t.name}_${fc.name} FOREIGN KEY (${fc.name}) REFERENCES ${ttName}(${tc.name})`;
      })
      .filter(Boolean);

    lines.push([...colDefs, ...fkDefs].join(',\n'));

    if (d === 'databricks') lines.push(') USING DELTA;\n');
    else                    lines.push(');\n');
  });

  if (d === 'mysql')     lines.push('\nSET FOREIGN_KEY_CHECKS = 1;');
  if (d === 'sqlserver') lines.push('\nCOMMIT;');

  return lines.join('\n');
}

/* ═══════════════════════ IMPORT SQL ═══════════════════════ */

function importSQL(sql) {
  const tableReg = /CREATE\s+TABLE\s+[`"[]?(\w+)[`"\]]?\s*\(([^;]+?)\)\s*(?:USING\s+\w+\s*)?;/gi;
  let m;
  const newTables = [];
  let xi = 80, yi = 80;

  while ((m = tableReg.exec(sql)) !== null) {
    const tname = m[1];
    const body  = m[2];
    const colReg = /^\s*[`"[]?(\w+)[`"\]]?\s+([\w()\s,]+?)(?:NOT\s+NULL|NULL|PRIMARY\s+KEY|UNIQUE|AUTO_INCREMENT|SERIAL|AUTOINCREMENT|IDENTITY[^,]*|GENERATED[^,]*)*[,\s]*$/gim;
    const cols = [];
    let cm;

    while ((cm = colReg.exec(body)) !== null) {
      const n = cm[1].toUpperCase();
      if (['PRIMARY','FOREIGN','INDEX','KEY','UNIQUE','CONSTRAINT','CHECK'].includes(n)) continue;
      const rawType = cm[2].trim().replace(/\s+/g, ' ');
      const type    = rawType.split(/\s+/)[0];
      const rest    = (cm[0]).toUpperCase();
      cols.push({
        id: colId(),
        name: cm[1],
        type: type,
        pk:      rest.includes('PRIMARY KEY') || cm[1].toLowerCase() === 'id',
        notNull: rest.includes('NOT NULL') || rest.includes('PRIMARY KEY'),
        unique:  rest.includes('UNIQUE'),
        fk: null,
      });
    }

    if (!cols.length) continue;
    newTables.push({ id: uid(), name: tname, x: xi, y: yi, cols, comment: '' });
    xi += 240; if (xi > 1100) { xi = 80; yi += 200; }
  }

  if (newTables.length) {
    state.tables.push(...newTables);
    _dirty = true;
    render();
    toast(`Imported ${newTables.length} table(s)`);
  } else {
    toast('No CREATE TABLE statements found');
  }
}

/* ═══════════════════════ MODAL ═══════════════════════ */

function openModal(title, content, options = {}) {
  $('modal-title').textContent = title;
  $('modal-ta').value = content;
  $('modal-ta').readOnly = options.readOnly || false;
  $('modal-overlay').classList.add('show');
  $('modal-action-btn').textContent = options.actionLabel || 'Copy';
  $('modal-action-btn').onclick = options.action || (() => {
    navigator.clipboard.writeText($('modal-ta').value).catch(() => {});
    $('modal-action-btn').textContent = 'Copied!';
    setTimeout(() => ($('modal-action-btn').textContent = 'Copy'), 1600);
  });
}

$('modal-close-btn').addEventListener('click', () => $('modal-overlay').classList.remove('show'));
$('modal-overlay').addEventListener('click', e => { if (e.target === $('modal-overlay')) $('modal-overlay').classList.remove('show'); });

/* ═══════════════════════ TOOLBAR ACTIONS ═══════════════════════ */

$('btn-add-table').addEventListener('click', () => {
  const cx = (canvasWrap.offsetWidth  / 2 - state.panX) / state.scale;
  const cy = (canvasWrap.offsetHeight / 2 - state.panY) / state.scale;
  addTable(Math.max(20, cx - 100), Math.max(20, cy - 60));
});

$('btn-export').addEventListener('click', () => {
  openModal(`Export — ${DB_DIALECTS[state.db].label}`, generateSQL());
});

$('btn-import').addEventListener('click', () => {
  openModal('Import SQL / DDL', '-- Paste CREATE TABLE statements here\n', {
    actionLabel: 'Import',
    action: () => {
      importSQL($('modal-ta').value);
      $('modal-overlay').classList.remove('show');
    },
  });
});

$('btn-clear').addEventListener('click', () => {
  if (confirm('Clear all tables and relationships?')) {
    state.tables = []; state.rels = []; state.selected = null; _dirty = false;
    render();
    toast('Canvas cleared');
  }
});

dbSelect.addEventListener('change', () => {
  state.db = dbSelect.value;
  render();
});

/* ═══════════════════════ SAVE / LOAD ═══════════════════════ */

function saveToLocalStorage() {
  try {
    const data = { tables: state.tables, rels: state.rels, nextId: state.nextId, db: state.db };
    localStorage.setItem('freediagram_state', JSON.stringify(data));
    _dirty = false;
    toast('Saved to browser storage');
  } catch (err) {
    toast('Save failed: ' + err.message);
  }
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem('freediagram_state');
    if (!raw) return false;
    const data = JSON.parse(raw);
    state.tables  = data.tables  || [];
    state.rels    = data.rels    || [];
    state.nextId  = data.nextId  || 1;
    state.db      = data.db      || 'postgresql';
    dbSelect.value = state.db;
    return true;
  } catch (err) {
    return false;
  }
}

$('btn-save').addEventListener('click', saveToLocalStorage);

$('btn-load').addEventListener('click', () => {
  if (loadFromLocalStorage()) {
    render();
    zoomFit();
    toast('Diagram loaded from browser storage');
  } else {
    toast('No saved diagram found');
  }
});

/* ── JSON Export ── */
$('btn-json').addEventListener('click', () => {
  const data = { tables: state.tables, rels: state.rels, db: state.db };
  openModal('Export JSON', JSON.stringify(data, null, 2));
});

/* ── Keyboard shortcuts ── */
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 's') { e.preventDefault(); saveToLocalStorage(); }
    if (e.key === 'z') { /* undo placeholder */ }
  }
  if (e.key === 'Escape') {
    $('modal-overlay').classList.remove('show');
    ctxMenu.style.display = 'none';
    if (state.fkMode) toggleFkMode();
  }
  if (e.key === 'Delete' && state.selected && document.activeElement === document.body) {
    if (confirm('Delete selected table?')) deleteTable(state.selected);
  }
});

/* ═══════════════════════ CONTEXT MENU ═══════════════════════ */

canvasWrap.addEventListener('contextmenu', e => {
  e.preventDefault();
  const rect = canvasWrap.getBoundingClientRect();
  const cx = (e.clientX - rect.left - state.panX) / state.scale;
  const cy = (e.clientY - rect.top  - state.panY) / state.scale;

  ctxMenu.style.display = 'block';
  ctxMenu.style.left    = e.clientX + 'px';
  ctxMenu.style.top     = e.clientY + 'px';

  $('ctx-add-here').onclick = () => {
    ctxMenu.style.display = 'none';
    addTable(cx - 100, cy - 40);
  };

  const hitId = hitTestTable(cx, cy);
  $('ctx-delete-table').style.display = hitId ? '' : 'none';
  $('ctx-delete-table').onclick = () => { ctxMenu.style.display = 'none'; if (hitId) deleteTable(hitId); };
});

document.addEventListener('click', () => { ctxMenu.style.display = 'none'; });
document.addEventListener('keydown', e => { if (e.key === 'Escape') ctxMenu.style.display = 'none'; });

/* ═══════════════════════ MAIN RENDER ═══════════════════════ */

function render() {
  renderTables();
  renderLines();
  renderSidebar();
  renderPanel();
}

/* ═══════════════════════ BOOT ═══════════════════════ */

(function init() {
  // Populate db select
  dbSelect.innerHTML = Object.entries(DB_DIALECTS)
    .map(([k, v]) => `<option value="${k}">${v.icon} ${v.label}</option>`)
    .join('');
  dbSelect.value = state.db;

  // Try restoring from storage, otherwise load demo
  const restored = loadFromLocalStorage();
  if (!restored) loadDemo();

  render();
  applyTransform();
  setTimeout(() => { renderLines(); zoomFit(); }, 100);
})();

function loadDemo() {
  // users table
  const u = addTable(60, 60, 'users');
  u.cols = [
    { id: colId(), name: 'id',         type: 'SERIAL',    pk: true,  notNull: true,  unique: false, fk: null },
    { id: colId(), name: 'email',       type: 'VARCHAR(255)', pk: false, notNull: true,  unique: true,  fk: null },
    { id: colId(), name: 'full_name',   type: 'TEXT',      pk: false, notNull: false, unique: false, fk: null },
    { id: colId(), name: 'role',        type: 'VARCHAR(255)', pk: false, notNull: false, unique: false, fk: null },
    { id: colId(), name: 'created_at',  type: 'TIMESTAMPTZ', pk: false, notNull: false, unique: false, fk: null },
  ];

  // orders table
  const o = addTable(340, 60, 'orders');
  o.cols = [
    { id: colId(), name: 'id',          type: 'SERIAL',    pk: true,  notNull: true,  unique: false, fk: null },
    { id: colId(), name: 'user_id',     type: 'INTEGER',   pk: false, notNull: true,  unique: false, fk: { table: 'users', col: 'id' } },
    { id: colId(), name: 'total_amount',type: 'NUMERIC',   pk: false, notNull: false, unique: false, fk: null },
    { id: colId(), name: 'status',      type: 'VARCHAR(255)', pk: false, notNull: false, unique: false, fk: null },
    { id: colId(), name: 'ordered_at',  type: 'TIMESTAMPTZ', pk: false, notNull: false, unique: false, fk: null },
  ];

  // products table
  const p = addTable(340, 320, 'products');
  p.cols = [
    { id: colId(), name: 'id',          type: 'SERIAL',    pk: true,  notNull: true,  unique: false, fk: null },
    { id: colId(), name: 'name',        type: 'TEXT',      pk: false, notNull: true,  unique: false, fk: null },
    { id: colId(), name: 'price',       type: 'NUMERIC',   pk: false, notNull: false, unique: false, fk: null },
    { id: colId(), name: 'sku',         type: 'VARCHAR(255)', pk: false, notNull: false, unique: true,  fk: null },
  ];

  // order_items table
  const oi = addTable(620, 180, 'order_items');
  oi.cols = [
    { id: colId(), name: 'id',          type: 'SERIAL',    pk: true,  notNull: true,  unique: false, fk: null },
    { id: colId(), name: 'order_id',    type: 'INTEGER',   pk: false, notNull: true,  unique: false, fk: { table: 'orders',   col: 'id' } },
    { id: colId(), name: 'product_id',  type: 'INTEGER',   pk: false, notNull: true,  unique: false, fk: { table: 'products', col: 'id' } },
    { id: colId(), name: 'quantity',    type: 'INTEGER',   pk: false, notNull: false, unique: false, fk: null },
    { id: colId(), name: 'unit_price',  type: 'NUMERIC',   pk: false, notNull: false, unique: false, fk: null },
  ];

  // relationships
  state.rels = [
    { id: relId(), fromT: o.id,  fromC: o.cols[1].id,  toT: u.id,  toC: u.cols[0].id,  card: 'N:1' },
    { id: relId(), fromT: oi.id, fromC: oi.cols[1].id, toT: o.id,  toC: o.cols[0].id,  card: 'N:1' },
    { id: relId(), fromT: oi.id, fromC: oi.cols[2].id, toT: p.id,  toC: p.cols[0].id,  card: 'N:1' },
  ];

  state.selected = null;
}

/**
 * Beyond Tatva · School Leads Tracker ↔ LMS sync (one "Leads" tab for every school).
 * Paste into the Leads Tracker sheet only: Extensions → Apps Script → Code.gs → replace all → Save.
 * Reload the sheet → "Beyond Tatva sync → Set up sync" once (asks for the sync key). Manual: docs/SHEETS-SYSTEM.md.
 *
 *  • Each row = one student. It reaches the LMS a few seconds after an edit. Needs School, Student name, Parent phone.
 *  • Every 5 minutes only what changed in the LMS comes back (payments, Studio logs, website leads): tiny runs,
 *    so 100 schools stay inside Google's free daily script time. Once an hour a full check also removes rows
 *    deleted in Studio and refreshes the School list in Options column A.
 *  • Columns are found by their header name, not position. Don't rename: School, Student name, Class, Section,
 *    Parent phone, Parent name, Next step, Short note, Next date, Do not contact, Source, LMS email, Paid?.
 *  • Filled by the LMS (typing there is overwritten): Signed up, Module 0, ID (hidden), Paid? (becomes "Yes" when paid).
 *  • Cell A1 note: ✅ last good sync, or red ❌ with the reason. Menu → Check sync repairs the timers.
 *  • Safety: one run at a time (lock); a bad or empty LMS answer never deletes rows; never removes more than
 *    10 rows and 20% in one run; separate from the School Outreach sync.
 */
var API = 'https://learn.beyondtatva.in/api/sheets/leads';
var TAB = 'Leads';
var FIELDS = { 'School': 'school', 'Student name': 'student', 'Class': 'grade', 'Section': 'section', 'Parent phone': 'phone',
  'Parent name': 'parent', 'Next step': 'status', 'Short note': 'note', 'Next date': 'next_date', 'Do not contact': 'do_not_contact',
  'Source': 'source', 'LMS email': 'lms_email' };
var REQUIRED = ['School', 'Student name', 'Parent phone', 'Next step', 'Next date', 'Do not contact'];
var SYSTEM = ['Signed up', 'Module 0', 'ID'];            // added at the far right, LMS-owned
var BACK = { 'Next step': 'status', 'Short note': 'note', 'Next date': 'next_date', 'Do not contact': 'do_not_contact' };
var FULL_EVERY_MS = 60 * 60 * 1000;
var CHUNK = 200;

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Beyond Tatva sync')
    .addItem('Set up sync', 'setupSync')
    .addItem('Sync now', 'syncAll')
    .addItem('Check sync (fix timers)', 'checkSync')
    .addToUi();
}

// ── Pure helpers (tested in tests/leads-tracker.test.mjs) ───────────────────
function text_(v, fmt) {
  if (v && typeof v.getTime === 'function' && typeof v.toISOString === 'function') return fmt ? fmt(v) : v.toISOString().slice(0, 10);
  return String(v === null || v === undefined ? '' : v).trim();
}
function yes_(v) { return /^(yes|y|true|1|✓|x)$/i.test(text_(v)); }

// One sheet row → the LMS payload. touched: LMS fields edited by hand (omitted = whole row).
function payload_(head, values, rowNum, touched, fmt) {
  var p = { row: rowNum, sheet: {} };
  head.forEach(function (h, i) {
    if (!h || SYSTEM.indexOf(h) >= 0) return;
    var v = text_(values[i], fmt);
    if (FIELDS[h]) p[FIELDS[h]] = v; else p.sheet[h] = v;
  });
  var id = head.indexOf('ID');
  p.id = id >= 0 ? text_(values[id]) : '';
  p.do_not_contact = yes_(p.do_not_contact);
  if (touched) p.touched = touched;
  return p;
}

// What a row must have before it is sent. null = fine.
function problem_(p) {
  if (!p.student && !p.phone) return 'empty';
  if (!p.student) return 'Add the student name.';
  if (String(p.phone).replace(/\D/g, '').length < 10) return 'Add the 10-digit parent phone.';
  return null;
}

function sourceLabel_(s) { s = text_(s); return s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/[-_]/g, ' ') : ''; }

// The cells the LMS sets in an existing row: [[columnIndex, value], …], only where different.
// studioWins: logged in Studio after the last hand edit of this row → Studio's follow-up fields come back too.
function changes_(head, values, rec, editedAt, fmt) {
  var out = [], col = {};
  head.forEach(function (h, i) { if (h) col[h] = i; });
  var put = function (h, v) {
    if (col[h] === undefined) return;
    if (text_(values[col[h]], fmt) !== text_(v, fmt)) out.push([col[h], v === null || v === undefined ? '' : v]);
  };
  put('Signed up', rec.signed_up ? 'Yes' : 'No');
  put('Module 0', rec.module0 ? 'Done' : (rec.signed_up ? 'Not yet' : ''));
  if (rec.paid) put('Paid?', 'Yes');
  var studioWins = rec.updated_source === 'studio' && !(editedAt && editedAt >= Date.parse(rec.updated_at));
  if (studioWins) {
    put('Next step', rec.status); put('Short note', rec.note); put('Next date', rec.next_date || '');
    put('Do not contact', rec.do_not_contact ? 'Yes' : '');
  }
  return out;
}

// A new row (website lead, lead added in Studio) in this sheet's column order.
function newRow_(head, rec) {
  var v = { 'School': rec.school, 'Student name': rec.student, 'Class': rec.grade, 'Section': rec.section, 'Parent phone': rec.phone,
    'Parent name': rec.parent, 'Next step': rec.status, 'Short note': rec.note, 'Next date': rec.next_date,
    'Do not contact': rec.do_not_contact ? 'Yes' : '', 'Source': sourceLabel_(rec.source), 'LMS email': rec.lms_email,
    'Paid?': rec.paid ? 'Yes' : '', 'Signed up': rec.signed_up ? 'Yes' : 'No', 'Module 0': rec.module0 ? 'Done' : '', 'ID': rec.id };
  return head.map(function (h) { var x = v[h]; return x === null || x === undefined ? '' : x; });
}

// Never let a bad answer wipe the sheet.
function safeToDelete_(gone, linked, received) {
  if (!gone) return true;
  return !(received === 0 || (gone > 10 && gone > linked * 0.2));
}

// ── Sheet access ────────────────────────────────────────────────────────────
function fmt_(d) { return Utilities.formatDate(d, 'Asia/Kolkata', 'yyyy-MM-dd'); }

function table_() {
  var sh = SpreadsheetApp.getActive().getSheetByName(TAB);
  if (!sh) throw new Error('No tab named "' + TAB + '".');
  var width = sh.getLastColumn();
  var head = sh.getRange(1, 1, 1, width).getValues()[0].map(function (h) { return String(h).trim(); });
  var missing = REQUIRED.filter(function (h) { return head.indexOf(h) < 0; });
  if (missing.length) throw new Error('Column "' + missing.join('", "') + '" not found in Leads. Was it renamed? Rename it back.');
  return { sheet: sh, head: head, width: width, last: Math.max(1, sh.getLastRow()) };
}

function col_(t, h) { return t.head.indexOf(h); }

function ensureColumns_() {
  var t = table_();
  SYSTEM.forEach(function (h) {
    if (col_(t, h) >= 0) return;
    var c = t.sheet.getLastColumn() + 1;
    if (c > t.sheet.getMaxColumns()) t.sheet.insertColumnsAfter(t.sheet.getMaxColumns(), 1);
    t.sheet.getRange(1, c).setValue(h).setFontWeight('bold').setNote(h === 'ID' ? 'Link to the LMS. Do not edit or delete.' : 'Filled by the LMS. Do not type here.');
    t = table_();
  });
  t.sheet.getRange(1, col_(t, 'ID') + 1, t.sheet.getMaxRows(), 1).setNumberFormat('@');
  t.sheet.hideColumns(col_(t, 'ID') + 1);
  return table_();
}

function locked_(fn) {
  var lock = LockService.getDocumentLock();
  if (!lock.tryLock(30000)) return;
  try { return fn(); } finally { lock.releaseLock(); }
}

function state_(err) {
  var c = SpreadsheetApp.getActive().getSheetByName(TAB).getRange(1, 1);
  var now = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd MMM HH:mm');
  if (err) c.setBackground('#f4cccc').setNote('❌ SYNC BROKEN (' + now + '): ' + String(err.message || err).slice(0, 300) + '\nFix: Beyond Tatva sync → Check sync. Still broken? Tell Claude.');
  else c.setBackground(null).setNote('✅ Synced with the LMS ' + now);
}

function key_() { return PropertiesService.getScriptProperties().getProperty('KEY'); }

function call_(method, query, body) {
  var opt = { method: method, headers: { 'x-sheets-key': key_() }, muteHttpExceptions: true };
  if (body) { opt.contentType = 'application/json'; opt.payload = JSON.stringify(body); }
  var res = UrlFetchApp.fetch(API + (query || ''), opt);
  var code = res.getResponseCode();
  if (code === 401) throw new Error('The LMS rejected the sync key. Run "Set up sync" with the current SHEETS_SYNC_SECRET.');
  if (code !== 200) throw new Error('LMS error ' + code + ': ' + res.getContentText().slice(0, 150));
  return JSON.parse(res.getContentText());
}

// ── Push: sheet → LMS ───────────────────────────────────────────────────────
function push_(t, rowNums, touched) {
  if (!rowNums.length) return;
  var props = PropertiesService.getDocumentProperties(), now = String(Date.now());
  var nameCol = col_(t, 'Student name') + 1, idCol = col_(t, 'ID');
  var rows = [];
  rowNums.forEach(function (r) {
    var p = payload_(t.head, t.sheet.getRange(r, 1, 1, t.width).getValues()[0], r, touched, fmt_);
    var bad = problem_(p);
    if (bad === 'empty') return;
    if (bad) { t.sheet.getRange(r, nameCol).setNote('Not synced: ' + bad); return; }
    rows.push(p);
  });
  for (var i = 0; i < rows.length; i += CHUNK) {
    call_('post', '', { rows: rows.slice(i, i + CHUNK) }).forEach(function (res) {
      if (res.id && idCol >= 0) {
        var c = t.sheet.getRange(res.row, idCol + 1);
        if (c.getValue() !== res.id) c.setValue(res.id);
        props.setProperty('e_' + res.id, now);           // edit time by ID (rows can move; IDs don't)
      }
      var note = res.result === 'error' ? 'Not synced: ' + res.error
        : [res.siblings ? 'Same parent phone as: ' + res.siblings : '', res.link || ''].filter(String).join('\n');
      t.sheet.getRange(res.row, nameCol).setNote(note);
    });
  }
}

function onEditSync(e) {
  locked_(function () {
    try {
      if (!e || !e.range || e.range.getSheet().getName() !== TAB) return;
      var t = table_();
      var r0 = Math.max(2, e.range.getRow()), r1 = Math.min(t.last, e.range.getLastRow());
      if (r1 < r0) return;
      var heads = t.head.slice(e.range.getColumn() - 1, e.range.getLastColumn());
      if (heads.every(function (h) { return SYSTEM.indexOf(h) >= 0; })) return;
      var touched = heads.map(function (h) { return FIELDS[h]; }).filter(function (f) { return f; });
      var rows = []; for (var r = r0; r <= r1; r++) rows.push(r);
      push_(t, rows, touched);
      state_(null);
    } catch (err) { state_(err); throw err; }
  });
}

// ── Pull: LMS → sheet ───────────────────────────────────────────────────────
function pull() {
  locked_(function () {
    try { pull_(false); state_(null); } catch (err) { state_(err); throw err; }
  });
}

function pull_(forceFull) {
  if (!key_()) throw new Error('No sync key. Run "Set up sync".');
  var props = PropertiesService.getDocumentProperties();
  var lastAt = props.getProperty('last_at'), lastFull = Number(props.getProperty('last_full') || 0);
  var full = forceFull || !lastAt || Date.now() - lastFull > FULL_EVERY_MS;
  var data = call_('get', full ? '' : '?since=' + encodeURIComponent(lastAt));
  if (!data || !Array.isArray(data.leads)) throw new Error('Unexpected answer from the LMS (no leads list).');
  var t = ensureColumns_(), idCol = col_(t, 'ID');

  // Where each ID is now (only the ID column is read on a normal run).
  var ids = t.last > 1 ? t.sheet.getRange(2, idCol + 1, t.last - 1, 1).getValues() : [];
  var at = {};
  ids.forEach(function (v, i) { var id = text_(v[0]); if (id && at[id] === undefined) at[id] = i + 2; });

  var adds = [];
  data.leads.forEach(function (rec) {
    var row = at[rec.id];
    if (!row) { adds.push(newRow_(t.head, rec)); return; }
    var values = t.sheet.getRange(row, 1, 1, t.width).getValues()[0];
    changes_(t.head, values, rec, Number(props.getProperty('e_' + rec.id) || 0), fmt_).forEach(function (c) {
      t.sheet.getRange(row, c[0] + 1).setValue(c[1]);
    });
  });
  if (adds.length) t.sheet.getRange(t.last + 1, 1, adds.length, t.width).setValues(adds);

  if (data.full) {
    // Rows deleted in Studio (and duplicate copies of one ID) leave the sheet, with the safety net.
    var live = {}; (data.ids || []).forEach(function (id) { live[id] = true; });
    var drop = [], seen = {};
    ids.forEach(function (v, i) {
      var id = text_(v[0]); if (!id) return;
      if (!live[id] || seen[id]) drop.push(i + 2);
      seen[id] = true;
    });
    if (safeToDelete_(drop.length, Object.keys(at).length, (data.ids || []).length)) {
      drop.sort(function (a, b) { return b - a; }).forEach(function (r) { t.sheet.deleteRow(r); });
    } else {
      throw new Error('Skipped removing ' + drop.length + ' rows (LMS sent ' + (data.ids || []).length + '). Check Studio, then tell Claude.');
    }
    schools_(data.schools || []);
    props.setProperty('last_full', String(Date.now()));
    // Forget edit times older than 2 days.
    var old = Date.now() - 2 * 86400000, all = props.getProperties();
    Object.keys(all).forEach(function (k) { if (k.indexOf('e_') === 0 && Number(all[k]) < old) props.deleteProperty(k); });
  }
  props.setProperty('last_at', data.at);
}

// Options column A = the School list from School Outreach (so every name matches the LMS).
function schools_(names) {
  if (!names.length) return;
  var sh = SpreadsheetApp.getActive().getSheetByName('Options');
  if (!sh) return;
  var cur = sh.getRange(2, 1, 499, 1).getValues().map(function (r) { return text_(r[0]); }).filter(String);
  if (cur.join('\n') === names.join('\n')) return;
  sh.getRange(2, 1, 499, 1).clearContent();
  sh.getRange(2, 1, names.length, 1).setValues(names.map(function (n) { return [n]; }));
}

// ── Set-up and repair ───────────────────────────────────────────────────────
function setupSync() {
  var ui = SpreadsheetApp.getUi();
  var k = ui.prompt('Sync key', 'Paste the SHEETS_SYNC_SECRET from Vercel (LMS project):', ui.ButtonSet.OK_CANCEL);
  if (k.getSelectedButton() !== ui.Button.OK || !k.getResponseText().trim()) return;
  PropertiesService.getScriptProperties().setProperty('KEY', k.getResponseText().trim());
  ensureColumns_();
  timers_(true);
  syncAll();
  ui.alert('Sync is on. Edits reach the LMS in seconds; LMS changes come back every 5 minutes.');
}

function timers_(reset) {
  var ts = ScriptApp.getProjectTriggers();
  if (reset) { ts.forEach(function (t) { ScriptApp.deleteTrigger(t); }); ts = []; }
  var has = function (fn) { return ts.some(function (t) { return t.getHandlerFunction() === fn; }); };
  var made = [];
  if (!has('pull')) { ScriptApp.newTrigger('pull').timeBased().everyMinutes(5).create(); made.push('5-minute refresh'); }
  if (!has('onEditSync')) { ScriptApp.newTrigger('onEditSync').forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create(); made.push('on-edit push'); }
  return made;
}

// Push every row (Studio-logged leads keep the Studio values), then a full pull.
function syncAll() {
  locked_(function () {
    try {
      var t = ensureColumns_(), rows = [];
      for (var r = 2; r <= t.last; r++) rows.push(r);
      push_(t, rows, []);
      pull_(true);
      state_(null);
    } catch (err) { state_(err); throw err; }
  });
}

function checkSync() {
  var ui = SpreadsheetApp.getUi(), msgs = [];
  try { table_(); msgs.push('✅ Leads tab and its columns are there.'); } catch (err) { msgs.push('❌ ' + err.message); }
  if (!key_()) return ui.alert('No sync key saved. Run "Set up sync" first.');
  try { call_('get', '?since=' + encodeURIComponent(new Date().toISOString())); msgs.push('✅ LMS answers and the key is right.'); }
  catch (err) { msgs.push('❌ ' + err.message); }
  var made = timers_(false);
  msgs.push(made.length ? '🔧 Re-created: ' + made.join(', ') : '✅ Both timers are on.');
  try { locked_(function () { pull_(true); state_(null); }); msgs.push('✅ Full sync just now.'); } catch (err) { state_(err); msgs.push('❌ ' + err.message); }
  ui.alert('Sync check', msgs.join('\n'), ui.ButtonSet.OK);
}

// Node tests load this file; Apps Script ignores this.
if (typeof module !== 'undefined') module.exports = { payload_: payload_, problem_: problem_, changes_: changes_, newRow_: newRow_, safeToDelete_: safeToDelete_, sourceLabel_: sourceLabel_ };

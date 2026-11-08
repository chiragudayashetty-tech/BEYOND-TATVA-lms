/**
 * Beyond Tatva · Google Sheets ↔ LMS (Supabase) sync.
 * Paste this whole file into the sheet: Extensions → Apps Script → Code.gs → Save.
 * Reload the sheet, then "Beyond Tatva sync → Set up sync" once (asks for the sync key).
 *
 * WORKSHOP LEADS spreadsheet (tabs whose header row has "Parent WhatsApp"):
 *   • One tab per source: one per school workshop ("SRVK", "Durga EMS", …), "Website" (website + Loki chat),
 *     "Manual". New tabs are created automatically with the same columns (a school's tab appears when its
 *     outreach status says "Workshop done", or when a lead for it arrives).
 *   • Rows are matched by the hidden "ID" column. Same parent phone + same child (or no child name) = one
 *     lead: copies are merged and removed automatically. Siblings on one phone are kept and noted.
 *   • "Signed up", "Module 0", "Paid?" and "Source" are filled by the LMS; typing in them is undone.
 *   • "LMS email": the student's login email, when the account doesn't use the parent phone on the slip.
 * SCHOOL OUTREACH spreadsheet (header has "School" and "Calls"): one row per school, one tab.
 */
var API = 'https://learn.beyondtatva.in/api/sheets';
var SKIP_TABS = ['All leads', 'Sync settings'];
var LEAD_SYSTEM = ['Signed up', 'Module 0', 'Paid?', 'Source'];
var LEAD_ADD = ['School', 'Next step', 'Next date', 'Do not contact', 'LMS email', 'Source', 'Signed up', 'Module 0', 'Paid?', 'Last synced', 'ID'];
var LEAD_FIELDS = { 'Student': 'student', 'Class': 'grade', 'Parent WhatsApp': 'phone', 'School': 'school', 'Status': 'status', 'Next step': 'next_step', 'Next date': 'next_date', 'LMS email': 'lms_email' };
var SCHOOL_FIELDS = { 'School': 'name', 'Area': 'area', 'Contact': 'contact', 'Phone': 'phone', 'Status': 'status', 'Calls': 'calls', 'Visits': 'visits', 'History (short)': 'history', 'Next step': 'next_step', 'Next date': 'next_date', 'Notes': 'notes' };

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Beyond Tatva sync')
    .addItem('Set up sync', 'setupSync')
    .addItem('Sync now', 'syncAll')
    .addToUi();
}

// ── Tables ──────────────────────────────────────────────────────────────────
function table_(sheet) {
  var lastCol = sheet.getLastColumn(), lastRow = sheet.getLastRow();
  if (lastCol < 1 || lastRow < 1) return null;
  var head = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h).trim(); });
  var col = {}; head.forEach(function (h, i) { if (h) col[h] = i; });
  var kind = col['Parent WhatsApp'] !== undefined ? 'leads' : (col['School'] !== undefined && col['Calls'] !== undefined ? 'schools' : null);
  if (!kind || SKIP_TABS.indexOf(sheet.getName()) >= 0) return null;
  var key = kind === 'leads' ? 'Student' : 'School', last = 1;
  if (lastRow > 1) {
    var names = sheet.getRange(2, col[key] + 1, lastRow - 1, 1).getValues();
    if (kind === 'leads') { for (var i = names.length - 1; i >= 0; i--) if (String(names[i][0]).trim()) { last = i + 2; break; } }  // leads: last filled row
    else { for (var j = 0; j < names.length && String(names[j][0]).trim(); j++) last = j + 2; }                                     // schools: stop at first gap (totals below)
  }
  return { sheet: sheet, head: head, col: col, kind: kind, last: last, name: sheet.getName() };
}

function tables_() {
  return SpreadsheetApp.getActive().getSheets().map(table_).filter(function (t) { return t; });
}

function kind_() { var ts = tables_(); return ts.length ? ts[0].kind : null; }

// A new lead tab, with exactly the same header row as the first lead tab.
function leadTab_(name) {
  var ss = SpreadsheetApp.getActive(), sh = ss.getSheetByName(name);
  if (sh) return table_(sh);
  var tmpl = tables_().filter(function (t) { return t.kind === 'leads'; })[0];
  sh = ss.insertSheet(String(name).slice(0, 60));
  tmpl.sheet.getRange(1, 1, 1, tmpl.head.length).copyTo(sh.getRange(1, 1));
  sh.setFrozenRows(1);
  sh.hideColumns(tmpl.col['ID'] + 1);
  return table_(sh);
}

// ── Set-up: key, rename, missing columns, triggers ──────────────────────────
function setupSync() {
  var ui = SpreadsheetApp.getUi();
  var key = ui.prompt('Sync key', 'Paste the SHEETS_SYNC_SECRET from Vercel (LMS project):', ui.ButtonSet.OK_CANCEL);
  if (key.getSelectedButton() !== ui.Button.OK || !key.getResponseText().trim()) return;
  PropertiesService.getScriptProperties().setProperty('KEY', key.getResponseText().trim());
  var ts = tables_();
  if (!ts.length) return ui.alert('No tab with the expected header row (row 1) was found.');
  if (ts[0].kind === 'leads') {
    ts.forEach(function (t) {
      if (t.name === 'Untitled' || t.name === 'Sheet1') {
        var n = ui.prompt('Name this tab', 'Which school are the students in "' + t.name + '" from? (e.g. SRVK)', ui.ButtonSet.OK);
        if (n.getResponseText().trim()) t.sheet.setName(n.getResponseText().trim());
      }
    });
    tables_().forEach(function (t) {
      var missing = LEAD_ADD.filter(function (h) { return t.col[h] === undefined; });
      if (missing.length) {
        var start = t.sheet.getLastColumn() + 1;
        t.sheet.getRange(1, start, 1, missing.length).setValues([missing]).setFontWeight('bold');
        var sc = missing.indexOf('School');
        if (sc >= 0 && t.last > 1 && ['Website', 'Manual'].indexOf(t.sheet.getName()) < 0)
          t.sheet.getRange(2, start + sc, t.last - 1, 1).setValues(Array(t.last - 1).fill([t.sheet.getName()]));
        t = table_(t.sheet);
      }
      LEAD_SYSTEM.forEach(function (h) { t.sheet.getRange(1, t.col[h] + 1).setNote('Filled from the LMS. Do not type here.'); });
      t.sheet.getRange(1, t.col['ID'] + 1).setNote('Link to the LMS record. Do not edit or delete.');
      t.sheet.hideColumns(t.col['ID'] + 1);
    });
  } else {
    var t = ts[0];
    if (t.col['ID'] === undefined) { t.sheet.getRange(1, t.sheet.getLastColumn() + 1).setValue('ID').setFontWeight('bold'); t = table_(t.sheet); }
    t.sheet.getRange(1, t.col['ID'] + 1).setNote('Link to the LMS record. Do not edit or delete.');
    t.sheet.hideColumns(t.col['ID'] + 1);
  }
  ScriptApp.getProjectTriggers().forEach(function (tr) { ScriptApp.deleteTrigger(tr); });
  ScriptApp.newTrigger('onEditSync').forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();
  ScriptApp.newTrigger('pull').timeBased().everyMinutes(5).create();
  syncAll();
  ui.alert('Sync is on. Edits reach the LMS in seconds; LMS updates come back every 5 minutes.');
}

// ── Push ────────────────────────────────────────────────────────────────────
// The tab a row belongs to: the tab it sits in. Exception: a Website/Manual lead with a School typed in
// belongs to that school's tab (it moves there on the next sync).
function desiredTab_(t, values) {
  var school = t.col['School'] !== undefined ? String(values[t.col['School']] || '').trim() : '';
  return (['Website', 'Manual'].indexOf(t.name) >= 0 && school && school !== t.name) ? school.slice(0, 60) : t.name;
}

function rowPayload_(t, values, rowNum) {
  var fields = t.kind === 'leads' ? LEAD_FIELDS : SCHOOL_FIELDS, extra = {};
  var p = { row: rowNum, tab: t.kind === 'leads' ? desiredTab_(t, values) : t.name, id: t.col['ID'] !== undefined ? String(values[t.col['ID']] || '') : '' };
  t.head.forEach(function (h, i) {
    if (!h || h === 'ID' || h === 'Last synced' || LEAD_SYSTEM.indexOf(h) >= 0) return;
    var v = values[i] instanceof Date ? Utilities.formatDate(values[i], 'Asia/Kolkata', 'yyyy-MM-dd') : String(values[i] === null ? '' : values[i]);
    if (fields[h]) p[fields[h]] = v; else extra[h] = v;
  });
  if (t.kind === 'leads') {
    p.do_not_contact = /^(yes|y|true|1|✓|x)$/i.test(String(extra['Do not contact'] || '').trim());
    delete extra['Do not contact'];
  }
  p.sheet = extra;
  return p;
}

function push_(t, rowNums) {
  var key = PropertiesService.getScriptProperties().getProperty('KEY');
  if (!key || !rowNums.length) return;
  var width = t.head.length, rows = rowNums.map(function (r) { return rowPayload_(t, t.sheet.getRange(r, 1, 1, width).getValues()[0], r); })
    .filter(function (p) { return t.kind !== 'leads' || p.student || p.phone; });
  for (var i = 0; i < rows.length; i += 200) {
    var res = UrlFetchApp.fetch(API, { method: 'post', contentType: 'application/json', headers: { 'x-sheets-key': key },
      payload: JSON.stringify({ kind: t.kind, rows: rows.slice(i, i + 200) }), muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) throw new Error('Sync failed (' + res.getResponseCode() + '): ' + res.getContentText().slice(0, 200));
    JSON.parse(res.getContentText()).forEach(function (r) {
      if (r.id && t.col['ID'] !== undefined) { var c = t.sheet.getRange(r.row, t.col['ID'] + 1); if (c.getValue() !== r.id) c.setValue(r.id); }
      var note = r.result === 'error' ? 'Not synced: ' + r.error : [r.siblings ? 'Same parent phone as: ' + r.siblings : '', r.link || ''].filter(String).join('\n');
      t.sheet.getRange(r.row, t.col[t.kind === 'leads' ? 'Student' : 'School'] + 1).setNote(note);
    });
  }
  if (t.col['Last synced'] !== undefined) {
    var now = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd MMM HH:mm');
    rowNums.forEach(function (r) { t.sheet.getRange(r, t.col['Last synced'] + 1).setValue(now); });
  }
}

function onEditSync(e) {
  if (!e || !e.range) return;
  var t = table_(e.range.getSheet());
  if (!t) return;
  var r0 = Math.max(2, e.range.getRow()), r1 = Math.min(t.last, e.range.getLastRow());
  if (r1 < r0) return;
  var touched = t.head.slice(e.range.getColumn() - 1, e.range.getLastColumn());
  if (touched.every(function (h) { return h === 'ID' || h === 'Last synced'; })) return;
  if (touched.every(function (h) { return LEAD_SYSTEM.indexOf(h) >= 0; })) return pull();   // LMS-owned: put the value back
  var rows = [], props = PropertiesService.getDocumentProperties(), now = String(Date.now());
  for (var r = r0; r <= r1; r++) { rows.push(r); props.setProperty('edit_' + t.name + '_' + r, now); }
  push_(t, rows);
}

// ── Pull: LMS → sheet ───────────────────────────────────────────────────────
function pull() {
  var key = PropertiesService.getScriptProperties().getProperty('KEY');
  var ts = tables_();
  if (!key || !ts.length || ts[0].kind !== 'leads') return;     // schools: the sheet is the source, nothing to pull
  var res = UrlFetchApp.fetch(API, { headers: { 'x-sheets-key': key }, muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('Pull failed (' + res.getResponseCode() + ')');
  var data = JSON.parse(res.getContentText());
  if (!data || !Array.isArray(data.leads)) return;

  // School tabs appear once a workshop is done.
  (data.schools || []).forEach(function (s) { if (/workshop done/i.test(s.status || '')) leadTab_(s.name); });
  ts = tables_();

  // Where each ID lives now.
  var at = {}, byTab = {};
  ts.forEach(function (t) {
    byTab[t.name] = t;
    if (t.last < 2) return;
    t.values = t.sheet.getRange(2, 1, t.last - 1, t.head.length).getValues();
    t.values.forEach(function (v, i) { var id = v[t.col['ID']]; if (id) at[id] = { t: t, i: i }; });
  });
  var live = {}, moves = [], adds = [], fixes = [], props = PropertiesService.getDocumentProperties(), recent = Date.now() - 10 * 60 * 1000;
  data.leads.forEach(function (rec) {
    live[rec.id] = true;
    var hit = at[rec.id];
    if (!hit) { adds.push(rec); return; }
    if (hit.t.name !== rec.tab) {
      // Moved on purpose (Website/Manual lead given a School) → move the row. Anything else (tab renamed,
      // row cut/pasted into another tab) → the sheet is right: tell the LMS where the row is now.
      if (desiredTab_(hit.t, hit.t.values[hit.i]) === rec.tab) { moves.push({ rec: rec, hit: hit }); return; }
      fixes.push(hit);
    }
    var t = hit.t, v = t.values[hit.i];
    var sys = { 'Signed up': rec.signed_up ? 'Yes' : 'No', 'Module 0': rec.module0 ? 'Done' : (rec.signed_up ? 'Not yet' : ''), 'Paid?': rec.paid ? 'Yes' : 'No', 'Source': rec.source || '' };
    Object.keys(sys).forEach(function (h) { if (t.col[h] !== undefined && String(v[t.col[h]]) !== sys[h]) { v[t.col[h]] = sys[h]; t.dirty = true; } });
    var edited = Number(props.getProperty('edit_' + t.name + '_' + (hit.i + 2)) || 0);
    if (edited < recent && rec.do_not_contact && t.col['Do not contact'] !== undefined && !v[t.col['Do not contact']]) { v[t.col['Do not contact']] = 'Yes'; t.dirty = true; }
  });
  ts.forEach(function (t) { if (t.dirty) t.sheet.getRange(2, 1, t.values.length, t.head.length).setValues(t.values); });

  // Rows whose tab changed in the sheet (renamed tab, cut/paste): update the LMS, don't move them.
  var byT = {};
  fixes.forEach(function (h) { (byT[h.t.name] = byT[h.t.name] || { t: h.t, rows: [] }).rows.push(h.i + 2); });
  Object.keys(byT).forEach(function (n) { var t = table_(byT[n].t.sheet); if (t) push_(t, byT[n].rows); });

  // Rows whose lead is gone (merged into another row, or deleted in Studio), and rows moving tabs.
  var drop = [];
  ts.forEach(function (t) { (t.values || []).forEach(function (v, i) { var id = v[t.col['ID']]; if (id && !live[id]) drop.push({ t: t, row: i + 2 }); }); });
  moves.forEach(function (m) {
    var from = {}; m.hit.t.head.forEach(function (h, j) { if (h) from[h] = m.hit.t.values[m.hit.i][j]; });
    m.rec._from = from;                                   // keep every column when a lead changes tab
    adds.push(m.rec); drop.push({ t: m.hit.t, row: m.hit.i + 2 });
  });
  drop.sort(function (a, b) { return b.row - a.row; }).forEach(function (d) { d.t.sheet.deleteRow(d.row); });

  // New leads (website, Studio, other tab) go to the end of their tab.
  var grouped = {};
  adds.forEach(function (rec) { (grouped[rec.tab] = grouped[rec.tab] || []).push(rec); });
  Object.keys(grouped).forEach(function (tab) {
    var t = leadTab_(tab), width = t.head.length;
    var rows = grouped[tab].map(function (rec) {
      var row = Array(width).fill(''), put = function (h, v) { if (t.col[h] !== undefined) row[t.col[h]] = v == null ? '' : v; };
      if (rec._from) Object.keys(rec._from).forEach(function (h) { put(h, rec._from[h]); });
      put('Student', rec.student); put('First name', String(rec.student || '').split(' ')[0]); put('Class', rec.grade); put('Parent WhatsApp', rec.phone);
      put('School', rec.school); put('Status', rec.status); put('Next step', rec.next_step); put('Next date', rec.next_date);
      put('LMS email', rec.lms_email); put('Do not contact', rec.do_not_contact ? 'Yes' : ''); put('Source', rec.source);
      put('Signed up', rec.signed_up ? 'Yes' : 'No'); put('Module 0', rec.module0 ? 'Done' : ''); put('Paid?', rec.paid ? 'Yes' : 'No'); put('ID', rec.id);
      return row;
    });
    t.sheet.getRange(t.last + 1, 1, rows.length, width).setValues(rows);
  });

}

function syncAll() {
  tables_().forEach(function (t) { var rows = []; for (var r = 2; r <= t.last; r++) rows.push(r); push_(t, rows); });
  pull();
}

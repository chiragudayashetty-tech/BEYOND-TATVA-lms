/**
 * Beyond Tatva · Google Sheets ↔ LMS (Supabase) sync.
 * Paste this whole file into the sheet: Extensions → Apps Script → Code.gs → Save.
 * Then reload the sheet and use the menu "Beyond Tatva sync → Set up sync" once.
 * The same script works in both sheets:
 *   • Workshop leads   (header row has "Parent WhatsApp")  → one row per student, any school
 *   • School Outreach  (header row has "School" and "Calls") → one row per school
 * Rows are matched by the "ID" column (added on set-up; don't edit or delete it). Never copy the sheet:
 * keep one sheet and add new schools/students as new rows.
 * Columns "Signed up", "Module 0" and "Paid?" are filled from the LMS. Typing in them is undone.
 */
var API = 'https://learn.beyondtatva.in/api/sheets';
var LEAD_SYSTEM = ['Signed up', 'Module 0', 'Paid?'];
var LEAD_ADD = ['School', 'Next step', 'Next date', 'Do not contact', 'Signed up', 'Module 0', 'Paid?', 'Last synced', 'ID'];
var LEAD_FIELDS = { 'Student': 'student', 'Class': 'grade', 'Parent WhatsApp': 'phone', 'School': 'school', 'Status': 'status', 'Next step': 'next_step', 'Next date': 'next_date' };
var SCHOOL_FIELDS = { 'School': 'name', 'Area': 'area', 'Contact': 'contact', 'Phone': 'phone', 'Status': 'status', 'Calls': 'calls', 'Visits': 'visits', 'History (short)': 'history', 'Next step': 'next_step', 'Next date': 'next_date', 'Notes': 'notes' };

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Beyond Tatva sync')
    .addItem('Set up sync', 'setupSync')
    .addItem('Sync now', 'syncAll')
    .addToUi();
}

// ── Set-up: key, missing columns, triggers ─────────────────────────────────
function setupSync() {
  var ui = SpreadsheetApp.getUi();
  var key = ui.prompt('Sync key', 'Paste the SHEETS_SYNC_SECRET from Vercel (LMS project):', ui.ButtonSet.OK_CANCEL);
  if (key.getSelectedButton() !== ui.Button.OK || !key.getResponseText().trim()) return;
  PropertiesService.getScriptProperties().setProperty('KEY', key.getResponseText().trim());
  var t = table_();
  if (!t) return ui.alert('Could not find the header row. Put the headers in row 1.');
  if (t.kind === 'leads') {
    var missing = LEAD_ADD.filter(function (h) { return t.col[h] === undefined; });
    if (missing.length) {
      var schoolPrompt = t.col['School'] === undefined ? ui.prompt('School for the existing rows', 'e.g. SRVK', ui.ButtonSet.OK) : null;
      var start = t.sheet.getLastColumn() + 1;
      t.sheet.getRange(1, start, 1, missing.length).setValues([missing]).setFontWeight('bold');
      if (schoolPrompt && schoolPrompt.getResponseText().trim() && t.last > 1) {
        var sc = start + missing.indexOf('School');
        t.sheet.getRange(2, sc, t.last - 1, 1).setValues(Array(t.last - 1).fill([schoolPrompt.getResponseText().trim()]));
      }
      t = table_();
    }
    LEAD_SYSTEM.forEach(function (h) { t.sheet.getRange(1, t.col[h] + 1).setNote('Filled from the LMS. Do not type here.'); });
  } else if (t.col['ID'] === undefined) {
    t.sheet.getRange(1, t.sheet.getLastColumn() + 1).setValue('ID').setFontWeight('bold');
    t = table_();
  }
  t.sheet.getRange(1, t.col['ID'] + 1).setNote('Link to the LMS record. Do not edit or delete.');
  t.sheet.hideColumns(t.col['ID'] + 1);
  ScriptApp.getProjectTriggers().forEach(function (tr) { ScriptApp.deleteTrigger(tr); });
  ScriptApp.newTrigger('onEditSync').forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();
  ScriptApp.newTrigger('pull').timeBased().everyMinutes(5).create();
  syncAll();
  ui.alert('Sync is on. Edits go to the LMS in seconds; LMS updates come back every 5 minutes.');
}

// ── Find the table: kind, header map, data rows (stops at the first empty row) ─
function table_() {
  var sheet = SpreadsheetApp.getActive().getSheets()[0];
  var lastCol = sheet.getLastColumn(), lastRow = sheet.getLastRow();
  if (lastCol < 1 || lastRow < 1) return null;
  var head = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h).trim(); });
  var col = {}; head.forEach(function (h, i) { if (h) col[h] = i; });
  var kind = col['Parent WhatsApp'] !== undefined ? 'leads' : (col['School'] !== undefined && col['Calls'] !== undefined ? 'schools' : null);
  if (!kind) return null;
  var key = kind === 'leads' ? 'Student' : 'School';
  var last = 1;
  if (lastRow > 1) {
    var names = sheet.getRange(2, col[key] + 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < names.length && String(names[i][0]).trim(); i++) last = i + 2;  // table ends at first empty name
  }
  return { sheet: sheet, head: head, col: col, kind: kind, last: last };
}

function rowPayload_(t, values, rowNum) {
  var fields = t.kind === 'leads' ? LEAD_FIELDS : SCHOOL_FIELDS, p = { row: rowNum, id: t.col['ID'] !== undefined ? String(values[t.col['ID']] || '') : '' }, extra = {};
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

// ── Push: send rows to the LMS and write back their IDs ─────────────────────
function push_(t, rowNums) {
  var key = PropertiesService.getScriptProperties().getProperty('KEY');
  if (!key || !rowNums.length) return;
  var width = t.head.length, rows = [];
  rowNums.forEach(function (r) { rows.push(rowPayload_(t, t.sheet.getRange(r, 1, 1, width).getValues()[0], r)); });
  for (var i = 0; i < rows.length; i += 200) {
    var res = UrlFetchApp.fetch(API, { method: 'post', contentType: 'application/json', headers: { 'x-sheets-key': key },
      payload: JSON.stringify({ kind: t.kind, rows: rows.slice(i, i + 200) }), muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) throw new Error('Sync failed (' + res.getResponseCode() + '): ' + res.getContentText().slice(0, 200));
    JSON.parse(res.getContentText()).forEach(function (r) {
      var cell = t.sheet.getRange(r.row, (t.col['ID'] || 0) + 1);
      if (r.id && t.col['ID'] !== undefined && cell.getValue() !== r.id) cell.setValue(r.id);
      var name = t.sheet.getRange(r.row, t.col[t.kind === 'leads' ? 'Student' : 'School'] + 1);
      name.setNote(r.result === 'error' ? 'Not synced: ' + r.error : (r.duplicate_phone ? 'Same parent phone as another row (sibling or duplicate?)' : ''));
    });
  }
  if (t.col['Last synced'] !== undefined) {
    var now = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd MMM HH:mm');
    rowNums.forEach(function (r) { t.sheet.getRange(r, t.col['Last synced'] + 1).setValue(now); });
  }
}

function onEditSync(e) {
  var t = table_();
  if (!t || !e || !e.range || e.range.getSheet().getIndex() !== 1) return;
  var r0 = Math.max(2, e.range.getRow()), r1 = Math.min(t.last, e.range.getLastRow());
  if (r1 < r0) return;
  var c0 = e.range.getColumn(), c1 = e.range.getLastColumn(), touched = t.head.slice(c0 - 1, c1);
  if (touched.every(function (h) { return h === 'ID' || h === 'Last synced'; })) return;
  // System columns belong to the LMS: put the value back on the next pull instead of pushing it.
  if (touched.every(function (h) { return LEAD_SYSTEM.indexOf(h) >= 0; })) return pull();
  var rows = []; for (var r = r0; r <= r1; r++) rows.push(r);
  var props = PropertiesService.getDocumentProperties(), now = String(Date.now());
  rows.forEach(function (r) { props.setProperty('edit_' + r, now); });
  push_(t, rows);
}

// ── Pull: LMS → sheet (system columns, plus rows created in the LMS) ────────
function pull() {
  var key = PropertiesService.getScriptProperties().getProperty('KEY'), t = table_();
  if (!key || !t || t.col['ID'] === undefined) return;
  var res = UrlFetchApp.fetch(API, { headers: { 'x-sheets-key': key }, muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('Pull failed (' + res.getResponseCode() + ')');
  var data = JSON.parse(res.getContentText()), list = t.kind === 'leads' ? data.leads : data.schools;
  var width = t.head.length, idCol = t.col['ID'];
  var values = t.last > 1 ? t.sheet.getRange(2, 1, t.last - 1, width).getValues() : [];
  var byId = {}; values.forEach(function (v, i) { if (v[idCol]) byId[v[idCol]] = i; });
  var props = PropertiesService.getDocumentProperties(), recent = Date.now() - 10 * 60 * 1000, changed = false, added = [];
  list.forEach(function (rec) {
    var i = byId[rec.id];
    if (i === undefined) { if (t.kind === 'leads') added.push(rec); return; }
    if (t.kind !== 'leads') return;                                  // school rows: sheet is the source; nothing system-owned
    var edited = Number(props.getProperty('edit_' + (i + 2)) || 0);
    var sys = { 'Signed up': rec.signed_up ? 'Yes' : 'No', 'Module 0': rec.module0 ? 'Done' : (rec.signed_up ? 'Not yet' : ''), 'Paid?': rec.paid ? 'Yes' : 'No' };
    Object.keys(sys).forEach(function (h) { if (t.col[h] !== undefined && String(values[i][t.col[h]]) !== sys[h]) { values[i][t.col[h]] = sys[h]; changed = true; } });
    if (edited < recent && rec.do_not_contact && t.col['Do not contact'] !== undefined && !values[i][t.col['Do not contact']]) { values[i][t.col['Do not contact']] = 'Yes'; changed = true; }
  });
  if (changed) t.sheet.getRange(2, 1, values.length, width).setValues(values);
  if (added.length) {
    var rows = added.map(function (rec) {
      var row = Array(width).fill('');
      var put = function (h, v) { if (t.col[h] !== undefined) row[t.col[h]] = v == null ? '' : v; };
      put('Student', rec.student); put('First name', String(rec.student || '').split(' ')[0]); put('Class', rec.grade); put('Parent WhatsApp', rec.phone);
      put('School', rec.school || (rec.source === 'sheet' ? '' : 'Website')); put('Status', rec.status); put('Next step', rec.next_step); put('Next date', rec.next_date);
      put('Signed up', rec.signed_up ? 'Yes' : 'No'); put('Paid?', rec.paid ? 'Yes' : 'No'); put('ID', rec.id);
      return row;
    });
    t.sheet.getRange(t.last + 1, 1, rows.length, width).setValues(rows);
  }
}

function syncAll() {
  var t = table_();
  if (!t) return;
  var rows = []; for (var r = 2; r <= t.last; r++) rows.push(r);
  push_(t, rows);
  pull();
}

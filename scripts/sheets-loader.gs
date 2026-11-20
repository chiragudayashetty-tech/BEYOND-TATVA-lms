/**
 * Beyond Tatva · sheet ↔ LMS sync LOADER. Paste this ONCE; never edit it again.
 * Extensions → Apps Script → delete everything in Code.gs → paste this → set BOOK below → Save.
 * Then reload the sheet and run "Beyond Tatva sync → Check sync".
 *
 * Every run downloads the current sync code from the LMS (/api/sheets/script), so fixes arrive with
 * a normal LMS deploy. Your sync key, timers and menu keep working as before (same names).
 */
var BOOK = 'outreach';   // 'outreach' in the School Outreach sheet · 'tracker' in the School Leads Tracker
var SCRIPT_URL = 'https://learn.beyondtatva.in/api/sheets/script?book=';

// Opening the sheet can't reach the internet (Google rule), so the menu is built here.
function onOpen() { menu_(); }
function setupSync() { return sync_('setupSync'); }
function syncAll() { return sync_('syncAll'); }
function checkSync() { return sync_('checkSync'); }
function pull() { return sync_('pull'); }
function onEditSync(e) { return sync_('onEditSync', e); }

function sync_(name, arg) {
  var api = code_(name === 'setupSync');
  if (name === 'pull') heal_();
  return api[name](arg);
}

// Fresh code at most 2 minutes old; if the LMS can't be reached, the last good copy (up to 6 hours).
function code_(askKey) {
  var props = PropertiesService.getScriptProperties(), cache = CacheService.getScriptCache();
  var key = props.getProperty('KEY');
  if (!key && askKey) {
    var ui = SpreadsheetApp.getUi(), k = ui.prompt('Sync key', 'Paste the SHEETS_SYNC_SECRET from Vercel (LMS project):', ui.ButtonSet.OK_CANCEL);
    if (k.getSelectedButton() !== ui.Button.OK) throw new Error('No sync key');
    props.setProperty('KEY', key = k.getResponseText().trim());
  }
  var text = cache.get('fresh_' + BOOK);
  if (!text && key) {
    try {
      var res = UrlFetchApp.fetch(SCRIPT_URL + BOOK, { headers: { 'x-sheets-key': key }, muteHttpExceptions: true });
      if (res.getResponseCode() === 200) {
        text = res.getContentText();
        cache.put('fresh_' + BOOK, text, 120);
        cache.put('good_' + BOOK, text, 21600);
      } else if (res.getResponseCode() === 401) {
        mark_('The LMS rejected the sync key. Menu → Beyond Tatva sync → Set up sync, paste the current key.');
        props.deleteProperty('KEY');
      }
    } catch (err) { console.warn('loader: LMS unreachable', err); }
  }
  text = text || cache.get('good_' + BOOK);
  if (!text) {
    mark_('Could not download the sync code from the LMS. It retries every 5 minutes.');
    throw new Error('Sync code not available');
  }
  return new Function(text + '\nreturn { onOpen: onOpen, setupSync: setupSync, syncAll: syncAll, checkSync: checkSync, pull: pull, onEditSync: onEditSync };')();
}

// Google sometimes switches a timer off silently; the 5-minute refresh puts the on-edit timer back.
function heal_() {
  var has = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'onEditSync'; });
  if (!has) ScriptApp.newTrigger('onEditSync').forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();
}

function menu_() {
  SpreadsheetApp.getUi().createMenu('Beyond Tatva sync').addItem('Set up sync', 'setupSync').addItem('Sync now', 'syncAll')
    .addItem('Check sync (fix timers)', 'checkSync').addToUi();
}

function mark_(why) {
  var ss = SpreadsheetApp.getActive(), s = ss.getSheetByName('Leads') || ss.getSheets()[0], c = s.getRange(1, 1);
  c.setBackground('#f4cccc').setNote('❌ SYNC BROKEN (' + Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd MMM HH:mm') + '): ' + why);
}

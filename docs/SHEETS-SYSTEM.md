# Sheets ↔ LMS: how the system works (Chirag's manual)

_Agreed design, 2026-11-14. Status: School Outreach part is live; the School Leads Tracker part is being built
(step 3 of the CRM plan). If this file and the code disagree, tell Claude._

## The three places and who owns what
| Place | What it is | Main record for |
|---|---|---|
| **School Outreach** sheet (one row per school) | Sales to schools | Mirror of Studio → School outreach. LMS is the main record; the sheet is a comfortable way to edit it. |
| **School Leads Tracker** sheet (one **Leads** tab, one row per student, every school) | Parents/students after a workshop | Your working sheet for calling. Every row is also in the LMS. |
| **LMS / Studio** (Pipeline, Today, School outreach) | Everything joined: leads + accounts + payments + progress | Payments, sign-ups, Module 0 progress, and the history of every call logged in Studio. |

Old sheet **"Workshop Leads v2 … Srvk closed"** is an archive. Its sync is switched off (delete its two triggers).

## Everyday situations
### 1. A new school
- Add it **once**: a new row in the School Outreach sheet (or Studio → School outreach → Add a school).
- Within 5 minutes the LMS has it, and the **School dropdown in the Leads Tracker updates by itself**
  (the LMS writes the school list into Options column A). Don't type schools into Options by hand.
- One spelling everywhere = the School Outreach name. That's what makes "filter by school" work.

### 2. Workshop done at a school
- School Outreach: Workshop Status → **Workshop done**. After-workshop Status stays empty (= still following up).
- Enter the forms in the Leads tab: one row per student, **School first**.
- When you finish following up that school: After-workshop Status → **Closed** (or **Partner** if they sign a deal).
  Closed schools and their leads drop off Studio → Today.

### 3. Entering a lead (Leads tab)
- **Must have:** School, Student name, Parent phone (10 digits). A row without a phone can't sync (shown in a note on the row).
- It reaches the LMS **a few seconds after you stop typing** in the row. A hidden **ID** column links the row to the LMS.
- Same parent phone + same student name = the same lead (copies are merged). Brother/sister on one phone = kept as two leads.

### 4. Following up
- Status comes from the **Next step** dropdown:
  - **Enrolled** = won · **Closed** or **Not interested** = lost · anything else (Call, WhatsApp, Call back, Send payment link…) = **open**.
- **Next date**: when to contact next. Yellow when due; it also shows in Studio → Today.
- **Do not contact = Yes**: never shown for follow-up again, never messaged by automations.
- Logged a call in Studio → Today instead? Next step / Next date / Do not contact come back into the sheet within 5 minutes.

### 5. Adding options (Options tab)
- Any column in Options (WhatsApp outcome, Call outcome, Source, Device…) → **just add the word**. Dropdowns update. The LMS stores whatever you pick.
- **Next step** is the only one with a meaning for the LMS. A new word counts as **open**, unless it contains
  "enrolled" (won), "closed" or "not interested" (lost).
- **School** column in Options is filled by the LMS (see 1). Words typed there by hand are replaced.

### 6. Adding or renaming columns (Leads tab)
- **New column** anywhere: fine. It's saved in the LMS with the lead and shown in Studio. No code change.
- **Don't rename these** (the LMS reads them by name): School · Student name · Class · Parent phone · Parent name ·
  Student email · Next step · Next date · Paid? · Do not contact · LMS email · Source · ID.
  Renamed by mistake? Cell A1 turns red; rename it back.
- Column **order** doesn't matter. Moving columns is fine.

### 7. Columns the LMS fills (don't type there)
- **Paid?**: becomes **Yes** when the student pays on the LMS. Your "Pending" stays until then.
- **Signed up** / **Module 0**: added by the script at the right end; filled by the LMS.
- **ID** (hidden): the link. Never edit or delete.

### 8. Removing a lead
- **Don't delete rows** in the sheet: the LMS still has the lead and puts the row back on the next refresh.
- To stop following someone: Next step → **Closed** or Do not contact → **Yes**.
- To really delete (wrong entry, test): Studio → Pipeline → the lead → Delete. The row leaves the sheet within 5 minutes.

### 9. Website / WhatsApp leads
- Leads from the website or Loki chat appear in the Leads tab automatically, Source = Website, School empty.
  Type a School if you learn it.

### 10. Is it working?
- **Cell A1** of each synced tab: note "✅ Synced with the LMS <time>". **Red** = broken, the note says why.
- Menu **Beyond Tatva sync → Check sync**: tests the key, repairs the timers, syncs now.
- Timers (Extensions → Apps Script → ⏰): exactly one `pull` (every 5 minutes) and one `onEditSync` (on edit).

### 11. Tabs the sync ignores
Follow-ups, Summary, Options (except the School list), How to use, and any tab whose header has no "Parent phone".
Add your own analysis tabs freely.

## In Studio (CRM), once built
- Pipeline: filter by **School, Status (open/won/lost), Class, Source, Due today**, search; **group by school** with
  forms → paid and conversion %.
- Today: school filter; won/lost leads never show.
- School outreach: each school shows its lead numbers.
- Filters live in the address bar (e.g. `/admin/pipeline?school=SRVK&status=open`), so they can be bookmarked.

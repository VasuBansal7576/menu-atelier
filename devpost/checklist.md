---
doc: checklist
status: approved
approval_basis: user-authorized autonomous execution on 2026-10-26, not a separate document review
---
# Build checklist

Build mode: fast, adapted to the user's express autonomy grant. Agent verification does not stand in for the user's final grading.

## Slices

- [x] **1. Edit a dish price and download the updated designed PDF**
  Becomes usable: The owner edits a menu, chooses a template and downloads the current PDF.
  Why now: Proves the user's unique kernel before expanding imports.
  PRD ref: `prd.md > The Core Journey`, `prd.md > Edit menu content`, `prd.md > Export`
  Spec ref: `spec.md > Menu model`, `spec.md > Layout registry and page engine`, `spec.md > PDF exporter`
  Build: Create the browser app, numeric model, edit controls, four templates, pagination and PDF export.
  Verify (mechanical): Start the app, edit a real price, download PDF, extract the changed text and render its pages for inspection.
  Learner check: Open the studio, change a price and grade whether the designed result is usable.
  Commit: `Build editable menu studio with shared preview and PDF layout`

- [x] **2. Import a menu without losing correctness or draft work**
  Becomes usable: The owner uploads or pastes a menu, reviews the candidate and confirms it.
  Why now: Tests the highest-risk external data boundary on a working edit/export loop.
  PRD ref: `prd.md > Source import and review`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Import adapters`, `spec.md > Data Model`
  Build: Add text, CSV, JSON, PDF and image adapters, validation, import review, history, local persistence and data export.
  Verify (mechanical): Import a valid file and a malformed file. Confirm prices, review warnings, cancel safety, undo and persistence. Exercise actual PDF and image files.
  Learner check: Import one of your own menus and check the recognized dishes and prices before accepting it.
  Commit: `Add reviewed menu imports and durable local drafts`

- [x] **3. Grade three sourced restaurant redesigns**
  Becomes usable: The owner loads official restaurant excerpts and compares distinct designs and usable PDFs.
  Why now: Demonstrates visual quality with real input and preserves source evidence.
  PRD ref: `prd.md > Real restaurant examples`, `prd.md > Choose a design`
  Spec ref: `spec.md > Layout registry and page engine`, `spec.md > Browser studio`
  Build: Integrate attributed input examples, finalize visual details and responsive behavior, capture a real demo and package deliverables.
  Verify (mechanical): Check source names and prices, browser rendering, actual exported PDFs, layout pagination, mobile controls and independent review.
  Learner check: Grade the supplied PDFs and the running studio for design, speed, correctness and uniqueness.
  Commit: `Add sourced restaurant demonstrations and delivery evidence`

## Hands-on Checkpoints

- [ ] Early usable behavior explored by learner. Deferred by the user's autonomous delivery request. Agent browser checks are tracked separately.
- [ ] Final kick-the-tires exploration and feedback completed. Awaiting user grading after delivery.

## Final Review

- [ ] Final review complete. The user has not yet graded the result or confirmed readiness.

## Code Tour and App Map

- [ ] Learning activity complete. No learner activity or reflection is claimed.
- [ ] Optional edit and transfer reflection addressed. Not yet offered during user grading.
- [x] `devpost/app-map.html` generated from finished code and checked. The reference map is provided for user review.

Activity and evidence: Agent will provide a reference-only app map and actual verification artifacts. User activity remains pending.
Route and stops: Reference route through app.js updateItem/commit, model.js parsePrice, layout.js layoutMenu/renderSVG, and export.js renderPDF. No live learner tour is claimed.
Edit outcome: No learner edit yet.
Reflection: No answer supplied. Do not invent one.
Activity mode: Reference-only handoff under the autonomy grant.

## Revisions

- Repeated interview and approval pauses are adapted to the user's explicit request to complete the whole build autonomously. Their specific menu workflow and quality criteria remain the product requirements. No learner interviews, approvals or learning outcomes are fabricated.

- Agent verification passed26 tests after independent review repairs. The12 final PDFs and154.52-second actual browser demo are prepared. User grading remains pending.

## Design recovery after user rejection

Previous mechanical checks remain historical evidence. The user rejected the original studio and menu appearance on 2026-10-26. Final review remains incomplete.

- [x] **4. Replace studio and prove one embedded-font menu**
  Becomes usable: A larger canvas and one task rail expose direct editing and a materially redesigned printable menu.
  Why now: The existing visual result failed the user's grading.
  PRD ref: `prd.md > Screens and Layout`, `prd.md > Look and Feel`
  Spec ref: `spec.md > Look and Feel`, `spec.md > Design recovery on 2026-10-26`
  Build: Preserve data/import/history. Add licensed font measurement and a shared vector scene consumed by SVG and pdf-lib.
  Verify (mechanical): Render the first PDF, inspect its actual typography, extract exact source names, currency and an edited price.
  Learner check: Pending the user's final design grading. No approval is invented.
  Commit: `Redesign studio and embed measured menu typography`

- [ ] **5. Complete four compositions and verify release**
  Becomes usable: Owners can import, edit, switch among four distinct designs and export dependable PDFs.
  Why now: The first print pilot establishes the typography contract before expanding the collection.
  PRD ref: `prd.md > Choose a design`, `prd.md > Export`, `prd.md > Real restaurant examples`
  Spec ref: `spec.md > Layout registry and page engine`, `spec.md > Browser studio`
  Build: Complete adaptive compositions and mobile editing. Refresh grading artifacts, documentation and demo.
  Verify (mechanical): Test source PDF and image imports, malformed input, history, persistence and JSON roundtrip. Render all final PDFs. Obtain independent adversarial and scoped source reviews. Verify the existing private deployment.
  Learner check: Grade the updated studio and actual PDF collection. Final acceptance remains pending.
  Commit: `Complete redesigned collection and verified grading release`

- Redesign mechanical verification passes29 tests. Independent review verified12 saved PDFs and571 text runs. The original design remains recorded as failed. The new143.50-second original-brand demo is prepared. User grading and learner-authored submission remain pending.

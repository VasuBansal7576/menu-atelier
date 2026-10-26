---
doc: checklist
status: approved
approval_basis: user-authorized autonomous execution on 2026-10-26, not a separate document review
---
# Build checklist

Build mode: fast, adapted to the user's express autonomy grant. Agent verification does not stand in for the user's final grading.

## Slices

- [ ] **1. Edit a dish price and download the updated designed PDF**
  Becomes usable: The owner edits a menu, chooses a template and downloads the current PDF.
  Why now: Proves the user's unique kernel before expanding imports.
  PRD ref: `prd.md > The Core Journey`, `prd.md > Edit menu content`, `prd.md > Export`
  Spec ref: `spec.md > Menu model`, `spec.md > Layout registry and page engine`, `spec.md > PDF exporter`
  Build: Create the browser app, numeric model, edit controls, four templates, pagination and PDF export.
  Verify (mechanical): Start the app, edit a real price, download PDF, extract the changed text and render its pages for inspection.
  Learner check: Open the studio, change a price and grade whether the designed result is usable.
  Commit: `Build editable menu studio with shared preview and PDF layout`

- [ ] **2. Import a menu without losing correctness or draft work**
  Becomes usable: The owner uploads or pastes a menu, reviews the candidate and confirms it.
  Why now: Tests the highest-risk external data boundary on a working edit/export loop.
  PRD ref: `prd.md > Source import and review`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Import adapters`, `spec.md > Data Model`
  Build: Add text, CSV, JSON, PDF and image adapters, validation, import review, history, local persistence and data export.
  Verify (mechanical): Import a valid file and a malformed file. Confirm prices, review warnings, cancel safety, undo and persistence. Exercise actual PDF and image files.
  Learner check: Import one of your own menus and check the recognized dishes and prices before accepting it.
  Commit: `Add reviewed menu imports and durable local drafts`

- [ ] **3. Grade three sourced restaurant redesigns**
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
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown.

Activity and evidence: Agent will provide a reference-only app map and actual verification artifacts. User activity remains pending.
Route and stops: To be filled from final implementation paths.
Edit outcome: No learner edit yet.
Reflection: No answer supplied. Do not invent one.
Activity mode: Reference-only handoff under the autonomy grant.

## Revisions

- Repeated interview and approval pauses are adapted to the user's explicit request to complete the whole build autonomously. Their specific menu workflow and quality criteria remain the product requirements. No learner interviews, approvals or learning outcomes are fabricated.

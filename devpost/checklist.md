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

- Agent verification passed26 tests after independent review repairs. The 12 final PDFs and 154.52-second actual browser demo are prepared. User grading remains pending.

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

## Second visual rejection and taste reset

The user rejected the redesigned appearance as well. Its passing29 tests and favorable agent reviews did not meet the design requirement. The next slice tests the shared failed premise against primary visual references before production changes.

- [x] **6. Prove a restaurant identity and direct-editing pilot**
  Becomes usable: One real restaurant menu has a coherent visual identity and a direct price-edit-to-PDF journey in a redesigned creative workspace.
  Why now: Both previous visual iterations failed user grading. Repeating their template premise is inadequate.
  PRD ref: `prd.md > Look and Feel`, `prd.md > Screens and Layout`
  Spec ref: `spec.md > Design recovery on 2026-10-26`, `spec.md > Layout registry and page engine`
  Build: Compare two isolated art-directed pilots using exact source dishes. Inspect an actual PDF before promoting a direction. Use original or licensed assets and preserve structured data.
  Verify (mechanical): Match all source names/prices, edit a price in the browser, extract it from the actual exported PDF and inspect the physical print layout. Compare against the rejected screenshots and actual references.
  Learner check: The user grades the new design. No agent score or technical test substitutes for this.
  Commit: `Build an art-directed restaurant identity and direct-editing studio`


- [x] **7. Integrate the selected creative workspace and curated compositions**
  Becomes usable: Owners import their actual menus, edit a price beside the printed dish, choose a coherent composition and export the same measured document.
  Why now: The refined pilot resolves the concrete visual and interaction defects before generalizing the product.
  PRD ref: `prd.md > Screens and Layout`, `prd.md > Look and Feel`, `prd.md > Source import and review`
  Spec ref: `spec.md > Production taste reset`, `spec.md > Data Model`, `spec.md > Browser studio`
  Build: Keep the validated model, import generations, durable history and shared PDF scene. Integrate the anchored editor and four distinct measured compositions with original graphics.
  Verify (mechanical): Exercise all three sources, reordered/missing categories, added dishes, long content, dense pagination, invalid input, undo, reload, JSON restore and phone editing. Inspect actual exported PDFs and independently review the final product. Refresh the real demo, approved repository and existing private deployment.
  Learner check: Grade the final studio and actual restaurant menus. No agent inspection replaces the user's taste judgment.
  Commit: `Integrate direct paper editing and art-directed menu compositions`

Current slice 7 mechanical release is complete. All 40 tests pass. The 12 exports contain 15 verified pages. Software commit `b64de60d7df71559bedaf62a1736155f787e176c` is deployed to the existing owner-private Site and was exercised after deployment. Both prior design failures remain failed. Current user taste grading, learner Final Review, public YouTube/Vimeo upload and entrant-authored submission remain pending.

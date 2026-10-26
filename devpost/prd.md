---
doc: prd
status: approved
approval_basis: user-authorized autonomous execution on 2026-10-26, not a separate document review
---
# Restaurant menu studio product requirements

Implements `scope.md > The Core Loop` and `scope.md > The Unique Kernel`.

## The Core Journey
1. The owner opens a studio with an editable demonstration menu and a visible import action.
2. The owner uploads a menu or pastes its text.
3. The studio presents recognized sections, dish names, descriptions and prices for review. It does not silently replace the draft.
4. The owner confirms the import, chooses a design and edits a price or dish.
5. The designed preview updates immediately and fits text into pages.
6. The owner exports a PDF and can verify the updated price in the downloaded file.
7. The draft survives a reload on the same browser.

## Screens and Layout
One main studio with a compact toolbar, one task rail, and a large document canvas. The rail switches among design, content and document settings. Selecting a dish opens its fields in that rail. Import and export use focused dialogs. Phone navigation preserves access to every editing task. This revised arrangement is agent-selected under the autonomy grant after the user rejected the previous studio.

## Look and Feel
The previous warm olive studio failed user design acceptance. Recovery uses a quiet neutral publishing workspace, a larger paper canvas and readable controls. Four independent compositions use licensed local fonts. Maison is a wine-ink brasserie with balanced columns. Edition has bold sans typography and a category rail. Mercato uses expressive Italian display type, full-width category groups and paired dishes. Broadside uses condensed headlines and section bands. Composition must adapt to restaurant names, long dishes and dense menus. It must never hardcode a restaurant title split. Actual selectable PDFs use the same font bytes, measured line breaks and positions as the preview. Final appearance remains for the user to grade.

## Features and Behavior

### Source import and review
Accept TXT, CSV, JSON, PDFs with a text layer and supported raster images. Clearly identify OCR processing and its limits. Review before replacing the active menu. Ambiguous or missing prices remain visibly reviewable. Never invent a dish, price or dietary claim. Reject malformed files with a useful message and retain existing work.

### Edit menu content
Edit restaurant name, subtitle, category names, dish names, descriptions, prices and dietary tags. Add and remove dishes and categories. Use numeric prices and the selected currency. Undo restores the previous state. A price edit updates the menu preview without an external request.

### Choose a design
At least four distinct menu templates. Preserve all content and prices when switching. Support readable page sizes and density. Paginate long content instead of clipping it. No dish may disappear between preview and PDF.

### Export
Download an actual PDF with selectable text and the latest content. Export JSON for backup and reimport. Include a print route if useful, but do not substitute a print dialog for a downloadable PDF.

### Real restaurant examples
Offer three attributed, unofficial excerpts from official restaurant menu pages. Preserve names and prices from the source snapshot. State that examples are demonstrations and not affiliated with restaurants. Provide source links and downloadable input files.

## States and Boundaries
First use starts with a useful demonstration. Import processing shows progress. Import errors preserve the current draft. Empty categories and menus have actionable controls. Invalid price input cannot enter the saved numeric model. Local-storage errors disclose that saving failed. Export errors remain recoverable.

## Product Decisions
The user selected restaurant menus, direct editing, actual price-change evidence and usable PDF output. The user requested optimized software, unique designs and real menu examples. All other visual and implementation choices are agent decisions under the explicit autonomy grant.

## What We're Building
The core journey above, accessible controls, keyboard access, responsive layout, correct exports and an evidence package for grading.

## Deferred From the POC
Cloud sync and real-time collaboration require account and access design and do not prove the core loop. Generative rewriting of dishes is excluded because it can alter restaurant facts.

## Open Questions
Final visual grading remains with the user. Eligibility, personal submission reflections and public submission access cannot be inferred from the build.

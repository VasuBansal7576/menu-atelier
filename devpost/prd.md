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
A paper-first creative workspace keeps import, source, history and export easy to reach. Composition choices use current-menu visual previews in a compact picker. The full inventory has a separate view. Selecting a dish opens a compact price editor anchored to its printed amount. Name, description, tags and category edits are secondary details. Restaurant, paper and footer settings use focused dialogs. On a phone, the price editor becomes a focused bottom panel that names the selected dish. Controls remain available while the document scrolls.

## Look and Feel

The user rejected three previous visual releases, then rejected generated imagery. The current print system contains no image-generation assets. Each retained composition owns a different page architecture. Market Bloom uses a vivid produce poster and category lanes. Folio uses a large typographic identity and editorial rows. Sunroom uses a landscape identity island. Night Press uses a dark landscape dish grid. Original program-drawn vectors and embedded licensed fonts supply the visual language.

The paper-first studio retains direct editing beside the actual printed price, with readable default widths for portrait and landscape. Exact names, prices and selectable text remain mandatory. Actual PDF pilots precede integration. User taste grading remains pending.

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

## Taste reset after the second rejection

The user rejected the first redesign as well. The next direction must establish a restaurant identity through composition, typography and purposeful original graphics. A creative workspace must make the printed dish and its edit feel directly connected. Two isolated pilots will be compared against primary visual references. One actual restaurant PDF and its edit loop must be inspected before expanding the collection. The existing four-template count is an agent-selected implementation detail, not a user requirement. The core menu workflow and all source examples remain required.

## Latest delivery steering

The user authorized a narrated video, upload and autonomous entry preparation. They subsequently selected Keep the video local at the YouTube terms confirmation. Preserve that later decision. The public-video requirement is unmet, and no valid final entry may be claimed. Country India, city Sangrur, state Punjab, solo team name Newgen Labs were supplied for entry preparation. Personal reflections and eligibility must not be invented.

## Brief-based generation revision

The user requested a Gamma-inspired system after rejecting previous fixed-design results. The new interaction is source menu plus owner brief, up to three measured directions, explicit application, refinement and editable PDF export. Hard portrait or landscape constraints return only matching architectures. Generation uses the selected A4 or Letter stock.

The authoritative menu remains separate from a version 1 design recipe in settings. A recipe carries its stable architecture, palette, motif, descriptive type category, density, seed, brief and rationale. Applying a recipe cannot alter source text, font metrics, glyph positions, hit targets or prices. Both the composition and density must match the saved settings. Unknown fields, invalid colors, insufficient text contrast and invalid enums are rejected before state mutation. Undo and JSON backup retain the complete recipe.

This is local procedural generation over four architectures. It does not provide Gamma's runtime model agent, arbitrary font generation or unrestricted layouts. An optional downloaded prompt and strict recipe import support an external AI art director without automatically transmitting the menu. All current visual assets are original code-rendered vectors. No image generation is used.

The current software has 43 passing checks and seven additional actual generated restaurant PDFs. Real browser acceptance includes applying a generated direction, editing a price to $16.75, downloading the PDF, extracting its selectable changed amount, downloading a JSON backup, reload persistence, invalid price rejection and a narrow mobile viewport. User taste remains unverified. The new narrated video remains local. Public video and Devpost submission requirements are unmet.

## Ten-minute print-system replacement

Following another failed taste review, replace poster compositions with a measured editorial grammar. Carta has full-width rows, Maison balanced brasserie columns, Gazette three landscape category columns, and Service two landscape columns. Preserve stable recipe IDs, integer prices, import review, history and native PDF. Keep typography and hierarchy independent from source facts. No runtime AI or generated images. Previous visual acceptance remains failed; this candidate awaits the user's grade. The earlier local video depicts the prior print system.

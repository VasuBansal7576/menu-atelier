---
doc: spec
status: approved
approval_basis: user-authorized autonomous execution on 2026-10-26, not a separate document review
---
# Restaurant menu studio technical specification

## How This Works, In Plain Language
The app reads a menu into categories and dishes. The editor changes that data. One layout engine arranges the same data into pages for the preview and downloadable PDF. Changing a price never requires regenerating an image or calling an AI service. The app saves the draft in this browser.

## The Core Journey Through the System
Implements `prd.md > The Core Journey`. An import adapter extracts text or reads structured input. A parser creates a reviewable candidate. Confirmation replaces the menu model. Edits update the model and page layout. Export draws the laid-out menu into a PDF. Draft storage reloads the validated model.

## Stack
Agent-selected under the autonomy grant. Buildless HTML, CSS and browser JavaScript keep startup and deployment simple. pdf-lib with @pdf-lib/fontkit produces real vector PDF files with embedded licensed fonts. Fontkit measures the same static font bytes used by the SVG preview and PDF. PDF.js extracts PDF text. Tesseract.js performs optional OCR in a worker. Heavy import libraries load only when required. Vendor dependencies locally where practical and include their license notices. Use Node's built-in tests for pure parser and validation behavior. Use a real browser for integrated verification.

Official dependency documentation must be checked when integrated. Main sources are https://github.com/Hopding/pdf-lib, https://mozilla.github.io/pdf.js/, and https://github.com/naptha/tesseract.js.

## Where It Runs and How Someone Tries It
Run `npm start` from the project. Open the printed localhost URL. No API key is required for the core journey. A private Sites deployment gives the owner a grading link. Public repository and public demo video are separate hackathon requirements and are not replaced by deployment.

## Look and Feel
Implements `prd.md > Look and Feel`. Use a paper-first studio with an anchored price editor and secondary details/settings dialogs. Keep template identifiers atelier, trattoria, botanical and midnight to preserve existing preference and backup contracts. Their current compositions are Folio, Market Bloom, Sunroom and Night Press. Use vendored static fonts and their OFL notices. The layout engine emits immutable pages with final text lines, font IDs, measured widths and positions in points. Preview and PDF consume those exact pages. Export does not reflow or transliterate source text. Coverage and fit errors reject a candidate before history or persistence. Respect reduced motion and readable focus indicators.

## Components

### Menu model
Owns valid menu data, price boundaries and history. Implements `prd.md > Edit menu content`.

### Import adapters
Own TXT, CSV, JSON, PDF and image boundaries. Parse into a candidate and warnings. Implements `prd.md > Source import and review`.

### Layout registry and page engine
Own template constants, item wrapping and pagination. Both renderers use their positions. Implements `prd.md > Choose a design`.

### Browser studio
Owns controls, dialogs, accessible feedback, persistence and preview interaction. Implements the full core journey.

### PDF exporter
Draws selectable text and code-rendered vectors using the current layout. Implements `prd.md > Export`.

## Data Model
Menu has schemaVersion, id, name, subtitle, currency, footer, source metadata, and ordered sections. Section has id, name, and ordered items. Item has id, name, description, price in integer minor currency units, and explicit tags. Import adapters normalize external decimal prices once. Template selection, page format and density belong to presentation settings, not dish data. History snapshots support undo. Validate storage and imports at their boundaries.

## File Structure
`dist/index.html` is the entry point. `dist/styles.css` defines the studio. Browser modules in `dist/` own menu data, import, layout and export. `dist/vendor/` contains browser dependencies. `dist/examples/` holds sourced sample inputs. `scripts/` contains launch and verification tools. `devpost/` contains planning and the app map. `research/` contains source evidence. `outputs/` contains screenshots, PDFs and demo evidence.

## External Services and Dependencies
No runtime generative API is required. AI is used to build and design the software through the required coding skills. The product must not falsely label its deterministic parser as generative AI. OCR may require an initial model download unless vendored. Sites is optional owner-private hosting.

## Important Failure Modes
OCR can misread prices. Always present a review step. PDF extraction can be empty for a scanned page. Offer OCR or pasted text and retain the draft. Long descriptions can exceed a page. Wrap and paginate explicitly, then verify exported pages. Unsupported characters need an explicit supported font or clear fallback.

## What Was Simplified and Why
Local draft storage avoids accounts. A small template registry replaces unconstrained AI layout generation so outputs remain editable and reproducible. Source excerpts keep the demonstration compact and attributable.

## Decisions and Open Issues
No learner uncertainty was stated, so none is invented. The main engineering uncertainty is whether preview and PDF stay consistent after edits and pagination. Verify actual downloaded PDF text and rendered pages. The user's final grading and public submission steps remain separate from agent verification.

## Public source and demonstration

The public source repository is https://github.com/VasuBansal7576/menu-atelier under the user's explicit publication authorization. The existing Site remains owner-private. The latest 98.20-second narrated demonstration is local only at the user's later request. It is excluded from dist and the public source. No YouTube upload or Devpost entry is claimed.

## Code-only print architecture

The user rejected the shared page-engine premise after three visual releases. The extracted print-kit owns font metrics, wrapping, text records and dish shaping. Two scene modules own four independent page architectures. The registry maps stable backup IDs to current designs. layoutMenu validates supported glyphs, delegates composition and normalizes physical page metadata. Immutable scenes retain exact item/section IDs, text roles, advances and ink bounds. The anchored editor uses price records through the SVG screen matrix. PDF consumes those same records.

The current scene vocabulary is text, rectangle, line and ellipse. No generated raster image assets or external runtime asset service are required. Public thumbnails come from actual PDF rasterization. Long text flows or rejects explicitly before history or storage mutation. Failed imports and invalid pending edits retain prior valid work.

## Narrated demonstration and submission boundary

The local recording shows original fictional restaurant content, mandatory import review, design choices, a real12to14.50 price change, actual PDF export and JSON backup. Footage consists of captured working browser states edited to original synthetic narration. It contains no third-party restaurant branding or music. Public upload was declined. The mandatory YouTube/Vimeo link is absent. Devpost's Create project action timed out on reCAPTCHA. Do not bypass that check or report an entry as created or submitted.

## Brief-based generation revision

The user requested a Gamma-inspired system after rejecting previous fixed-design results. The new interaction is source menu plus owner brief, up to three measured directions, explicit application, refinement and editable PDF export. Hard portrait or landscape constraints return only matching architectures. Generation uses the selected A4 or Letter stock.

The authoritative menu remains separate from a version 1 design recipe in settings. A recipe carries its stable architecture, palette, motif, descriptive type category, density, seed, brief and rationale. Applying a recipe cannot alter source text, font metrics, glyph positions, hit targets or prices. Both the composition and density must match the saved settings. Unknown fields, invalid colors, insufficient text contrast and invalid enums are rejected before state mutation. Undo and JSON backup retain the complete recipe.

This is local procedural generation over four architectures. It does not provide Gamma's runtime model agent, arbitrary font generation or unrestricted layouts. An optional downloaded prompt and strict recipe import support an external AI art director without automatically transmitting the menu. All current visual assets are original code-rendered vectors. No image generation is used.

The current software has 43 passing checks and seven additional actual generated restaurant PDFs. Real browser acceptance includes applying a generated direction, editing a price to $16.75, downloading the PDF, extracting its selectable changed amount, downloading a JSON backup, reload persistence, invalid price rejection and a narrow mobile viewport. User taste remains unverified. The new narrated video remains local. Public video and Devpost submission requirements are unmet.

## Ten-minute print-system replacement

Following another failed taste review, replace poster compositions with a measured editorial grammar. Carta has full-width rows, Maison balanced brasserie columns, Gazette three landscape category columns, and Service two landscape columns. Preserve stable recipe IDs, integer prices, import review, history and native PDF. Keep typography and hierarchy independent from source facts. No runtime AI or generated images. Previous visual acceptance remains failed; this candidate awaits the user's grade. The earlier local video depicts the prior print system.

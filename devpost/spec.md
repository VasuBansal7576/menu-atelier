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
Implements `prd.md > Look and Feel`. Use a paper-first studio with an anchored price editor and secondary details/settings dialogs. Keep template identifiers atelier, trattoria, botanical and midnight to preserve existing preference and backup contracts. Their current compositions are Herbarium, Osteria, Counter and Table cards. Use vendored static fonts and their OFL notices. The layout engine emits immutable pages with final text lines, font IDs, measured widths and positions in points. Preview and PDF consume those exact pages. Export does not reflow or transliterate source text. Coverage and fit errors reject a candidate before history or persistence. Respect reduced motion and readable focus indicators.

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
Draws selectable text and vector ornaments using the current layout. Implements `prd.md > Export`.

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

The user approved public repository publication under VasuBansal7576. Source and planning files are at [https://github.com/VasuBansal7576/menu-atelier](https://github.com/VasuBansal7576/menu-atelier). The actual browser demo is at `dist/grading/demo.mp4` in the repository. The owner-private website retains its current audience. A public YouTube or Vimeo upload and the final entrant submission remain separate steps.

## Design recovery on 2026-10-26

The user rejected the original appearance. The first two runnable alternatives selected a single-rail studio. The user rejected that result. The second recovery compared new physical print pilots, rejected both initial candidates, then refined a paper-first direction with an editor beside the actual printed price. The selected architecture preserves model/import/history and replaces typography, composition and the PDF adapter. Functional tests are regression evidence, not visual acceptance. A first real embedded-font PDF precedes expansion to all designs. Final verification includes actual source imports, rendered PDFs, source-price extraction, responsive editing and independent adversarial review.

## Taste reset architecture boundary

Keep schemaVersion1, integer prices, import review, history and the verified font/PDF geometry contract. The previously selected studio and all four visual templates failed user acceptance. Isolated pilots may add purposeful illustration, image or rotation support to the shared scene. The selected implementation must preserve the same graphic positions in SVG and PDF, preserve selectable text and disclose asset provenance. Revise the implementation plan before production edits after the pilot comparison.

## Production taste reset

The refined B pilot supplies the selected visual and editing basis. A composition registry owns physical formats, identity graphics and measured regions. Shared DishBlock records own text roles, glyph bounds, price gutters and pagination. Pages remain immutable. Each text price retains its item and section IDs and a role of price so the browser can position its editor using the actual SVG screen matrix. The UI keeps createHistory as the sole committed owner. A dish edit session holds a validated temporary draft, updates the preview, and commits once when finished. Escape cancels it. All navigation and export boundaries finish a valid session or block invalid input.

Only original or properly licensed graphics enter the application. The generated ink illustration has a retained prompt and hash. SVG and PDF use the same asset, alpha and placement. Reference designers' copyrighted branding and photography remain research material. The official demonstration uses original fictional restaurant content.

# Menu Atelier

A restaurant menu studio with editable source facts and native PDF export.

## Current print system

The previous poster designs failed user acceptance. The new editorial system uses four print grammars. Carta uses full-width Italian rows and a dedicated price lane. Maison uses a centered brasserie identity and balanced category columns. Gazette uses three category columns on landscape paper. Service uses a condensed identity and two landscape columns. Column placement considers measured category and dish heights. All text remains editable and selectable.

[Studio](https://menu-atelier-vasu-oct26.zippy17.chatgpt.site/) · [Six current restaurant studies](https://menu-atelier-vasu-oct26.zippy17.chatgpt.site/generated/) · [Base print library](https://menu-atelier-vasu-oct26.zippy17.chatgpt.site/grading/)

Import a menu, review names and exact prices, choose or generate a direction, click a printed price to edit it, and export PDF or JSON. The recipe, menu, undo history and browser draft remain separate from the measured printable scene. Prices use integer minor units. The SVG preview and PDF use the same font bytes and glyph metrics.

Generation is a bounded local grammar, not a runtime language model. The current system is typographic and uses no image generation. An external AI art-direction prompt and strict recipe import remain available. Current taste acceptance remains unverified.

## Run and verify

Use Node.js 22.13 or newer. Run `npm install`, `npm start` and open the printed localhost address. Run `npm test` for 43 checks covering source preservation, actual PDF geometry, unsupported glyphs, pagination, exact prices, imports, recipe validation, undo and backup restoration. No API key is needed for the core workflow.

`node scripts/generate-studies.mjs` reproduces six current restaurant PDFs, editable backups and actual PDF rasters. `node scripts/grade.mjs --publish-assets` reproduces twelve base architecture exports, including every continuation page. Poppler is needed for rasterization. `node scripts/demo-proof.mjs` reproduces the original price-change PDFs.

Root scope.md, prd.md and spec.md mirror devpost/. The required Devpost Learn Skill Pack was used during development. The source repository is public under VasuBansal7576. Third-party licenses and source snapshot attribution are retained in THIRD_PARTY_NOTICES.md and each example. Bianco uses the linked April 2023 menu.

The current 95-second [public narrated demo](https://www.youtube.com/watch?v=2v9OsLtVy4Y) shows the editorial print system, mandatory review, an exact $12.00 to $14.50 price edit, restyling and native PDF export. It uses edited actual browser captures and synthetic narration. The entrant authorized public publication on October 27. The Devpost entry is being completed. OCR is English and requires review. Unsupported scripts fail preflight without replacing valid work. No performance benchmark or physical-phone test is claimed.

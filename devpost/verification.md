# Verification record

The product is ready for the user's grading after the checks below. Hackathon submission and human review are separate states.

## User outcome evidence

| Requirement | Evidence | Result |
| --- | --- | --- |
| Import a genuine restaurant PDF | Browser file chooser uploaded the official Bianco April2023 PDF. outputs/browser/original-pdf-review.txt contains20 recognized dishes and explicit ambiguity warnings. | Verified locally. |
| Review before replacing work | Example and PDF import both opened a candidate review. Original draft remained until confirmation. | Verified in browser. |
| Direct price change | Browser changed Dishoom Vegetable Samosas from£7.90 to£9.25. outputs/browser/price-edited.jpg records the edit. | Verified. |
| Price reaches actual PDF | outputs/dishoom-atelier-before.pdf contains£7.90. outputs/dishoom-atelier-edited.pdf contains£9.25 and no£7.90. Independent reviewer confirmed all10 dishes. | Verified. |
| Downloadable PDF | Initial PDF saved through the visible export button. Subsequent edited bytes also came from the live app exporter. Browser download and asynchronous inspection tools stalled during those calls. Those delays are not app benchmarks. | Initial UI download verified. Repeated UI download remains unverified. |
| Design switch and persistence | Original Bianco Margherita changed22.00 to24.50, survived design switching and a new browser tab after preview server restart. | Verified in browser. |
| Invalid prices | Negative price prevented export and focused the highlighted field. outputs/browser/invalid-price-blocked.txt. | Verified in browser. |
| Image recognition | Real local Tesseract worker recovered10 Dishoom dish names and exact prices from a PNG in tests/ocr.test.mjs. | Engine integration verified. Separate browser OCR upload not yet observed. |
| Long content | Automated tests cover84 dishes, extreme names/descriptions, impossible repeated text and25-line footer treatment across templates and paper sizes. | Verified by behavior tests. |
| Failed edits preserve work | tests/app-layout.test.mjs checks layout failure before history/storage mutation, import review preservation and recovery from a previously impossible saved draft. | Verified. |
| Responsive layout |390px browser viewport had document scrollWidth390px. Screenshot outputs/browser/mobile.jpg. Examples and design entry points remain accessible. | Verified at tested breakpoint. |
| Real redesigned menus | outputs/grade contains12 PDFs and JSON backups from3 official excerpts across4 templates. Every source dish and price was independently checked in every PDF. | Verified. |
| Demo video | outputs/menu-atelier-demo.mp4 uses44 actual browser screencast frames. FFprobe reports154.52seconds. It shows source text import, review, editing, template switching and export. | Local video prepared. Public upload pending. |

## Review and corrections

Independent review found an unbounded pagination loop for a valid multiline footer and overflow from measuring labels before uppercase rendering. Both received source fixes and regressions. A later print inspection corrected unbalanced pizzeria columns, footer ornament overlap and page-counter border clearance. Final PDFs were regenerated after print corrections.

The parent also caught an occupied preview port before accepting a startup claim. The studio uses4387. No unrelated server was stopped. A PDF inspection config initially substituted the wrong font. Re-rendering with the system font configuration restored the actual serif output. These corrections are recorded in the local decision trail.

## Practical limits

PDF output uses Western Latin fonts. Unsupported glyphs block export explicitly. OCR is English and requires manual review. PDF extraction does not guarantee arbitrary column reconstruction. Prices and availability in restaurant examples are snapshots. No generative AI service is called at runtime. AI was used for planning, implementation, design and verification through the required coding skills.

No production speedup or browser latency benchmark is claimed. The editor has no framework runtime or network call on the edit path. PDF extraction, PDF export and OCR libraries load on demand. All runtime dependencies and English OCR assets are local static files.

## Hackathon status

The official Learn Skill Pack was installed and consulted. Planning files were written before application implementation. The user's express autonomy grant adapted the curriculum's repeated interview and approval pauses. No unperformed learner interview, reflection or final grading is recorded as completed. A public repository, a public YouTube or Vimeo video, learner-authored submission answers and the final Devpost submission remain separate release steps.

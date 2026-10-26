# Verification record

The user rejected both previous visual releases. Their passing tests and favorable agent reviews did not establish design quality. The current release replaces the form rail with a paper-first workspace and editing beside the printed price. It adds four physical compositions and original artwork. User taste acceptance remains pending.

## Current evidence

| Requirement | Evidence | Result |
| --- | --- | --- |
| Actual restaurant import | Parent uploaded the original Bianco PDF through the browser file chooser. Mandatory review showed20 dishes and original amounts. The repaired layout exports those20 dishes on2 readable sheets. | Browser import and actual repair PDFs verified. |
| Review before replacement | Parent pasted the original Olive & Ember TXT. Review showed all9 names, descriptions and prices before confirmation. | Verified in the integrated browser and recording. |
| Direct price editing | Whipped ricotta changed from$12.00 to$14.50 beside its printed price. Enter saved one history action. Undo restored$12.00 and Redo restored$14.50. | Verified in the integrated browser. |
| Invalid input | Three-decimal24.999 remained highlighted and blocked the actual Export action. Escape restored the prior valid price. | Browser and regression verified. |
| Actual selectable PDF | `olive-and-ember-before.pdf` and `olive-and-ember-price-change.pdf` preserve all9 names and descriptions. Independent extraction confirms that only Whipped ricotta changes1200→1450 minor units. The edited file has no$12.00 and has two$14.50 prices. | Saved PDF bytes verified. Reproduce with `node scripts/demo-proof.mjs`. |
| Export action | Actual browser Export returned completed feedback during the recording. The same exporter generated independently inspected PDF bytes. | UI action and exporter verified. Repeated physical browser file saving was not independently observed. |
| Phone-width editing | At390×844, document width remained390. The editor occupied x8..382 and ended at836. An entered$15.25 survived Enter and reload. | Tested browser viewport. No physical-phone claim. |
| Secondary content controls | Parent added, named, described, priced and removed a dish. Undo restored it. Table-card stock settings showed actual A5 and Half Letter dimensions. | Verified in the integrated browser. |
| OCR and source correctness | Real local OCR recovers10 fixture dishes and exact prices. PDF extraction retains20 official source dishes. Source JSON/TXT, malformed data, history, stale import cancellation and captured currency have regressions. | Included in40 passing tests. OCR browser flow was verified in the prior release; its adapter is unchanged. |
| Four compositions | Osteria uses an asymmetric dining sheet. Herbarium uses original ink artwork and measured columns. Counter is a landscape category index. Table cards use A5 or Half Letter. | Actual PDF rasters inspected. User taste pending. |
| Complete collection |12 source/template exports have15 pages. Every page has an actual PDF raster, correct dimensions, source link and editable backup. All names/prices and embedded fonts pass independent saved-file checks. | `scripts/verify-grading.py` and `dist/grading/verification.json`. |
| Geometry | Independent verification before the final bounded Counter adjustment matched596 saved gallery text runs and914 runs including repair artifacts to scene values, baselines, x positions and advances. Final Counter and actual-PDF geometry regressions pass. | Real PDF geometry verified. |
| Actual demonstration |31 actual browser screencast frames, long holds shortened, no third-party restaurant branding or music. H.2641360×1000,93.50 seconds. | `dist/grading/demo.mp4`. Public YouTube/Vimeo upload remains pending. |

## Review corrections

Two initial art-directed pilots did not pass the full gate. The second supplied a basis for refinement after its price association, typography and form rail were corrected. No numerical agent score was used as design acceptance.

Two fresh adversarial reviewers independently found sparse continuation sheets and subtitles crossing identity artwork. Shared region flow now reclaims unused paper, repeats headings and uses wider Osteria continuation columns. Bianco Herbarium changes from2 sheets to1. The original20-dish Bianco import changes from3 sheets to2. Both illustrated headers reserve artwork space on A4 and Letter. Long fragmented fields retain complete selectable text. A final measured balancing pass improves Herbarium's last sheet without adding pages.

Final review inspected all15 actual page rasters. A bounded Counter refinement gives compact categories separate indexed columns when they fit, while retaining shared flow for longer content. Parent inspected all three final Counter PDFs after regeneration. No source-specific layout branch is used.

## Efficiency and limits

Font preparation and text measurement are cached. The default vector composition does not wait for the unused raster illustration. Its bytes load only when required for an illustrated PDF and are cached. Browser startup observation showed local assets only, with no OCR, PDF-writing library or illustration request on that default route. No latency or speedup benchmark is claimed.

PDF writing and recognition libraries load when required. Editing makes no external request. Fonts, dependencies and the English OCR model are vendored. Supported Latin/currency characters stay original. Unsupported scripts fail preflight without changing saved work. Arbitrary PDF columns and OCR may require manual correction. Restaurant examples are unofficial snapshots. Bianco uses an April2023 source.

No runtime generative service is called or falsely claimed. AI helped plan, design, implement and verify the software. The original ink asset has its generation prompt, hash and alpha receipt in `dist/art/`. Reference designers' copyrighted imagery is not incorporated.

## Release and hackathon state

The user explicitly approved public source/planning/demo publication under VasuBansal7576. The existing website remains owner-private. The release owner performs destination verification after deployment and records the exact deployed commit separately from these local checks.

Official rules allow standard libraries and AI assistants. Design, Potential Impact, Innovation/Idea and Presentation are equally weighted. Public source includes scope.md, prd.md and spec.md. The required Learn Skill Pack was consulted. No interview, final user grade, learner tour or reflection is invented. Public YouTube/Vimeo upload, entrant-written answers, exit survey and final Devpost submission remain pending.

# Menu Atelier

An editable restaurant menu studio. Import a menu, review its dishes and prices, choose a design, edit the content, and download a PDF.

## Run the studio

```sh
npm install
npm start
```

Open the localhost address printed by the server. The core editing and PDF workflow requires no API key. Drafts stay in the current browser. Export JSON to keep a portable backup.

## Verify a real price change

1. Open an attributed restaurant example.
2. Select a dish and change its price.
3. Check the new price in the paper preview.
4. Switch to another design and check that the edit remains.
5. Download the PDF and find the changed price in its selectable text.

Run `npm test` for26 behavior and integration checks. Run `node scripts/grade.mjs` to reproduce all12 grading PDFs and editable backups. Integrated browser and PDF evidence is recorded in `devpost/verification.md`. The private deployment includes a `/grading/` gallery and a154.52-second actual browser demo.

## Understand the files

The root `scope.md`, `prd.md` and `spec.md` mirror the canonical planning files in `devpost/`. `devpost/checklist.md` records build progress and distinguishes agent checks from the user's final review. `research/sources.md` records the official restaurant sources and their limitations. `devpost/app-map.html` explains the finished implementation.

## Know the boundaries

Menu recognition requires review. OCR can misread names and prices. The app does not infer allergen safety. Example menus are unofficial selections and are not endorsed by the restaurants. Pizzeria Bianco's source PDF is a documented April 2023 snapshot linked by the official site at retrieval time. Prices and availability can change.

AI helped plan, write, design and verify this software using the Devpost Learn Skill Pack. Runtime import uses parsing, PDF text extraction and OCR. It does not require or claim an online generative model.

## Hackathon preparation

Built from an empty project folder on 2026-10-26 for [Build With AI Basics](https://learn-ai-basics.devpost.com/). The required [Devpost Learn Skill Pack](https://github.com/challengepost/learn-ai-basics) is installed locally and its six stages were consulted. The user's explicit autonomous-build instruction adapted the repeated conversational approval checkpoints. The records do not claim unperformed interviews, learner testing or reflection.

A public code repository and a publicly accessible 1 to 3 minute video are separate submission requirements. A private app deployment alone does not complete a hackathon submission. The entrant writes their own submission answers and learning reflections.

## License

Application code is MIT licensed. Restaurant facts and names remain attributed to their sources. Third-party dependencies retain their own licenses and notices.

---
doc: scope
status: approved
approval_basis: user-authorized autonomous execution on 2026-10-26, not a separate document review
---
# Restaurant menu studio

A restaurant turns its existing menu into an editable, designed PDF.

## The Unique Kernel
An actual dish price changes in structured data, immediately updates the designed menu, and appears correctly in an exported PDF. The design remains editable rather than becoming an image.

## Who It's For
An independent restaurant owner who changes dishes and prices and currently rebuilds a menu in a design tool or asks a designer to do it.

## The Core Loop
Open the studio, upload or paste a menu, review the extracted names and prices, write a design brief, compare generated directions, edit a dish or price, and export a PDF. Return to the saved browser draft for the next update.

## Inspiration & Identity
The user requested beautiful and distinctive designs and may grade multiple examples. The user later named Gamma as the workflow reference. The current bounded slice uses a brief, reviewable directions, refinement and editable export. It is a procedural design engine, not runtime AI or arbitrary layout generation.

## Why This Matters to the Learner
The user wants a complete hackathon result to personally grade for design, speed, correctness and uniqueness.

## What "Working" Looks Like
Import a real restaurant excerpt, change a price, switch layouts without losing the edit, and download a legible PDF containing the changed price. Show the entire sequence in a real app recording.

## The POC Boundary
One browser-based studio. Structured text, CSV and JSON import. PDF text extraction and image OCR when supported. A mandatory import review step. Editable dishes and categories, brief-based design generation, validated external art-direction recipes, design selection, local persistence, undo, PDF and data export. Three sourced real restaurant excerpts.

## Later
Accounts, team editing, POS integration, cloud asset storage and commercial printing fulfilment are future work.

## Explicitly Cut
Payments and billing are outside the menu workflow. Invented prices and inferred allergen claims are prohibited because correctness matters more than a filled-in field. No production orders or restaurant affiliation claims.

## Process note
Created from the user's supplied idea using Devpost 1-start and 2-scope. The user expressly delegated implementation decisions. This document records that authorization rather than inventing an interview or separate approval.

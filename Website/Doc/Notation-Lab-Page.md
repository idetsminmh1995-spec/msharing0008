# Notation Lab Page

**Revised:** 2026-11-15

## Current UI/UX

Notation Lab now begins with a minimal entry page. The previous viewer-first workspace and composer UI have been retired from this route.

The page presents exactly three action boxes:

- **Open File** — accepts `.musicxml`, `.xml`, and `.mxl` files. A supported file is handed to the dedicated Editor route.
- **Create** — opens the dedicated Editor route for a new score.
- **Scan** — disabled and labelled **Coming soon**. No scan flow is available yet.

## Routes

- `Website/Website/notation.html` — Notation Lab entry page.
- `Website/Website/notation-editor.html` — M1 score-first Editor shell.
- `Website/Website/notation-editor.js` — renders the score in the editor shell, drives the sticky toolbar, and provides zoom, playback, and export controls.
- `Website/Website/notation-entry.js` — file validation and entry-to-editor handoff.
- `Website/Website/notation-editor-handoff.js` — restores the selected file in the Editor.

## Constraints

The entry page stores a selected file only for the current browser session and caps this temporary handoff at 3 MB. Larger files can still be opened directly from the Editor. Scan is deliberately unavailable until its product and implementation plan are approved.

The Editor now carries the shared site header plus a sticky secondary toolbar (file, history, note value, accidentals, score setup, playback, view, export). See [Notation Lab Editor — Fixed Toolbar](Notation-Lab-Editor-Toolbar-2026-11-18.md).

The active source of truth for future changes is [Notation Lab UI/UX Plan](../Plan/Notation-Lab-UI-UX-Plan.md).

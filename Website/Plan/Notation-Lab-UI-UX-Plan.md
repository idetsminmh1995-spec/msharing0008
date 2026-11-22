# Notation Lab UI/UX Plan

**Status:** Active — revised 2026-11-15

## Product flow

Notation Lab starts as a focused entry screen. It must not expose the previous viewer or composer controls before a user chooses an intent.

1. **Open File** opens a file picker for supported score files. After a valid selection, the user is sent to the Editor with that file.
2. **Create** sends the user directly to the Editor to start a new score.
3. **Scan** is visually present but disabled and labelled **Coming soon**. No scan/upload workflow is implied or implemented.

## Entry-screen requirements

- Use three equally clear action boxes: Open File, Create, and Scan.
- Keep the page lightweight, responsive, keyboard-accessible, and free of the old notation canvas, bottom dock, playback, composer, diagnostics, and marketing-style workspace UI.
- Give each action a concise explanation and a clear disabled state for Scan.
- Preserve the existing site header and mobile navigation for brand consistency.

## Editor handoff

- The Editor is a dedicated route. It receives either a create intent or a selected local file.
- File transfer and editor implementation details will be expanded only after the entry screen is accepted.
- The current score composer implementation is removed; it is not the baseline for the new editor.

## Delivery sequence

1. Remove the composer enhancement and the old Notation Lab landing-workspace UI.
2. Implement the three-action entry page.
3. Add the editor route and create/open handoff contract.
4. Update this plan and work log after each accepted editor milestone.
5. Verify keyboard navigation, responsive layout, and file-type validation before publishing.

## Current milestone

Only steps 1–3 are in scope for this revision. Scan remains intentionally unavailable.


## Editor program — added 2026-11-15

The entry page is complete as the first UI milestone. The editor will now follow the score-first architecture and M1–M6 delivery sequence in [Notation Lab Editor — Audit, Product Design, and Capability Plan](../Doc/Notation-Lab-Editor-Architecture-2026-11-15.md).

The editor route now carries the shared site header plus a sticky secondary toolbar and a score workspace (see [Notation Lab Editor — Fixed Toolbar and Score Workspace](../Doc/Notation-Lab-Editor-Toolbar-2026-11-18.md)). Open, create, zoom, layout, playback, and export are live.

Note entry, the selection model and undo/redo history have since shipped (Part K in `Notation/Notation Plan/PLAN.md`), and the score workspace now has a three-panel sidebar dock — Palettes, Properties, Instruments — beside the score (see [Sidebar Dock, Properties and Instruments](../Doc/Notation-Lab-Editor-Sidebar-Dock-2026-11-18.md)).

## Next editor milestone

1. ~~**Editable Properties.**~~ Shipped: pitch, duration, voice and staff write back through `commit()`.
2. ~~**Page / Horizontal view switch.**~~ Shipped: the View segment redraws the same document as sheets or one row.
3. ~~**Session persistence.**~~ Shipped: `notation-lab-sidebar` remembers whether the dock was open and which panel it was on.

Scan remains intentionally unavailable.

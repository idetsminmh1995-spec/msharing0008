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

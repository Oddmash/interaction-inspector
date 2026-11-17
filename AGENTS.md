# Interaction Inspector working agreements

Interaction Inspector is a privacy-sensitive Chrome extension. Preserve its narrow collection model and browser permission boundary before optimizing UI or developer ergonomics.

- Keep `activeTab` and `scripting` as the only extension permissions unless the task explicitly authorizes a permission change.
- Do not add persistent host access, storage, network requests, telemetry, or background collection.
- Never capture keyboard keys or codes, input values, password data, page text, IDs, classes, or free-form ARIA values. Keep editable-control keydowns and password targets excluded.
- Preserve the 200-event in-memory limit, allowlisted tags and ARIA tokens, navigation/reset cleanup, and top-level-document scope unless the requested behavior explicitly changes them.
- Keep the inspector UI inside its closed Shadow DOM. Product layout, timeline visualization, and project-specific tokens remain local even when shared Oddmash UI components are adopted.
- When adopting Oddmash UI, pin a reviewed commit until an approved package release exists and verify visual geometry, focus behavior, extension permissions, privacy tests, and bundle impact.

Before handoff, run `npm test`, `npm run build`, and—when extension behavior or UI changes—`npm run test:e2e`. Explain any permission, captured-field, or privacy-boundary change explicitly.

# Interaction Inspector working agreements

Follow the [Oddmash concurrent work claims](https://github.com/Oddmash/.github/blob/main/AGENTS.md#concurrent-work-claims) and organization collaboration rules before implementation, review, CI retries, or merges.

Follow the [Oddmash review follow-up guidance](https://github.com/Oddmash/.github/blob/main/docs/AI-CODE-REVIEW.md#following-up-on-review-findings) when addressing review comments.

Interaction Inspector is a privacy-sensitive Chrome extension. Preserve its narrow collection model and browser permission boundary before optimizing UI or developer ergonomics.

Treat every localized README as a product introduction, not a repository setup guide. Explain what Interaction Inspector does, who it helps, a concrete debugging use case, its capabilities, privacy model, and scope. Do not put clone, install, local-run, build, test, release, or contributor workflows in a README; keep all development and verification details in `CONTRIBUTING.md`. Keep all four README translations, language links, claims, and visuals synchronized.

- Keep `activeTab` and `scripting` as the only extension permissions unless the task explicitly authorizes a permission change.
- Do not add persistent host access, storage, network requests, telemetry, or background collection.
- Never capture keyboard keys or codes, input values, password data, page text, IDs, classes, or free-form ARIA values. Keep editable-control keydowns and password targets excluded.
- Preserve the 200-event in-memory limit, allowlisted tags and ARIA tokens, navigation/reset cleanup, and top-level-document scope unless the requested behavior explicitly changes them.
- Keep the inspector UI inside its closed Shadow DOM. Product layout, timeline visualization, and project-specific tokens remain local even when shared Oddmash UI components are adopted.
- When adopting Oddmash UI, pin a reviewed commit until an approved package release exists and verify visual geometry, focus behavior, extension permissions, privacy tests, and bundle impact.

Before handoff, run `pnpm test`, `pnpm run build`, and—when extension behavior or UI changes—`pnpm run test:e2e`. Explain any permission, captured-field, or privacy-boundary change explicitly.

## Public contribution language

Write issue and pull request titles, bodies, public review discussions, commit messages, and changelog entries in English. Use the shared English issue and PR templates from [Oddmash](https://github.com/Oddmash/.github/blob/main/CONTRIBUTING.md). Preserve existing product documentation localization and provide translation help when needed.

## Agent contribution attribution

Follow the [Oddmash agent attribution convention](https://github.com/Oddmash/.github/blob/main/AGENTS.md#agent-contribution-attribution). When a commit materially incorporates a verified finding or recommendation from Reviewer, Impact, Triage, QA, Release, Docs, or Architect, append the canonical `Co-authored-by` trailer for each actual contributing GitHub account. Deduplicate trailers, preserve human authorship and record the source role or discussion for shared identities. Do not credit unused advice or rewrite published history.

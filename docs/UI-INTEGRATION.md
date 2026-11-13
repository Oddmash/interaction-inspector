# Oddmash UI integration

The panel consumes `@oddmash/ui/button` and injects its CSS into the existing closed Shadow DOM. The four toolbar buttons retain their labels, handlers, compact geometry and dark palette. Recording, permissions and privacy code are unchanged.

Project-specific colors have one source: `tokens/inspector.json`. `npm run tokens` generates `src/generated/inspector-tokens.css`; `npm run tokens:check` rejects drift. The generated stylesheet precedes the existing layout rules. Remaining inspector-specific visualization styles are intentionally local.

The dependency is pinned to an immutable Git commit until an approved npm release. Node 24 is required: npm builds the dependency using its `prepare` script. No npm registry publication is needed. To update, choose a reviewed Oddmash UI commit and run `npm install github:Oddmash/oddmash-ui#<commit>`, then commit both package files.

Run `npm ci`, `npm run tokens:check`, `npm test`, `npm run build`, `npx playwright install chromium`, and `npm run test:e2e`. The extension tests cover actual MV3 toolbar activation, picking, recording, filtering, private input handling, reset and close.

Dialog/Tabs are exercised in the UI package's separate demo. They are not inserted into the inspector merely to demonstrate coverage. A closed-shadow modal integration needs separate focus and portal validation.

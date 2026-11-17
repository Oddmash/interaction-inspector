# Contributing to Interaction Inspector

The product README explains what Interaction Inspector is. Repository setup, local extension loading, and verification belong here.

## Run the extension locally

1. Install Node.js 24 or later.
2. Run `npm ci` and `npm run build`.
3. Open `chrome://extensions`, enable **Developer mode**, and choose **Load unpacked**.
4. Select the repository's `dist/` directory.
5. Run `npm run demo` and open the Vite URL with `/demo/` appended.
6. Click the extension toolbar icon in that tab. Use **Pick element** on the disclosure button, then select **Start** and interact with the demo.

**Stop** preserves the existing timeline. **Reset** stops recording and clears the selected element and timeline. **Escape** cancels element picking.

## Verification

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Unit tests use Node's test runner. The Playwright smoke test loads a temporary copy of the built MV3 extension and uses test-only injection and an open shadow root on the intercepted demo origin. A separate Chromium test invokes the real toolbar action through DevTools Protocol while keeping the production manifest unchanged.

Preserve the privacy and permission boundaries in `AGENTS.md`. Any change to permissions, captured fields, session lifetime, network behavior, or the public inspection model must be called out explicitly in the pull request. Follow the [Oddmash organization contribution policy](https://github.com/Oddmash/.github/blob/main/CONTRIBUTING.md).

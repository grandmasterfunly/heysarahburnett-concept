# Sarah Burnett: website redesign concept

Static concept preview, not indexed by search engines. The live site is https://www.heysarahburnett.com/

## Accessibility checks

- `ci/a11y-mobile.mjs`: axe-core (WCAG 2.2 A/AA + best practice) on the home page at 390px and 1440px, with reduced motion and with the menu, tabs and lightbox open.
- `ci/a11y-pages.mjs`: axe-core on every page in `ci/pages.json` at 390px and 1440px, with the menu, tabs, read-more, quote expanders and flip cards open.
- `.pa11yci.json`: pa11y-ci (HTML_CodeSniffer, WCAG2AA) on every page, desktop and mobile.

To run locally: `npm ci && npx playwright install chromium && npm run serve &` then `npm run test:a11y`.

The GitHub Actions workflow is in `ci/a11y.workflow.yml`. To turn it on, move it to `.github/workflows/a11y.yml`. Pushing workflow files needs a token with the `workflow` scope.

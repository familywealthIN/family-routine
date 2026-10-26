# styles/app

The web-app's page, layout, view and container styles, plus its global overrides (`global/`), kept here so that all CSS lives in the UI package.

- Each file is loaded by its `.vue` with `<style [scoped] src="@routine-notes/ui/styles/app/…">`; the `global/` sheets are imported by `apps/web-app/src/main.js`, in cascade order.
- New page CSS goes here, never inline in the app. `apps/web-app/src/__tests__/cssLivesInUi.test.js` enforces this.
- The existing rules still apply: page styles are root-class prefixed or scoped, and no bare global selectors.

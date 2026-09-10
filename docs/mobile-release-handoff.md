# Mobile Release Pipeline — Session Handoff

**Branch:** `app-release-work` · **Last updated:** 2026-09-06 (match seeded)

Starting a fresh session? Open with something like:

> Read `docs/mobile-release-handoff.md` and `docs/store-deployment.md`. The match
> deploy key is installed now — kick off the first iOS release run.

`docs/store-deployment.md` is the full runbook. This file is the state of play,
the decisions behind it, and what not to undo.

---

## State at a glance

| Area | Status |
|---|---|
| **Whole pipeline** | ✅ **Green end to end.** Run [`34087580358`](https://github.com/familywealthIN/family-routine/actions/runs/34087580358), v1.2.1, 2026-09-07 — all four jobs success |
| fastlane match | ✅ Proven. Clones `familywealth/certificates` over SSH, installs cert + profile |
| Android | ✅ AAB on the Play **internal** track, v1.2.1 / versionCode 107, targetSdk 36 |
| iOS | ✅ Signed IPA uploaded to App Store Connect as **build 1 of 1.2.1** |
| App Store review | ⏸️ Not submitted, by design. `SUBMIT_FOR_REVIEW` is unset |
| PR distribution | ⚙️ Built, still not exercised — no PR has run `mobile-build.yml` since the Xcode/SDK changes |
| GitHub secrets | ✅ 31 set |

### What was actually wrong

Five separate problems, each hidden behind the one in front of it. Only the
first was known when this started:

| Problem | Fix |
|---|---|
| `match` never seeded | Seeded to `familywealth/certificates`; deploy key + 3 secrets |
| Play rejected `targetSdk 35` | AGP 8.13.0 / Gradle 8.14.3 / SDK 36 — **not** AGP 9 |
| Archive: `iOS 18.2 Platform Not Installed` | Xcode pin `16.2` → `26.2`; macos-14 jobs → macos-15 |
| `upload_to_app_store` rejected its own config | `automatic_release_after_approval` → `automatic_release` |
| Apple rejected version `0.1.1` | Version floor is >1.2 — released as 1.2.1 |

### Before the next release

- **A `v*.*.*` tag goes to Play _production_ with a 10% staged rollout**, not
  internal. Every run so far has been `workflow_dispatch` with `track=internal`.
  The first tag push is the first production release — and this is a live app.
- **Check the TestFlight build** for Liquid Glass changes to native UI (splash,
  status bar) from the iOS 26 SDK, and confirm Google/Apple sign-in still work.
- `IPHONEOS_DEPLOYMENT_TARGET` is still `14.0` while `capacitor.config.json`
  says `15.0`. Xcode 26 documents 15 as its minimum but builds 14 anyway.
- Open a throwaway PR to exercise `mobile-build.yml` — its iOS jobs moved
  runners and Xcode versions and have not run since.

## 🐛 Two app bugs found on the first real build (2026-09-07)

Both predate the pipeline work and shipped in every build to date. Neither was
caused by the release automation — the automation just delivered a build people
could finally run.

### The app could not reach the server

`GQL_URL` resolved to `https://api.routine.familywealth.in/graphql`. That host
is **NXDOMAIN**, and it is not in the `connect-src` of the CSP in
`public/index.html` either, so it could never have worked from the WebView.

The endpoint the **live web app** at `routine.familywealth.in` actually calls —
read straight out of its deployed bundle — is:

```
https://aicivz8c3l.execute-api.ap-south-1.amazonaws.com/dev/graphql
```

That host was *already* in the CSP allowlist, and it answers GraphQL. It is the
`familywealth-graphql-api` serverless service, stage `dev`, region `ap-south-1`.
Fixed as the fallback in both workflows; the `GQL_URL` secret was updated to
match.

> `apps/web-app/src/blob/config.js` is committed and had the correct URL all
> along. CI overwrites it via `scripts/create-env.js` from the secret, so only
> the mobile builds were ever broken — the web app was always fine.

### The header drew under the status bar (iOS)

Capacitor's iOS default is `UIScrollViewContentInsetAdjustmentNever`
(`CAPInstanceDescriptor.m:45`). **With `.never`, WKWebView reports
`env(safe-area-inset-*)` as 0.** So this rule resolved to `max(0px, 0px)`:

```css
.capacitor-native .v-toolbar {
  margin-top: max(var(--system-top-inset, 0px), env(safe-area-inset-top));
}
```

Fixed with `"contentInset": "always"` in `capacitor.config.json` → `ios`.

Measured on an iPhone 16 Pro Max simulator using a probe page loaded in the real
WebView:

| | `env(safe-area-inset-top)` | `innerHeight` | Result |
|---|---|---|---|
| Before | `0px` | 956 (full screen) | content under the Dynamic Island |
| After | `0px` | **860** | content correctly inset |

`env()` staying 0 afterwards is correct: the WebView no longer extends into the
unsafe area, so there is nothing to compensate for and nothing double-insets.

`public/index.html` also shipped with **two `<head>` tags**, the first never
closed, each carrying its own viewport meta — and the first lacked
`viewport-fit=cover`, leaving the winner to the parser. Merged into one
well-formed head. Necessary, but not sufficient on its own: `viewport-fit=cover`
cannot help while the WebView reports no insets at all.

> **Still latent:** `--system-top-inset` is read in seven CSS rules but is
> **never assigned anywhere**, so it always falls back to `0px`.
> `utils/androidSafeArea.js` sets a differently named `--safe-area-inset-top`,
> which none of those rules read — so its intended 24px Android fallback is dead
> code. Left alone deliberately; `contentInset` makes it moot on iOS, but
> **Android has no `contentInset` equivalent** and may still need a real fix.

## 🧪 Test in the simulator before TestFlight

Standing instruction from the user, 2026-09-07: build and run in the local Xcode
simulator and verify the change there *before* shipping to TestFlight. Both bugs
above were reproducible on a simulator in minutes; both had already survived a
full release cycle. Every TestFlight upload also permanently burns a build
number and ~12 minutes of macOS runner.

```bash
yarn workspace web-app build
cd apps/web-app && PATH="$HOME/.rbenv/shims:$PATH" npx cap sync ios
cd ../ios/App && xcodebuild -workspace App.xcworkspace -scheme App   -configuration Debug -sdk iphonesimulator   -destination 'platform=iOS Simulator,name=iPhone 16 Pro Max'   CODE_SIGNING_ALLOWED=NO build
xcrun simctl install booted <path>/App.app && xcrun simctl launch booted com.routine.note
```

Two gaps in local fidelity worth knowing:

- **Local Xcode is 16.2; CI builds with 26.2.** Simulator runs cannot reproduce
  iOS 26 SDK behaviour such as Liquid Glass. Installing Xcode 26 would close it.
- `GoogleService-Info.plist` is gitignored and provisioned by CI. A **placeholder
  with dummy keys** now exists locally so the app builds and launches;
  `FirebaseApp.configure()` is unguarded and crashes without one. Swap in the
  real file for anything Firebase-dependent.

## ⚠️ The iOS app is already live on the App Store

Earlier drafts of both docs were wrong about this. They listed "create the App
Store Connect app record" as outstanding and treated the pipeline's first iOS
upload as the app's first ever. Queried directly from App Store Connect on
2026-09-06:

| Version | State | Created |
|---|---|---|
| 0.1.1 | PREPARE_FOR_SUBMISSION | 2026-04-06 |
| **1.2** | **READY_FOR_SALE** | 2026-03-13 |
| 1.1 | READY_FOR_SALE | 2026-02-06 |
| 1.0 | READY_FOR_SALE | 2025-04-18 |

Plus 23+ builds uploaded manually between Nov 2025 and Mar 2026. So this app has
been shipping on iOS for nearly a year by hand; this pipeline is *automating an
existing release*, not launching a new one.

### The version floor

**iOS requires the next version to be strictly greater than 1.2.** Apple:

```
This bundle is invalid. The value for key CFBundleShortVersionString [0.1.1]
in the Info.plist file must contain a higher version than that of the
previously approved version [1.2].
```

The two stores have **diverged**: Play production is at 0.0.3 / versionCode 3
while the App Store is at 1.2. The pipeline stamps *one* version from the git tag
into both, so **the tag must clear the iOS floor**. Play does not care about
`versionName` — only `versionCode`, which is computed separately from
`run_number + VERSION_CODE_OFFSET` and keeps increasing regardless.

Next release is **1.2.1**.

> A stale `0.1.1` version sits in `PREPARE_FOR_SUBMISSION` in App Store Connect.
> It is below 1.2 and cannot accept a build. Delete it or renumber it before the
> next run; `SYNC_STORE_METADATA` is off, so the pipeline will not fix it.

### Android is done

Run `34061981272` uploaded `0.1.1` to the Play internal track successfully with
`targetSdk 36`. The API 36 work is confirmed against the live Play API — the same
call that returned `Target SDK of artifact is too low` twice earlier that day.

Note this means **0.1.1 is now consumed on the Play internal track too.**

---

## How it works

- Push a `v*.*.*` tag → `release-mobile.yml` builds a signed AAB to Play
  (production, 10% staged rollout) and a signed IPA to the App Store, both
  auto-submitted for review.
- Every PR to `master`/`develop` → `mobile-build.yml` sends the debug APK to
  Firebase App Distribution and a signed build to TestFlight.
- The git tag is the single source of truth for the version.
  `scripts/stamp-version.mjs` writes it into `build.gradle`, `project.pbxproj`
  and `apps/web-app/package.json` at build time; nothing version-related is
  committed.

---

## Decisions — please don't silently undo these

| Decision | Why |
|---|---|
| **No Mac Catalyst target.** Mac reach comes from `SUPPORTS_MAC_DESIGNED_FOR_IPHONE_IPAD=YES` plus the App Store Connect availability tick | Catalyst was fully built, then removed on request — the iPad build was judged sufficient. `docs/store-deployment.md` records what reinstating it would take. Ask before rebuilding it |
| **fastlane lives at the repo root**, not under `apps/android` / `apps/ios` | Root `.gitignore` used to swallow new files under those directories, and root layout gives `supply`/`deliver` their conventional metadata paths |
| **Two separate Google service accounts** | The PR lane runs on every push; a leaked App Distribution key must not be able to publish to the Play Store |
| **`supply` / `deliver` default to binary-only** (`SYNC_STORE_METADATA` unset) | Pushing an empty `fastlane/metadata` tree would blank a live store listing |
| **Matchfile is `readonly(true)`** | A failing CI job must never mint certificates and walk the account toward its 20-cert limit. **Seeding needs `--readonly false`** |
| **`VERSION_CODE_OFFSET: 100`** | Play production was already at versionCode 3 while the workflow's `run_number` starts at 1 |
| **App Store review submission is opt-in**, gated on `SUBMIT_FOR_REVIEW=true` | Changed 2026-09-06 from a hardcoded `true`. `ios release` now uploads to App Store Connect and TestFlight and stops; a human submits. A rejection blocks the review queue, and the listing is not complete yet |
| **PR distribution runs on every PR**, not label-gated | User's choice, knowing each PR permanently consumes a TestFlight build number |

---

## Bugs found and fixed — don't reintroduce

1. **Root `.gitignore` had bare `android` / `ios`.** These matched
   `apps/android/**` and `apps/ios/**`, so every *new* file there was silently
   ignored. Now rooted as `/android`, `/ios`.
2. **`mobile-build.yml` triggered on `main`;** the default branch is `master`,
   so its release step had never once run.
3. **No debug keystore was provisioned.** AGP minted a random one per CI run, so
   every debug APK had a different signing SHA-1 and Google Sign-In failed with
   `DEVELOPER_ERROR` — which would have made tester builds unusable for login.
   Now provisioned from `ANDROID_DEBUG_KEYSTORE_B64` and its SHA-1 registered in
   Firebase.
4. **Firebase config provisioning only warned.** Builds shipped placeholder
   config while passing green — verified in run `32206446725`. Both Android and
   iOS steps now hard-fail.
5. **`${{ github.run_number + 100 }}`** — GitHub Actions expressions have no
   arithmetic. It made the whole workflow unparseable (HTTP 422 on dispatch).
   Computed in the `prepare` job's shell instead.
6. **`stamp-version.mjs` false-failed** when the version being stamped already
   matched the file, because it detected a miss by comparing text before/after.
   Now asserts against the pattern.
7. **iOS distribution blockers:** removed `UIRequiredDeviceCapabilities=armv7`,
   set `aps-environment` to `production`, added
   `ITSAppUsesNonExemptEncryption`, and committed a shared Xcode scheme so
   archiving is deterministic.

---

## Key identifiers

| Thing | Value |
|---|---|
| Bundle / package ID | `com.routine.note` |
| Apple Team ID | `NJ3L9A8F3R` |
| ASC API key | `AC3C3Y55D5` (App Manager) |
| ASC Issuer ID | `9b9c575a-cafe-420d-8611-f18c3a9a99dc` |
| Play app ID | `4975952012930727444` ("Routine notes", Production) |
| Play developer account | `6082120305366136640` |
| Firebase project | `groutine-21c1b` (number `350952942983`) |
| Upload key SHA-1 | `AE:4F:14:C1:B9:8C:66:75:A8:C7:D2:10:7D:9F:19:FB:B7:2A:A1:E7` |
| Debug key SHA-1 | `D8:55:9E:51:D4:A4:7B:55:1E:A4:2F:7D:88:AC:E9:34:84:69:3A:E4` |
| Tester email | `grvpanchalindia@gmail.com` |

---

## Local artifacts — not in the repo, **not backed up**

`D:/keys/routine-notes/` on the Windows machine, and — verified 2026-09-06 — the
**whole folder is also at `/Users/encors/Documents/keys/routine-notes/` on the
Mac**, not just the `.p8` as earlier drafts of this doc claimed. Two machines is
better than one, but neither is a backup: both are unsynced local disks.

| File | If lost |
|---|---|
| `AuthKey_AC3C3Y55D5.p8` | **Unrecoverable.** Apple offers it once. Copies on both machines |
| `match-password.txt` | **Mac only, and the `MATCH_PASSWORD` secret is write-only.** Losing both means `fastlane match nuke appstore` and a full re-seed, which revokes cert `FXF8T465ZP` |
| `match_deploy_key.pub` | Harmless — public half. The private half lives only in the `MATCH_DEPLOY_KEY` secret; if that is lost, generate a new pair |
| `upload-keystore.jks` | Another Play upload-key reset request (~4 days) |
| `debug.keystore` | Tester builds break Google Sign-In until a new SHA-1 is registered |
| `play-publisher-sa.json`, `firebase-app-distribution-sa.json` | Regenerable |

GitHub secrets are write-only and are **not** a backup. Back this folder up.

---

## Gotchas worth knowing

- Play's upload key was lost; a reset was requested 2026-08-19 and approved
  2026-08-23. Resetting the *upload* key does not change the *app signing* key,
  so installed-app certificates and Google Sign-In were unaffected.
- **APNs auth keys are already uploaded to Firebase** (Key ID `54M9U84DJT`) —
  iOS push infrastructure is in place.
- `0.1.0` is consumed on the Play internal track. Pick a fresh version.
- The Play internal track shows *Inactive* — no tester list is attached yet.
- `Manage store presence` was **not** granted to `play-publisher`. Not needed
  for binary-only uploads; add it manually before setting `SYNC_STORE_METADATA=true`.
- `capacitor.config.json` says `ios.minVersion: "15.0"` while the pbxproj and
  Podfile say `14.0`. Unreconciled.
- A second Play app, `in.familywealth.routine`, is **"Removed by Google"**. Different
  package, so it does not block us, but a prior removal on the same developer
  account is context worth having before submitting.

---

## Deliberately uncommitted

`apps/workflows/` (per instruction), `.srv.log`, and
`apps/web-app/src/plugins/csp-cors-solutions.md`.

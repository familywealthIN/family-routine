# Mobile Release Pipeline — Session Handoff

**Branch:** `app-release-work` · **Last updated:** 2026-09-06

Starting a fresh session? Open with something like:

> Read `docs/mobile-release-handoff.md` and `docs/store-deployment.md`. I'm on a
> Mac now and want to seed fastlane match so the iOS release lane can run.

`docs/store-deployment.md` is the full runbook. This file is the state of play,
the decisions behind it, and what not to undo.

---

## State at a glance

| Area | Status |
|---|---|
| Android release | ✅ **Proven end-to-end.** v0.1.0 / versionCode 103 published to Play internal track, run `32641311575`, 2026-08-23 |
| iOS release | ⛔ Blocked. Job passes every step up to `Configure match SSH access` |
| PR distribution | ⚙️ Built, not yet exercised. Firebase App Distribution (Android) + TestFlight (iOS) |
| Mac | Covered by "Designed for iPad", not a Catalyst target |
| GitHub secrets | 28 set. Only `MATCH_GIT_URL`, `MATCH_PASSWORD`, `MATCH_DEPLOY_KEY` missing |

**The single remaining blocker** is seeding `fastlane match`, which needs macOS
keychain APIs. Step-by-step instructions are in `docs/store-deployment.md` →
*"Seeding fastlane match — must run on a Mac"*.

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
| **Auto-submit for App Store review is ON** | User's choice. Consider `submit_for_review: false` for the first real iOS run |
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

`D:/keys/routine-notes/` on the Windows machine:

| File | If lost |
|---|---|
| `AuthKey_AC3C3Y55D5.p8` | **Unrecoverable.** Apple offers it once. Already copied to the Mac (2026-09-06), so two copies now exist |
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

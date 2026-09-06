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
| fastlane match | ✅ **Proven in CI.** Run `34060741146` cloned `familywealth/certificates` over SSH and installed cert + profile |
| iOS archive | ✅ **Proven in CI.** Run `34061487738` under Xcode 26.2: `Archive Succeeded`, dSYM exported, signed `App.ipa` produced |
| iOS upload | ⚙️ Fixed but unverified — `upload_to_app_store` was passing an option that does not exist. Corrected 2026-09-06; no run has reached it since |
| Android build | ✅ **Verified locally** on AGP 8.13 / Gradle 8.14.3 / SDK 36. Signed AAB built and `jarsigner` verified |
| Android upload | ⚙️ Fixed but unverified — the API 36 bump is committed; no run has re-attempted the Play upload |
| PR distribution | ⚙️ Built, not yet exercised |
| Mac | Covered by "Designed for iPad", not a Catalyst target |
| GitHub secrets | ✅ 31 set. Nothing missing |

Every step of the signing and build chain is now proven. What is unverified is
strictly the two *upload* calls, both of which had never been reached before.

### ✅ iOS — the Xcode pin fixed the archive

`XCODE_VERSION` moved `16.2` → **`26.2`**. Under 16.2 the archive died with
`iOS 18.2 Platform Not Installed` on both storyboards. Under 26.2 it produced a
signed IPA.

26.2 rather than 16.4 (the `macos-15` default) because since **2026-04-28**
App Store Connect rejects any upload not built with Xcode 26 / the iOS 26 SDK.
16.4 would have archived green and been rejected at upload.

Knock-ons: `mobile-build.yml`'s `build-ios` and `smoke-ios` moved macos-14 →
**macos-15** (macos-14 has no Xcode 26 at all), both workflows keep the *same*
pin so the PR lane cannot go green on builds the release lane cannot produce,
and `smoke-ios` stopped hardcoding `iPhone 15` as its simulator fallback.

Still to watch on the first successful upload:

- **Liquid Glass.** The iOS 26 SDK restyles *native* UI by default. The WebView
  content is unaffected, but splash, status bar and native controls may differ.
- **`IPHONEOS_DEPLOYMENT_TARGET = 14.0`** is below the iOS 15 Xcode 26 documents
  as its minimum. It still builds. Reconciling it with
  `capacitor.config.json`'s `15.0` would settle a long-standing disagreement.

### ✅ Android — API 36 via AGP 8.13, *not* AGP 9

Play rejected the upload with `Target SDK of artifact is too low: 104` (`104` is
the versionCode; the message names the artifact). Since **2026-08-31** Play
requires new uploads to target **API 36**. The 2026-08-23 success predates the
deadline — the calendar moved, not the repo.

**AGP 9 was the wrong tool.** AGP **8.13** already supports API 36.1, and
Capacitor 8 itself ships AGP 8.13.0 + Gradle 8.14.3 + compileSdk 36. Meanwhile
all seven Capacitor 7 plugin modules under `node_modules` use `lintOptions` and
a library-level `targetSdkVersion`, both of which **AGP 9 removes** — so AGP 9
would have broken every one of them for no benefit.

What changed:

| | From | To |
|---|---|---|
| AGP | 8.7.2 | **8.13.0** |
| Gradle wrapper | 8.11.1 | **8.14.3** |
| `compileSdkVersion` / `targetSdkVersion` | 35 | **36** |
| CI SDK packages | `android-35` / `build-tools;35.0.0` | **`android-36` / `36.0.0`** |

`minSdkVersion` stays **23**. Capacitor 8 uses 24, but API 36 does not require
it and raising it would drop Android 6 users for no reason.

Only `variables.gradle` needed the SDK bump — all seven plugin modules read
`rootProject.ext.compileSdkVersion`, so it propagates. `rootProject.buildDir` in
the `clean` task also became `rootProject.layout.buildDirectory`; the old form is
removed in Gradle 9.

Verified locally on this Mac (JDK 21, matching CI): debug APK reports
`targetSdkVersion:'36'` / `compileSdkVersion='36'`, and a signed release AAB
built and passed `jarsigner -verify`.

**API 36 behaviour changes look low-risk here.** The manifest has no
`screenOrientation` lock and no `windowOptOutEdgeToEdgeEnforcement`, and the web
app already handles insets via `apps/web-app/src/utils/androidSafeArea.js` and
`env(safe-area-inset-*)`. Edge-to-edge was already enforced at targetSdk 35.

### 🐛 A latent Fastfile bug the successful archive exposed

`upload_to_app_store` was passing **`automatic_release_after_approval`**, which
is not a deliver option. fastlane rejects the entire config when given an unknown
key, so the action could never have run:

```
[!] Could not find option 'automatic_release_after_approval' in the list of
    available options: ..., submit_for_review, ..., automatic_release, ...
```

Now `automatic_release`. This was pre-existing, not introduced by the review-flag
change — it simply had never been reached, because no archive had ever succeeded.
Every option name in both iOS lanes has since been checked against the `deliver`
and `pilot` gems.

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

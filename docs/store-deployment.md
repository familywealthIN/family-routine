# Store Deployment — Google Play + App Store

Automated release of `Routine Notes` (`com.routine.note`) to Google Play and to
App Store Connect for **iPhone and iPad**.

There is no separate Mac build. The iPad binary is offered on Apple Silicon Macs
through the **"Designed for iPad"** availability option in App Store Connect —
one binary, one upload, zero extra build work.

---

## How it runs

| Trigger | What happens |
|---|---|
| Push a `v*.*.*` tag | `release-mobile.yml` — signed AAB to Play production (10% staged rollout), signed IPA to the App Store (iPhone + iPad). Both auto-submitted for review. |
| PR to `master`/`develop` | `mobile-build.yml` — after the smoke tests, the debug APK goes to Firebase App Distribution and a signed build goes to TestFlight. |
| `workflow_dispatch` | Same as a tag, but you pick the version and the Play track (`internal` or `production`). |

```
git tag v1.3.0 && git push origin v1.3.0
```

The tag is the single source of truth for the marketing version.
`scripts/stamp-version.mjs` writes it into `apps/android/app/build.gradle`,
`project.pbxproj` and `apps/web-app/package.json` at build time — nothing
version-related is committed.

Build numbers differ per platform on purpose:

- **Android** — `github.run_number + VERSION_CODE_OFFSET` (offset `100`, set in
  `release-mobile.yml`). The offset exists because Play production is already at
  **versionCode 3** while this workflow's `run_number` starts at 1 — without it
  the first automated release would be rejected as non-increasing. Play rejects
  duplicate or decreasing `versionCode` permanently, so this must never go
  backwards; renaming the workflow file resets `run_number`, so raise the offset
  if that ever happens.
- **iOS** — queried from App Store Connect
  (`latest_testflight_build_number + 1`). Two workflows upload iOS builds and
  `github.run_number` is scoped per workflow file, so those counters would
  collide.

---

## Credentials

### GitHub secrets

**Android / Play**

| Secret | What it is |
|---|---|
| `ANDROID_KEYSTORE_B64` | base64 of the upload keystore `.jks` |
| `ANDROID_KEYSTORE_PASSWORD` | keystore password |
| `ANDROID_KEY_ALIAS` | key alias (e.g. `upload`) |
| `ANDROID_KEY_PASSWORD` | key password |
| `PLAY_SERVICE_ACCOUNT_JSON_B64` | base64 of the GCP service-account JSON for the Play Developer API |

**Apple**

| Secret | What it is |
|---|---|
| `ASC_KEY_ID` | App Store Connect API key ID |
| `ASC_ISSUER_ID` | App Store Connect issuer ID (UUID) |
| `ASC_KEY_P8_B64` | base64 of `AuthKey_<KEYID>.p8` |
| `MATCH_GIT_URL` | SSH URL of the private certificates repo — `git@github.com:familywealth/certificates.git` |
| `MATCH_PASSWORD` | passphrase encrypting that repo |
| `MATCH_DEPLOY_KEY` | SSH private key with read access to it |

**PR distribution**

| Secret | What it is |
|---|---|
| `FIREBASE_SA_JSON_B64` | base64 of a GCP service-account JSON with *Firebase App Distribution Admin* |
| `FIREBASE_ANDROID_APP_ID` | Firebase Android app ID, `1:350952942983:android:…` (read it off `google-services.json`) |

**Firebase / app runtime config — referenced by the workflows but NOT currently set**

Verified 2026-08-18 against run `32206446725`, which emitted
`ANDROID_GOOGLE_SERVICES_JSON_B64 not set` and
`IOS_GOOGLE_SERVICE_INFO_PLIST_B64 not set; using placeholder`. Every mobile
build to date has shipped a placeholder Firebase config, so push notifications
and Google sign-in cannot work in those artifacts. These must be created before
the first real release:

| Secret | Source |
|---|---|
| `ANDROID_GOOGLE_SERVICES_JSON_B64` | Firebase Console → Project settings → Android app → `google-services.json` |
| `IOS_GOOGLE_SERVICE_INFO_PLIST_B64` | same, iOS app → `GoogleService-Info.plist` |
| `FCM_API_KEY`, `FCM_AUTH_DOMAIN`, `FCM_DATABASE_URL`, `FCM_PROJECT_ID`, `FCM_STORAGE_BUCKET`, `FCM_MESSAGING_SENDER_ID`, `FCM_APP_ID`, `FCM_MEASUREMENT_ID` | Firebase Console → Project settings → Web app config object |
| `GA_PUBLIC_KEY` | Firebase Console → Cloud Messaging → Web Push certificates (VAPID key) |
| `GA_CLIENT_ID`, `GA_SERVER_CLIENT_ID`, `GA_ANDROID_CLIENT_ID`, `GA_IOS_CLIENT_ID` | Google Cloud Console → APIs & Services → Credentials. The server/android/ios values are already hardcoded in `apps/web-app/capacitor.config.json` |
| `GQL_URL` | optional — the workflows fall back to `https://api.routine.familywealth.in/graphql` |

> Org-level secrets could not be enumerated (the CLI token is not an org admin),
> but the two `not set` warnings above prove these are not reaching the runner
> by any route.

### One-time setup outside the repo

**Google** — status as of 2026-08-23

1. ✅ **Play Console app already exists and is live.** `com.routine.note`
   ("Routine notes", app id `4975952012930727444`) is in **Production** at
   **versionCode 3 / v0.0.3**, 177 countries. So the "upload one AAB manually
   first" prerequisite is already satisfied — `supply` can publish immediately.
2. ✅ **Play App Signing is already enrolled.** Google holds the app signing key;
   it is unchanged by anything below.
3. ✅ **Upload key reset approved** (requested 2026-08-19, live 2026-08-23).
   The old registered upload key (`49:03:2C:CD:…`) was replaced — its private
   keystore was nowhere on the dev machine. Play now accepts only
   `D:/keys/routine-notes/upload-keystore.jks` (alias `upload`), SHA-1
   `AE:4F:14:C1:B9:8C:66:75:A8:C7:D2:10:7D:9F:19:FB:B7:2A:A1:E7` — verified
   matching Play's registered certificate on both SHA-1 and SHA-256.
   **Back this keystore up.** Losing it again means another reset request.
4. ✅ **Service accounts created** (see below) and the Google Play Android
   Developer API is enabled on project `groutine-21c1b`.
5. ✅ `play-publisher@groutine-21c1b.iam.gserviceaccount.com` invited to Play
   Console and Active, with: view app information, release to production +
   Play App Signing, release to testing tracks.
   *Not* granted **Manage store presence** — unnecessary while `supply` runs
   binary-only, but it must be added manually before setting
   `SYNC_STORE_METADATA=true`. Permission propagation can take up to 24h.

> **Google Sign-In is not affected by the upload key reset.** Resetting the
> upload key does not change the *app signing* key, so the certificate on
> installed apps stays the same and its SHA-1 remains valid in Firebase.

**Apple**

1. ✅ API key `AC3C3Y55D5` created with the **App Manager** role. The `.p8` is at
   `/Users/encors/Documents/keys/routine-notes/AuthKey_AC3C3Y55D5.p8` on the Mac
   and `D:/keys/routine-notes/` on the Windows box. It cannot be re-downloaded.
2. ✅ Private repo `familywealth/certificates` created and seeded (2026-09-06).
   ⛔ Its **read-only deploy key is still not installed** — see
   *"Seeding fastlane match"* below. This is the last blocker on the iOS job.
3. ✅ Developer Portal App ID `com.routine.note` exists (`WV4ZX53BS5`, UNIVERSAL),
   alongside `com.routine.note.service` (`265233QTYX`) for Sign in with Apple.
4. ✅ APNs Auth Key `54M9U84DJT` uploaded to Firebase.
5. ✅ App Store Connect app record exists — "Routine Notes", id `6744820484`.
6. ✅ Certificates seeded from the Mac (2026-09-06). Distribution certificate
   `FXF8T465ZP` and profile `match AppStore com.routine.note`, both expiring
   **2027-09-06**. Full detail in *"Seeding fastlane match"* below.
7. Once the first build is live, tick **Pricing and Availability → Make this app
   available on Mac**. Apple Silicon Macs only — Intel Macs are excluded — and
   Apple re-reviews the app for Mac suitability.
8. Invite the tester in *Users and Access* (role: Developer) and add them to
   **Internal Testers**. Internal testers must be App Store Connect users, but
   they skip Beta App Review — external groups would need Apple to review the
   first build, defeating per-PR turnaround.

**Firebase** (project `350952942983`, already exists)

1. Create a service account with *Firebase App Distribution Admin* and download
   its JSON key.
2. Firebase Console → App Distribution → *Testers & Groups* → create the group
   **`pr-testers`** and add the tester's email.

---

## Assets

### Fix in the repo first

`apps/web-app/assets/icon-only.png`, `icon-foreground.png` and
`icon-background.png` are **byte-identical** (all 1024×1024, md5 `7b6068bd`).
The Android adaptive icon composites the full square icon over itself and will
render wrong under the 16.7% inset mask. Produce a genuine transparent
foreground and a solid or gradient background, then:

```
yarn workspace web-app assets:generate
```

`splash.png` and `splash-dark.png` are also identical — cosmetic, low priority.

The iOS 1024×1024 icon is RGB with no alpha, which is what Apple requires.
No Mac idiom icons are needed — a "Designed for iPad" app reuses the iOS icon.

### Google Play listing

| Asset | Spec |
|---|---|
| App icon | 512×512 PNG, ≤1MB |
| Feature graphic | 1024×500 PNG/JPG, **no alpha** |
| Phone screenshots | 2–8, 16:9 or 9:16, 320–3840px per side |
| 7" tablet screenshots | up to 8 — required for the "tablet optimised" badge |
| 10" tablet screenshots | up to 8 |
| App name | ≤30 chars |
| Short description | ≤80 chars |
| Full description | ≤4000 chars |
| Privacy policy URL | required |

Console forms, one-time: Data Safety (declare the FCM token, Google/Apple
sign-in, analytics), content rating questionnaire, target audience, ads
declaration (none), and **test account credentials for review**.

### App Store — two screenshot sets

| Platform | Required |
|---|---|
| iPhone | 6.9" — 1290×2796 or 1320×2868, up to 10 |
| iPad | 13" — 2064×2752 or 2048×2732, up to 10 |

Plus: 1024×1024 icon (present), name ≤30, subtitle ≤30, promotional text ≤170,
keywords ≤100, description ≤4000, support URL, marketing URL, privacy policy
URL, App Privacy questionnaire, age rating questionnaire, and a **demo account
for App Review** — mandatory for a login-gated app and the most common
rejection cause.

Already satisfied: Sign in with Apple alongside Google sign-in (guideline 4.8),
and in-app account deletion (5.1.1(v)).

### Syncing listing text from the repo

Both `supply` and `deliver` default to **binary-only** uploads. Store text and
screenshots are pushed only when `SYNC_STORE_METADATA=true`, so an accidental
run against an empty `fastlane/metadata` tree cannot blank a live listing.

To enable it, populate `fastlane/metadata/` (iOS), `fastlane/metadata/android/`
(Play), `fastlane/screenshots/` and
`fastlane/metadata/android/en-US/images/`, then set the variable in the job.

---

## Mac support — "Designed for iPad"

There is **no Mac build target**. The single iOS binary that ships to iPhone and
iPad is also offered on Apple Silicon Macs by ticking *Make this app available
on Mac* in App Store Connect. Nothing in CI changes; it is a store setting.

Relevant build settings in `project.pbxproj`:

```
TARGETED_DEVICE_FAMILY              = "1,2"   # iPhone + iPad
SUPPORTS_MACCATALYST                = NO
SUPPORTS_MAC_DESIGNED_FOR_IPHONE_IPAD = YES   # allows the Mac availability tick
SUPPORTED_PLATFORMS                 = "iphoneos iphonesimulator"
```

What this buys and costs:

- **Buys** — zero extra build work, one binary, one review, one screenshot set
  per device class, and push notifications keep working (an iOS app on Apple
  Silicon still receives APNs, so Firebase Messaging is untouched).
- **Costs** — Apple Silicon only, so Intel Macs are excluded. The app runs in an
  iPad-shaped window with iPad idioms rather than Mac-native menus, window
  chrome or keyboard conventions.

**If a real Mac app is wanted later**, the Catalyst route needs: a Catalyst
target (`SUPPORTS_MACCATALYST = YES`, `TARGETED_DEVICE_FAMILY = "1,2,6"`,
`SUPPORTED_PLATFORMS` gaining `macosx`), a sandboxed `AppMac.entitlements` with
a `keychain-access-groups` entry (GoogleSignIn cannot persist credentials on
macOS without it), a `Podfile` `post_install` marking pod targets
Catalyst-capable, `#if !targetEnvironment(macCatalyst)` guards around Firebase
(Messaging does not support Catalyst), a `mac` idiom icon set, and a second
`match` certificate type (`mac_installer_distribution`). Capacitor has no
official Catalyst support, so budget real time for it.

---

## Seeding fastlane match — done 2026-09-06

**Seeded and verified.** `match` created the Apple distribution certificate and
the App Store provisioning profile, encrypted them, and pushed them to
`familywealth/certificates`. All three `MATCH_*` secrets are set on
`familywealthIN/family-routine`, so the pipeline now has 31 secrets and none
missing.

| Thing | Value |
|---|---|
| Certificates repo | `familywealth/certificates` (private, branch `master`) |
| Distribution certificate | `FXF8T465ZP`, `Apple Distribution: Gaurav Panchal (NJ3L9A8F3R)`, expires **2027-09-06** |
| Provisioning profile | `match AppStore com.routine.note`, `IOS_APP_STORE`, ACTIVE, expires **2027-09-06** |
| Profile UUID | `4b249ecf-69fd-4470-abc1-7b66ab2bb3a0` |
| Passphrase | `/Users/encors/Documents/keys/routine-notes/match-password.txt` (mode 600) — **also only in the `MATCH_PASSWORD` secret. Not backed up.** |

The profile name matches `IOS_PROFILE` in `fastlane/Fastfile`
(`"match AppStore #{APP_IDENTIFIER}"`) exactly — that string is referenced
directly by `gym`'s `export_options`, so it must not drift.

> **The repo is `familywealth/certificates`, not `familywealthIN/certificates`.**
> Earlier drafts of this doc assumed the latter. `familywealthIN` denies repo
> creation to non-owners (`grvpanchal does not have the correct permissions to
> execute CreateRepository`), so the repo was created in the `familywealth` org
> instead. Deploy keys are per-repo, so nothing about CI cares — but
> `MATCH_GIT_URL` must point at `familywealth`.

### ⛔ One step still outstanding: the CI deploy key

`MATCH_DEPLOY_KEY` is set, but its **public** half has not been added to the
certificates repo, because `grvpanchal` has push but **not admin** on
`familywealth/certificates` (the deploy-key API returns 404). Until an admin
adds it, the `ios` job will fail at `Configure match SSH access` → the clone.

Add this key at
`https://github.com/familywealth/certificates/settings/keys/new` —
title `routine-notes-ci-readonly`, **leave write access unchecked**:

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOQJrlBVjmRxsRd8+pDtPTUhQuXEhczN0oECv64Bi/il routine-notes-ci-readonly
```

It is also saved at `/Users/encors/Documents/keys/routine-notes/match_deploy_key.pub`.
The private half exists **only** in the `MATCH_DEPLOY_KEY` secret; the local copy
was deleted. If it is ever lost, generate a new pair and replace both.

### How it was seeded, for the record

Seeding ran over **HTTPS** using the `gh` credential helper, not SSH — no SSH key
is registered on the `grvpanchal` account and the token lacks `admin:public_key`.
The encrypted contents are identical either way; only CI needs the SSH URL.

```bash
export PATH="$HOME/.rbenv/shims:$PATH"          # rbenv Ruby 3.3.3; system Ruby is 2.6.10 and too old
gem install bundler:2.4.22 && bundle install

# match authenticates to Apple with the ASC API key, passed as a JSON file:
#   { "key_id", "issuer_id", "key": <contents of the .p8>, "in_house": false }
export MATCH_GIT_URL="https://github.com/familywealth/certificates.git"
export MATCH_PASSWORD="$(grep '^MATCH_PASSWORD=' ~/Documents/keys/routine-notes/match-password.txt | cut -d= -f2-)"

bundle exec fastlane match appstore --readonly false --api_key_path ./asc_api_key.json
```

`--readonly false` is required: `fastlane/Matchfile` sets `readonly(true)` so a
failing CI job can never mint certificates. Only the `appstore` type is needed —
there is no Mac Catalyst target, so no `mac_installer_distribution` certificate.

Re-running `--readonly true` afterwards confirmed the stored passphrase decrypts
the repo and installs the profile — the exact path CI takes.

### Verified in CI

Run [`34060741146`](https://github.com/familywealthIN/family-routine/actions/runs/34060741146)
(2026-09-06) exercised the deploy key for the first time and match worked:

```
Enabling match readonly mode.
Cloning remote git repo...
Installing certificate...
Installing provisioning profile...
Certificate Name: Apple Distribution: Gaurav Panchal (NJ3L9A8F3R)
Profile Name:     match AppStore com.routine.note
All required keys, certificates and provisioning profiles are installed 🙌
```

Note that the `Configure match SSH access` step only loads the key into
`ssh-agent` — it passes even with a bad key. The real proof is the `Cloning
remote git repo` line above, inside `Build and submit to the App Store`.

That run then failed further on for two reasons unrelated to signing — Play's
API 36 requirement and a missing iOS platform SDK on the runner. Both are
described in `docs/mobile-release-handoff.md`.

### Re-verify after a change

```bash
gh workflow run release-mobile.yml --repo familywealthIN/family-routine \
  --ref app-release-work -f version=0.1.1 -f track=internal
```

Watch the `ios` job. It should now get past `Configure match SSH access` and
reach `Build and submit to the App Store`.

> **App Store review submission is now opt-in.** `fastlane/Fastfile` gates it on
> `SUBMIT_FOR_REVIEW=true` (see `submit_for_review?`), so by default `ios release`
> uploads the build to App Store Connect and TestFlight and stops there. A human
> submits it. Set the variable on the job only once the listing is complete —
> screenshots, privacy answers, and the demo account App Review needs for a
> login-gated app. This replaces the old hardcoded `submit_for_review: true`.

> Pick a version that has not been used. `0.1.0` is already consumed on the Play
> internal track, and App Store Connect likewise rejects duplicate build numbers.

### If you ever need to re-seed

Losing `MATCH_PASSWORD` means the repo cannot be decrypted. Recovery is
`bundle exec fastlane match nuke appstore` (revokes the certificate on Apple's
side — any build signed with it stops being uploadable) followed by a fresh
seed. The account holds **1 of 20** distribution certificates today, so there is
ample headroom, but `nuke` is the only way back from a lost passphrase.


## Verifying before you trust it

1. **Android** — `npx cap sync android && ./gradlew bundleRelease`, then
   `jarsigner -verify app-release.aab`. The release workflow does this check
   itself and fails loudly on an unsigned AAB.
2. **iOS** — run `fastlane ios release` once with `submit_for_review: false`.
   Confirm the build reaches TestFlight and installs on a physical iPhone *and*
   iPad before enabling auto-submit.
3. **Mac** — after the first release is live, tick the Mac availability option,
   then install from the Mac App Store on an Apple Silicon Mac and confirm the
   app launches, Google sign-in completes, and notifications arrive.
4. **PR distribution** — open a throwaway PR against `develop` and confirm the
   Firebase install link works on a device and the TestFlight build arrives.
   Push a second commit and confirm the build number increments.

---

## Known risks

1. **Auto-submit burns review cycles.** A rejected Apple submission blocks the
   queue until you respond. Consider `submit_for_review: false` for the first
   few releases.
2. **Every-PR TestFlight uploads are not free.** Each runs a signed `macos-15`
   archive (~10–15 min on the more expensive runner) and permanently occupies a
   build number — TestFlight builds cannot be deleted, only expired. To gate
   them behind a label instead, change the `if:` on `distribute-ios` to
   `contains(github.event.pull_request.labels.*.name, 'distribute')`.
3. **`ios.minVersion` disagreement.** `capacitor.config.json` says `15.0` while
   the pbxproj and Podfile say `14.0`. Reconcile before the first release.
4. **Root `.gitignore` used to contain bare `android` / `ios`**, which silently
   ignored every new file under `apps/android` and `apps/ios`. They are now
   rooted (`/android`, `/ios`). If you ever see a new native file refuse to
   stage, check there first.

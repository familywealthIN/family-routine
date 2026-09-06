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
| `MATCH_GIT_URL` | SSH URL of the private certificates repo |
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

1. App Store Connect → *Users and Access* → *Integrations* → create an API key
   with the **App Manager** role. The `.p8` downloads exactly once.
2. Create a private git repo for `match` (e.g. `familywealthIN/certificates`)
   and a read-only deploy key for it.
3. Developer Portal → App ID `com.routine.note` with **Push Notifications**,
   and **Sign in with Apple**.
4. Upload an **APNs Auth Key** to the Firebase console — separate from the ASC
   key, and required for iOS/iPad push to work at all.
5. Create the App Store Connect app record for the iOS platform.
6. Seed the certificates repo **from a Mac** (this cannot be done from Windows):
   ```
   bundle exec fastlane match appstore
   ```
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

## Seeding fastlane match — must run on a Mac

This is the **only remaining blocker**. Everything else in the pipeline is done
and proven: Android published to Play's internal track end-to-end on 2026-08-23.
The iOS job runs correctly right up to `Configure match SSH access` and fails
there because three secrets do not exist yet.

`match` generates the Apple distribution certificate and provisioning profile,
encrypts them, and commits them to a private git repo. Certificate creation
requires macOS keychain APIs, so it cannot be done from Windows or Linux.

### Prerequisites

- macOS with **Xcode installed and opened once** (so the licence is accepted)
- The repo cloned, on branch `app-release-work`
- `bundle install` from the repo root — the `Gemfile` already pins fastlane and
  CocoaPods
- Access to the Apple Developer account (Team `NJ3L9A8F3R`)

### 1. Create the certificates repo

A **private** repo, e.g. `familywealthIN/certificates`. It stores only
encrypted material, but it must never be public.

### 2. Point the environment at the App Store Connect API key

**Already done as of 2026-09-06** — `AuthKey_AC3C3Y55D5.p8` has been copied to
the Mac. (The original is at `D:/keys/routine-notes/` on the Windows machine.
It cannot be re-downloaded; Apple offers it exactly once, at creation.)

From the directory holding the `.p8`:

```bash
export ASC_KEY_ID=AC3C3Y55D5
export ASC_ISSUER_ID=9b9c575a-cafe-420d-8611-f18c3a9a99dc
export ASC_KEY_P8_B64=$(base64 -i AuthKey_AC3C3Y55D5.p8)   # macOS base64 uses -i
```

### 3. Seed the certificates

```bash
export MATCH_GIT_URL=git@github.com:familywealthIN/certificates.git
export MATCH_PASSWORD='<invent a strong passphrase and save it>'

bundle exec fastlane match appstore
```

`fastlane/Matchfile` already sets `app_identifier`, `team_id` and
`readonly(true)`. **Seeding must not be readonly**, so pass `--readonly false`
if match refuses to create anything.

Only the `appstore` type is needed — there is no Mac Catalyst target, so no
`mac_installer_distribution` certificate is required.

### 4. Create a deploy key for CI

CI reads the certificates repo over SSH:

```bash
ssh-keygen -t ed25519 -C "routine-notes-ci" -f ./match_deploy_key -N ""
```

Add `match_deploy_key.pub` to the **certificates** repo, under
Settings -> Deploy keys. Read-only is sufficient, since CI runs `readonly: true`.

### 5. Set the three GitHub secrets

```bash
gh secret set MATCH_GIT_URL    --repo familywealthIN/family-routine --body "git@github.com:familywealthIN/certificates.git"
gh secret set MATCH_PASSWORD   --repo familywealthIN/family-routine --body '<the passphrase from step 3>'
gh secret set MATCH_DEPLOY_KEY --repo familywealthIN/family-routine < ./match_deploy_key
```

Then delete the local private key — it now lives in the secret.

### 6. Verify

```bash
gh workflow run release-mobile.yml --repo familywealthIN/family-routine \
  --ref app-release-work -f version=0.1.1 -f track=internal
```

Watch the `ios` job. It should get past `Configure match SSH access` and reach
`Build and submit to the App Store`.

> **Do the first iOS run with `submit_for_review: false`** in
> `fastlane/Fastfile`. A rejected Apple submission blocks the review queue until
> you respond, and it is worth confirming the archive uploads cleanly before
> handing Apple an automated submission.

> Pick a version that has not been used. `0.1.0` is already consumed on the Play
> internal track, and App Store Connect likewise rejects duplicate build numbers.

---

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

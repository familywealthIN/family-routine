# Building test apps without GitHub Actions

`mobile-build.yml` sends every PR to testers: the Android APK to Firebase App
Distribution and an iOS build to TestFlight. When Actions cannot run (billing),
the same two builds run elsewhere:

| | Where it runs | What it does |
|---|---|---|
| **iOS → TestFlight** | Xcode Cloud (Apple's Macs, 25 free hours a month with the developer account) | `apps/ios/App/ci_scripts/ci_post_clone.sh` builds the web app and installs pods; Xcode Cloud archives, signs and uploads |
| **Android → testers** | Docker on the Windows PC | `tools/local-pipeline/android.ps1` builds the committed HEAD and, with `-Distribute`, sends it to the `pr-testers` group |

An iOS build cannot run in Docker or on Windows: Xcode only runs on macOS on
Apple hardware.

## The private config

Nothing secret is in git. Both builds read files kept next to the signing keys
in `D:/keys/routine-notes/`:

| File | Used by | From |
|---|---|---|
| `google-services.json`, `GoogleService-Info.plist` | Android, iOS | Firebase Management API with `firebase-app-distribution-sa.json`, or the Firebase console |
| `debug.keystore` | Android | the shared debug key registered in Firebase (Google sign-in) |
| `firebase-app-distribution-sa.json` | Android `-Distribute` | Google Cloud service account |
| `app-config.env` | Android | `node tools/local-pipeline/make-config.js` |
| `xcode-cloud-env.txt` | iOS (pasted into Xcode Cloud) | `node tools/local-pipeline/make-config.js` |

`make-config.js` reads the FCM_* / GA_* / GQL_URL values from the root `.env`
(the Google client ids it lacks come from `capacitor.config.json`) and refuses a
`GQL_URL` that points at localhost. Run it again whenever one of those changes,
and paste the new values into Xcode Cloud.

## iOS: Xcode Cloud, once

In App Store Connect → the app → **Xcode Cloud** → **Manage Workflows**:

1. Edit the existing **Default** workflow (or create one):
   - **General** → Repository `familywealthIN/family-routine`, project or
     workspace **`apps/ios/App/App.xcworkspace`** (the old `ios/App/...` path
     is why that workflow fails on every push), scheme **App**.
   - **Environment** → Xcode 26.2 (as on GitHub) and the two variables from
     `D:/keys/routine-notes/xcode-cloud-env.txt`: `APP_CONFIG_B64` and
     `IOS_GOOGLE_SERVICE_INFO_PLIST_B64`, each marked **Secret**.
   - **Start Conditions** → Branch Changes on `master` (and allow manual
     starts). A PR-branch condition gives a build per PR, like GitHub did.
   - **Actions** → Archive, platform iOS, distribution **TestFlight (Internal
     Testing Only)**.
   - **Post-Actions** → TestFlight Internal Testing → the internal testers group.
2. **Xcode Cloud → Settings → Build Number**: set the next build number above
   the highest one already in TestFlight. Xcode Cloud numbers its own builds;
   a number TestFlight has already seen is refused.
3. Start a build (Start Build → master), or push to master.

The project signs manually for fastlane match; the script switches it to
automatic signing on the Xcode Cloud machine only, and Xcode Cloud signs with
its own cloud-managed certificate. The marketing version is still
`MARKETING_VERSION` in the Xcode project: once a version is approved, Apple
closes it to new builds ("Invalid Pre-Release Train"), so bump it as in
`docs/store-deployment.md`.

## Android: Docker

Once: install Docker Desktop (it needs WSL 2, which needs admin rights and a
reboot): `winget install Docker.DockerDesktop`, then start Docker Desktop.

```powershell
node tools/local-pipeline/make-config.js            # when .env changes
powershell -File tools/local-pipeline/android.ps1             # build only
powershell -File tools/local-pipeline/android.ps1 -Distribute # build + testers
powershell -File tools/local-pipeline/android.ps1 -Ref origin/master -Distribute -Notes "master 774f3e6"
```

The build clones the commit from the repo's git directory into the container,
so it is what is **committed**, never uncommitted files or Windows
`node_modules`. The APK lands in `build/local-pipeline/`; its build number is
the minutes since 1 January 2026, so it always installs over an older one. The
first run downloads the image (~3 GB with the Android SDK); later runs reuse the
`routine-notes-android-cache` volume for yarn and Gradle.

Store releases (`release-mobile.yml`) are not part of this: they still need
GitHub Actions, or fastlane on a Mac.

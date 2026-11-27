#!/bin/bash
# Runs inside the Dockerfile.android image: the build-android job of
# mobile-build.yml, then (with DISTRIBUTE=1) its Firebase App Distribution job.
#
# Mounts (android.ps1 sets them up):
#   /repo.git  the checkout's git directory, read-only: the build clones the
#              exact commit from it, so it is a clean build of what is
#              committed, never of uncommitted files or Windows node_modules
#   /keys      D:/keys/routine-notes, read-only: app-config.env,
#              google-services.json, debug.keystore,
#              firebase-app-distribution-sa.json
#   /out       where the APK is copied
#   /cache     yarn and Gradle caches, kept between runs
# Env: SHA (the commit), NOTES (release notes), DISTRIBUTE (1 = send to testers)
set -euo pipefail

need() { [ -f "$1" ] || { echo "error: $1 is missing (see docs/local-pipeline.md)" >&2; exit 1; }; }
need /keys/app-config.env
need /keys/google-services.json
need /keys/debug.keystore

git config --global --add safe.directory '*'
rm -rf /work/src
git clone --quiet /repo.git /work/src
cd /work/src
git checkout --quiet "$SHA"
echo "Building $(git log -1 --format='%h %s')"

yarn install --frozen-lockfile

(
  cd apps/web-app
  set -a
  . /keys/app-config.env
  set +a
  IS_DEVELOPMENT=false node ./scripts/create-env.js
)
yarn workspace web-app build

cp /keys/google-services.json apps/android/app/google-services.json
export ANDROID_DEBUG_KEYSTORE=/keys/debug.keystore
echo "sdk.dir=$ANDROID_HOME" > apps/android/local.properties

# Same version as iOS; the build number is minutes since 1 Jan 2026, so a
# local build always installs over an older one.
VERSION=$(grep -m1 -oE 'MARKETING_VERSION = [0-9.]+' apps/ios/App/App.xcodeproj/project.pbxproj | awk '{print $3}')
BUILD_NUMBER=$(( ($(date +%s) - 1767225600) / 60 ))
VERSION="$VERSION" BUILD_NUMBER="$BUILD_NUMBER" node scripts/stamp-version.mjs

(cd apps/web-app && npx cap sync android)
(cd apps/android && chmod +x gradlew && ./gradlew assembleDebug --no-daemon --stacktrace)

APK=apps/android/app/build/outputs/apk/debug/app-debug.apk

# Testers can only sign in with Google if the APK carries the registered key.
want=$(keytool -list -v -keystore /keys/debug.keystore -storepass android 2>/dev/null | grep -m1 'SHA1:' | awk '{print $2}' | tr -d ':' | tr 'a-f' 'A-F')
apksigner=$(ls -d "$ANDROID_HOME"/build-tools/*/apksigner | sort -V | tail -1)
got=$("$apksigner" verify --print-certs "$APK" | grep -m1 'certificate SHA-1 digest:' | awk '{print $NF}' | tr -d ':' | tr 'a-f' 'A-F')
if [ -z "$want" ] || [ "$want" != "$got" ]; then
  echo "error: the APK is not signed with the registered debug key" >&2
  exit 1
fi

out="/out/routine-notes-$VERSION-$BUILD_NUMBER-$(git rev-parse --short HEAD).apk"
cp "$APK" "$out"
echo "APK: $out (version $VERSION, build $BUILD_NUMBER)"

if [ "${DISTRIBUTE:-0}" = "1" ]; then
  need /keys/firebase-app-distribution-sa.json
  APP_ID=$(node -e "console.log(require('/keys/google-services.json').client[0].client_info.mobilesdk_app_id)")
  GOOGLE_APPLICATION_CREDENTIALS=/keys/firebase-app-distribution-sa.json \
    firebase appdistribution:distribute "$out" \
      --app "$APP_ID" \
      --groups pr-testers \
      --release-notes "${NOTES:-$(git log -1 --format='%h %s')}"
fi

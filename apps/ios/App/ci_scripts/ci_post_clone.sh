#!/bin/sh
# Xcode Cloud: turn a fresh clone into a buildable iOS project.
#
# Xcode Cloud runs this after cloning and before it archives
# apps/ios/App/App.xcworkspace. It does what mobile-build.yml's TestFlight job
# does on GitHub (build the web app, copy it in, install pods); Xcode Cloud
# then archives, signs and uploads to TestFlight itself. Set up in
# docs/local-pipeline.md, including the two secret environment variables:
#
#   APP_CONFIG_B64                     base64 of the FCM_* / GA_* / GQL_URL lines
#                                      scripts/create-env.js reads
#   IOS_GOOGLE_SERVICE_INFO_PLIST_B64  base64 of GoogleService-Info.plist
set -eu

fail() { echo "error: $*" >&2; exit 1; }

cd "$CI_PRIMARY_REPOSITORY_PATH"

# Node 20 (as on GitHub) and CocoaPods 1.16 (Podfile.lock). Homebrew is on
# every Xcode Cloud image; node@20 is keg-only, so it goes on PATH by hand.
export HOMEBREW_NO_AUTO_UPDATE=1 HOMEBREW_NO_INSTALL_CLEANUP=1
brew install node@20 cocoapods
export PATH="$(brew --prefix node@20)/bin:$PATH"
npm install --global yarn@1

[ -n "${APP_CONFIG_B64:-}" ] || fail "APP_CONFIG_B64 is not set in the Xcode Cloud workflow"
[ -n "${IOS_GOOGLE_SERVICE_INFO_PLIST_B64:-}" ] || fail "IOS_GOOGLE_SERVICE_INFO_PLIST_B64 is not set in the Xcode Cloud workflow"

yarn install --frozen-lockfile

# Without the real plist the app builds but push, analytics and Google
# sign-in fail at runtime, so a missing one stops the build above.
printf '%s' "$IOS_GOOGLE_SERVICE_INFO_PLIST_B64" | base64 --decode > apps/ios/App/App/GoogleService-Info.plist

config="$(mktemp)"
printf '%s' "$APP_CONFIG_B64" | base64 --decode > "$config"
(
  cd apps/web-app
  set -a
  . "$config"
  set +a
  IS_DEVELOPMENT=false node ./scripts/create-env.js
)
rm -f "$config"

yarn workspace web-app build
(cd apps/web-app && npx cap sync ios)
(cd apps/ios/App && pod install)

# The project signs manually for fastlane match (fastlane/Fastfile). Xcode
# Cloud signs with its own cloud-managed certificate and profile, which needs
# automatic signing — switched here on the build machine only, never in git.
sed -i '' 's/CODE_SIGN_STYLE = Manual;/CODE_SIGN_STYLE = Automatic;/g' apps/ios/App/App.xcodeproj/project.pbxproj

echo "ci_post_clone: web app built, synced and pods installed for $(grep -m1 -oE 'MARKETING_VERSION = [0-9.]+' apps/ios/App/App.xcodeproj/project.pbxproj)"

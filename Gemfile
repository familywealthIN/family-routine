source 'https://rubygems.org'

# Store deployment: fastlane drives supply (Play), deliver/pilot (App Store
# Connect) and match (Apple signing certificates). See fastlane/Fastfile.
gem 'fastlane', '~> 2.226'

# Pinned to the version in apps/ios/App/Podfile.lock (COCOAPODS: 1.16.2) so CI
# never resolves a different CocoaPods than the lockfile was generated with.
gem 'cocoapods', '~> 1.16.2'

plugins_path = File.join(File.dirname(__FILE__), 'fastlane', 'Pluginfile')
eval_gemfile(plugins_path) if File.exist?(plugins_path)

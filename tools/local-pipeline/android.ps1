<#
  Local Android pipeline in Docker: builds the committed HEAD exactly as
  mobile-build.yml does on GitHub and, with -Distribute, sends the APK to the
  Firebase App Distribution testers. See docs/local-pipeline.md.

    powershell -File tools/local-pipeline/android.ps1             # build only
    powershell -File tools/local-pipeline/android.ps1 -Distribute # build + testers
#>
param(
  [switch]$Distribute,
  [string]$Ref = 'HEAD',
  [string]$Notes = '',
  [string]$Keys = 'D:\keys\routine-notes'
)
$ErrorActionPreference = 'Stop'

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'Docker is not installed or not on PATH (see docs/local-pipeline.md).'
}

$here = $PSScriptRoot
$repo = (Resolve-Path "$here\..\..").Path
$gitDir = (git -C $repo rev-parse --path-format=absolute --git-common-dir).Trim()
$sha = (git -C $repo rev-parse $Ref).Trim()
$out = Join-Path $repo 'build\local-pipeline'
New-Item -ItemType Directory -Force $out | Out-Null

docker build -t routine-notes-android -f "$here\Dockerfile.android" $here
if ($LASTEXITCODE -ne 0) { throw 'docker build failed' }

docker run --rm `
  -v "${gitDir}:/repo.git:ro" `
  -v "${Keys}:/keys:ro" `
  -v "${out}:/out" `
  -v routine-notes-android-cache:/cache `
  -e "SHA=$sha" `
  -e "NOTES=$Notes" `
  -e "DISTRIBUTE=$([int][bool]$Distribute)" `
  routine-notes-android
if ($LASTEXITCODE -ne 0) { throw 'Android build failed' }

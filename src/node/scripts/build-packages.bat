@echo off
echo 🚀 Starting Windows package build...

if "%1"=="" (
    echo Building all platforms...
    node scripts/build-packages.js
) else (
    echo Building for platform: %1
    node scripts/build-packages.js %1
)

pause 
# Android build and release

The tracked native source uses package `com.omnilife.app`, version code **6**, version name **1.0.3**, minimum API 24, and compile/target API **36**. It uses Capacitor 8.5.3, Android Gradle Plugin 8.13.0, Gradle 8.14.3, and JDK 21. Install the Android SDK platform 36 and the SDK build tools selected by Gradle.

## Prepare a checkout

Install Node.js 22 or newer and JDK 21. Set `JAVA_HOME` and `ANDROID_HOME` to their local installation directories. Alternatively, use an untracked `android/local.properties` for the SDK path. Then run from the repository root:

```powershell
npm ci
npx cap sync android
```

Sync regenerates `android/capacitor.settings.gradle`, `android/app/capacitor.build.gradle`, the Cordova compatibility project, plugin JSON, Capacitor config, and web assets. These files are ignored and must be regenerated after a fresh checkout or dependency change. The tracked assets `.gitkeep` ensures the destination directory exists for a remote-server sync.

The shell loads `https://omnilife-relationship-optimizer.vercel.app` from `capacitor.config.ts`. With this remote URL, Capacitor permits the local `out/` directory to be absent and emits a warning. `npm run build` checks the server application but does not deploy it or embed it in the AAB. Verify the deployed commit and native behavior separately before upload. The app has no bundled offline application; verify its connection-error and recovery behavior on device.

## Signing

Provide **all four** variables through the release environment or a secret manager:

| Variable | Value |
| --- | --- |
| `KEYSTORE_PATH` | Absolute path to the existing owner-controlled upload keystore |
| `KEYSTORE_ALIAS` | Existing key alias |
| `KEYSTORE_PASSWORD` | Keystore password |
| `KEY_PASSWORD` | Key password |

No key, alias, or password is hardcoded. The original key must remain outside tracked source. Never generate a replacement key for an existing Play listing without following its key-reset process. Never pass passwords in command arguments or commit `.env`, keystores, signing properties, or `local.properties`.

```powershell
Set-Location android
.\gradlew.bat --no-daemon clean :app:bundleRelease --console=plain
```

Missing credentials fail `verifyReleaseSigning` before release compilation. The key must exist at the supplied path; invalid credentials fail Android's signing validation. The release is minified, resource-shrunk, and non-debuggable. To compile an **unsigned inspection artifact** without credentials, explicitly run:

```powershell
.\gradlew.bat --no-daemon clean :app:bundleRelease -PallowUnsignedRelease=true --console=plain
```

An unsigned bundle is **not an upload candidate**. Once credentials are supplied, rebuild normally and verify its signer and SHA-256. Build artifacts are ignored:

```powershell
Get-FileHash app/build/outputs/bundle/release/app-release.aab -Algorithm SHA256
jarsigner -verify -verbose -certs app/build/outputs/bundle/release/app-release.aab
```

## Native inspection

```powershell
.\gradlew.bat :app:dependencies --configuration releaseRuntimeClasspath --console=plain
Get-Content app/build/intermediates/merged_manifests/release/processReleaseManifest/AndroidManifest.xml
.\gradlew.bat :app:assembleDebug --console=plain
adb devices -l
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.omnilife.app/.MainActivity
```

Only App, Browser, Haptics, SplashScreen, and StatusBar plugins are expected after sync. Confirm the dependency report and merged release manifest contain no Billing, RevenueCat, Firebase messaging, notification permission, push service, or receiver. The Android v1 surface is free-only; web Stripe is outside the native shell.

Backups and Android 12+ cloud/device extraction are disabled. The HTTPS shell disallows cleartext, mixed content, third-party cookies, production WebView debugging, and production Capacitor logging. First-party cookies remain enabled and flushed for same-origin authentication. Any future relaxation requires a documented device test demonstrating the need.

Before Play upload, test on a device/emulator against the approved deployed commit: login and session persistence; onboarding; daily entry and revisit; partner-free use; confirmed account deletion and subsequent login refusal; offline error and reconnection; Settings, landing, direct `/pricing`, and locked features without prices/purchases/upgrade directions. Use owner-supplied disposable test accounts for destructive deletion. A local web test suite does not establish these device results.

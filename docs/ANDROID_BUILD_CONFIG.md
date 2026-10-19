# Android build and release

The tracked native source uses package `app.couplemetric.android`, version code **6**, version name **1.0.3**, minimum API 24, and compile/target API **36**. It uses Capacitor 8.5.3, Android Gradle Plugin 8.13.0, Gradle 8.14.3, and JDK 21. Install the Android SDK platform 36 and the SDK build tools selected by Gradle.

## Prepare a checkout

Install Node.js 22 or newer and JDK 21. Set `JAVA_HOME` and `ANDROID_HOME` to their local installation directories. Alternatively, use an untracked `android/local.properties` for the SDK path. Then run from the repository root:

```powershell
npm ci
npx cap sync android
```

Sync regenerates `android/capacitor.settings.gradle`, `android/app/capacitor.build.gradle`, the Cordova compatibility project, plugin JSON, Capacitor config, and web assets. These files are ignored and must be regenerated after a fresh checkout or dependency change. The tracked `native-shell/index.html` is copied into the generated public assets for connection-error handling.

The shell loads `https://omnilife-relationship-optimizer.vercel.app` from `capacitor.config.ts`. Its `webDir` is the tracked static `native-shell` directory; `server.errorPath` selects its `index.html` when the main page cannot load. This local page requires no network, scripts, or Capacitor plugins. Its accessible Retry link navigates to the configured HTTPS origin. A focused config test checks that the packaged error page exists and its Retry target matches `server.url`; update both together when changing the origin. `npm run build` checks the server application but does not deploy it or embed it in the AAB. Verify the deployed commit and native behavior separately before upload. Full application use still requires a connection.

## Signing

Provide **all four** variables through the release environment or a secret manager:

| Variable | Value |
| --- | --- |
| `KEYSTORE_PATH` | Absolute path to the existing owner-controlled upload keystore |
| `KEYSTORE_ALIAS` | Existing key alias |
| `KEYSTORE_PASSWORD` | Keystore password |
| `KEY_PASSWORD` | Key password |

No key, alias, or password is hardcoded. The original key must remain outside tracked source. Never generate a replacement key for an existing Play listing without following its key-reset process. Never pass passwords in command arguments or commit `.env`, keystores, signing properties, or `local.properties`.

### Enter signing credentials privately on Windows

After the preparation above, open your own PowerShell window in the repository root and run the following. Keep the existing keystore in its current private location. Enter its full path and existing alias when asked; passwords are masked. Nothing is saved to a credential file or your permanent Windows environment. The values exist only in this PowerShell process and its build process; the password variables are removed afterward. A different terminal or an already running Codex session cannot inherit them.

```powershell
$env:KEYSTORE_PATH = Read-Host 'Full path to the existing .keystore or .jks file'
$env:KEYSTORE_ALIAS = Read-Host 'Existing key alias'
try {
    $env:KEYSTORE_PASSWORD = [System.Net.NetworkCredential]::new('', (Read-Host 'Keystore password' -AsSecureString)).Password
    $env:KEY_PASSWORD = [System.Net.NetworkCredential]::new('', (Read-Host 'Key password' -AsSecureString)).Password
    & .\android\gradlew.bat -p android --no-daemon :app:bundleRelease --console=plain
    if ($LASTEXITCODE -ne 0) { throw 'Android signing/build failed; inspect the Gradle error above.' }
}
finally {
    Remove-Item Env:\KEYSTORE_PASSWORD, Env:\KEY_PASSWORD -ErrorAction SilentlyContinue
}
```

If you do not know the alias, run `keytool -list -keystore <existing-keystore-path>` using the JDK 21 binary. It prompts for the keystore password privately and lists the aliases. Do not create a new alias or key. The key password may differ from the keystore password; use the original values. After a successful build, verify the signature and checksum below before treating the output as an upload candidate.

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
adb shell am start -n app.couplemetric.android/.MainActivity
```

Only App, Browser, Haptics, SplashScreen, and StatusBar plugins are expected after sync. Confirm the dependency report and merged release manifest contain no Billing, RevenueCat, Firebase messaging, notification permission, push service, or receiver. The Android v1 surface is free-only; web Stripe is outside the native shell.

Backups and Android 12+ cloud/device extraction are disabled. The HTTPS shell disallows cleartext, mixed content, third-party cookies, production WebView debugging, and production Capacitor logging. First-party cookies remain enabled and flushed for same-origin authentication. Any future relaxation requires a documented device test demonstrating the need.

Before Play upload, test on a device/emulator against the approved deployed commit: login and session persistence; onboarding; daily entry and revisit; partner-free use; confirmed account deletion and subsequent login refusal; offline error and reconnection; Settings, landing, direct `/pricing`, and locked features without prices/purchases/upgrade directions. Use owner-supplied disposable test accounts for destructive deletion. A local web test suite does not establish these device results.

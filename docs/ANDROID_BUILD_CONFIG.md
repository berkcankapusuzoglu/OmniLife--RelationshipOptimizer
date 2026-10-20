# Android build and release

The tracked native source uses package `app.couplemetric.android`, version code **7**, version name **1.1.0**, minimum API 24, and compile/target API **36**. It uses Capacitor 8.5.3, Android Gradle Plugin 8.13.0, Gradle 8.14.3, Google Services Gradle plugin 4.4.3, and JDK 21. Install the Android SDK platform 36 and the SDK build tools selected by Gradle.

## Prepare a checkout

Install Node.js 22 or newer and JDK 21. Set `JAVA_HOME` and `ANDROID_HOME` to their local installation directories. Alternatively, use an untracked `android/local.properties` for the SDK path. Then run from the repository root:

```powershell
npm ci
npx cap sync android
```

Sync regenerates `android/capacitor.settings.gradle`, `android/app/capacitor.build.gradle`, the Cordova compatibility project, plugin JSON, Capacitor config, and web assets. These files are ignored and must be regenerated after a fresh checkout or dependency change. The tracked `native-shell/index.html` is copied into the generated public assets for connection-error handling.

## Plugins, permissions and Firebase config (v1.1.0)

After sync the generated Gradle files must list exactly these nine plugins: `@capacitor/app`, `@capacitor/browser`, `@capacitor/haptics`, `@capacitor/push-notifications`, `@capacitor/share`, `@capacitor/splash-screen`, `@capacitor/status-bar`, `@capgo/capacitor-native-biometric`, `@revenuecat/purchases-capacitor`. Anything else is stale; rerun `npx cap sync android`, never hand-edit.

The tracked manifest declares `INTERNET`, `com.android.vending.BILLING` (Play Billing through RevenueCat), `android.permission.POST_NOTIFICATIONS` (Android 13+ runtime permission for the daily reminder, requested only from the in-app opt-in), `android.permission.USE_BIOMETRIC` (app lock) and `android.permission.VIBRATE` (haptic score reveal). Backups, cleartext and mixed content stay disabled. FCM defaults come from the `com.google.firebase.messaging.default_notification_icon` / `_color` / `_channel_id` meta-data (`@drawable/ic_stat_notification`, `@color/notification_accent`, channel `reminders`); the server sends no channel id, so this channel receives every reminder. ProGuard keeps `com.revenuecat.purchases.**` and `ee.forgr.biometric.**` in addition to the Capacitor bridge.

Firebase Cloud Messaging needs an owner-supplied `android/app/google-services.json` from the Firebase project for Android app `app.couplemetric.android`. The file is gitignored. `android/build.gradle` always carries the `com.google.gms:google-services` classpath; `android/app/build.gradle` applies the plugin **only if** `android/app/google-services.json` exists, so a checkout without it still compiles and push registration simply fails closed on the device. A store build must include the file or reminders will never deliver. Purchase UI additionally needs `NEXT_PUBLIC_REVENUECAT_ANDROID_KEY` baked into the web deployment and `NATIVE_BILLING_ENABLED=true` on the server; the native shell itself carries no keys.

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

The nine plugins listed above are expected after sync. Confirm the merged release manifest contains `com.android.vending.BILLING`, `POST_NOTIFICATIONS`, `USE_BIOMETRIC`, `VIBRATE` and the FCM meta-data, and that `bundletool dump manifest` reports `versionCode="7"`. Web Stripe checkout and the Stripe portal stay outside the native shell: a Stripe-owned subscription viewed in the app shows only "Manage your subscription on the web".

Backups and Android 12+ cloud/device extraction are disabled. The HTTPS shell disallows cleartext, mixed content, third-party cookies, production WebView debugging, and production Capacitor logging. First-party cookies remain enabled and flushed for same-origin authentication. Any future relaxation requires a documented device test demonstrating the need.

Before Play upload, test on a device/emulator against the approved deployed commit: login and session persistence; onboarding; daily entry and revisit; partner-free use; confirmed account deletion and subsequent login refusal; offline error and reconnection; with `NATIVE_BILLING_ENABLED=false`, Settings, landing, direct `/pricing` and locked features without prices/purchases/upgrade directions; with the flag on, the store-priced paywall, trial purchase with a license tester, restore, Play-managed cancellation and the partner "Included with …'s Premium" state; reminder opt-in after the first log and the Settings → Device toggles (reminder, biometric lock). Use owner-supplied disposable test accounts for destructive deletion. A local web test suite does not establish these device results.

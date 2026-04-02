# Android Build Configuration Reference

## Signing Configuration (android/app/build.gradle)

```gradle
signingConfigs {
    release {
        storeFile file('omnilife-release.keystore')
        storePassword System.getenv('KEYSTORE_PASSWORD') ?: ''
        keyAlias 'omnilife'
        keyPassword System.getenv('KEY_PASSWORD') ?: ''
    }
}
```

## Release Build Type

```gradle
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

## Environment Variables Required

Before building a release, set these in your shell:

### Linux/macOS/Git Bash
```bash
export KEYSTORE_PASSWORD="tempSifre81!"
export KEY_PASSWORD="tempSifre81!"
```

### Windows Command Prompt
```cmd
set KEYSTORE_PASSWORD=tempSifre81!
set KEY_PASSWORD=tempSifre81!
```

### Windows PowerShell
```powershell
$env:KEYSTORE_PASSWORD = "tempSifre81!"
$env:KEY_PASSWORD = "tempSifre81!"
```

## Build Commands

```bash
# Debug build (no signing needed)
cd android && ./gradlew assembleDebug

# Release build (requires env vars above)
cd android && ./gradlew bundleRelease

# Output locations
# Debug APK: android/app/build/outputs/apk/debug/app-debug.apk
# Release AAB: android/app/build/outputs/bundle/release/app-release.aab
```

## Keystore Details

- File: `android/app/omnilife-release.keystore`
- Alias: `omnilife`
- Algorithm: RSA 2048-bit
- Validity: 10,000 days
- CN: Berkcan Kapusuzoglu, L=Falls Church VA, C=US

**CRITICAL: Never lose this keystore. Without it you cannot update the app on Google Play.**

# Google Play Store Publishing Guide

Last updated: 2026-03-23

## Current State

- Capacitor 8 configured: `appId: com.omnilife.app`, `appName: OmniLife`
- `android/` project generated and synced
- Capacitor plugins: `@capacitor/haptics`, `@capacitor/push-notifications`, `@capacitor/splash-screen`, `@capacitor/status-bar`, `@capacitor/browser`
- App loads live Vercel URL in native WebView (`https://omnilife-relationship-optimizer.vercel.app`)
- `androidScheme: 'https'` not explicitly set (Capacitor 8 defaults to https)

## Prerequisites

- **Android Studio** installed (latest stable)
- **JDK 17+** installed
- **Google Play Developer account** ($25 one-time fee at [play.google.com/console](https://play.google.com/console))
- Identity verification completed (1-3 business days)

## Phase 1: Build the Android App

```bash
# Sync web assets and plugins to Android project
npx cap sync android

# Open in Android Studio
npx cap open android
```

Note: Since the app loads a live URL, there's no need to run `npm run build` before syncing (the WebView loads from Vercel, not local assets).

## Phase 2: App Icons & Splash Screen

Option A — use `@capacitor/assets`:
```bash
npm install -D @capacitor/assets
# Place icon.png (1024x1024) and splash.png (2732x2732) in resources/
npx capacitor-assets generate --android
```

Option B — use [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html):
- Upload 1024x1024 PNG, download generated icons
- Place in `android/app/src/main/res/mipmap-*` directories

## Phase 3: Configure Version & Signing

### Version (in `android/app/build.gradle`):
- `versionCode` — increment for EVERY upload to Play Store
- `versionName` — user-visible version string (e.g., "1.0.0")

### Signing keystore (DO THIS ONCE, BACK IT UP):
```bash
keytool -genkey -v -keystore android/app/omnilife-release.keystore \
  -alias omnilife -keyalg RSA -keysize 2048 -validity 10000
```

**CRITICAL: Never lose this keystore. Without it you cannot update your app.**

### Set environment variables before building:
```bash
# Linux/macOS/Git Bash
export KEYSTORE_PASSWORD="your-password"
export KEY_PASSWORD="your-password"

# Windows Command Prompt
set KEYSTORE_PASSWORD=your-password
set KEY_PASSWORD=your-password
```

Signing config is already in `android/app/build.gradle` with ProGuard minification and resource shrinking enabled.

## Phase 4: Build Release Bundle

```bash
cd android
./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

AAB format is required by Google Play (APKs no longer accepted for new apps).

## Phase 5: Firebase Setup (for Push Notifications)

1. Create a Firebase project at https://console.firebase.google.com
2. Add an Android app with package name `com.omnilife.app`
3. Download `google-services.json` and place it in `android/app/`
4. The Capacitor push plugin handles FCM integration automatically
5. The `build.gradle` already conditionally applies the google-services plugin when the file exists

## Phase 6: Play Console Listing

### App Details
- **App name**: OmniLife (or chosen app name)
- **Short description** (80 chars): Track your relationship health with daily check-ins and AI-powered insights.
- **Full description**: Relationship health tracker for analytical couples. Log daily scores across 9 dimensions, get personalized recommendations, track trends over time, and strengthen your relationship with guided exercises.
- **Category**: Lifestyle
- **Content rating**: Everyone / PEGI 3

### Store Assets Required
- **App icon**: 512x512 PNG (32-bit, no alpha)
- **Feature graphic**: 1024x500 PNG or JPG
- **Screenshots**: 2-8 per device type (phone required, tablet recommended)
  - Minimum: 320px, Maximum: 3840px on any dimension
  - Recommended: 1080x1920 (portrait phone)

### Data Safety Form
- **Data collected**: Email address, name (account creation)
- **Data shared**: None
- **Security**: Data encrypted in transit (HTTPS), data encrypted at rest (Supabase)
- **Data deletion**: Users can request deletion via settings

## Phase 7: In-App Payments

**Important**: Google requires Google Play Billing for digital goods purchased inside Android apps. Stripe cannot be used for in-app purchases on Android.

### Recommended approach for v1:
Disable in-app payment buttons on Android. Direct users to the web version for subscription upgrades. Detect platform:
```typescript
import { Capacitor } from '@capacitor/core';
const isNative = Capacitor.isNativePlatform();
```

### Future: Add RevenueCat
For cross-platform billing (like SnuggleSmart uses):
```bash
npm install @revenuecat/purchases-capacitor
```
Configure products in RevenueCat dashboard: `pro_monthly` ($4.99), `pro_yearly` ($39.99), `premium_monthly` ($7.99), `premium_yearly` ($59.99).

## Phase 8: Testing & Review

1. **Internal testing**: Upload AAB to internal testing track in Play Console
2. **Pre-launch report**: Firebase Test Lab runs automated tests (check for crashes)
3. **Closed testing**: Share with beta testers via email list
4. **Production**: Submit for review (3-7 business days)

### Common Review Issues
- App must provide value beyond just a website wrapper — our native plugins (push notifications, haptics) and PWA features help justify native app
- Privacy policy must be accessible from within the app (already at `/legal/privacy`)
- App must not crash on launch — test on multiple API levels

## Quick Reference

```bash
# Full build cycle
npx cap sync android
cd android && ./gradlew bundleRelease

# Debug build (for testing)
cd android && ./gradlew assembleDebug

# Check gradle tasks
cd android && ./gradlew tasks
```

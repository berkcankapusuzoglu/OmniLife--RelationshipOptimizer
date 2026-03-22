# OmniLife Native App (Capacitor)

OmniLife uses Capacitor to wrap the live Vercel deployment as native iOS and Android apps. The app loads `https://omnilife-relationship-optimizer.vercel.app` in a native WebView with native plugins layered on top.

## Prerequisites

- Node.js 18+
- For iOS: macOS with Xcode 15+ and CocoaPods
- For Android: Android Studio with SDK 33+

## Setup

```bash
# Install dependencies
npm install

# Add platforms (run once)
npx cap add ios
npx cap add android

# Sync after any config/plugin changes
npm run cap:sync
```

## Building for iOS

```bash
# Open in Xcode
npm run cap:ios

# In Xcode:
# 1. Select your team under Signing & Capabilities
# 2. Set the bundle identifier to com.omnilife.app
# 3. Select a simulator or device, then Build & Run
```

## Building for Android

```bash
# Open in Android Studio
npm run cap:android

# In Android Studio:
# 1. Wait for Gradle sync to complete
# 2. Select a device/emulator, then Run
```

## Push Notifications

### iOS (APNs)
1. Enable Push Notifications capability in Xcode
2. Create an APNs key in Apple Developer Portal
3. Upload the key to your push notification service (e.g., Firebase)

### Android (FCM)
1. Create a Firebase project at https://console.firebase.google.com
2. Add an Android app with package name `com.omnilife.app`
3. Download `google-services.json` and place it in `android/app/`
4. The Capacitor push plugin handles FCM integration automatically

## App Store Submission Checklist

- [ ] App icons (1024x1024 for App Store, various sizes for device)
- [ ] Screenshots for required device sizes (6.7", 6.5", 5.5")
- [ ] App description, keywords, and category
- [ ] Privacy policy URL (already at /legal/privacy)
- [ ] Terms of service URL (already at /legal/terms)
- [ ] Review notes explaining the app loads a web URL
- [ ] Enable App Transport Security exception if needed
- [ ] Test on physical device before submission
- [ ] Set up App Store Connect with bundle ID com.omnilife.app

## Google Play Submission Checklist

- [ ] App icons (512x512 for Play Store)
- [ ] Feature graphic (1024x500)
- [ ] Screenshots for phone and tablet
- [ ] Short and full description
- [ ] Privacy policy URL
- [ ] Content rating questionnaire
- [ ] Target audience and content declarations
- [ ] Signed release APK/AAB
- [ ] Set up Google Play Console with package name com.omnilife.app

## App Icon Generation

Place a 1024x1024 PNG at `resources/icon.png` and a 2732x2732 PNG at `resources/splash.png`, then run:

```bash
npm install -g @capacitor/assets
npx capacitor-assets generate
```

This generates all required icon and splash screen sizes for both platforms.

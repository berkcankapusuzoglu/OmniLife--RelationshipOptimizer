# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# Keep Capacitor bridge and plugin classes
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.** { *; }
-keepclassmembers class com.getcapacitor.** { *; }

# Third-party Capacitor plugins (RevenueCat ships its own consumer rules for
# com.revenuecat.purchases; the plugin bridge classes are kept explicitly).
-keep class com.revenuecat.purchases.** { *; }
-keep class ee.forgr.biometric.** { *; }

# Keep WebView JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep AndroidX and support libraries
-keep class androidx.** { *; }

# Keep line numbers for crash debugging
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

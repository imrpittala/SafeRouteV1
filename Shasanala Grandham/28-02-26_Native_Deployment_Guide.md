# Deploying SafeRoute_Native

`SafeRoute_Native` is a React Native mobile application built using the Expo framework. The recommended way to build and deploy Expo apps to the Apple App Store and Google Play Store is by using **EAS (Expo Application Services)**.

## 1. Prerequisites Setup

1. **Install the EAS CLI**
   Open your terminal and install the EAS command-line tool globally:
   ```bash
   npm install -g eas-cli
   ```

2. **Log in to your Expo account**
   ```bash
   eas login
   ```
   (Create an account at [expo.dev](https://expo.dev) if you don't have one).

3. **Configure the Project**
   Navigate to your native app directory and run the configuration initialization:
   ```bash
   cd c:\SafeRoute\SafeRoute_Native
   eas build:configure
   ```
   This will generate an `eas.json` file in your project, defining build profiles (development, preview, production).

## 2. Setting up App Configuration (`app.json`)
Before building for production, ensure your `app.json` has the essential details configured correctly.

```json
{
  "expo": {
    "name": "SafeRoute",
    "slug": "saferoute-native",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.yourcompany.saferoute"
    },
    "android": {
      "package": "com.yourcompany.saferoute"
    }
  }
}
```
*Note: Replace `com.yourcompany.saferoute` with your actual unique bundle identifier and package name.*

## 3. Creating Production Builds

EAS builds the application binaries (`.aab` for Android, `.ipa` for iOS) in the cloud, so you do not need Xcode or Android Studio installed locally.

### Build for Android (Google Play Store)
Run the following command to create an Android App Bundle (`.aab`):
```bash
eas build --platform android --profile production
```
*EAS will guide you through generating the Android Keystore used to sign your app.*

### Build for iOS (Apple App Store)
Run the following command to create an iOS binary archive (`.ipa`):
```bash
eas build --platform ios --profile production
```
*EAS requires you to log into your Apple Developer account (`$99/yr`) to manage distribution certificates and provisioning profiles.*

## 4. Submitting to the App Stores

Once the builds are completed, you can either manually upload the generated `.aab` / `.ipa` files to your respective developer consoles, or automate it using **EAS Submit**.

**To submit automatically:**

1. **Android (Google Play Console):**
   ```bash
   eas submit -p android
   ```
   *You'll need a Google Play Console developer account and a Google Service Account Key.*

2. **iOS (App Store Connect):**
   ```bash
   eas submit -p ios
   ```
   *You'll need an active Apple Developer account and App Store Connect API keys.*

## Testing with Previews (Optional but Recommended)
Before pushing to production, you can create a test build that you can install directly on your device without going through the app store.
```bash
eas build --profile preview --platform all
```
This generates a build that bypasses the strict store review process, letting team members install the app via a simple QR code.

# Antigravity App - Walkthrough

I have scaffolded the complete React Native MVP for the Antigravity App inside your `SafeRoute Native` folder. We encountered an issue where Node.js and NPM/NPX were not available in your command line, so I manually constructed the required Expo configuration files and boilerplate.

### Features Implemented
1. **Dynamic Map:** A full-screen `MapView` focused on a set local point.
2. **Heatmap:** Uses `react-native-maps/Heatmap` to display 20 overlapping high-risk mock coordinates varying between yellow and red.
3. **Navigation Modes:** A sliding bottom sheet that allows toggling `fastest` and `safest` routes. Safe routes detour clearly around the high-risk zones.
4. **Panic Button (SOS):** A floating red safety button using a robust 3-second countdown and iterative phone vibration APIs.

---

## 🛠️ How to Test and Run Locally

Since this React Native app utilizes native elements like Google Maps and Vibration engines, it cannot be rendered as a webpage. Follow these instructions carefully:

### Step 1: Install Node.js
If you haven't already, please do the following:
1. Visit the [Node.js Official Website](https://nodejs.org/en/download/).
2. Download the Windows Installer (.msi) for the LPS version.
3. Run the installer and complete the setup.
4. Restart your computer (or IDE terminal) so that `npm` is added to your environment paths.

### Step 2: Install Libraries
Open your terminal (PowerShell/Command Prompt), navigate into the app folder, and install everything:

```bash
cd "C:\Users\P Raghavendra\Desktop\SafeRoute Native"
npm install
```

### Step 3: Run the Application
Start the Expo Metro Bundler:

```bash
npx expo start
```

This will produce a giant QR Code in your terminal. You can preview the application in one of two ways:
- **Physical Device:** Download the `Expo Go` app on an iOS or Android device, open your camera context, and scan the QR code.
- **Simulator (Android):** Open Android Studio, start an Android Emulator, and press `a` in the terminal.
- **Simulator (iOS):** Open Xcode, start an iPhone Simulator, and press `i` in the terminal. (Requires a Mac, so likely ignore this on Windows).

> [!TIP]
> **Expo Go Limitations:** Since `react-native-maps` uses native Apple Maps/Google Maps binaries, you may encounter a map-render warning if Expo Go updates its native mappings. If that occurs, building a standalone development build (`npx expo run:android`) is recommended.

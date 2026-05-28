# UberClone 🚗

A full-featured ride-hailing mobile application built with React Native CLI, inspired by Uber. Supports both passenger and driver profiles with real-time map tracking, Google Places autocomplete, distance-based pricing, and Mercado Pago payment integration.

---

## Tech Stack

- **React Native CLI** — Cross-platform mobile app (Android & iOS)
- **Firebase** — Authentication + Firestore database + Storage
- **Redux Toolkit** — Global state management
- **React Navigation** — Stack and Tab navigation
- **Google Maps / Places / Directions API** — Maps, autocomplete, routing
- **Mercado Pago API** — Payment gateway (sandbox)

---

## Prerequisites

Make sure you have the following installed before running the project:

| Tool | Version |
|------|---------|
| Node.js | >= 22.11.0 |
| Java JDK | 17 |
| Android Studio | Latest |
| React Native CLI | Latest |
| Git | Latest |

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Juan-Esteban-Garavito/UberClone.git
cd UberClone
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Google Maps API Key

Open `android/app/src/main/AndroidManifest.xml` and replace `YOUR_GOOGLE_MAPS_API_KEY` with your key:

```xml
<meta-data
  android:name="com.google.android.geo.API_KEY"
  android:value="YOUR_GOOGLE_MAPS_API_KEY" />
```

Make sure these APIs are enabled in your Google Cloud Console:
- Maps SDK for Android
- Places API
- Directions API
- Geocoding API
- Distance Matrix API

### 4. Configure Firebase

The project is already connected to Firebase via `android/app/google-services.json`.

If you need to use your own Firebase project:

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project
3. Add an Android app with package name `com.uberclone`
4. Download `google-services.json` and place it in `android/app/`
5. Enable the following in Firebase console:
   - **Authentication** → Email/Password
   - **Firestore Database** → Start in test mode
   - **Storage** → Start in test mode

### 5. Run on Android

Connect a physical device or start an Android emulator, then:

```bash
npx react-native run-android
```

Or start Metro bundler separately:

```bash
npm start
npx react-native run-android
```

---

## Project Structure

```
src/
├── components/         # Reusable UI components
├── config/             # Firebase configuration
├── constants/          # API keys, colors, strings
├── hooks/              # Custom hooks (useTranslation)
├── navigation/         # AppNavigator (Stack + Tabs)
├── redux/
│   ├── slices/         # userSlice, tripSlice, earningsSlice
│   └── store.js
├── screens/
│   ├── auth/           # LoginScreen, RegisterScreen
│   ├── driver/         # DriverHomeScreen
│   ├── history/        # HistoryScreen
│   ├── home/           # HomeScreen (passenger)
│   ├── payment/        # PaymentScreen (Mercado Pago)
│   ├── profile/        # ProfileScreen
│   ├── tracking/       # TrackingScreen
│   └── trip/           # TripScreen
└── utils/              # validators, formatters
```

---

## Key Features

### Passenger
- 📍 Current location as default origin (auto-filled)
- 🔍 Google Places Autocomplete for destination
- 🗺️ Route preview on map before requesting
- 🚗 Vehicle selection (Economy, XL, Premium) with real distance-based pricing
- 📡 Real-time driver tracking with animated car marker
- 💳 Payment via cash or Mercado Pago card gateway
- ⭐ Rate driver after trip
- 📋 Trip history grouped by day with totals

### Driver
- 🟢 Go online/offline toggle
- 🔔 Receive ride requests with distance and fare preview
- 🚗 Two-phase animated route: driver → pickup → destination
- ⭐ Rate passenger after trip
- 💰 Daily earnings summary with trip count
- 📋 Trip history with totals

---

## Payment Testing (Mercado Pago Sandbox)

Use these test cards in the payment screen:

| Card | Number | Expiry | CVV | Result |
|------|--------|--------|-----|--------|
| Visa | 4509 9535 6623 3704 | 12/26 | 123 | ✅ Approved |
| Mastercard | 5031 7557 3453 0604 | 12/26 | 123 | ✅ Approved |
| Visa | 4000 0000 0000 0002 | 12/26 | 123 | ❌ Rejected |

Use document number: `12345678`

---

## Git Workflow

This project follows a branch-per-developer workflow:

- `juan` — Driver screens, navigation, tracking, payments, home
- `ximena` — Auth screens, profile, history, Redux slices, hooks
- `main` — Production-ready merged code

---

## Authors

- **Juan Esteban Garavito** — [@Juan-Esteban-Garavito](https://github.com/Juan-Esteban-Garavito)
- **Ximena Zapata** — Colaboradora

---

## Course

**Subject:** Mobile Development  
**Institution:** Tecnológico de Antioquia  
**Semester:** 2026-1  
**Professor:** Paula Andrea Muñoz Correa
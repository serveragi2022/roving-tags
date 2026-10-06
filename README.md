# Roving Tags (Expo React Native, JavaScript)

Mobile app for shift roving: scan machine QR, answer the checklist, take a live photo,
or log an urgent repair with Process Owner approval. Works offline and uploads later.

## Setup

```bash
npx create-expo-app@latest roving-tags --template blank
cd roving-tags

npx expo install expo-camera expo-location @react-native-async-storage/async-storage \
  @react-native-community/netinfo @react-navigation/native @react-navigation/native-stack \
  react-native-screens react-native-safe-area-context @expo/vector-icons
```

Then copy these into the new project (replace the existing ones):

- `App.js`
- `app.json`  (adds the camera and location plugins)
- `.env.example` (copy it to `.env` and fill in the server address and branch)
- the whole `src/` folder

The camera needs a real build, not the Expo Go web preview. Run:

```bash
npx expo start
```

and open it on your Android phone with Expo Go (or use a development build).

## Folders

```text
src/
  components/   BigButton, Screen (shared layout), SyncBanner, TopBar, BottomNav,
                GoodBadToggle, StatusPill, PhotoCapture
  screens/      Setup, AssignRoute, Home, Route, Scan, Checklist, Photo, Urgent, Approval, Review (History tab)
  services/     api.js  (all server calls)
  utils/        AppContext (shared data), helpers, theme, sampleData, checklistItems, storage, location,
                machineRows (the 728 machines from tblMachineDetails), machineList (mills, floors, search by QR code)
  navigation/   AppNavigator.js
```

## Login and accounts

- Login uses `POST /api/login/mobile`. Offline login and approval use the accounts saved on the phone from `GET /api/user?branch=...` ("Sync Accounts" on the Login and Setup screens; it also runs after every online login).
- `src/utils/encryption.js` is a placeholder. Copy `encryptPassword()` from your MMS app into it (same key and IV as the server). If it imports a package such as crypto-js, install that package too.
- Approval of urgent repairs: the Shift Miller types username + password, checked against the saved accounts. The position must be "Shift Miller" (`APPROVER_POSITION` in `src/utils/accounts.js`).

## Checklists

- Setup -> Manage Checklists. The Standard Checklist (the 6 operating + 4 housekeeping checks) is used by every machine that has no checklist of its own.
- Create more checklists, edit their checks, then "Assign to Machines" (multi-select; search a machine type and use "Select all shown").
- Scanning a machine opens the checklist assigned to it. Each saved record keeps a copy of the checks that were used.

## Flow

- Start: Login -> Setup (pick date, mill, shift) -> Assign Route (pick the machines to rove) -> Home.
- Path A (normal): Home -> Scan -> Checklist -> Photo -> Next stop. Records are saved on the phone.
- Path B (urgent): Home or Checklist -> Urgent Repair Sheet -> Approval (work, then completion).
- History tab: see saved records, upload all or retry a failed one.

## Demo mode

If `EXPO_PUBLIC_API_URL` in `.env` is empty, the app pretends the upload worked. To test scanning without printed
QR codes, use "Enter asset code manually" on the Scan screen (e.g. `M22-A`).

## Things to connect or confirm

1. `src/utils/sampleData.js`: `currentUser` is a placeholder (no login screen in the design).
2. `src/services/api.js`: only `POST /roving-records` is assumed. Change it to match your server.
   The machine list is inside the app (`src/utils/machineRows.js`). Replace the rows when the list changes, or load it from the server later.
   The assigned route is saved on the phone per date + mill + shift.
   Mills are decided from the location text in `src/utils/machineList.js` (Silo, Mill A, Mill B, Bran, Others).
3. `src/utils/helpers.js`: `NEW_WORK_DAY_STARTS_AT_HOUR = 6` decides when a new work day starts, so night shift (C) records stay with the right day.
4. Anyone can open Manage Checklists for now. Restrict it by position if needed.
5. Photos stay in the app cache folder until uploaded.

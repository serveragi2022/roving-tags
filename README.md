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

- Login uses `POST /api/login/mobile`. Offline login and approval use the accounts saved on the phone from `GET /api/user?branch=...` ("Sync Accounts" on the Login and Home screens; it also runs after every online login).
- `src/utils/encryption.js` is a placeholder. Copy `encryptPassword()` from your MMS app into it (same key and IV as the server). If it imports a package such as crypto-js, install that package too.
- Approval of urgent repairs: the approver types username + password, checked against the saved accounts. The account needs the access **"Roving Tags Cleaning and Monitoring - Approve"** (`ACCESS_APPROVE` in `src/utils/accounts.js`).

## Checklists

- Home -> Manage Checklists. The Standard Checklist (the 6 operating + 4 housekeeping checks) is used by every machine that has no checklist of its own.
- Create more checklists, edit their checks, then "Assign to Machines" (multi-select; search a machine type and use "Select all shown").
- Scanning a machine opens the checklist assigned to it. Each saved record keeps a copy of the checks that were used.

## Flow

- Start: Login -> Home (today, last used mill and shift). Home -> Change -> Setup (pick another date, mill, shift) -> Assign Route (people with the Routes/Checklist access pick the machines to rove) -> Home.
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
4. Access comes from the `accessmodule` of the account in MMS. To log in the account needs **"Roving Tags Cleaning and Monitoring"**. To set routes and manage checklists it also needs **"Roving Tags Cleaning and Monitoring - Routes/Checklist"** (`canUseApp()` / `canSetup()` in `src/utils/accounts.js`). Everyone else only picks date, mill and shift. Anyone with the Routes/Checklist access can set routes for future dates in advance. Approval of urgent repairs needs "Roving Tags Cleaning and Monitoring - Approve".
5. Routes and checklists are shared through the server (see `server/`): run `server/roving_setup.sql`, then add `server/RovingSetupController.cs` to the MMS API (adjust the TODO parts; it uses Newtonsoft JToken). The phone of the route setter uploads changes (they wait on the phone while offline); every other phone downloads them when online and keeps a copy for offline use. With an empty `EXPO_PUBLIC_API_URL` everything stays on the phone.
6. Records (checklists and urgent breakdown / callout) are sent to `POST /api/roving-records` with the photo. Run `server/roving_record.sql`, add `server/RovingRecord.cs` (and its DbSet/mapping) and `server/RovingRecordController.cs`. The photo goes to Google Cloud Storage and the saved-by name is written as first letter of the first name + last name (e.g. "J. Santos").
7. Photos stay in the app cache folder until uploaded.

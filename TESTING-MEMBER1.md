# Member 1: Reminder notifications and proof-file test log

Branch: `vince/sqlite-storage`, brought up to date with `main` first (fast-forward, nothing lost).

## What was done

**Reminder notifications (new)**
- Installed `cordova-plugin-local-notification`. Cordova adds its helper `cordova-plugin-device` by itself.
- One notification per semester that is switched on. It shows at 9:00 AM on the semester end date.
- Switching a semester off cancels its notification. Switching it on, adding a semester, or changing the end date schedules it again.
- When the app opens, all notifications are cleared and the switched-on ones are scheduled again.
- The notification permission is asked the first time a notification is scheduled. If it is refused, a short message tells the person to turn notifications on in the phone settings.
- Code: new file `www/js/notifications.js`, one script tag in `www/index.html`, one line in `www/js/app.js` (`syncReminders()` at app start), and three small hook-ins on the Reminders screen in `www/js/screens.js`.
- No layout, colour or text was changed.

**Proof files (already on `main`, tested only)**
- Saving to the app folder, the proof viewer and the Open PDF button were already built on `main`. They were not changed.

## Bugs found and fixes

| # | What was found | Fix |
|---|----------------|-----|
| 1 | `vince/sqlite-storage` was 7 commits behind `main` and was missing the proof storage and proof viewer. | Fast-forwarded the branch to `main`. |
| 2 | Reminder ids are text, but the notification plugin needs whole numbers. | `notifId()` turns each reminder id into the same whole number every time, so cancel and reschedule hit the right notification. |

## Things noticed but not changed (not part of this task)

- Deleting an entry says its proof is removed from the phone, but the proof files stay in the app folder.
- The proof viewer first points the photo and the PDF preview at the `file:///` path, which the WebView may block. For photos the app then loads the image from the file data, so the photo still shows. A PDF preview on the Proof Viewer screen may stay blank on Android. The "Open PDF" button is the way to read it.
- `cordova-plugin-file-opener2` (4.0.0) was last updated in 2023, and `cordova-plugin-local-notification` (1.2.3) lists support for `cordova-android` 13 and up. Both installed without errors into an Android project with `cordova-android` 15 (`cordova prepare android`), but a full build was not possible here.
- The notification small icon is the plugin's default (`ic_popup_reminder`). If that icon is missing the notification may show a plain icon.

## Tests run in this session

Headless Chromium, real `www/` files, Cordova plugins faked. These check the app logic. They do **not** replace testing on the phone.

| ID | Test | Result |
|----|------|--------|
| R1 | Adding a semester schedules 1 notification | Pass |
| R2 | It fires at 9:00 on the end date | Pass |
| R3 | The notification id is a whole number from the reminder id | Pass |
| R4 | A second semester gives 2 notifications | Pass |
| R5 | Switching one off cancels only that one | Pass |
| R6 | Switching it back on schedules it again | Pass |
| R7 | Changing the end date moves the notification | Pass |
| R8 | App open: everything is rescheduled, only switched-on ones kept, stray ones removed | Pass |
| R9 | App open clears first, then schedules | Pass |
| R10 | An end date in the past schedules nothing | Pass |
| R11 | Permission refused: message shown, nothing scheduled | Pass |
| P1 | Camera photo and PDF both show as tags before saving | Pass |
| P2 | Both proofs are saved inside the app folder | Pass |
| P3 | PDF content is saved intact | Pass |
| P4 | After reopening, the entry still lists both proofs | Pass |
| P5 | Tapping the photo proof opens it and the image loads | Pass |
| P6 | "Open PDF" asks the phone to open the saved file as `application/pdf` | Pass |
| P7 | The database save keeps the proof file location | Pass |
| B1 | Plain browser with no plugins: reminders work, no errors | Pass |
| E1 | No unexpected JavaScript errors during the run | Pass |
| C1 | `cordova prepare android` installs all plugins, including the notification one, with `cordova-android` 15 | Pass |

## Tests to run on the phone (not done yet)

Build and install:

    npm install -g cordova
    cordova platform add android
    cordova build android

Fill in the Result and Notes columns.

| ID | Steps | Expected | Result | Notes |
|----|-------|----------|--------|-------|
| T1 | Settings > Reminders > Add semester, with tomorrow as the end date. | Android asks to allow notifications. Tap Allow. | | |
| T2 | Set the phone clock to 8:59 AM on the end date and wait one minute. | Notification "Semester ending" appears at 9:00. | | |
| T3 | Switch that semester off. Repeat T2. | No notification. | | |
| T4 | Switch two semesters on, close the app fully (swipe it away), reopen. Repeat T2. | Notifications still fire. | | |
| T5 | Restart the phone with a semester switched on. | The notification still fires on the end date. | | |
| T6 | Refuse the permission when asked. Switch a semester on. | Message "Notifications are blocked..." appears. | | |
| T7 | Add Entry > Camera > take a photo. Then File > pick a PDF. Save. | Entry shows 2 proofs. | | |
| T8 | Close the app fully, reopen, open the entry. | 2 proofs are listed. | | |
| T9 | Tap the photo proof. | The photo opens in the Proof Viewer. | | |
| T10 | Tap the PDF proof, then "Open PDF". | A PDF app opens the file. | | |

## Bug log for phone tests

| # | Test | What went wrong | Fix |
|---|------|-----------------|-----|
| | | | |

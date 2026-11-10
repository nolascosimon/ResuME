# ResuME - Nolasco, Masillones, Bonita

Android app for recording college achievements, attaching proof, and generating resumes. Built with Apache Cordova (HTML, CSS, JavaScript).

Milestone 3: entries, the profile, and the settings are saved in SQLite on the phone. The Timeline and Entry Details use the saved entries, attached proof can be viewed, and a resume can be made into a PDF. Reminders, backup, certificate export, and the AI features are still being built.

## Branches

- `main`: the Milestone 2 interface.
- `vince/sqlite-storage`: Member 1, SQLite storage for entries, profile, and settings.
- `Member-2-Simon-Nolasco`: Member 2, forms, camera and file picker, saved resumes, and PDF export.
- Member 3: Timeline, Entry Details, and proof viewer.

## Run in a browser

    cd www
    python -m http.server 8000

Open http://localhost:8000 and use the phone view in the browser dev tools. The camera and the PDF viewer only work on a phone or emulator. In a browser the PDF is downloaded instead.

## Build the APK

Needs Node.js, JDK 17, and Android Studio with the Android SDK.

    npm install -g cordova
    cordova platform add android
    cordova plugin add cordova-plugin-camera cordova-plugin-file cordova-plugin-network-information cordova-plugin-statusbar cordova-plugin-splashscreen cordova-sqlite-storage cordova-plugin-file-opener2
    cordova build android

The APK is in platforms/android/app/build/outputs/apk/debug/.

## Libraries

- Bootstrap 5 and Bootstrap Icons
- Inter font
- jsPDF (MIT license) for the PDF resumes

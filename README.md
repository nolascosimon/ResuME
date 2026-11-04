# ResuME - Nolasco, Masillones, Bonita

Android app for recording college achievements, attaching proof, and generating resumes. Built with Apache Cordova (HTML, CSS, JavaScript).

Milestone 2: all 16 screens are built and connected. Data is saved in local storage for now. SQLite, PDF files, backup, reminders, and the real AI calls come in the next milestones.

## Run in a browser

    cd www
    python -m http.server 8000

Open http://localhost:8000 and use the phone view in the browser dev tools.

## Build the APK

Needs Node.js, JDK 17, and Android Studio with the Android SDK.

    npm install -g cordova
    cordova platform add android
    cordova plugin add cordova-plugin-camera cordova-plugin-file cordova-plugin-network-information cordova-plugin-statusbar cordova-plugin-splashscreen
    cordova build android

The APK is in platforms/android/app/build/outputs/apk/debug/.

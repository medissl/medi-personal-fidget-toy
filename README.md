# Still

A personal, offline Android collection of sensory toys. Open it, press Play, pick a toy from the vertical collection, and close the toy whenever you like.

## First version

- **Stardust:** rainbow particles. One finger gathers, two fingers orbit and pinch, three swirl, four or more bloom. Rainbow, ember, and moonlight palettes.
- **Little pond:** make ripples and gently push floating leaves.
- **Bubble pad:** press individual bubbles or sweep across them; press again to reverse them.
- **Slow dial:** rotate a tactile dial with small clicks.

Touch sounds, music, haptics, volume, brightness, gentler motion, and particle amount are adjustable and saved locally. Music starts off. Pausing, opening settings, or backgrounding stops active feedback. Closing a toy returns to the collection's previous position.

No accounts, ads, analytics, backend, or online asset requests. The APK bundles the music and has **no Internet permission**. The only permission is vibration. Music attribution is in the app and [CREDITS.md](CREDITS.md).

## Install on your Android phone

Transfer the generated `Still.apk` to your phone and open it. Android may ask you to allow installation from the app you used to open the APK. The build supports Android 8.0 and later with an up-to-date Android System WebView.

This first APK is locally signed for personal installation. Keep `.local/still-personal.p12` privately if you want future builds to install as updates. It is excluded from Git. A key regenerated on another machine will not match an existing installation.

## Preview and checks

Node 20+ is needed only for development. There are no npm dependencies in the shipped app.

```sh
npm ci
npx playwright install chromium
npm run check
npm test
npm start
```

The preview is at http://127.0.0.1:4173. `npm run check` validates syntax, offline packaging, particle stability, audio interruption, and compact dial geometry. `npm test` runs isolated Chromium interactions, including multitouch, pause/reset/resume, bundled music decoding, local preferences, and responsive layouts. Screenshots and results are written to ignored `test-results/`.

If using an existing test browser, set `STILL_CHROMIUM_EXECUTABLE` to its executable path. The test runner otherwise uses Playwright's installed Chromium.

## Build the APK

Requires Windows PowerShell 7+, JDK 21, Android SDK Build Tools 35.0.0, and Android SDK Platform 35. Downloads are official Google Android SDK packages. Build output is ignored by Git.

```powershell
./build-android.ps1 -BuildTools "$env:ANDROID_HOME/build-tools/35.0.0" -AndroidJar "$env:ANDROID_HOME/platforms/android-35/android.jar"
```

The script compiles, dexes, packages, aligns, signs, and verifies `Still.apk`. The local signing key is generated only if absent. No Gradle, AndroidX, framework, or hosted build service is required.

## Structure and decisions

`web/` contains the UI and simulations. `android/` is a small native WebView wrapper with a restricted haptic bridge; it serves bundled files through an intercepted local HTTPS origin and rejects other resources and navigation. `scripts/` contains the local preview and focused checks.

Read [DESIGN.md](DESIGN.md) for visual and interaction decisions and [AGENTS.md](AGENTS.md) before making changes. Runtime settings are validated on load. Particle counts, pointer input, audio triggers, and haptic pulses are bounded.

## Current verification limits

Browser tests verify the web experience; APK compilation and signature checks verify packaging. They do not establish physical haptic feel, speaker balance, Android-specific lifecycle timing, or frame rate and battery use on a phone. Those need a device pass. No medical outcome is claimed.

Initial verification passed: focused Node checks, isolated Chromium interaction checks, screenshots inspected at narrow and typical phone sizes and desktop, Android compilation, and APK v2/v3 signature verification. Browser layout checks covered widths 320, 390, 768, 1024, and 1440, plus a 640×280 compact-window regression. The packaged manifest was inspected and includes vibration permission only.

Slime and additional objects are future candidates after tuning the first collection on the actual phone.

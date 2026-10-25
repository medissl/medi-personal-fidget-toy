# Medi Personal Fidget Toy

An offline Android fidget collection for personal use.

## Download on your phone

[Download v0.2.0](https://github.com/medissl/medi-personal-fidget-toy/releases/download/v0.2.0/Medi-Personal-Fidget-Toy.apk), then open it on Android. It updates v0.1.0 using the same application ID and local key. Preferences are preserved; old particle counts migrate to the denser simulation. Requires Android 8+ and a current Android System WebView.

## Play

The menu has the name, spinning particles, circular Play, random play on the left, and settings on the right. Selection scrolls vertically in two columns.

Gameplay fills the screen. Icon controls and bottom options fade after two seconds. Tap near the top to reveal them; swipes do not reveal them. Android system bars hide during play; an OS edge gesture can reveal them temporarily.

Eight toys: Stardust, Little pond, Bubble pad, Slow dial, Slime, Buttons, Sand, and Newton's cradle.

Stardust has 12,000 particles by default, adjustable from 3,000 to 18,000. Hold to gather; release to burst. Two fingers orbit/pinch, three make a vortex, four create separate wells, and five or more repel. Flow, Wave, Gravity, Ribbons, and Electric modes change the movement.

Recorded effects replace oscillator tones. Master, effects, and music volumes are separate. Samples are normalized; click rates and voice counts are bounded; a compressor controls peaks. Select Floating Cities, Carefree, or Dream Culture for music. Everything is bundled offline. No backend, account, ads, analytics, or Internet permission.

## Develop

Node 20+ is only needed for development. No npm packages ship in the app.

    npm ci
    npx playwright install chromium
    npm run check
    npm test
    npm start

Preview: http://127.0.0.1:4173. Screenshots: ignored test-results/v2 folder. Set STILL_CHROMIUM_EXECUTABLE to use an existing Chromium.

Build on Windows PowerShell 7+ with JDK 21, Android SDK Build Tools 35.0.0 and Platform 35:

    ./build-android.ps1 -BuildTools "$env:ANDROID_HOME/build-tools/35.0.0" -AndroidJar "$env:ANDROID_HOME/platforms/android-35/android.jar"

This produces Medi-Personal-Fidget-Toy.apk. Keep .local/still-personal.p12 privately so future builds update the existing installation. Keys and APKs stay out of Git.

Read [AGENTS.md](AGENTS.md), [DESIGN.md](DESIGN.md), and [CREDITS.md](CREDITS.md) before changing the app.

## Verification limits

Node checks cover particle stability, gather/release, cancellation, compact layouts, and cradle bounds. Isolated Chromium checks cover minimal menus, two-column selection, tap-versus-swipe reveal, ten-touch input, recorded audio, toy flows, and preferences. Android packaging and signatures are checked.

Samsung speaker loudness, physical haptics, battery/frame rate, and Android system-bar behavior still need a phone pass. The cradle uses simplified end-ball energy transfer; slime uses an elastic perimeter.

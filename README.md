# No-No Stress

An offline Android fidget collection for personal use.

## Download

[Download v0.3.0](https://github.com/medissl/medi-personal-fidget-toy/releases/download/v0.3.0/No-No-Stress.apk), then open it on Android. Uses the same application ID and signing key as previous releases so it installs as an update. Requires Android 8+ and a current Android System WebView.

## Play

The cream paper menu has the STRESS emblem, full app name, GitHub left, Play center, and Options right. Selection scrolls vertically in two columns.

Gameplay fills the screen. Back, Options, and relevant bottom controls fade after five seconds. Tap near the top to reveal, then tap an icon to activate. Swipes do not reveal controls. Android bars hide during play; an OS edge gesture can reveal temporary bars.

Fourteen toys: Wood carving, Metal balls, Slime, Packaging pop, Zipper, Carrots, On/off, Glass break, Stardust, Little pond, Bubble pad, Slow dial, Sand, and Newton’s cradle.

Stardust uses moving particle swarms, colored orbital bands, white convergence, pinch interaction, fingertip obstacles, and release bursts. Finger placement and movement guide the currents; Controls & credits in Options explains the interaction.

Music and recorded effects are bundled. Android uses MediaPlayer and SoundPool; the browser preview uses Web Audio. No backend, account, ads, analytics, or Internet permission.

## Develop

Node 20+ is only needed for development. No npm packages ship in the app.

    npm ci
    npx playwright install chromium
    npm run check
    npm test
    npm start

Preview: http://127.0.0.1:4173. Screenshots: ignored test-results/v3 folder. Set STILL_CHROMIUM_EXECUTABLE to use an existing Chromium.

Build on Windows PowerShell 7+ with JDK 21, Android SDK Build Tools 35.0.0 and Platform 35:

    ./build-android.ps1 -BuildTools "$env:ANDROID_HOME/build-tools/35.0.0" -AndroidJar "$env:ANDROID_HOME/platforms/android-35/android.jar"

Produces No-No-Stress.apk. Keep .local/still-personal.p12 privately so future builds can update the installed app. Keys and APKs stay out of Git.

Read AGENTS.md, DESIGN.md, and CREDITS.md before changing the app.

## Verification

Node checks cover simulation stability, gathering and release, seven-finger obstacle exclusion, slime recovery, multi-drag cradle, material removal, zipper counting, shard generation, metal bounds, and native audio routing. Chromium checks cover rendered screens, fourteen toy flows, five-second controls, reveal-before-activate, multitouch, actual browser WAV/music playback, native bridge bypass, and preferences.

Physical Android sound output, speaker loudness, haptics, tilt orientation, battery/frame rate, and system bars still need device verification. The visual and physics systems are original approximations informed by the user’s references.

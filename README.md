# No-No Stress

An offline Android fidget collection for personal use.

## Download

[Download v0.6.0](https://github.com/medissl/no-no-stress/releases/download/v0.6.0/No-No-Stress.apk), then open it on Android. Uses the same application ID and signing key as previous releases so it installs as an update. Requires Android 8+ and a current Android System WebView.

## Play

The cream paper menu has the STRESS emblem, full app name, GitHub left, Play center, and Options right. Selection scrolls vertically in two columns.

Gameplay fills the screen. Back, Options, and relevant bottom controls fade after five seconds. Tap near the top, or the bottom when toy options exist, to reveal, then tap an icon to activate. Swipes do not reveal controls. Android bars hide during play; an OS edge gesture can reveal temporary bars.

Fourteen toys: Wood carving, Metal balls, Slime, Packaging pop, Zipper, Liquid lava, On/off, Glass break, Stardust, Little pond, Bubble pad, Slow dial, Sand, and Newton’s cradle.

Stardust uses MIT-adapted StarEngine touch geometry and individual particle head/tail light trails on pure black, with finger-driven currents, pinch interaction, fingertip obstacles, and release bursts. There are no drawn orbit lines or white fingertip overlays. Finger placement and movement guide the currents; Controls & credits in Options explains the interaction.

Music and recorded effects are bundled. Music tracks are matched at about -16 LUFS; effects have measured level balancing and peak limiting, including real wood rubbing and a full glass-shatter effect. Android uses MediaPlayer and SoundPool; the browser preview uses Web Audio. No backend, account, ads, analytics, or Internet permission.

## Develop

Node 20+ is only needed for development. No npm packages ship in the app.

    npm ci
    npx playwright install chromium
    npm run check
    npm test
    npm run check:visual
    npm start

Preview: http://127.0.0.1:4173. Screenshots: ignored test-results/v6 folder. Set STILL_CHROMIUM_EXECUTABLE to use an existing Chromium.

Build on Windows PowerShell 7+ with JDK 21, Android SDK Build Tools 35.0.0 and Platform 35:

    ./build-android.ps1 -BuildTools "$env:ANDROID_HOME/build-tools/35.0.0" -AndroidJar "$env:ANDROID_HOME/platforms/android-35/android.jar"

Produces No-No-Stress.apk. The build normalizes Windows ZIP paths before signing; the raw APK check requires the built file. Keep .local/still-personal.p12 privately so future builds can update the installed app. Keys and APKs stay out of Git.

Read AGENTS.md, DESIGN.md, and CREDITS.md before changing the app.

## Verification

Node checks cover simulation stability, gathering and release, seven-finger obstacle exclusion, slime recovery, multi-drag cradle, material removal, zipper counting, shard generation, metal bounds, and native audio routing. Chromium checks cover rendered screens, fourteen toy flows, five-second controls, reveal-before-activate, multitouch, actual browser WAV/music playback, native bridge bypass, and preferences. The focused visual check captures a 20-second held swarm, translating/folding checkpoints and sustained release, verifies actual particle rendering at both density limits and chrome reflection changes, and records Chromium frame cadence. Node regressions include a minute-long hold, overlapping contacts, edge release continuity, and cradle rest.

Physical Android sound output, speaker loudness, haptics, tilt orientation, battery/frame rate, and system bars still need device verification. The visual and physics systems are original approximations informed by the user’s references.

Version 0.4 fixes nested APK asset paths that prevented the menu emblem, fonts, music, and effects from loading on Android. Wood can be cut below its guide and severed, Sand preserves drag marks, the cradle cannot tangle, and Glass Break uses eight different vessels on a table. Liquid lava replaces Carrots.

Version 0.5 adds ruled cream paper, visible carving tips and 95% scoring, nine large metal balls, correct cradle momentum transfer, movable leaves, falling glass entrances, and sharper GPU liquid shading. Material recordings replace the mismatched effects, and movement-controlled audio replaces repeating carving/zipper hits. Stardust and Lava have no interaction SFX. See ATOMUS_RESEARCH.md for the limits of the public engine source.

Version 0.6 rebuilds Stardust momentum and light trails, removing the timed burst-to-idle velocity replacement. Long and overlapping holds retain motion, fingers can split/join currents, and the same walls apply before and after release. Wood scoring is 85%, with new continuous abrasive recordings; zipper uses a new clear recording without its silent gap. Chrome reflections respond to position and tilt, lava preserves more colorful folds, leaf dragging does not splash, and the cradle dissipates to rest. Source limitations remain documented in ATOMUS_RESEARCH.md.

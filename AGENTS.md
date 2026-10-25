# No-No Stress

Read DESIGN.md before changing screens, toy motion, touch feedback, or audio. User corrections take priority over this document.

This is a personal offline Android collection: home → Play → two-column vertical selection → full-screen toy → back at the previous scroll position.

The home has the STRESS prohibition emblem, the full name No-No Stress, GitHub on the left, Play in the center, and Options on the right. No cat or random-play action.

Gameplay has only Back and Options at the top. Controls and relevant bottom options fade after five seconds. The first hidden top tap only reveals; a second deliberate tap activates. Swipes and holds do not reveal. Cancellation, resize, settings, backgrounding, and exit must not produce a particle burst.

Use existing browser/Android APIs and keep all runtime assets bundled. There is no Internet permission, backend, account, advertising, or analytics. Only immutable bundled content can reach the JavaScript bridge. The GitHub action opens the fixed profile in an external browser.

Each toy owns its simulation. app.js owns navigation, settings, lifecycle, and pointer capture. audio.js routes to Android LocalAudio or browser audio. LocalAudio uses direct uncompressed WAV/MP3 assets. Preserve the application ID and private signing key for updates.

Verify affected multitouch, cancellation, audio interruption, settings persistence, and upgrade behavior. Run npm run check, npm test, the Android build, and npm run check:apk. The APK check must inspect raw ZIP entry names in both headers; normalized filename APIs hid the Windows backslash bug before. Inspect actual rendered screens. Distinguish Chromium checks from physical Android playback, haptics, tilt, system bars, and performance.

Keep keys, SDKs, APKs, logs, and test artifacts out of Git. APKs belong in GitHub Releases. Review the diff, preserve unrelated work, and report observed results.

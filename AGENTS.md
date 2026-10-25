# Medi Personal Fidget Toy

Read DESIGN.md before modifying screens, toy motion, touch feedback, or audio.

This is a personal offline Android toy collection. Preserve the flow: home → Play → vertical collection → full-screen toy → back to the collection at the previous scroll position.

Keep the menu to the app name and icon actions, selection to two columns with names inside boxes, and gameplay to the full canvas with fading icon controls. Treat tap-only reveal and suppression of release bursts on cancellation as regression requirements.

Use browser and Android standard APIs first. Add a dependency only when an observed requirement cannot be met simply. Each toy owns its simulation; app.js owns navigation, settings, lifecycle, and pointer capture. Audio and haptics go through audio.js.

Keep all runtime assets bundled. The Android app has no Internet permission. Its JavaScript bridge must remain restricted to immutable bundled content. Keep signing keys, build tools, APKs, and local machine paths out of Git.

When changing interactions, test pointer cancellation, multitouch, reset, pause/resume, closing a toy, backgrounding, and settings persistence. Run the browser check and compile the Android wrapper for relevant changes. Hardware haptics, audio feel, battery use, and Android lifecycle need device verification; distinguish those from browser checks.

Capture and inspect the actual rendered home, collection, toy, and settings screens for visual changes. Keep input responsive and controls readable. Review the diff before committing; preserve unrelated changes. Report the checks actually run and any device checks still outstanding.

# No-No Stress — design

## Direction

A quiet personal Android toy box with cream woody paper, warm brown Fredoka typography, brick red accents, and tactile full-screen toys. Follow the user's explicit layout and particle references.

Home: STRESS inside a red circle/slash emblem above the full title “No-No Stress.” Circular GitHub action left, larger circular Play center, conventional gear for Options right. No cat, tagline, descriptions, or extra actions. The GitHub action opens https://github.com/medissl externally.

Selection: exactly two square cards per row, scrolling vertically. Each name sits inside its card at the top-left. No descriptions or category headings.

## Gameplay

Fill the screen with the toy. No title, description, counters, or bottom action bar, except the explicitly requested zipper completion count. Back top-left and Options top-right. No pause, mute, or reset buttons at the top.

Top controls and toy-specific bottom options fade after five seconds. A short top tap while hidden only reveals. The reveal tap cannot also activate a control or trigger a toy. The next deliberate tap activates. Swipes and holds remain gameplay. Keyboard Tab reveals controls. Settings pause simulation and audio. Android immersive mode hides bars during play; OS edge gestures can reveal temporary bars.

## Stardust

The shapes are made entirely of moving individual particles. They must not become static drawn orbit outlines. Use rich swarms of individually visible moving points, coherent colored currents, and only a small glow per particle. The background is exact black. Do not draw trail segments, history buffers, a blurry full-screen halo, or a white fingertip marker. White can emerge only from actual overlapping colored particles. Keep individual orbit colors coherent, and preserve those colors through release. The supplied Atomus images are the visual acceptance reference; thin wire loops are inadequate.

Default 14,400 particles; adjustable 4,800–24,000. Color palettes remain at the bottom, with no five-mode selector. Hold gathers; release the last contact causes an expansive burst. Cancellation never bursts.

Fingers act as moving checkpoints. Particles retain momentum and flow between them; there are no analytic circle, ellipse, atom, or DNA position targets. Moving, pinching, spreading, crossing, and clustering contacts changes the currents. Nearby contact groups can merge or split the flow.

The user's one-to-ten-finger descriptions are observed motifs, not fixed outlines to reproduce. In particular, three contacts must not invoke a perfect circumcircle. Two-contact pinching should remain alive as it compresses and expands. Seven contacts retain the requested directional stream with solid fingertip obstacles.

Preserve density and live motion while keeping particle heads distinct. The reference shapes must emerge from the finger-driven flow, with no imposed circle or atom outlines.

## Tactile toys

Wood carving: horizontal rotating log with bark, machined chucks, round/square/triangle tips, and three guided silhouettes. Allow carving below the guide and fully through the axis. The smaller severed segment falls; material never grows back.

Metal balls: many spheres, multiple draggable balls, collisions that affect their neighbors, real collision samples, Android tilt.

Slime: full-screen glossy material with actual local indentation and gradual recovery. No isolated elastic egg.

Packaging pop: dimensional translucent bubbles flatten into irregular crumpled plastic, not an X. Bubbles stay popped; a fresh sheet follows completion. Bubble pad remains the separate reversible silicone toy.

Zipper: large teeth and pull tab fill the screen with fabric. Zip upward to the reachable top edge; completion count appears briefly once, then a new zipper arrives. Recorded zipper sound follows movement.

Liquid lava replaces Carrots. Use connected, advected color plumes with velocity, swirling pressure flow, and touch-driven stirring. Offer the three existing color choices.

Glass: eight different freestanding glass vessels on one tabletop: tumbler, wine glass, round vase, flute, mug, flared vase, bowl, and decanter. Aim balls at their silhouettes. Glass breaks into slow-motion shards that land on the table. Replace the set only after all eight break.

On/off: tactile switches. Pond: leaves, ripples, recorded water. Dial: continuous circular input with bounded recorded clicks. Sand: persistent rake marks.

Cradle: all five balls start completely still. Any ball can be grabbed, including multiple balls at once. Collision response transfers motion, with bounded swing and angular speed. Enforce bob order so strings cannot cross, including when several balls are dragged.

## Audio and verification

Recorded, normalized local effects; independent master/effects/music controls. No invisible legacy mute state. Android music uses MediaPlayer and effects use SoundPool, bypassing WebView media interception. Voices and repeated triggers are bounded. Browser fallback uses Web Audio. All runtime audio is offline.

Inspect home, selection, clear gameplay, touch patterns, revealed controls, and settings. Test first-tap suppression, five-second delay, multitouch, release/cancel, upgrade preferences, and audio lifecycle. Physical speaker loudness, haptics, tilt orientation, battery use, and system bars require a phone pass.

## Android packaging regression

Windows aapt2 may emit backslashes in nested asset names. Normalize all ZIP entry names before alignment/signing while preserving uncompressed audio. Verify raw central and local headers and exact bundled payloads with npm run check:apk. Python ZipInfo.filename on Windows can normalize names and hide this defect; it is not sufficient evidence.

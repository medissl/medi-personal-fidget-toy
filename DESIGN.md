# No-No Stress — design

## Direction

A quiet personal Android toy box with cream woody paper, warm brown Fredoka typography, brick red accents, and tactile full-screen toys. Follow the user's explicit layout and particle references.

Home: STRESS inside a red circle/slash emblem above the full title “No-No Stress.” Circular GitHub action left, larger circular Play center, conventional gear for Options right. No cat, tagline, descriptions, or extra actions. The GitHub action opens https://github.com/medissl externally.

Selection: exactly two square cards per row, scrolling vertically. Each name sits inside its card at the top-left. No descriptions or category headings.

## Gameplay

Fill the screen with the toy. No title, description, counters, or bottom action bar, except the explicitly requested zipper completion count. Back top-left and Options top-right. No pause, mute, or reset buttons at the top.

Top controls and toy-specific bottom options fade after five seconds. A short top tap while hidden only reveals. The reveal tap cannot also activate a control or trigger a toy. The next deliberate tap activates. Swipes and holds remain gameplay. Keyboard Tab reveals controls. Settings pause simulation and audio. Android immersive mode hides bars during play; OS edge gestures can reveal temporary bars.

## Stardust

The shapes are made entirely of moving individual particles. They must not become static drawn orbit outlines. Use rich swarms, thick colored bundles, visible grain, soft halos, loose particles around the bands, and white at convergence and crossings. Keep individual orbit colors coherent, and preserve those colors through release. The supplied Atomus images are the visual acceptance reference; thin wire loops are inadequate.

Default 7,200 particles; adjustable 2,400–14,400. Color palettes remain at the bottom, with no five-mode selector. Hold gathers; release the last contact causes an expansive burst. Cancellation never bursts.

Fingers act as moving checkpoints. Particles retain momentum and flow between them; there are no analytic circle, ellipse, atom, or DNA position targets. Moving, pinching, spreading, crossing, and clustering contacts changes the currents. Nearby contact groups can merge or split the flow.

The user's one-to-ten-finger descriptions are observed motifs, not fixed outlines to reproduce. In particular, three contacts must not invoke a perfect circumcircle. Two-contact pinching should remain alive as it compresses and expands. Seven contacts retain the requested directional stream with solid fingertip obstacles.

Preserve the richer glowing appearance preferred during review. Do not thin the field or dim it to make the trajectories tidy. White is strongest at convergence; colored moving grains and loose strands remain visible.

## Tactile toys

Wood carving: horizontal rotating log, round/square/triangle tips, guided silhouette, three randomized designs, falling chips. Carving cannot grow material back.

Metal balls: many spheres, multiple draggable balls, collisions that affect their neighbors, real collision samples, Android tilt.

Slime: full-screen glossy material with actual local indentation and gradual recovery. No isolated elastic egg.

Packaging pop: disposable bubbles stay popped; a fresh sheet follows completion. Bubble pad remains the separate reversible silicone toy.

Zipper: zip upward; completion count appears briefly once, then a new zipper arrives. Recorded zipper sound follows movement.

Carrots: moving knife, falling slices, recorded chop. Glass: ball impact creates individually moving shards with initial slow motion, followed by a fresh pane.

On/off: tactile switches. Pond: leaves, ripples, recorded water. Dial: continuous circular input with bounded recorded clicks. Sand: persistent rake marks.

Cradle: all five balls start completely still. Any ball can be grabbed, including multiple balls at once. Collision response transfers motion and keeps bobs on screen.

## Audio and verification

Recorded, normalized local effects; independent master/effects/music controls. No invisible legacy mute state. Android music uses MediaPlayer and effects use SoundPool, bypassing WebView media interception. Voices and repeated triggers are bounded. Browser fallback uses Web Audio. All runtime audio is offline.

Inspect home, selection, clear gameplay, touch patterns, revealed controls, and settings. Test first-tap suppression, five-second delay, multitouch, release/cancel, upgrade preferences, and audio lifecycle. Physical speaker loudness, haptics, tilt orientation, battery use, and system bars require a phone pass.

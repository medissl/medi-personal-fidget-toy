# No-No Stress — design

## Direction

A quiet personal Android toy box with cream ruled notebook paper with visible fine grain, warm brown Fredoka typography, brick red accents, and tactile full-screen toys. Follow the user's explicit layout and particle references.

Home: STRESS inside a red circle/slash emblem above the full title “No-No Stress.” Circular GitHub action left, larger circular Play center, conventional gear for Options right. No cat, tagline, descriptions, or extra actions. The GitHub action opens https://github.com/medissl externally.

Selection: exactly two square cards per row, scrolling vertically. Each name sits inside its card at the top-left. No descriptions or category headings.

## Gameplay

Fill the screen with the toy. No title, description, counters, or bottom action bar, except the explicitly requested zipper completion count and transient carving score. Back top-left and Options top-right. No pause, mute, or reset buttons at the top.

Top controls and toy-specific bottom options fade after five seconds. A short tap at the top, or bottom when toy options exist, while hidden only reveals. The reveal tap cannot also activate a control or trigger a toy. The next deliberate tap activates. Swipes and holds remain gameplay. Keyboard Tab reveals controls. Settings pause simulation and audio. Android immersive mode hides bars during play; OS edge gestures can reveal temporary bars.

## Stardust

The shapes are made entirely of moving individual particles. They must not become static drawn orbit outlines. Use rich swarms with coherent colored currents and fine luminous motion filaments. The latest reference correction explicitly requires neon-like moving trails rather than a dotted outline. The background is exact black. Render each particle's own recent head/tail motion additively. No static orbit strokes, full-screen blur, or white fingertip marker. White can emerge only from actual overlapping colored particles. Keep individual orbit colors coherent, and preserve those colors through release. The supplied Atomus images are the visual acceptance reference; thin wire loops are inadequate.

Default 14,400 particles; adjustable 4,800–24,000. Color palettes remain at the bottom, with no five-mode selector. Hold gathers; release the last contact causes an expansive burst. Cancellation never bursts.

Fingers act as moving checkpoints. Particles retain momentum and flow between them; there are no analytic circle, ellipse, atom, or DNA position targets. Moving, pinching, spreading, crossing, and clustering contacts changes the currents. Nearby contact groups can merge or split the flow.

The user's one-to-ten-finger descriptions are observed motifs, not fixed outlines to reproduce. In particular, three contacts must not invoke a perfect circumcircle. Two-contact pinching should remain alive as it compresses and expands. Seven contacts retain the requested directional stream with solid fingertip obstacles.

Preserve density and live motion while keeping fine filaments visible; reserve white for real overlap. The reference shapes must emerge from the finger-driven flow, with no imposed circle or atom outlines.

StarEngine touch centroid/angular ordering/perimeter helpers are adapted under MIT, with notice bundled in web/licenses/StarEngine-MIT.txt. These helpers are public; the complete Atomus effect equations are not. See ATOMUS_RESEARCH.md. The active StarView line head/tail update is adapted into persistent particle history. Our spring fields, checkpoint steering and WebGL shaders remain an original reconstruction. Long holds maintain independent particle energies; compact/collinear touch geometry uses a nondegenerate live spring field. Screen walls apply during holds and release. Release adds an impulse to existing velocity; settling continuously blends forces without a timed scene switch. Gaussian particle halos leave the fine original filaments sharp. A small velocity grid maintains coherent released currents; density-dependent emission lifts sparse filaments without a timed scene switch.

## Tactile toys

Wood carving: horizontal rotating log with bark, machined chucks, round/square/triangle tips, and three guided silhouettes. Allow carving below the guide and fully through the axis. The smaller severed segment falls; material never grows back. The finger holds the body of the tool with its tip above the finger. A >=85% whole-profile match awards one point, shown briefly; the next log pops in. Empty logs replace immediately without a point.

Metal balls: exactly nine large chrome spheres with per-pixel reflected room rays responding to position and tilt, plus rolling surface roughness, multiple draggable balls, collisions that affect their neighbors, real collision samples, Android tilt.

Slime: full-screen glossy material with actual local indentation and gradual recovery. No isolated elastic egg.

Packaging pop: dimensional translucent bubbles flatten into irregular crumpled plastic, not an X. Bubbles stay popped; a fresh sheet follows completion. Bubble pad remains the separate reversible silicone toy.

Zipper: large teeth and pull tab fill the screen with fabric. Zip upward to the reachable top edge; completion count appears briefly once, then a new zipper arrives. Recorded zipper sound follows movement.

Liquid lava replaces Carrots. Use connected, advected color plumes with velocity, swirling pressure flow, and touch-driven stirring. Rainbow is the default. Limited MacCormack advection preserves color folds; saturated shading and cubic dye interpolation avoid muddy color and blocky highlights. Offer the three existing color choices.

Glass: eight different freestanding glass vessels on one tabletop: tumbler, wine glass, round vase, flute, mug, flared vase, bowl, and decanter. Aim balls at their silhouettes. Glass breaks into slow-motion shards that land on the table. Replace the set only after all eight break, with a staggered fall and settling bounce from above.

On/off: tactile switches. Pond: leaves can be held and moved without triggering droplets, ripples or water SFX; open water touches splash. Dial: continuous circular input with bounded recorded clicks. Sand: persistent rake marks.

Cradle: all five balls start completely still. Any ball can be grabbed, including multiple balls at once. One incoming bob transfers to one outgoing bob; two transfer to two. Collision response transfers motion, with bounded swing and angular speed. Enforce bob order so strings cannot cross, including when several balls are dragged. Held bobs absorb collisions; blocked held targets cannot continually inject energy. Damping and a quiet-state threshold bring the chain to exact rest.

## Audio and verification

Authentic recorded material effects; separate sand, abrasive carving, sticky slime, silicone pops, plastic-wrap snaps, zipper and dial recordings. Carving, sand and zipper use a single movement-controlled loop with a short idle watchdog, never stacked retriggers. Both switch directions use the same tactile sound. Lava and Stardust have no interaction SFX. Independent master/effects/music controls. No invisible legacy mute state. Android music uses MediaPlayer and effects use SoundPool, bypassing WebView media interception. Voices and repeated triggers are bounded. Browser fallback uses Web Audio. All runtime audio is offline.

Inspect home, selection, clear gameplay, touch patterns, revealed controls, and settings. Test first-tap suppression, five-second delay, multitouch, release/cancel, upgrade preferences, and audio lifecycle. Physical speaker loudness, haptics, tilt orientation, battery use, and system bars require a phone pass.

## Android packaging regression

Windows aapt2 may emit backslashes in nested asset names. Normalize all ZIP entry names before alignment/signing while preserving uncompressed audio. Verify raw central and local headers and exact bundled payloads with npm run check:apk. Python ZipInfo.filename on Windows can normalize names and hide this defect; it is not sufficient evidence.

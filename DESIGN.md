# Medi Personal Fidget Toy — design

## Layout

Follow the user's concrete Android game layout.
Home: spinning particles above “Medi Personal Fidget Toy”; circular Play in the middle, random play on its left, menu/settings on its right.
Selection: exactly two square boxes per row, vertical scrolling, each name in the box's top-left. No descriptions.
Use a dark blue shell, bold system sans-serif, mint buttons, and simple icons. The toys carry the visual interest. Keep taglines, editorial headings, helper paragraphs, and category badges out of these screens.

## Gameplay chrome

The canvas fills the phone. No title, gesture label, description, or button text.
Back at top-left; pause/audio/reset icons at top-center; settings at top-right.
Controls and bottom options fade after two seconds without a control interaction.
A short tap beginning near the top reveals them. Swiping into the top never reveals them. Hidden controls are inert and cannot activate on the wake tap.
Keyboard Tab reveals controls. Settings pause the toy and audio.
Android immersive mode hides system bars while playing and restores normal bars in menus. OS edge gestures can reveal transient bars.

## Toys

Stardust: 12,000 particles across the screen initially; adjustable 3,000–18,000. Hold to gather; release the last finger for a charged burst. Cancellation, pause, backgrounding, resize, and exit never cause a burst. Two fingers set an orbit and pinch radius, three a vortex, four separate wells, and five or more repel. Flow, Wave, Gravity, Ribbons, and Electric change the movement. Keep colors saturated and release motion expansive.
Pond: floating leaves, ripples, touch-driven drift, recorded water.
Bubble pad: tall reversible silicone pad and recorded pop variations.
Dial: circular dragging and short recorded detents; bound repeated playback.
Slime: glossy elastic material, drag/stretch and spring back, recorded wet sounds.
Buttons: distinct pressed surfaces with recorded mechanical clicks.
Sand: persistent five-line rake marks; reset clears.
Cradle: pull an end ball and release to transfer momentum. Bound swings to the viewport.

## Audio and comfort

Recorded effects replace synthesized bleeps. Master/SFX/music gains are independent. Normalize short samples, compress peaks, and retain an audible adjustment range. Bound active voices and trigger rates. Offer different music choices.
Preserve preferences and reduced motion. Keep controls readable when brightness is lowered.
All runtime assets are local.

## References and verification

Official SungLab Atomus/Triple A listings inform particle modes and multitouch; JindoBlu Antistress informs tactile variety. The user's hold/release description is an acceptance criterion. Use original simulations rather than claiming identical proprietary physics.
Inspect rendered menu, selection, clear gameplay, revealed controls, and settings on phone sizes. Test gesture cancellation, tap-only reveal, timeout, and audio lifecycle. Build with the existing signing key and distinguish browser results from device verification.

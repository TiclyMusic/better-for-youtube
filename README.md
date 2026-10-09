# Better for YouTube

The sister extension of Better for YouTube Music for **www.youtube.com**: Material 3 Expressive, lighter and minimal.

## Features

**Look**
- **M3 Expressive, light and dark.** It follows YouTube's own theme setting. Pill buttons morph to rounded squares when pressed, and like/dislike becomes a connected button group. You also get pill search, tonal chips, rounded thumbnails with pill time badges, a rounded player, a tonal description card, rounded menus and dialogs, and an M3 progress bar, play button and settings menu inside the player.
- **Dynamic color.** The palette comes from the thumbnail of the video you're watching and stays on as you browse.
- **Wavy progress bar**, the same M3 Expressive indicator as Better for YouTube Music. It shows each chapter as its own segment with gaps, the buffered range as a lighter track, and a pill thumb that grows on hover. It follows you while scrubbing, works on live streams, and doesn't draw while the controls are hidden. YouTube's own slider stays on top, so seeking, preview thumbnails and the keyboard work as usual.
- **M3 player.** Play/pause is a primary button that's a circle when paused and a squircle when playing. Volume, time, the chapter chip and the right-hand controls are tonal pills with state layers. The settings menu, toggles, volume slider, tooltips, autoplay countdown, end-screen wall and the ad "Skip" button are all M3 too.
- **Hashed-token adoption.** YouTube's newer components use hashed design tokens (`--t4a6da19e…`) whose names change between builds. At runtime the extension reads YouTube's own `[dark]`/`[light]` token blocks, recognizes each token by its stock color, and remaps it to the matching M3 role, so new components follow the theme too.
- **Minimal interface.** Removes end-screen cards, info cards, the watermark, the merch shelf, info panels, the Explore / More from YouTube / footer guide sections, voice search, and feed nudges.
- **Hide Shorts.** Removes Shorts shelves, Shorts cards in feeds and search, and the guide entry.

**Speed**
- **Lightweight effects.** Ambient mode ("cinematics") is off; it re-renders the video into blurred canvases nonstop. Live backdrop blurs on the masthead, chip bar and tonal buttons are removed, and so are JS ripples.
- **No hover previews.** Resting the mouse on a thumbnail no longer starts a second video stream.
- **Minimum quality** (default 1080p; also Auto, 720p, 1440p, 4K). YouTube's adaptive streaming often settles lower than your screen can show, for example 720p on a 1080p video in a normal-sized window. The chosen quality is locked on every video. Videos that don't go that high play at their best. If you pick a quality yourself in YouTube's settings menu, that choice wins for that video.
- **Background saver** (off by default). Drops to 144p a few seconds after the tab goes to the background, and returns when you come back. It pauses the minimum quality while hidden, and never applies in picture-in-picture.
- **Native animations.** Keeps Chrome's compositor-driven `Element.animate` instead of YouTube's JS polyfill.
- **Lazy rendering.** `content-visibility` on feed items, search results, the watch-next list and comments.
- **Telemetry blocking.** Blocks log events, QoE stats and ad trackers. Watch history keeps working.
- **Prefer H.264** (off by default). For older PCs without VP9/AV1 hardware decoding; caps video at 1080p.

**Quality of life**
- **Keep playing.** Dismisses "Video paused. Continue watching?". It only does this when you've been idle for 10+ minutes and the video is paused, so it never confirms a dialog you opened yourself.
- **Scroll for volume.** Works over the player's control bar, not the whole video, so page scrolling still works. Shows an M3 indicator.
- **Picture-in-picture.** A button right after the volume control pops the video into Chrome's floating window, which stays above other apps. The button fills with the primary color while PiP is on, and works even on videos where YouTube disables PiP.
- **Hide Premium upsells.**

Ads are not blocked.

## Install

`chrome://extensions` → Developer mode → **Load unpacked** → select this `better-for-youtube/` folder.

## Shared code

`src/shared/m3-tokens.css`, `src/shared/color.js` and `src/popup/popup.{js,css}` are generated copies of `../shared/`. Edit the originals there, then run `node tools/sync-shared.mjs` from the `Extensions/` folder.

## Download

Get the latest build from the [Releases page](https://github.com/TiclyMusic/better-for-youtube/releases/latest). Unzip it, open `chrome://extensions`, enable Developer mode and use **Load unpacked**.

## Other extensions

- [Better for YouTube Music](https://github.com/TiclyMusic/better-for-yt-music)
- [Better for Spotify](https://github.com/TiclyMusic/better-for-spotify)

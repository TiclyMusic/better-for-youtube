// Settings schema for Better for YouTube. Loaded by the content script, popup and
// service worker, so it must stay plain global JS.
var BYTM = globalThis.BYTM || (globalThis.BYTM = {});

BYTM.DEFAULTS = Object.freeze({
  // Look
  theme: true, // Material 3 Expressive restyle
  dynamicColor: true, // palette from the video you're watching
  wavyProgress: true, // M3 Expressive wavy progress bar in the player
  m3Captions: true, // subtitles as rounded, palette-tinted M3 pills
  expressiveType: true, // Google Sans Flex
  minimalUI: true, // hide clutter: end screens, cards, extra guide sections…
  hideShorts: true, // no Shorts shelves, cards or guide entry
  accentHue: 25, // fallback hue (OKLCH degrees) before the first video / when dynamic color is off

  // Speed
  blockTelemetry: true, // declarativeNetRequest ruleset
  lazyRender: true, // content-visibility on off-screen grid items, results, comments
  lightEffects: true, // no ambient mode (cinematics), no live blurs, no ripples
  noHoverPreviews: true, // don't start inline video previews on thumbnail hover
  minQuality: "hd1080", // lock video quality: "auto" | "hd720" | "hd1080" | "hd1440" | "hd2160" | "max"
  videoSaver: false, // 144p while the tab is in the background (overrides minQuality while hidden)
  nativeAnimations: true, // keep Chrome's native Element.animate over YouTube's JS polyfill
  preferH264: false, // avoid VP9/AV1 software decoding on older PCs

  // Quality of life
  autoContinue: true, // dismiss "Video paused. Continue watching?"
  wheelVolume: true, // scroll over the player controls to change volume
  pipButton: true, // picture-in-picture button next to the volume control
  hideUpsells: true, // Premium promos & banners
});

BYTM.ACCENTS = Object.freeze([
  { name: "Coral", hue: 25 },
  { name: "Rose", hue: 0 },
  { name: "Violet", hue: 285 },
  { name: "Blue", hue: 250 },
  { name: "Teal", hue: 190 },
  { name: "Green", hue: 145 },
  { name: "Amber", hue: 75 },
]);

// After the extension is reloaded or updated, the old content script keeps
// running in tabs that were already open, but every chrome.* call then throws
// "Extension context invalidated". Polls check this and stop quietly.
BYTM.alive = function alive() {
  if (globalThis.bytmHost) return true; // desktop app: no extension context
  try {
    return !!chrome.runtime?.id;
  } catch {
    return false;
  }
};

BYTM.ext = function ext() {
  return (globalThis.bytmHost && globalThis.bytmHost.chrome) || chrome;
};

BYTM.loadSettings = async function loadSettings() {
  const stored = await BYTM.ext().storage.sync.get(null);
  return { ...BYTM.DEFAULTS, ...stored };
};

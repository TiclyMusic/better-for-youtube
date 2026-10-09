// Better for YouTube content-script entry point: settings -> <html data-bytm-*>
// attributes (the stylesheet keys off them), light/dark scheme sync, and
// dynamic color from the video you're watching.
(() => {
  const root = document.documentElement;
  const FONT_HREF =
    "https://fonts.googleapis.com/css2?family=Google+Sans+Flex:opsz,wdth,wght,ROND@6..144,25..151,1..1000,0..100&display=swap";

  const ATTRS = {
    theme: "data-bytm-theme",
    wavyProgress: "data-bytm-wavy",
    m3Captions: "data-bytm-captions",
    expressiveType: "data-bytm-type",
    minimalUI: "data-bytm-minimal",
    hideShorts: "data-bytm-no-shorts",
    lazyRender: "data-bytm-lazy",
    lightEffects: "data-bytm-light",
    noHoverPreviews: "data-bytm-no-previews",
    videoSaver: "data-bytm-video-saver", // read by page-bridge.js
    hideUpsells: "data-bytm-hide-upsells",
  };
  const THEME_ONLY = new Set(["expressiveType", "wavyProgress", "m3Captions"]);

  let settings = { ...BYTM.DEFAULTS };
  let lastVideo = null;
  let token = 0;

  function applyAttributes() {
    for (const [key, attr] of Object.entries(ATTRS)) {
      root.toggleAttribute(attr, !!settings[key] && (!THEME_ONLY.has(key) || settings.theme));
    }
    root.dataset.bytmMinQuality = settings.minQuality || "auto"; // read by page-bridge.js
  }

  // YouTube's own theme setting (light / dark / device) drives our scheme.
  function syncScheme() {
    const scheme = root.hasAttribute("dark") ? "dark" : "light";
    if (root.dataset.bytmScheme !== scheme) {
      root.dataset.bytmScheme = scheme;
      BYTM.wavy?.paletteChanged(); // the player accent differs per scheme
    }
  }

  let fontLink = null;
  function ensureFont() {
    const want = settings.theme && settings.expressiveType;
    if (want && !fontLink) {
      fontLink = document.createElement("link");
      fontLink.rel = "stylesheet";
      fontLink.href = FONT_HREF;
      (document.head || root).append(fontLink);
    } else if (!want && fontLink) {
      fontLink.remove();
      fontLink = null;
    }
  }

  // --- Dynamic color ------------------------------------------------------------------
  function currentVideoId() {
    if (location.pathname !== "/watch") return null;
    return new URLSearchParams(location.search).get("v");
  }

  async function refreshPalette(force = false) {
    if (!settings.dynamicColor) return;
    const id = currentVideoId();
    if (!id || (id === lastVideo && !force)) return; // elsewhere: keep the last palette
    lastVideo = id;
    const my = ++token;
    const { seed } = await BYTM.analyzeArt(`https://i.ytimg.com/vi/${id}/mqdefault.jpg`);
    if (my !== token) return;
    const palette = BYTM.applySeed(seed, settings.accentHue);
    BYTM.wavy.paletteChanged();
    chrome.storage.local.set({ lastPalette: palette }).catch(() => {});
  }

  function applyAccent() {
    const palette = BYTM.setPalette(settings.accentHue, 0.13);
    BYTM.wavy.paletteChanged();
    if (!settings.dynamicColor) chrome.storage.local.set({ lastPalette: palette }).catch(() => {});
  }

  // --- Settings -------------------------------------------------------------------------
  function applySettings(prev = {}) {
    applyAttributes();
    ensureFont();
    BYTM.tokens.sync(settings.theme);
    BYTM.wavy.setEnabled(settings.theme && settings.wavyProgress);
    BYTM.pip.sync(settings.pipButton);
    BYTM.tweaks.configure(settings);
    try {
      // Read synchronously by page-bridge.js at the next page load.
      localStorage.setItem("bytm:native-animations", settings.nativeAnimations ? "1" : "0");
      localStorage.setItem("bytm:prefer-h264", settings.preferH264 ? "1" : "0");
    } catch {}
    if (prev.dynamicColor !== settings.dynamicColor || prev.accentHue !== settings.accentHue) {
      if (settings.dynamicColor && currentVideoId()) refreshPalette(true);
      else if (!settings.dynamicColor || !prev.restored) applyAccent();
    }
  }

  // Defaults first, so the page never flashes the stock look.
  applyAttributes();
  syncScheme();

  Promise.all([BYTM.loadSettings(), chrome.storage.local.get("lastPalette")]).then(([loaded, { lastPalette }]) => {
    const prev = settings;
    settings = loaded;
    let restored = false;
    if (settings.dynamicColor && lastPalette) {
      BYTM.setPalette(lastPalette.hue, lastPalette.chroma);
      restored = true;
    }
    applySettings({ ...prev, dynamicColor: undefined, restored });
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    const prev = { ...settings, restored: true };
    for (const [key, { newValue }] of Object.entries(changes)) {
      settings[key] = newValue === undefined ? BYTM.DEFAULTS[key] : newValue;
    }
    applySettings(prev);
  });

  // --- Housekeeping poll ------------------------------------------------------------------
  // A cheap poll instead of a subtree MutationObserver over YouTube's huge,
  // constantly-mutating DOM. Navigation events make it immediate.
  function poll() {
    if (!BYTM.alive()) return clearInterval(BYTM.pollTimer);
    syncScheme();
    BYTM.tokens.sync(settings.theme);
    BYTM.wavy.scan();
    BYTM.pip.sync(settings.pipButton);
    refreshPalette().catch(() => {});
    BYTM.tweaks.poll();
  }
  document.addEventListener("yt-navigate-finish", poll);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", poll, { once: true });
  else poll();
  BYTM.pollTimer = setInterval(poll, 1000);
})();

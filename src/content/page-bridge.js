// Runs in the page's MAIN world at document_start: player API access and the
// overrides that must be in place before YouTube's own scripts load.
// Messages cross the world boundary as JSON strings on CustomEvents.
(() => {
  const emit = (type, data) => document.dispatchEvent(new CustomEvent(type, { detail: JSON.stringify(data) }));
  const parse = (e) => {
    try {
      return JSON.parse(e.detail);
    } catch {
      return null;
    }
  };
  const flag = (name, fallback) => {
    try {
      const v = localStorage.getItem(name);
      return v === null ? fallback : v === "1";
    } catch {
      return fallback;
    }
  };
  const player = () => {
    const p = document.getElementById("movie_player");
    return p && typeof p.getVolume === "function" ? p : null;
  };

  // --- Keep Chrome's native Element.animate ---------------------------------------
  // YouTube loads the web-animations-next-lite polyfill, which replaces the
  // native, compositor-driven animate() with a JS wrapper ticking a
  // requestAnimationFrame loop. Ignore that override.
  try {
    const native = Element.prototype.animate;
    if (flag("bytm:native-animations", true) && native && /\[native code\]/.test(Function.prototype.toString.call(native))) {
      Object.defineProperty(Element.prototype, "animate", { configurable: true, get: () => native, set: () => {} });
    }
  } catch {}

  // --- Prefer H.264 ---------------------------------------------------------------
  // VP9/AV1 without hardware decode can peg an older CPU. Saying we can't play
  // them makes YouTube serve H.264 (hardware-decoded almost everywhere).
  if (flag("bytm:prefer-h264", false)) {
    const heavy = /vp0?9|vp8|av01/i;
    const isTypeSupported = MediaSource.isTypeSupported.bind(MediaSource);
    MediaSource.isTypeSupported = (type) => (heavy.test(type) ? false : isTypeSupported(type));
    const canPlayType = HTMLMediaElement.prototype.canPlayType;
    HTMLMediaElement.prototype.canPlayType = function (type) {
      return heavy.test(type) ? "" : canPlayType.call(this, type);
    };
  }

  // --- Minimum quality ------------------------------------------------------------------
  // YouTube's adaptive streaming often settles below what the screen can show
  // (e.g. 720p on a 1080p video). Lock the chosen quality on every video; when a
  // video doesn't offer it, use the best it has. A quality picked by hand in
  // YouTube's menu wins for that video. Setting: html[data-bytm-min-quality].
  const ORDER = ["tiny", "small", "medium", "large", "hd720", "hd1080", "hd1440", "hd2160", "hd2880", "highres"];
  const rank = (q) => ORDER.indexOf(q);
  let lockedVideo = null;
  let manualVideo = null;
  let lastApply = 0;

  function qualityTarget(want, levels) {
    const usable = levels.filter((l) => rank(l) >= 0).sort((a, b) => rank(a) - rank(b));
    if (!usable.length) return null;
    const best = usable[usable.length - 1];
    if (want === "max" || rank(best) <= rank(want)) return best; // lower-res video: its best
    return usable.find((l) => rank(l) >= rank(want)) || best; // smallest level >= wanted
  }

  function enforceQuality() {
    const want = document.documentElement.dataset.bytmMinQuality;
    const p = player();
    if (!want || want === "auto" || !p || capped || typeof p.setPlaybackQualityRange !== "function") return;
    if (document.getElementById("movie_player")?.classList.contains("ad-showing")) return;
    const id = p.getVideoData?.()?.video_id;
    if (!id || id === manualVideo) return;
    const target = qualityTarget(want, p.getAvailableQualityLevels?.() || []);
    if (!target) return;
    if (p.getPlaybackQuality() === target && lockedVideo === id) return;
    if (Date.now() - lastApply < 3000) return; // let a switch settle before re-checking
    lastApply = Date.now();
    lockedVideo = id;
    try {
      p.setPlaybackQualityRange(target, target);
    } catch {}
  }
  setInterval(enforceQuality, 1500);
  // Picking a quality yourself in YouTube's settings menu turns the lock off for that video.
  document.addEventListener(
    "click",
    (e) => {
      if (e.target.closest?.(".ytp-quality-menu")) manualVideo = player()?.getVideoData?.()?.video_id || null;
    },
    true
  );

  // --- Background saver --------------------------------------------------------------
  // While the tab is hidden nobody sees the picture: drop to 144p after a few
  // seconds, return as soon as the tab is visible again. Never while the video
  // is in picture-in-picture — then it is still on screen.
  let capped = false;
  let hiddenTimer = 0;
  function syncSaver() {
    const p = player();
    const enabled = document.documentElement.hasAttribute("data-bytm-video-saver");
    clearTimeout(hiddenTimer);
    if (!p || typeof p.setPlaybackQualityRange !== "function") return;
    if (enabled && document.hidden && !document.pictureInPictureElement) {
      hiddenTimer = setTimeout(() => {
        if (!document.hidden || capped || document.pictureInPictureElement) return;
        try {
          p.setPlaybackQualityRange("tiny", "tiny");
          capped = true;
        } catch {}
      }, 4000);
    } else if (capped) {
      try {
        p.setPlaybackQualityRange("tiny", "highres");
      } catch {}
      capped = false;
      lockedVideo = null; // re-apply the minimum quality right away
      lastApply = 0;
      enforceQuality();
    }
  }
  document.addEventListener("visibilitychange", syncSaver);
  document.addEventListener("enterpictureinpicture", syncSaver, true);
  document.addEventListener("leavepictureinpicture", syncSaver, true);

  // --- Volume (scroll over the player controls) ----------------------------------------
  document.addEventListener("bytm:volume", (e) => {
    const delta = parse(e)?.delta;
    const p = player();
    if (typeof delta !== "number" || !p) return;
    const current = p.isMuted() ? 0 : p.getVolume();
    const target = Math.max(0, Math.min(100, Math.round(current + delta)));
    p.setVolume(target);
    if (target > 0 && p.isMuted()) p.unMute();
    emit("bytm:volume-changed", { volume: p.getVolume(), muted: p.isMuted() });
  });
})();

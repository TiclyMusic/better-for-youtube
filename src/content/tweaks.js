// Quality-of-life features for Better for YouTube.
(() => {
  let options = {};

  // ---------------------------------------------------------------------------
  // "Video paused. Continue watching?"
  // YouTube reuses a generic confirm dialog for it, so we only press "Yes" when
  // that's unambiguous: the video is paused AND you haven't touched the mouse
  // or keyboard for a long time. A dialog you opened yourself (e.g. "Delete
  // playlist?") always follows recent input, so it is never auto-confirmed.
  const IDLE_BEFORE_PROMPT = 10 * 60 * 1000;
  let lastInput = Date.now();
  for (const ev of ["pointerdown", "keydown", "wheel", "touchstart"]) {
    window.addEventListener(ev, () => (lastInput = Date.now()), { capture: true, passive: true });
  }

  function continueWatching() {
    if (!options.autoContinue || Date.now() - lastInput < IDLE_BEFORE_PROMPT) return;
    const video = document.querySelector("#movie_player video");
    if (!video || !video.paused) return;
    const dialog = [...document.querySelectorAll("ytd-popup-container tp-yt-paper-dialog")].find(
      (d) => d.offsetParent && d.querySelector("yt-confirm-dialog-renderer")
    );
    const yes = dialog?.querySelector("#confirm-button button, #confirm-button yt-button-shape button, #confirm-button");
    if (!yes) return;
    yes.click();
    video.play().catch(() => {});
    console.info("[Better for YouTube] Dismissed 'Continue watching?'");
  }

  // ---------------------------------------------------------------------------
  // Scroll over the player's control bar to change volume (only the controls,
  // so scrolling the page with the cursor over the video still scrolls).
  let toast, toastLevel, toastLabel, toastTimer;
  function showVolumeToast(volume, muted) {
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "bytm-volume-toast";
      toast.setAttribute("role", "status");
      const track = document.createElement("div");
      track.className = "bytm-volume-track";
      toastLevel = document.createElement("div");
      toastLevel.className = "bytm-volume-level";
      track.append(toastLevel);
      toastLabel = document.createElement("span");
      toastLabel.className = "bytm-volume-label";
      toast.append(track, toastLabel);
      document.body.append(toast);
    }
    toastLevel.style.width = `${muted ? 0 : volume}%`;
    toastLabel.textContent = muted ? "Muted" : `${Math.round(volume)}%`;
    toast.classList.add("bytm-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("bytm-visible"), 1100);
  }
  document.addEventListener("bytm:volume-changed", (e) => {
    try {
      const { volume, muted } = JSON.parse(e.detail);
      if (typeof volume === "number") showVolumeToast(volume, muted);
    } catch {}
  });

  window.addEventListener(
    "wheel",
    (e) => {
      if (!options.wheelVolume || e.ctrlKey) return;
      if (!e.target.closest?.("#movie_player .ytp-chrome-bottom")) return;
      if (e.target.closest(".ytp-popup, .ytp-settings-menu")) return; // let menus scroll
      const dy = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (!dy) return;
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("bytm:volume", { detail: JSON.stringify({ delta: dy < 0 ? 5 : -5 }) }));
    },
    { passive: false, capture: true }
  );

  // ---------------------------------------------------------------------------
  // No hover previews: YouTube starts an inline player (a whole extra video
  // stream) when the cursor rests on a thumbnail. Swallow the hover events
  // that trigger it; plain CSS :hover effects keep working.
  const PREVIEW_TARGETS =
    "ytd-thumbnail, yt-thumbnail-view-model, .yt-lockup-view-model__content-image, ytd-rich-grid-media #thumbnail, ytd-video-preview";
  for (const ev of ["mouseover", "mouseenter", "pointerover", "pointerenter", "mousemove"]) {
    document.addEventListener(
      ev,
      (e) => {
        if (options.noHoverPreviews && e.target.closest?.(PREVIEW_TARGETS)) e.stopImmediatePropagation();
      },
      true
    );
  }

  BYTM.tweaks = {
    configure(settings) {
      options = settings;
    },
    poll() {
      continueWatching();
    },
  };
})();

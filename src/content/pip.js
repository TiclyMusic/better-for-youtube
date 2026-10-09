// Picture-in-picture button, placed right after the volume control in the
// player. Uses Chrome's native video PiP: the window floats above other apps
// and keeps play/pause (and next/previous via YouTube's media session).
(() => {
  const SVG = "http://www.w3.org/2000/svg";
  // Material Symbols "picture_in_picture_alt"
  const ICON = "M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z";

  let enabled = false;
  let button = null;

  const player = () => document.getElementById("movie_player");
  const video = () => player()?.querySelector("video.html5-main-video, video") || null;
  const supported = () => document.pictureInPictureEnabled === true;

  function build() {
    const b = document.createElement("button");
    b.className = "ytp-button bytm-pip-button";
    b.type = "button";
    b.setAttribute("aria-pressed", "false");
    const svg = document.createElementNS(SVG, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS(SVG, "path");
    path.setAttribute("d", ICON);
    svg.append(path);
    b.append(svg);
    b.addEventListener("click", toggle);
    return b;
  }

  async function toggle(e) {
    e.stopPropagation(); // don't let the click reach the video (play/pause)
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        return;
      }
      const v = video();
      if (!v) return;
      // YouTube marks some videos as not allowed in PiP; the browser can do it anyway.
      v.disablePictureInPicture = false;
      v.removeAttribute("disablepictureinpicture");
      await v.requestPictureInPicture();
    } catch (err) {
      console.warn("[Better for YouTube] picture-in-picture failed", err);
    }
    syncState();
  }

  function syncState() {
    if (!button) return;
    const active = !!document.pictureInPictureElement;
    button.setAttribute("aria-pressed", String(active));
    const label = active ? "Exit picture-in-picture" : "Picture-in-picture";
    button.setAttribute("aria-label", label);
    button.title = label;
  }
  document.addEventListener("enterpictureinpicture", syncState, true);
  document.addEventListener("leavepictureinpicture", syncState, true);

  BYTM.pip = {
    // Called from the housekeeping poll; cheap when the button is in place.
    sync(on) {
      enabled = on && supported();
      if (!enabled) {
        button?.remove();
        return;
      }
      const volume = player()?.querySelector(".ytp-left-controls .ytp-volume-area");
      if (!volume) return;
      if (!button) button = build();
      if (button.previousElementSibling !== volume) volume.after(button);
      syncState();
    },
  };
})();

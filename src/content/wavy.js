// M3 Expressive wavy progress for the YouTube player — the same indicator as
// Better YT Music, extended for video: chapters become separate segments with
// gaps, the buffered range shows as a second track tone, and nothing is drawn
// while YouTube has auto-hidden the controls. YouTube's own slider stays on
// top (transparent), so seeking, previews, chapters and keyboard all work.
(() => {
  const AMPLITUDE = 3; // px
  const WAVELENGTH = 40; // px
  const WAVE_SPEED = 0.85; // wavelengths per second while playing
  const STROKE = 4;
  const GAP = 5; // between the played wave, the thumb and the track
  const THUMB_W = 4;
  const CHAPTER_GAP = 4; // px between chapters

  let enabled = false;
  let raf = 0;
  let lastFrame = 0;
  let amp = 0;
  let phase = 0;
  let state = null; // { player, container, canvas, ctx, ... }
  let colors = null;
  let colorsStale = true;
  let probe = null;
  let classObserver = null;

  const isPlaying = (v) => !!v && !v.paused && !v.ended && v.readyState > 2;

  function readColors() {
    if (!probe) {
      probe = document.createElement("span");
      probe.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
      document.documentElement.append(probe);
    }
    probe.style.color = "var(--bytm-player-accent)";
    colors = {
      active: getComputedStyle(probe).color,
      track: "rgba(255, 255, 255, 0.26)",
      buffered: "rgba(255, 255, 255, 0.46)",
    };
    colorsStale = false;
  }

  // --- Mounting --------------------------------------------------------------------
  function attach(player, container) {
    detach();
    const canvas = document.createElement("canvas");
    canvas.className = "bytm-wave";
    canvas.setAttribute("aria-hidden", "true");
    container.prepend(canvas);
    const s = {
      player, container, canvas,
      ctx: canvas.getContext("2d"),
      dragging: false,
      hover: 0,
      hovering: false,
      w: 0, h: 0, dpr: 0,
      segments: null, segKey: "",
    };
    const onDown = () => { s.dragging = true; kick(); };
    const onUp = () => { if (s.dragging) { s.dragging = false; kick(); } };
    const onEnter = () => { s.hovering = true; kick(); };
    const onLeave = () => { s.hovering = false; kick(); };
    container.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    container.addEventListener("pointerenter", onEnter);
    container.addEventListener("pointerleave", onLeave);
    // Controls showing/hiding, play/pause and ad state are all classes on the player.
    classObserver = new MutationObserver(kick);
    classObserver.observe(player, { attributes: true, attributeFilter: ["class"] });
    s.detach = () => {
      container.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      container.removeEventListener("pointerenter", onEnter);
      container.removeEventListener("pointerleave", onLeave);
      classObserver?.disconnect();
      canvas.remove();
    };
    state = s;
    kick();
  }

  function detach() {
    state?.detach();
    state = null;
  }

  // Chapter segments in canvas px, cached until the layout changes.
  function segments(s, width) {
    const chapters = s.container.querySelectorAll(".ytp-chapter-hover-container");
    const key = `${width}|${chapters.length}|${location.search}`;
    if (s.segments && s.segKey === key) return s.segments;
    const left = s.container.getBoundingClientRect().left;
    let list = [...chapters]
      .map((c) => {
        const r = c.getBoundingClientRect();
        return [r.left - left, r.right - left];
      })
      .filter(([a, b]) => b - a > 1);
    if (list.length <= 1) list = [[0, width]];
    else list = list.map(([a, b], i) => [a, i === list.length - 1 ? b : b - CHAPTER_GAP / 2]);
    s.segments = list;
    s.segKey = key;
    return list;
  }

  function progressOf(s, video, width) {
    if (s.dragging) {
      // While scrubbing, YouTube moves its (hidden) scrubber; follow it.
      const m = /translateX\(([-\d.]+)px\)/.exec(s.container.querySelector(".ytp-scrubber-container")?.style.transform || "");
      if (m) return Math.min(Math.max(parseFloat(m[1]) / width, 0), 1);
    }
    if (video && isFinite(video.duration) && video.duration > 0) {
      return Math.min(video.currentTime / video.duration, 1);
    }
    const bar = s.container.querySelector(".ytp-progress-bar"); // live streams
    const now = parseFloat(bar?.getAttribute("aria-valuenow"));
    const max = parseFloat(bar?.getAttribute("aria-valuemax"));
    return max > 0 ? Math.min(Math.max(now / max, 0), 1) : 0;
  }

  function bufferedOf(video) {
    if (!video || !isFinite(video.duration) || !video.duration) return 0;
    const b = video.buffered;
    for (let i = 0; i < b.length; i++) {
      if (b.start(i) <= video.currentTime + 0.5 && b.end(i) >= video.currentTime) return b.end(i) / video.duration;
    }
    return 0;
  }

  // --- Drawing ----------------------------------------------------------------------
  function line(ctx, from, to, mid, color) {
    if (to - from < 0.5) return;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(from, mid);
    ctx.lineTo(to, mid);
    ctx.stroke();
  }

  function draw(s, video) {
    const { canvas, ctx } = s;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    const dpr = window.devicePixelRatio || 1;
    if (w !== s.w || h !== s.h || dpr !== s.dpr) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      s.w = w; s.h = h; s.dpr = dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!colors || colorsStale) readColors();

    const mid = h / 2;
    const x = progressOf(s, video, w) * w;
    const bufX = Math.max(bufferedOf(video) * w, x);
    const half = STROKE / 2;
    const k = (2 * Math.PI) / WAVELENGTH;
    ctx.lineCap = "round";
    ctx.lineWidth = STROKE + s.hover;

    const segs = segments(s, w);
    // Only the chapter you're in waves; finished chapters are a straight line.
    let current = segs.findIndex(([a, b], i) => x >= a && (x <= b || i === segs.length - 1 || x < segs[i + 1][0]));
    if (current < 0) current = segs.length - 1;

    for (let i = 0; i < segs.length; i++) {
      const [a, b] = segs[i];
      const start = a + half;
      const end = b - half;
      if (end <= start) continue;

      if (i < current) {
        line(ctx, start, end, mid, colors.active);
        continue;
      }

      // Played part of the current chapter: the wave.
      const playedEnd = Math.min(end, x - GAP - THUMB_W / 2);
      if (i === current && playedEnd > start) {
        ctx.strokeStyle = colors.active;
        ctx.beginPath();
        for (let px = start; px <= playedEnd; px += 1.5) {
          // Flat at both ends of the segment so chapter gaps stay clean.
          const ramp = Math.max(0, Math.min(1, (px - start) / (WAVELENGTH / 2), (playedEnd - px) / (WAVELENGTH / 2)));
          const y = mid + amp * ramp * Math.sin(px * k - phase);
          px === start ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
        }
        ctx.lineTo(playedEnd, mid);
        ctx.stroke();
      }

      // Remaining part: buffered tone, then the plain track.
      const trackStart = Math.max(start, x + GAP + THUMB_W / 2);
      if (trackStart < end) {
        const bufEnd = Math.min(end, bufX);
        line(ctx, trackStart, bufEnd, mid, colors.buffered);
        line(ctx, Math.max(trackStart, bufEnd), end, mid, colors.track);
      }
    }

    // Stop indicator at the very end, and the vertical pill thumb.
    const last = w - half;
    if (last - x > 12) {
      ctx.fillStyle = colors.active;
      ctx.beginPath();
      ctx.arc(last, mid, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    const thumbH = 16 + s.hover * 5;
    ctx.fillStyle = colors.active;
    ctx.beginPath();
    ctx.roundRect(x - THUMB_W / 2, mid - thumbH / 2, THUMB_W, thumbH, THUMB_W / 2);
    ctx.fill();
  }

  // --- Loop -------------------------------------------------------------------------
  function frame(now) {
    raf = 0;
    if (!enabled || !state) return;
    if (lastFrame && now - lastFrame < 30) {
      raf = requestAnimationFrame(frame); // ~30 fps is plenty for a slow wave
      return;
    }
    const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.1) : 0;
    lastFrame = now;

    const s = state;
    if (!s.container.isConnected) {
      detach();
      return;
    }
    const video = s.player.querySelector("video");
    const playing = isPlaying(video);
    const targetAmp = playing ? AMPLITUDE : 0;
    amp += (targetAmp - amp) * Math.min(1, dt * 7);
    if (Math.abs(targetAmp - amp) < 0.02) amp = targetAmp;
    phase = (phase + dt * WAVE_SPEED * 2 * Math.PI * (amp / AMPLITUDE)) % (Math.PI * 2);
    const targetHover = s.hovering || s.dragging ? 1 : 0;
    s.hover += (targetHover - s.hover) * Math.min(1, dt * 14);
    if (Math.abs(targetHover - s.hover) < 0.01) s.hover = targetHover;

    // Controls auto-hidden (or an ad playing): nothing visible to animate.
    const hidden = s.player.classList.contains("ytp-autohide") && !s.dragging;
    if (!hidden) draw(s, video);

    const animating = !hidden && (playing || amp !== targetAmp || s.hover !== targetHover || s.dragging);
    if (animating) raf = requestAnimationFrame(frame);
    else lastFrame = 0;
  }

  function kick() {
    if (!raf && enabled && state) raf = requestAnimationFrame(frame);
  }

  const MEDIA_EVENTS = ["play", "playing", "pause", "seeked", "timeupdate", "loadedmetadata", "ended", "progress"];
  const onMedia = (e) => {
    if (e.target instanceof HTMLMediaElement) kick();
  };

  BYTM.wavy = {
    setEnabled(on) {
      if (on === enabled) return;
      enabled = on;
      if (on) {
        for (const ev of MEDIA_EVENTS) document.addEventListener(ev, onMedia, true);
        window.addEventListener("resize", kick);
        this.scan();
      } else {
        for (const ev of MEDIA_EVENTS) document.removeEventListener(ev, onMedia, true);
        window.removeEventListener("resize", kick);
        detach();
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      }
    },
    scan() {
      if (!enabled) return;
      const player = document.getElementById("movie_player");
      const container = player?.querySelector(".ytp-progress-bar-container");
      if (container && (!state || state.container !== container || !state.canvas.isConnected)) attach(player, container);
      kick();
    },
    paletteChanged() {
      colorsStale = true;
      kick();
    },
  };
})();

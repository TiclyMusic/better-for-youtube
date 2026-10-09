// Popup content for Better for YouTube (popup.js itself is shared, see tools/sync-shared.mjs).
var BYTM_POPUP = (() => {
  const ICONS = {
    palette:
      "M12 3a9 9 0 0 0 0 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z",
    bolt: "M7 2v11h3v9l7-12h-4l4-8z",
    sparkle: "M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z",
    // Material Symbols "hd"
    hd: "M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-8 12H9.5v-2h-2v2H6V9h1.5v2.5h2V9H11v6zm2-6h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4V9zm1.5 4.5h2v-3h-2v3z",
  };

  const GROUPS = [
    {
      title: "Look",
      icon: "palette",
      rows: [
        { key: "theme", title: "Material 3 Expressive", sub: "Tonal surfaces, bold shapes and springy motion — light and dark" },
        { key: "dynamicColor", title: "Dynamic color", sub: "Build the palette from the video you're watching", needsTheme: true },
        { key: "wavyProgress", title: "Wavy progress bar", sub: "M3 Expressive wave in the player, with chapters and buffering", needsTheme: true },
        { key: "m3Captions", title: "Material captions", sub: "Subtitles as rounded, palette-tinted pills (replaces YouTube's caption style)", needsTheme: true },
        { key: "expressiveType", title: "Expressive type", sub: "Google Sans Flex with rounded display styles", needsTheme: true },
        { key: "minimalUI", title: "Minimal interface", sub: "No end screens, cards, merch or extra guide sections" },
        { key: "hideShorts", title: "Hide Shorts", sub: "Remove Shorts shelves, cards and the guide entry" },
      ],
      accent: true,
    },
    {
      title: "Speed",
      icon: "bolt",
      rows: [
        { key: "blockTelemetry", title: "Block telemetry & ad trackers", sub: "Fewer background requests; watch history keeps working" },
        { key: "lazyRender", title: "Lazy rendering", sub: "Skip layout and paint for off-screen videos and comments" },
        { key: "lightEffects", title: "Lightweight effects", sub: "No ambient mode, live blurs or ripple animations" },
        { key: "noHoverPreviews", title: "No hover previews", sub: "Don't start videos when the mouse rests on a thumbnail" },
        { key: "videoSaver", title: "Background saver", sub: "Drop to 144p while the tab is hidden (pauses the minimum quality; never in picture-in-picture)" },
        { key: "nativeAnimations", title: "Native animations", sub: "Chrome's GPU animations instead of YouTube's JS polyfill (applies on reload)" },
        { key: "preferH264", title: "Prefer H.264", sub: "For older PCs: avoids heavy VP9/AV1 decoding (max 1080p, applies on reload)" },
      ],
    },
    {
      title: "Video quality",
      icon: "hd",
      rows: [
        {
          key: "minQuality",
          title: "Minimum quality",
          sub: "Locked on every video; lower-resolution videos use their best. Picking a quality in YouTube's menu wins for that video",
          options: [
            { value: "auto", label: "Auto" },
            { value: "hd720", label: "720p" },
            { value: "hd1080", label: "1080p" },
            { value: "hd1440", label: "1440p" },
            { value: "hd2160", label: "4K" },
          ],
        },
      ],
    },
    {
      title: "Quality of life",
      icon: "sparkle",
      rows: [
        { key: "autoContinue", title: "Keep playing", sub: "Auto-dismiss “Video paused. Continue watching?”" },
        { key: "wheelVolume", title: "Scroll for volume", sub: "Scroll over the player controls to adjust volume" },
        { key: "pipButton", title: "Picture-in-picture", sub: "A button next to the volume pops the video into a floating window" },
        { key: "hideUpsells", title: "Hide Premium upsells", sub: "Remove promo banners and pop-ups" },
      ],
    },
  ];

  return {
    hero: { lobes: 10, depth: 0.1, color: "rgb(240 42 28)" },
    icons: ICONS,
    groups: GROUPS,
    appUrl: "https://www.youtube.com/",
    openLabel: "Open YouTube",
    paletteFromLast: "Palette from the last video you watched",
    paletteWaiting: "Watch something to pick up its colors",
  };
})();

// YouTube's newer components read hashed design tokens (e.g.
// --t4a6da19e16bf221a) instead of the readable --yt-sys-color-* names, and
// the hashes change between YouTube builds. So we adopt them at runtime: read
// the [dark] / [light] blocks from YouTube's own stylesheets, recognise each
// token by its stock color value, and remap it onto the matching M3 role.
(() => {
  const HASHED = /^--t[0-9a-f]{12,}$/;
  const mix = (role, pct) => `color-mix(in oklab, var(${role}) ${pct}%, transparent)`;

  // Stock value -> M3 role, per scheme. Only unambiguous values are listed;
  // anything else (brand gradients, status colors…) keeps YouTube's value.
  const ROLES = {
    dark: {
      "#fff": "var(--md-on-surface)",
      "#ffffff": "var(--md-on-surface)",
      "#f1f1f1": "var(--md-on-surface)",
      "#aaa": "var(--md-on-surface-variant)",
      "#aaaaaa": "var(--md-on-surface-variant)",
      "#717171": mix("--md-on-surface", 38),
      "#0f0f0f": "var(--md-surface)",
      "#181818": "var(--md-surface-container-low)",
      "#212121": "var(--md-surface-container)",
      "#272727": "var(--md-surface-container)",
      "#282828": "var(--md-surface-container-high)",
      "#3f3f3f": "var(--md-outline-variant)",
      "#030303": "var(--md-on-primary)",
      "#3ea6ff": "var(--md-primary)",
      "#65b8ff": "var(--md-primary)",
      "#263850": "var(--md-secondary-container)",
      "#f03": "var(--md-primary)",
      "#ff0033": "var(--md-primary)",
      "#e1002d": "var(--md-primary)",
      "rgba(255,255,255,0.05)": mix("--md-on-surface", 5),
      "rgba(255,255,255,0.1)": mix("--md-on-surface", 10),
      "rgba(255,255,255,0.15)": mix("--md-on-surface", 15),
      "rgba(255,255,255,0.2)": mix("--md-on-surface", 20),
      "rgba(255,255,255,0.3)": mix("--md-on-surface", 30),
      "rgba(255,255,255,0.7)": "var(--md-on-surface-variant)",
    },
    light: {
      "#0f0f0f": "var(--md-on-surface)",
      "#030303": "var(--md-on-surface)",
      "#606060": "var(--md-on-surface-variant)",
      "#909090": mix("--md-on-surface", 38),
      "#fff": "var(--md-surface)",
      "#ffffff": "var(--md-surface)",
      "#f9f9f9": "var(--md-surface-container-low)",
      "#f2f2f2": "var(--md-surface-container-high)",
      "#e5e5e5": "var(--md-outline-variant)",
      "#065fd4": "var(--md-primary)",
      "#def1ff": "var(--md-secondary-container)",
      "#f03": "var(--md-primary)",
      "#ff0033": "var(--md-primary)",
      "#e1002d": "var(--md-primary)",
      "rgba(0,0,0,0.05)": mix("--md-on-surface", 5),
      "rgba(0,0,0,0.1)": mix("--md-on-surface", 10),
      "rgba(0,0,0,0.2)": mix("--md-on-surface", 20),
    },
  };
  const norm = (v) => v.trim().toLowerCase().replace(/\s+/g, "");

  let style = null;
  let seenSheets = -1;

  function collect() {
    const found = { dark: new Map(), light: new Map() };
    for (const sheet of document.styleSheets) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        continue; // cross-origin sheet
      }
      const walk = (list) => {
        for (const rule of list) {
          if (rule.cssRules && !rule.style) {
            walk(rule.cssRules);
            continue;
          }
          const sel = rule.selectorText;
          if (!rule.style || !sel) continue;
          const scheme = /(^|,)\s*\[dark\]\s*(,|$)/.test(sel) ? "dark" : /(^|,)\s*\[light\]\s*(,|$)/.test(sel) ? "light" : null;
          if (!scheme) continue;
          for (const prop of rule.style) {
            if (!HASHED.test(prop)) continue;
            const role = ROLES[scheme][norm(rule.style.getPropertyValue(prop))];
            if (role) found[scheme].set(prop, role);
          }
        }
      };
      walk(rules);
    }
    return found;
  }

  function adopt() {
    const found = collect();
    const block = (map) => [...map].map(([k, v]) => `${k}:${v};`).join("");
    const css =
      `:root[data-bytm-theme][data-bytm-scheme="dark"],:root[data-bytm-theme][data-bytm-scheme="dark"] [dark]{${block(found.dark)}}` +
      `:root[data-bytm-theme][data-bytm-scheme="light"],:root[data-bytm-theme][data-bytm-scheme="light"] [light]{${block(found.light)}}`;
    if (!style) {
      style = document.createElement("style");
      style.id = "bytm-adopted-tokens";
    }
    style.textContent = css;
    if (!style.isConnected) (document.head || document.documentElement).append(style);
    return found.dark.size + found.light.size;
  }

  BYTM.tokens = {
    // Cheap to call often: only re-scans when YouTube adds stylesheets.
    sync(enabled) {
      if (!enabled) {
        style?.remove();
        seenSheets = -1;
        return;
      }
      const count = document.styleSheets.length;
      if (count === seenSheets && style?.isConnected) return;
      seenSheets = count;
      (window.requestIdleCallback || setTimeout)(() => {
        const n = adopt();
        console.debug(`[Better for YouTube] adopted ${n} design tokens`);
      });
    },
  };
})();

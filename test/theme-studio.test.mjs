import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const themeStudio = require('../packages/core/theme-studio.js');

function createMockElement(tag) {
  const attrs = new Map();
  const el = {
    tagName: String(tag).toUpperCase(),
    id: '',
    textContent: '',
    children: [],
    parentElement: null,
    get attributes() {
      return Array.from(attrs.entries()).map(([name, value]) => ({ name, value }));
    },
    setAttribute(k, v) {
      const key = String(k);
      const val = String(v);
      attrs.set(key, val);
      if (key === 'id') el.id = val;
    },
    getAttribute(k) {
      return attrs.has(String(k)) ? attrs.get(String(k)) : null;
    },
    hasAttribute(k) {
      return attrs.has(String(k));
    },
    removeAttribute(k) {
      attrs.delete(String(k));
      if (k === 'id') el.id = '';
    },
    appendChild(child) {
      child.parentElement = el;
      el.children.push(child);
      return child;
    },
    remove() {
      if (!el.parentElement) return;
      el.parentElement.children = el.parentElement.children.filter((x) => x !== el);
      el.parentElement = null;
    },
  };
  return el;
}

function createMockDocument({ prismStyle = null } = {}) {
  const html = createMockElement('html');
  const head = createMockElement('head');
  const body = createMockElement('body');
  html.appendChild(head);
  html.appendChild(body);
  if (prismStyle !== null) {
    html.setAttribute('data-ag-cs-style', prismStyle);
  }

  function findById(node, id) {
    if (node.id === id || node.getAttribute('id') === id) return node;
    for (const c of node.children) {
      const found = findById(c, id);
      if (found) return found;
    }
    return null;
  }

  return {
    documentElement: html,
    head,
    body,
    createElement: (tag) => createMockElement(tag),
    getElementById: (id) => findById(html, id),
  };
}

test('ThemeStudio: exposes expected exports and mounts root.__agSagThemeStudio in browser UMD mode', () => {
  assert.equal(themeStudio.STYLE_ID, 'ag-sag-theme-css');
  assert.deepEqual(Object.keys(themeStudio.THEME_PRESETS).sort(), [
    'aurora-glass',
    'catppuccin-mocha',
    'crystal-day',
    'doodle-sketch',
    'matcha-journal',
    'midnight-ink',
    'native',
    'nord-frost',
    'obsidian-prism',
    'oled-pure',
    'phantom-crimson',
    'pixel-terminal',
    'rose-dawn',
    'tokyo-night',
    'warm-basalt',
    'warm-paper',
  ]);
  assert.deepEqual(Object.keys(themeStudio.DENSITY_PRESETS).sort(), ['balanced', 'comfortable', 'compact']);

  const src = fs.readFileSync(new URL('../packages/core/theme-studio.js', import.meta.url), 'utf8');
  const sandbox = {};
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.runInNewContext(src, sandbox);
  assert.equal(typeof sandbox.__agSagThemeStudio?.createThemeStudioController, 'function');
  assert.equal(sandbox.__agSagThemeStudio.STYLE_ID, 'ag-sag-theme-css');
});

test('ThemeStudio: all presets & switches generate valid CSS with strictly zero :has() selectors', () => {
  for (const preset of Object.keys(themeStudio.THEME_PRESETS)) {
    for (const density of Object.keys(themeStudio.DENSITY_PRESETS)) {
      const css = themeStudio.buildThemeCss({
        preset,
        density,
        cjkFontTuning: true,
        compactSidebar: true,
        wideReadable: true,
        conflictPolicy: 'takeover',
        customCss: '.custom-card { border-radius: 10px; }',
      });

      assert.equal(css.includes(':has('), false, `Generated CSS for ${preset}/${density} must never use :has()`);
      assert.ok(css.includes('"PingFang SC"'));
      assert.ok(css.includes('"Hiragino Sans GB"'));
      assert.ok(css.includes('"Noto Sans CJK SC"'));
      assert.ok(css.includes('"Microsoft YaHei UI"'));
      assert.ok(css.includes('--ag-sag-font-mono:'));
      assert.ok(css.includes('max-width:min(1180px, 94%)'));
      assert.ok(css.includes('min-height:28px'));
      assert.ok(css.includes('.custom-card { border-radius: 10px; }'));

      if (preset === 'native') {
        assert.equal(css.includes('--background:'), false, 'native preset should not override host palette');
      } else {
        assert.ok(css.includes('--background:'));
        assert.ok(css.includes('--card:'));
        assert.ok(css.includes('--foreground:'));
        assert.ok(css.includes('--muted-foreground:'));
        assert.ok(css.includes('--primary:'));
        assert.ok(css.includes('--border:'));
      }
    }
  }

  const oledCss = themeStudio.buildThemeCss({ preset: 'oled-pure' });
  assert.match(oledCss, /--background:#000000(?:!important)?;/);

  const noCjkCss = themeStudio.buildThemeCss({ preset: 'native', cjkFontTuning: false });
  assert.equal(noCjkCss.includes('"PingFang SC"'), false);
});

test('ThemeStudio: sanitizeCustomCss blocks @import, external urls, XSS tags, escapes and caps length at 8192', () => {
  const malicious = [
    '@import url("https://evil.example/a.css");',
    '@IMPORT "http://evil.example/b.css";',
    '@im/**/port url("//evil.example/c.css");',
    '@\\69mport url("https://evil.example/hex.css");',
    '.a { background: url(https://evil.example/track.png); }',
    '.b { background: url("http://evil.example/track2.png"); }',
    '.c { background: url(//cdn.evil.example/x.svg); }',
    '.d { background: url(javascript:alert(1)); }',
    '.e { background: url(data:text/html,<script>alert(1)</script>); }',
    '.f { width: expression(alert(1)); behavior: url(xss.htc); }',
    '</style><script>alert("xss")</script><style>',
    '<<script>script>alert(2)</</style>style>',
    '.safe { color: var(--primary); content: "\\2022"; border-radius: 6px; }',
  ].join('\n');

  const cleaned = themeStudio.sanitizeCustomCss(malicious);
  assert.equal(/@\s*import/i.test(cleaned), false);
  assert.equal(/https?:\/\//i.test(cleaned), false);
  assert.equal(/\/\/cdn\.evil/i.test(cleaned), false);
  assert.equal(/javascript:/i.test(cleaned), false);
  assert.equal(/<script/i.test(cleaned), false);
  assert.equal(/<\/style/i.test(cleaned), false);
  assert.equal(/expression\s*\(/i.test(cleaned), false);
  assert.equal(/behavior\s*:/i.test(cleaned), false);
  assert.ok(cleaned.includes('.safe { color: var(--primary); content: "\\2022"; border-radius: 6px; }'));

  const huge = '.x{color:red;}\n'.repeat(1200);
  const capped = themeStudio.sanitizeCustomCss(huge);
  assert.ok(capped.length <= 8192);
  assert.ok(capped.length > 8000);
});

test('ThemeStudio: sanitizeCustomCss defeats multi-pass escape/splice/nested-paren PoCs while preserving safe CSS', () => {
  // 1. Non-hex backslash escapes (@\i\m\p\o\r\t and \u\r\l)
  const nonHexImport = themeStudio.sanitizeCustomCss('@\\i\\m\\p\\o\\r\\t "https://evil.com/a.css";');
  assert.equal(/@\s*import/i.test(nonHexImport), false);
  assert.equal(/evil\.com/i.test(nonHexImport), false);

  const nonHexUrl = themeStudio.sanitizeCustomCss('.x { background: \\u\\r\\l(https://evil.com/p.png); }');
  assert.equal(/\burl\s*\(/i.test(nonHexUrl), false);
  assert.equal(/evil\.com/i.test(nonHexUrl), false);

  // 2. Multi-pass hex backslash escapes (@\5c 69mport, \5c 75rl, and 6-digit zero-padded hex followed by hex chars)
  const doubleHexImport = themeStudio.sanitizeCustomCss('@\\5c 69mport url("https://evil.com/b.css");');
  assert.equal(/@\s*import/i.test(doubleHexImport), false);
  assert.equal(/evil\.com/i.test(doubleHexImport), false);

  const zeroPadHexImport = themeStudio.sanitizeCustomCss('@\\00005c69mport url("https://evil.com/z.css");');
  assert.equal(/@\s*import/i.test(zeroPadHexImport), false);
  assert.equal(/evil\.com/i.test(zeroPadHexImport), false);

  const doubleHexUrl = themeStudio.sanitizeCustomCss('.y { background: \\5c 75rl("https://evil.com/c.png"); }');
  assert.equal(/\burl\s*\(/i.test(doubleHexUrl), false);
  assert.equal(/evil\.com/i.test(doubleHexUrl), false);

  const zeroPadDataUrl = themeStudio.sanitizeCustomCss('.z0 { background: url(\\000064ata:text/javascript,alert(1)); }');
  assert.equal(/\burl\s*\(/i.test(zeroPadDataUrl), false);
  assert.equal(/javascript/i.test(zeroPadDataUrl), false);

  // 3. Splice resurrection (@imp@import;ort and </st@import;yle><script>alert(1)</script>)
  const spliceImport = themeStudio.sanitizeCustomCss('@imp@import;ort url("https://evil.com/d.css");');
  assert.equal(/@\s*import/i.test(spliceImport), false);
  assert.equal(/evil\.com/i.test(spliceImport), false);

  const spliceStyleBreakout = themeStudio.sanitizeCustomCss('</st@import;yle><script>alert(1)</script>');
  assert.equal(spliceStyleBreakout.includes('<'), false);
  assert.equal(/<\/style/i.test(spliceStyleBreakout), false);
  assert.equal(/<script/i.test(spliceStyleBreakout), false);
  assert.equal(/alert\s*\(/i.test(spliceStyleBreakout), false);
  assert.equal(/@\s*import/i.test(spliceStyleBreakout), false);

  // 4. Nested parens in image-set(...) / -webkit-image-set(...)
  const imgSet = themeStudio.sanitizeCustomCss(
    '.z { background-image: image-set(url(a.png) 1x, "https://evil.com/t.png" 2x); }'
  );
  assert.equal(/image-set/i.test(imgSet), false);
  assert.equal(/evil\.com/i.test(imgSet), false);
  assert.equal(/a\.png/i.test(imgSet), false);

  const webkitImgSet = themeStudio.sanitizeCustomCss(
    '.w { background-image: -webkit-image-set("https://evil.com/t.png" 2x); }'
  );
  assert.equal(/image-set/i.test(webkitImgSet), false);
  assert.equal(/evil\.com/i.test(webkitImgSet), false);

  // 5. Strict url(...) whitelist: reject data:text/javascript, data:image/svg+xml, relative paths; allow #id & base64 raster
  const jsDataUrl = themeStudio.sanitizeCustomCss('.js { background: url(data:text/javascript,alert(1)); }');
  assert.equal(/\burl\s*\(/i.test(jsDataUrl), false);
  assert.equal(/javascript/i.test(jsDataUrl), false);
  assert.equal(/alert\s*\(/i.test(jsDataUrl), false);

  const svgDataUrl = themeStudio.sanitizeCustomCss('.svg { background: url("data:image/svg+xml;base64,PHN2Zz4="); }');
  assert.equal(/\burl\s*\(/i.test(svgDataUrl), false);

  const relUrl = themeStudio.sanitizeCustomCss('.rel { background: url(assets/leak.png); }');
  assert.equal(/\burl\s*\(/i.test(relUrl), false);

  // 6. @charset, @namespace, -moz-binding, and full :has() rule removal (never leaves broadened base selector)
  const extraBlocked = themeStudio.sanitizeCustomCss(
    '@charset "UTF-8";\n@namespace svg url(http://www.w3.org/2000/svg);\ndiv:has(> .a:not(.b)) { -moz-binding: url(#x); color: red; }\ndiv:\\68 as(.c) { opacity: 0.5; }\n.kept { color: green; }'
  );
  assert.equal(/@\s*(?:charset|namespace)/i.test(extraBlocked), false);
  assert.equal(/:has\s*\(/i.test(extraBlocked), false);
  assert.equal(/-moz-binding/i.test(extraBlocked), false);
  assert.equal(extraBlocked.includes('color: red;'), false);
  assert.equal(extraBlocked.includes('opacity: 0.5;'), false);
  assert.ok(extraBlocked.includes('.kept { color: green; }'));

  // 7. Non-convergent adversarial nesting (> 8 passes) fails closed to ''
  let deepNested = '@import;';
  for (let i = 0; i < 10; i += 1) {
    deepNested = `@imp${deepNested}ort;`;
  }
  assert.equal(themeStudio.sanitizeCustomCss(deepNested), '');

  // 8. Safe CSS constructs are preserved intact (Unicode \2022, child combinator >, #local-id, base64 raster)
  const safeCss =
    '.parent > .child { content: "\\2022"; filter: url(#glow-1); background-image: url("data:image/png;base64,iVBORw0KGgo="); }';
  assert.equal(themeStudio.sanitizeCustomCss(safeCss), safeCss);
});

test('ThemeStudio: default opt-in stays inert until enabled, handles Prism yield vs takeover, and destroys cleanly', () => {
  const doc = createMockDocument({ prismStyle: 'obsidian' });
  const ctl = themeStudio.createThemeStudioController({
    doc,
    preset: 'midnight-ink',
    cjkFontTuning: true,
    density: 'compact',
    compactSidebar: true,
    wideReadable: true,
    customCss: '.note { opacity: 0.95; }',
  });

  // Opt-in default: disabled
  assert.equal(ctl.getDebugState().enabled, false);
  assert.equal(doc.getElementById(themeStudio.STYLE_ID), null);
  assert.equal(doc.documentElement.hasAttribute('data-ag-sag-theme'), false);

  // Enable under Obsidian Prism with default conflictPolicy = 'yield'
  ctl.setEnabled(true);
  const styleEl = doc.getElementById(themeStudio.STYLE_ID);
  assert.ok(styleEl, 'style element should be mounted when enabled');
  assert.equal(doc.documentElement.getAttribute('data-ag-sag-theme'), '1');
  assert.equal(doc.documentElement.getAttribute('data-ag-sag-theme-colors'), 'yielded');
  assert.equal(ctl.getDebugState().prismDetected, true);
  assert.equal(ctl.getDebugState().colorsYielded, true);
  assert.equal(styleEl.textContent.includes('--background:#0b0f17'), false, 'yield policy must skip color vars under Prism');
  assert.ok(styleEl.textContent.includes('"PingFang SC"'), 'yield policy still keeps CJK font tuning');
  assert.ok(styleEl.textContent.includes('--ag-sag-line-height:1.52'), 'yield policy still keeps typography density');
  assert.ok(styleEl.textContent.includes('.note { opacity: 0.95; }'));

  // Switch to takeover policy: colors now apply in full
  ctl.updateSettings({ conflictPolicy: 'takeover', preset: 'nord-frost' });
  assert.equal(doc.documentElement.getAttribute('data-ag-sag-theme-policy'), 'takeover');
  assert.equal(doc.documentElement.getAttribute('data-ag-sag-theme-colors'), 'active');
  assert.equal(ctl.getDebugState().colorsYielded, false);
  assert.match(styleEl.textContent, /--background:#2e3440(?:!important)?;/);
  assert.equal(styleEl.textContent.includes(':has('), false);

  // Disable via setEnabled(false) removes style and attributes cleanly
  ctl.setEnabled(false);
  assert.equal(doc.getElementById(themeStudio.STYLE_ID), null);
  assert.equal(doc.documentElement.hasAttribute('data-ag-sag-theme'), false);
  assert.equal(doc.documentElement.getAttribute('data-ag-cs-style'), 'obsidian', 'host Prism attribute must remain intact');

  // Re-enable and then destroy()
  ctl.setEnabled(true);
  assert.ok(doc.getElementById(themeStudio.STYLE_ID));
  doc.documentElement.setAttribute('data-ag-sag-theme-extra', '1');
  ctl.destroy();

  assert.equal(ctl.getDebugState().destroyed, true);
  assert.equal(ctl.getDebugState().styleMounted, false);
  assert.equal(doc.getElementById(themeStudio.STYLE_ID), null);
  const remainingSagAttrs = doc.documentElement.attributes.filter((a) => a.name.startsWith('data-ag-sag-theme'));
  assert.deepEqual(remainingSagAttrs, []);
  assert.equal(doc.documentElement.getAttribute('data-ag-cs-style'), 'obsidian');

  // Post-destroy operations are safe no-ops
  assert.equal(ctl.setEnabled(true), false);
  assert.equal(doc.getElementById(themeStudio.STYLE_ID), null);
});

// =====================================================================
//  PISTOLET · Generador de tokens de diseno
//
//  Lee design/tokens.json (FUENTE UNICA) y emite:
//    - PistoletApp/frontend/src/styles/tokens.generated.css  (web: Bootstrap 5.3)
//    - PistoletApp/constants/design.generated.ts             (app Expo / RN)
//    - pistolet-frontend/src/styles/tokens.generated.css     (copia raiz, si existe)
//
//  Uso (desde PistoletApp):  node design/build-tokens.mjs
//  NO editar los archivos generados a mano.
// =====================================================================
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');        // PistoletApp
const workspaceRoot = resolve(repoRoot, '..'); // carpeta que contiene pistolet-frontend

const tokens = JSON.parse(readFileSync(join(here, 'tokens.json'), 'utf8'));

// ---------- helpers de color ----------
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}
const rgbTriplet = (hex) => hexToRgb(hex).join(', ');
const rgba = (hex, alpha) => `rgba(${rgbTriplet(hex)}, ${alpha})`;

const HEADER = (kind) =>
  `/* =====================================================================\n` +
  ` *  GENERADO desde design/tokens.json — NO EDITAR A MANO.\n` +
  ` *  Edita los tokens y corre: node design/build-tokens.mjs\n` +
  ` * ===================================================================== */\n`;

// =====================================================================
//  1. CSS para la web (Bootstrap 5.3)
// =====================================================================
function buildCss() {
  const p = tokens.primitives;
  const out = [];

  out.push(HEADER('css'));

  // --- primitivos + tipografia + escalas (independientes del tema) ---
  out.push(':root {');
  for (const [group, val] of Object.entries(p)) {
    if (typeof val === 'string') {
      out.push(`  --ps-${group}: ${val};`);
    } else {
      for (const [shade, hex] of Object.entries(val)) {
        out.push(`  --ps-${group}-${shade}: ${hex};`);
      }
    }
  }
  out.push(`  --ps-font-display: '${tokens.typography.display}', Georgia, serif;`);
  out.push(`  --ps-font-body: '${tokens.typography.body}', system-ui, sans-serif;`);
  for (const [k, v] of Object.entries(tokens.typography.sizes)) out.push(`  --ps-text-${k}: ${v}px;`);
  for (const [k, v] of Object.entries(tokens.typography.weights)) out.push(`  --ps-weight-${k}: ${v};`);
  for (const [k, v] of Object.entries(tokens.spacing)) out.push(`  --ps-space-${k}: ${v}px;`);
  for (const [k, v] of Object.entries(tokens.radii)) out.push(`  --ps-radius-${k}: ${v}px;`);
  out.push('}\n');

  // --- temas semanticos ---
  for (const scheme of ['dark', 'light']) {
    const t = tokens.themes[scheme];
    // Orden de emision: el tema por defecto entra en :root para no requerir atributo.
    const selector =
      scheme === tokens.defaultScheme
        ? `:root,\n[data-bs-theme="${scheme}"]`
        : `[data-bs-theme="${scheme}"]`;

    out.push(`${selector} {`);
    out.push(`  color-scheme: ${scheme};`);

    // variables propias de Pistolet
    for (const [k, v] of Object.entries(t)) {
      out.push(`  --ps-${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v};`);
    }

    // sombras
    for (const [k, s] of Object.entries(tokens.shadow[scheme])) {
      out.push(`  --ps-shadow-${k}: 0 ${s.y}px ${s.blur}px ${rgba(s.color, s.opacity)};`);
    }

    // --- mapeo a Bootstrap 5.3 ---
    out.push(`  --bs-primary: var(--ps-accent);`);
    out.push(`  --bs-primary-rgb: ${rgbTriplet(t.accent)};`);
    out.push(`  --bs-body-bg: var(--ps-bg);`);
    out.push(`  --bs-body-bg-rgb: ${rgbTriplet(t.bg)};`);
    out.push(`  --bs-body-color: var(--ps-text);`);
    out.push(`  --bs-body-color-rgb: ${rgbTriplet(t.text)};`);
    out.push(`  --bs-emphasis-color: var(--ps-text);`);
    out.push(`  --bs-emphasis-color-rgb: ${rgbTriplet(t.text)};`);
    out.push(`  --bs-secondary-color: ${rgba(t.text, 0.7)};`);
    out.push(`  --bs-secondary-bg: var(--ps-surface-subtle);`);
    out.push(`  --bs-secondary-bg-rgb: ${rgbTriplet(t.surfaceSubtle)};`);
    out.push(`  --bs-tertiary-color: ${rgba(t.text, 0.55)};`);
    out.push(`  --bs-tertiary-bg: var(--ps-surface);`);
    out.push(`  --bs-border-color: var(--ps-border);`);
    out.push(`  --bs-border-color-translucent: ${rgba(t.border, 0.65)};`);
    out.push(`  --bs-heading-color: var(--ps-heading);`);
    out.push(`  --bs-link-color: var(--ps-accent);`);
    out.push(`  --bs-link-color-rgb: ${rgbTriplet(t.accent)};`);
    out.push(`  --bs-link-hover-color: var(--ps-accent-hover);`);
    out.push(`  --bs-link-hover-color-rgb: ${rgbTriplet(t.accentHover)};`);
    out.push(`  --bs-card-bg: var(--ps-surface);`);
    out.push(`  --bs-card-color: var(--ps-text);`);
    out.push(`  --bs-card-border-color: var(--ps-border);`);
    out.push(`  --bs-card-cap-bg: var(--ps-surface-subtle);`);
    out.push(`  --bs-dropdown-bg: var(--ps-surface);`);
    out.push(`  --bs-dropdown-color: var(--ps-text);`);
    out.push(`  --bs-dropdown-link-hover-bg: var(--ps-surface-subtle);`);
    out.push(`  --bs-modal-bg: var(--ps-surface);`);
    out.push(`  --bs-modal-color: var(--ps-text);`);
    out.push(`  --bs-highlight-bg: var(--ps-accent);`);
    out.push(`  --bs-highlight-color: var(--ps-on-accent);`);
    out.push(`  --bs-dark: var(--ps-inverse-bg);`);
    out.push(`  --bs-dark-rgb: ${rgbTriplet(t.inverseBg)};`);
    out.push(`  --bs-light: var(--ps-surface-subtle);`);
    out.push(`  --bs-light-rgb: ${rgbTriplet(t.surfaceSubtle)};`);
    out.push(`  --bs-danger: var(--ps-danger);`);
    out.push(`  --bs-danger-rgb: ${rgbTriplet(t.danger)};`);
    out.push(`  --bs-success: var(--ps-success);`);
    out.push(`  --bs-success-rgb: ${rgbTriplet(t.success)};`);
    out.push(`  --bs-warning: var(--ps-warning);`);
    out.push(`  --bs-warning-rgb: ${rgbTriplet(t.warning)};`);
    out.push(`  --bs-info: var(--ps-info);`);
    out.push(`  --bs-info-rgb: ${rgbTriplet(t.info)};`);
    out.push('}\n');
  }

  // --- utilidades de sombra ---
  out.push('.ps-shadow-sm { box-shadow: var(--ps-shadow-sm) !important; }');
  out.push('.ps-shadow-md { box-shadow: var(--ps-shadow-md) !important; }');
  out.push('.ps-shadow-lg { box-shadow: var(--ps-shadow-lg) !important; }');
  out.push('');

  return out.join('\n');
}

// =====================================================================
//  2. TypeScript para la app (Expo / React Native)
// =====================================================================
function buildTs() {
  const p = tokens.primitives;

  const shadowFor = (scheme) => {
    const lines = Object.entries(tokens.shadow[scheme]).map(([k, s]) => {
      const obj = `{ shadowColor: '${s.color}', shadowOffset: { width: 0, height: ${s.y} }, shadowOpacity: ${s.opacity}, shadowRadius: ${s.blur}, elevation: ${s.elevation} }`;
      return `    ${k}: ${obj},`;
    });
    return `{\n${lines.join('\n')}\n  }`;
  };

  const themeObj = (scheme) =>
    Object.entries(tokens.themes[scheme])
      .map(([k, v]) => `  ${k}: '${v}',`)
      .join('\n');

  return (
    HEADER('ts') +
    `import type { ViewStyle } from 'react-native';\n\n` +
    `export type Scheme = 'light' | 'dark';\n\n` +
    `export const primitives = ${JSON.stringify(p, null, 2)} as const;\n\n` +
    `const dark = {\n${themeObj('dark')}\n};\n\n` +
    `const light = {\n${themeObj('light')}\n};\n\n` +
    `// Los dos temas comparten exactamente las mismas claves.\n` +
    `export type Theme = typeof dark;\n\n` +
    `export const themes: { dark: Theme; light: Theme } = { dark, light };\n\n` +
    `export const typography = ${JSON.stringify(tokens.typography, null, 2)} as const;\n\n` +
    `export const spacing = ${JSON.stringify(tokens.spacing, null, 2)} as const;\n\n` +
    `export const radii = ${JSON.stringify(tokens.radii, null, 2)} as const;\n\n` +
    `export const shadows: Record<Scheme, Record<'sm' | 'md' | 'lg', ViewStyle>> = {\n` +
    `  light: ${shadowFor('light')},\n` +
    `  dark: ${shadowFor('dark')},\n};\n\n` +
    `export const fonts = {\n` +
    `  display: '${tokens.typography.display}',\n` +
    `  body: '${tokens.typography.body}',\n} as const;\n\n` +
    `export const defaultScheme: Scheme = '${tokens.defaultScheme}';\n`
  );
}

// =====================================================================
//  3. Escritura
// =====================================================================
function writeOut(full, content) {
  if (!existsSync(dirname(full))) mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, 'utf8');
  console.log('  ✓', full);
}

const css = buildCss();
const ts = buildTs();

const cssCanonico = join(repoRoot, 'frontend', 'src', 'styles', 'tokens.generated.css');
const tsApp = join(repoRoot, 'constants', 'design.generated.ts');
const cssRaiz = join(workspaceRoot, 'pistolet-frontend', 'src', 'styles', 'tokens.generated.css');

console.log('Generando tokens de Pistolet…');
writeOut(cssCanonico, css);
writeOut(tsApp, ts);
if (existsSync(dirname(cssRaiz))) {
  writeOut(cssRaiz, css);
} else {
  console.log('  · copia de la raiz ausente, se omite:', cssRaiz);
}
console.log('Listo.');

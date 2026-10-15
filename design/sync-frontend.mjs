// =====================================================================
//  PISTOLET · Sincroniza el frontend canónico con la copia de la raíz
//
//  Fuente de verdad:  PistoletApp/frontend
//  Destino:           pistolet-frontend  (copia de trabajo en la raíz)
//
//  Uso (desde PistoletApp):  node design/sync-frontend.mjs
//
//  Copia angular.json, src/ y public/. No borra archivos que existan
//  solo en el destino (copia aditiva/sobreescritura).
// =====================================================================
import { cpSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const workspaceRoot = resolve(repoRoot, '..');

const origen = join(repoRoot, 'frontend');
const destino = join(workspaceRoot, 'pistolet-frontend');

if (!existsSync(origen)) {
  console.error('No se encontró el frontend canónico:', origen);
  process.exit(1);
}
if (!existsSync(destino)) {
  console.error('No se encontró la copia de la raíz:', destino);
  process.exit(1);
}

const objetivo = ['angular.json', 'src', 'public'];

for (const item of objetivo) {
  const desde = join(origen, item);
  const hacia = join(destino, item);
  if (!existsSync(desde)) continue;
  cpSync(desde, hacia, { recursive: true });
  console.log('  ✓', item);
}

console.log('Frontend de la raíz sincronizado con PistoletApp/frontend.');

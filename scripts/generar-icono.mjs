#!/usr/bin/env node
/**
 * Genera apps/web/public/apple-touch-icon.png (180x180) con la misma
 * composición que logo.svg (fondo pine, sol ocre, sierras). Sin dependencias:
 * rasteriza con matemáticas y comprime con zlib nativo.
 *
 * Uso: node scripts/generar-icono.mjs
 */
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const T = 180;
const PINE_950 = [8, 16, 11];
const PINE_700 = [32, 58, 40];
const PINE_600 = [44, 79, 56];
const PINE_200 = [188, 210, 196];
const OCHRE_400 = [211, 165, 104];

const picosAtras = [
  [0, 150], [55, 75], [95, 125], [135, 65], [180, 150],
];
const picosFrente = [
  [0, 150], [75, 105], [105, 140], [145, 100], [180, 150],
];
const SOL = { x: 126, y: 54, r: 26 };
const CASA = {
  paredes: [26, 126, 60, 154],
  tejado: [[20, 128], [43, 104], [66, 128]],
  puerta: [39, 138, 47, 154],
};
const OCHRE_200 = [226, 192, 145];
const OCHRE_600 = [166, 116, 48];

function dentroPoligono(x, y, puntos) {
  let dentro = false;
  for (let i = 0, j = puntos.length - 1; i < puntos.length; j = i++) {
    const [xi, yi] = puntos[i];
    const [xj, yj] = puntos[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

function nieve(x, y, picoX, picoY, ancho) {
  // Pequeño triángulo de nieve bajo el pico.
  const rel = (y - picoY) / 22;
  if (rel < 0 || rel > 1) return false;
  return Math.abs(x - picoX) < ancho * (1 - rel) && y >= picoY;
}

const px = Buffer.alloc(T * T * 3);
for (let y = 0; y < T; y++) {
  for (let x = 0; x < T; x++) {
    let color = PINE_950;
    const dx = x - SOL.x;
    const dy = y - SOL.y;
    if (dx * dx + dy * dy <= SOL.r * SOL.r) color = OCHRE_400;
    if (dentroPoligono(x, y, [...picosAtras, [180, 180], [0, 180]])) color = PINE_700;
    if (nieve(x, y, 55, 75, 14) || nieve(x, y, 135, 65, 12)) color = PINE_200;
    if (dentroPoligono(x, y, [...picosFrente, [180, 180], [0, 180]])) color = PINE_600;
    if (
      x >= CASA.paredes[0] && x <= CASA.paredes[2] &&
      y >= CASA.paredes[1] && y <= CASA.paredes[3]
    ) {
      color = OCHRE_200;
    }
    if (dentroPoligono(x, y, CASA.tejado)) color = OCHRE_600;
    if (
      x >= CASA.puerta[0] && x <= CASA.puerta[2] &&
      y >= CASA.puerta[1] && y <= CASA.puerta[3]
    ) {
      color = PINE_950;
    }
    const i = (y * T + x) * 3;
    px[i] = color[0];
    px[i + 1] = color[1];
    px[i + 2] = color[2];
  }
}

const tabla = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  tabla[n] = c;
}
function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) crc = tabla[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function trozo(tipo, datos) {
  const t = Buffer.from(tipo, "ascii");
  const cuerpo = Buffer.concat([t, datos]);
  const out = Buffer.alloc(12 + datos.length);
  out.writeUInt32BE(datos.length, 0);
  cuerpo.copy(out, 4);
  out.writeUInt32BE(crc32(cuerpo), 8 + datos.length);
  return out;
}

const cabecera = Buffer.alloc(13);
cabecera.writeUInt32BE(T, 0);
cabecera.writeUInt32BE(T, 4);
cabecera[8] = 8; // profundidad
cabecera[9] = 2; // color verdadero
const filas = [];
for (let y = 0; y < T; y++) {
  filas.push(Buffer.from([0]));
  filas.push(px.subarray(y * T * 3, (y + 1) * T * 3));
}
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  trozo("IHDR", cabecera),
  trozo("IDAT", deflateSync(Buffer.concat(filas))),
  trozo("IEND", Buffer.alloc(0)),
]);

const destino = join(dirname(fileURLToPath(import.meta.url)), "..", "apps", "web", "public", "apple-touch-icon.png");
writeFileSync(destino, png);
console.log(`Icono escrito en ${destino} (${png.length} bytes)`);

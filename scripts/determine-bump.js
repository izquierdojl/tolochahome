#!/usr/bin/env node
/**
 * Decide major|minor|patch desde los commits (convencional + tipo de change).
 * Uso: node scripts/determine-bump.js [desde-tag]
 * - Si no se pasa tag, usa el último tag v* alcanzable.
 * - Lee `git log <tag>..HEAD --format=%B`.
 *
 * Reglas (AGENTS.md §8):
 * - BREAKING CHANGE o `!:` → major
 * - `feat` o tipo `feature` → minor
 * - `fix`/`bug` → patch
 * - infra/docs/refactor/test/chore → patch salvo BREAKING
 */
import { execSync } from "node:child_process";

function sh(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

const since = process.argv[2] || sh("git describe --tags --abbrev=0 --match 'v*' 2>/dev/null");
const range = since ? `${since}..HEAD` : "HEAD";
const log = sh(`git log ${range} --format=%B%x1e`);
const bodies = log.split("\x1e").map((s) => s.trim()).filter(Boolean);

let bump = "patch";
if (bodies.length === 0) {
  console.log(bump);
  process.exit(0);
}

const breaking = bodies.some(
  (b) => /BREAKING CHANGE/i.test(b) || /^[a-z!]+(\(.+\))?!:/im.test(b),
);
if (breaking) {
  console.log("major");
  process.exit(0);
}
const hasFeat = bodies.some(
  (b) => /^(feat(\(.+\))?:|feature[:\s-])/im.test(b),
);
console.log(hasFeat ? "minor" : "patch");

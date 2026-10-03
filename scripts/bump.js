#!/usr/bin/env node
/**
 * Sube la version (semver) en la raiz y en todos los workspaces,
 * crea el commit "chore(release): vX.Y.Z" y el tag "vX.Y.Z".
 *
 * Uso:
 *   node scripts/bump.js minor   # 0.1.0 -> 0.2.0 (feature/infra/docs, por defecto)
 *   node scripts/bump.js patch   # 0.2.0 -> 0.2.1 (bugfix/hotfix)
 *   node scripts/bump.js major   # 0.2.0 -> 1.0.0 (BREAKING CHANGE / estable)
 *
 * Con BUMP_DRY_RUN=1 no toca ficheros ni git: solo imprime la proxima version.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WORKSPACES = ["apps/api/package.json", "apps/web/package.json"];
const DRY = process.env.BUMP_DRY_RUN === "1";

const type = process.argv[2] ?? "minor";
if (!["major", "minor", "patch"].includes(type)) {
  console.error(`Tipo de bump desconocido: ${type} (usa major | minor | patch)`);
  process.exit(1);
}

const rootPkgPath = join(REPO_ROOT, "package.json");
const rootPkg = JSON.parse(readFileSync(rootPkgPath, "utf8"));

const [major, minor, patch] = rootPkg.version.split(".").map((n) => Number(n) || 0);
const next =
  type === "major" ? [major + 1, 0, 0] : type === "minor" ? [major, minor + 1, 0] : [major, minor, patch + 1];
const version = next.join(".");

console.log(`Versión actual: ${rootPkg.version} -> ${version} (${type})`);
if (DRY) {
  console.log("Modo dry-run: no se modifica nada.");
  process.exit(0);
}

rootPkg.version = version;
writeFileSync(rootPkgPath, `${JSON.stringify(rootPkg, null, 2)}\n`);

for (const rel of WORKSPACES) {
  const pkgPath = join(REPO_ROOT, rel);
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  pkg.version = version;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

execSync(`git add package.json ${WORKSPACES.join(" ")}`, { cwd: REPO_ROOT, stdio: "inherit" });
execSync(`git commit -m "chore(release): v${version}"`, { cwd: REPO_ROOT, stdio: "inherit" });
execSync(`git tag "v${version}"`, { cwd: REPO_ROOT, stdio: "inherit" });
console.log(`Release local creado: commit + tag v${version}`);
console.log("Publica con: git push origin <rama> && git push origin --tags");

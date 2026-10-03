#!/usr/bin/env bash
# Crea un change OpenSpec: scripts/new_change.sh <tipo> "<título>" [rama]
# Ejemplo: scripts/new_change.sh feature "Alta de grupos" dev
set -euo pipefail

DEFAULT_BRANCH="${DEFAULT_BRANCH:-dev}"
TIPOS="feature|bug|docs|infra|refactor|test|chore"

tipo="${1:-}"
titulo="${2:-}"
branch="${3:-$DEFAULT_BRANCH}"

if [[ -z "$tipo" || -z "$titulo" ]]; then
  echo "Uso: $0 <tipo> \"<título>\" [rama]" >&2
  echo "  tipo: $TIPOS" >&2
  echo "  rama: dev (defecto) | feature" >&2
  exit 1
fi

if ! [[ "$tipo" =~ ^($TIPOS)$ ]]; then
  echo "Tipo inválido: $tipo (usa $TIPOS)" >&2
  exit 1
fi

if [[ "$branch" != "dev" && "$branch" != "feature" ]]; then
  echo "Rama inválida: $branch (usa dev | feature)" >&2
  exit 1
fi

id8="$(python3 scripts/spec_id.py)"
# slug: minúsculas, sin acentos, espacios -> guiones, solo [a-z0-9-]
slug="$(echo "$titulo" \
  | iconv -f utf-8 -t ascii//TRANSLIT 2>/dev/null || echo "$titulo" \
  | tr '[:upper:]' '[:lower:]' \
  | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//' \
  | cut -c1-48)"
name="${tipo}-${id8}-${slug}"
dir="openspec/changes/${name}"
mkdir -p "$dir/specs"

autor="$(git config user.name 2>/dev/null || echo unknown)"
fecha="$(date -Iseconds)"

cat > "$dir/meta.yaml" <<EOF
tipo: $tipo
id: $id8
titulo: "$titulo"
autor: "$autor"
fecha: "$fecha"
branch: $branch
EOF

cat > "$dir/proposal.md" <<EOF
# $titulo

## Resumen
<!-- Qué problema resuelve y por qué -->

## Alcance
<!-- Qué entra / qué no entra (un change = una capacidad) -->

## Diseño
<!-- Enfoque técnico, endpoints, tablas, UI -->
EOF

cat > "$dir/tasks.md" <<EOF
- [ ] Propuesta revisada
- [ ] Implementación
- [ ] typecheck + lint + test + build
- [ ] Archivar (commitear TODO y verificar \`git status\` limpio en lo tocado)
EOF

if [[ "$branch" == "feature" ]]; then
  git checkout -b "feature/${name}" 2>/dev/null || git checkout "feature/${name}"
  echo "Rama creada: feature/${name}"
fi

echo "Change creado: $dir"
echo "  tipo=$tipo id=$id8 branch=$branch"

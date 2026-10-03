#!/usr/bin/env bash
# Valida los meta.yaml de openspec/changes/ (se ejecuta en CI).
# Exige: tipo, id, titulo, autor, fecha, branch.
set -euo pipefail

TIPOS="feature bug docs infra refactor test chore"
fail=0

shopt -s nullglob
dirs=(openspec/changes/*/)
if [[ ${#dirs[@]} -eq 0 ]]; then
  echo "Sin changes activos: OK"
  exit 0
fi

for dir in "${dirs[@]}"; do
  name="$(basename "$dir")"
  meta="$dir/meta.yaml"
  echo "== $name =="
  if [[ ! -f "$meta" ]]; then
    echo "  ERROR: falta meta.yaml"; fail=1; continue
  fi
  # Nombre <tipo>-<id8>-<slug>
  if ! [[ "$name" =~ ^(feature|bug|docs|infra|refactor|test|chore)-[0-9a-f]{8}-[a-z0-9-]+$ ]]; then
    echo "  ERROR: nombre no sigue <tipo>-<id8>-<slug>: $name"; fail=1
  fi
  for campo in tipo id titulo autor fecha branch; do
    if ! grep -qE "^${campo}:" "$meta"; then
      echo "  ERROR: falta campo '${campo}' en meta.yaml"; fail=1
    fi
  done
  tipo="$(grep -E '^tipo:' "$meta" | sed 's/^tipo:[[:space:]]*//')"
  # shellcheck disable=SC2086
  if ! [[ " $TIPOS " == *" $tipo "* ]]; then
    echo "  ERROR: tipo inválido '$tipo'"; fail=1
  fi
  if ! grep -Eq '^id: [0-9a-f]{8}$' "$meta"; then
    echo "  ERROR: id debe ser 8 hex"; fail=1
  fi
  branch="$(grep -E '^branch:' "$meta" | sed 's/^branch:[[:space:]]*//')"
  if [[ "$branch" != "dev" && "$branch" != "feature" ]]; then
    echo "  ERROR: branch debe ser dev|feature (es '$branch')"; fail=1
  fi
  # El id del nombre debe coincidir con el meta
  if ! [[ "$name" == *"-$(grep -E '^id:' "$meta" | awk '{print $2}')-"* ]]; then
    echo "  ERROR: el id del nombre no coincide con meta.yaml"; fail=1
  fi
done

if [[ $fail -ne 0 ]]; then
  echo "Validación FAILED"
  exit 1
fi
echo "Todos los changes válidos."

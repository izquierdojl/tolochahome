# Normaliza el slug de new_change.sh

## Resumen

`scripts/new_change.sh` genera el directorio del change con el título sin
normalizar cuando `iconv` está disponible: aparecen mayúsculas, espacios y
acentos (`bug-e4bcd6cd-Normaliza el slug de new_change.sh`). El fallo está en
la precedencia de `||` frente a las tuberías del slug: `echo | iconv || echo`
se evalúa como `(echo | iconv) || echo`, así que cuando `iconv` funciona el
resto de la tubería (`tr`, `sed`, `cut`) nunca se ejecuta.

`check_changes.sh` (y por tanto el CI) rechaza esos nombres porque exige
`<tipo>-<id8>-<slug>` en minúsculas y solo `[a-z0-9-]`; hasta ahora había que
renombrar el directorio a mano.

## Alcance

- Calcular el slug en un único paso, sin `iconv` ni precedencias frágiles.
- Garantizar minúsculas, sin acentos, solo `[a-z0-9-]`, longitud máxima 48 y
  sin guiones sobrantes al principio, al final ni tras el recorte.
- Si el título no deja ningún carácter útil, usar `change` como slug.
- No entra: cambios en `meta.yaml`, en los tipos o en el flujo de ramas.

## Diseño

El slug se calcula con `python3`, que el script ya exige para `spec_id.py`:
normaliza el título a NFKD, descarta lo no ASCII, pasa a minúsculas, sustituye
cualquier secuencia no alfanumérica por un guion y recorta a 48 caracteres.
Así el resultado no depende de la locale ni de que `iconv` soporte
`//TRANSLIT`, y `check_changes.sh` acepta el directorio recién creado.

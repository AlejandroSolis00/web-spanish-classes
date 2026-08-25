#!/bin/bash

BASE="$HOME/Documents/web-spanish-classes"

clean_name() {
  local name="$1"
  # Quitar " - spanish lessons online" y fecha
  name=$(echo "$name" | sed 's/ - spanish lessons online.*$//')
  # Quitar "： " después del número de lección
  name=$(echo "$name" | sed 's/：[ ]*/- /')
  # Reemplazar espacios y caracteres especiales con guiones
  name=$(echo "$name" | sed 's/[áÁ]/a/g; s/[éÉ]/e/g; s/[íÍ]/i/g; s/[óÓ]/o/g; s/[úÚü]/u/g; s/[ñÑ]/n/g')
  name=$(echo "$name" | sed 's/[(), ]/-/g')
  name=$(echo "$name" | sed 's/[^a-zA-Z0-9._-]/-/g')
  # Quitar guiones múltiples
  name=$(echo "$name" | sed 's/--*/-/g')
  # Quitar guiones al inicio y final
  name=$(echo "$name" | sed 's/^-//; s/-$//')
  echo "$name"
}

rename_files() {
  local dir="$1"
  local ext="$2"

  find "$dir" -maxdepth 1 -name "*.$ext" | while read -r filepath; do
    filename=$(basename "$filepath")
    namenoext="${filename%.$ext}"
    newname=$(clean_name "$namenoext")
    newpath="$dir/$newname.$ext"

    if [ "$filepath" != "$newpath" ]; then
      mv "$filepath" "$newpath"
      echo "✓ $filename → $newname.$ext"
    fi
  done
}

echo "=== Renombrando Lecciones ==="
for folder in "Beginner I" "Beginer II" "Intermediate I" "Advanced"; do
  echo "--- $folder ---"
  rename_files "$BASE/Lessons/$folder" "html"
  rename_files "$BASE/Lessons/$folder" "pdf"
done

echo ""
echo "=== Renombrando Ejercicios ==="
for folder in "Beginner I" "Beginner II" "Intermediate I" "Intermediate II" "Advanced I" "Advanced II"; do
  echo "--- $folder ---"
  rename_files "$BASE/Exercises/$folder" "html"
  rename_files "$BASE/Exercises/$folder" "pdf"
done

echo ""
echo "✅ Renombrado completo"

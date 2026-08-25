#!/bin/bash

BASE="$HOME/Documents/web-spanish-classes"

fix_files() {
  local dir="$1"
  local ext="$2"

  find "$dir" -maxdepth 1 -name "*.$ext" | while read -r filepath; do
    filename=$(basename "$filepath")
    newname="$filename"

    # Corregir guión bajo después del número: -009-_Numeros → -009-Numeros
    newname=$(echo "$newname" | sed 's/-_/-/g')

    # Corregir primera letra en minúscula: lesson- → Lesson-, exercise- → Exercise-
    newname=$(echo "$newname" | sed 's/^lesson/Lesson/; s/^exercise/Exercise/; s/^EXERCISE/Exercise/')

    newpath="$dir/$newname"

    if [ "$filepath" != "$newpath" ]; then
      mv "$filepath" "$newpath"
      echo "✓ $filename → $newname"
    fi
  done
}

echo "=== Corrigiendo Lecciones ==="
for folder in "Beginner I" "Beginer II" "Intermediate I" "Advanced"; do
  echo "--- $folder ---"
  fix_files "$BASE/Lessons/$folder" "html"
  fix_files "$BASE/Lessons/$folder" "pdf"
done

echo ""
echo "=== Corrigiendo Ejercicios ==="
for folder in "Beginner I" "Beginner II" "Intermediate I" "Intermediate II" "Advanced I" "Advanced II"; do
  echo "--- $folder ---"
  fix_files "$BASE/Exercises/$folder" "html"
  fix_files "$BASE/Exercises/$folder" "pdf"
done

echo ""
echo "✅ Corrección completa"

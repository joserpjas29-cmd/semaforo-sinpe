# Nota sobre esta copia del código

Esta carpeta es una copia del repositorio Origin `jose-daniel/semaforo-sinpe` (rama por defecto, árbol `aa04fb8`), descargada el 2 de octubre de 2026.

## Cómo se obtuvo

- No se usó `git clone`. Se listó el árbol completo con `get_git_tree` y se descargó cada archivo con `get_file_contents`.
- Para cada archivo se calculó `git hash-object` y se comparó con el SHA del blob en el repositorio. **Los 64 archivos incluidos coinciden byte por byte** con el original.
- `tessdata/spa.traineddata` (modelo de español de Tesseract, 2,3 MB) se bajó del repositorio público `tesseract-ocr/tessdata_fast`, y `app/favicon.ico` de la plantilla pública de `create-next-app`. Se usaron esas fuentes porque son binarios públicos y conocidos. Los dos tienen exactamente el mismo SHA que en el repo, así que son idénticos.
- Las tres imágenes de `public/ejemplos/` se descargaron del repo (en base64). Coinciden con el SHA del blob y con los SHA-256 que espera `lib/ejemplos-texto.ts`, así que el atajo de la demo funciona.

## Qué NO viene

| Archivo | Por qué | Qué hacer |
| --- | --- | --- |
| `package-lock.json` (393 KB) | La herramienta lo corta a 256 KB y también corta cada pedazo por líneas, así que no se pudo armar completo y verificado. Preferimos no meter un lockfile inventado. | `npm install` genera uno nuevo con versiones compatibles. Si querés exactamente las mismas versiones del repo, cloná el repositorio desde Origin. |
| `node_modules/`, `.next/`, `data/*.sqlite` | Se generan solos (están en `.gitignore`). | `npm install`; la base SQLite se crea con la semilla al arrancar. |

## Verificación que se hizo con esta copia

Se probó en una carpeta aparte, sin tocar esta copia, con Node 22.23.3 y `npm install` (sin lockfile):

- `npm test`: 6 archivos y **40 de 40 tests pasando**, incluido el OCR sobre las tres imágenes.
- `npm run lint`: sin errores.
- `npm run build`: compila (Next.js 16.3.8).
- `npm start` y llamadas a la API: 6060 3030 sale rojo, 7070 2020 amarillo, 8881 0001 y 5111 9090 verde. Los tres comprobantes salen verde, amarillo y rojo. El comprobante consistente con el «guion de estafa» sale rojo. Reportar 7000 1111 una vez lo deja en amarillo.

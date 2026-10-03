# Semáforo SINPE

Herramienta web para frenar estafas con SINPE Móvil en Costa Rica: números reciclados y comprobantes falsos. El semáforo no realiza transacciones ni accede a su cuenta de banco. Sirve para mirar dos veces antes de soltar la plata o de dar un producto por pagado.

No está afiliada a ningún banco ni al Banco Central de Costa Rica. No usa logos ni marcas oficiales.

## El problema

SINPE Móvil es instantáneo. También lo es la estafa. Dos patrones se repiten:

1. **Antes de enviar.** El número era de otra persona (un chip reciclado) o ya lo reportaron por pedir devoluciones y mandar comprobantes que no cuadran. La banca muestra el nombre del beneficiario, pero en el apuro mucha gente no lo lee.
2. **Al recibir.** El cliente manda una captura. La plata no está en la cuenta. El mensaje dice «me equivoqué, devuélvame ya». Si devolvés, estás regalando plata de tu bolsillo.

Semáforo SINPE junta reportes de la gente para el primer caso y lee la captura en la misma máquina para el segundo.

## Cómo funciona

### Consultar un número

La persona ingresa un celular de 8 dígitos (también acepta `+506`). Cada reporte suma puntos según el tipo y la antigüedad:

| Tipo | Puntos base |
| --- | --- |
| Comprobante falso | 40 |
| Número reciclado | 36 |
| Pidió devolución | 24 |
| Otro | 12 |

La recencia multiplica: últimos 7 días ×1, hasta 30 días ×0,75, hasta 90 ×0,45, hasta un año ×0,2, y más viejo ×0,05.

- **Verde** (0 a 17): sin alertas relevantes.
- **Amarillo** (18 a 54): precaución.
- **Rojo** (55 o más): alto riesgo.

Dos reglas suben el color aunque el puntaje no llegue: un reporte grave de los últimos 14 días deja el semáforo al menos en amarillo, y dos reportes graves en 30 días (comprobante falso o número reciclado) lo ponen en rojo.

En la consulta se ven cantidades y tipos, no el texto libre. Siempre se recuerda verificar el nombre que muestra la banca antes de confirmar.

### Analizar un comprobante

Se sube una imagen y, si se quiere, se pega el mensaje del cliente. Sin API key, [tesseract.js](https://github.com/naptha/tesseract.js) lee el texto en español con el modelo local `tessdata/spa.traineddata`. Las tres capturas de ejemplo tienen además el texto ya preparado, para que la demo no se quede esperando el arranque del OCR. Si el lector falla o tarda más de 25 segundos en otra imagen, el semáforo sale del mensaje y no se pone en verde. Encima de ese texto corren reglas:

- fecha que no existe, hora imposible, fecha futura o anterior a 2015;
- referencia demasiado corta, demasiado larga o de relleno (`12`, `111111`, `123456`);
- dos montos distintos, o un monto del mensaje que no cuadra con el del comprobante;
- más de un banco en el mismo texto, o un banco sin la palabra SINPE;
- monto con letras metidas (una «O» en vez de un cero) o un monto que el OCR lee mucho peor que el resto;
- guiones en el mensaje: «me equivoqué», «devolveme / devuélvame», urgencia, presión o una historia de emergencia.

Una señal alta enciende el rojo. Una señal media, el amarillo. Si no se lee nada, el resultado es amarillo («no se pudo leer»), nunca verde. El verde solo sale cuando hay monto y una fecha o referencia coherentes, y ninguna señal.

Si existe `VISION_API_KEY`, primero se intenta un modelo de visión compatible con la API de chat de OpenAI. Si falla o no está la variable, se usa el OCR. La app no se rompe sin la llave.

Siempre se recuerda confirmar el depósito en la banca. Un comprobante en el chat no es plata en la cuenta.

### Reportar

El formulario pide número, tipo (comprobante falso, número reciclado, pidió devolución, otro) y una descripción breve. Ese reporte entra en la consulta. Hay un límite de 10 reportes por hora por conexión. La IP no se guarda en claro: solo un hash con sal. La nota de privacidad está en el formulario.

## Cómo correrlo

Hace falta Node.js 22 (la base local usa `node:sqlite`, que viene con Node).

```bash
npm install
npm run dev
```

La app queda en [http://127.0.0.1:43123](http://127.0.0.1:43123).

```bash
npm test
npm run lint
npm run build
npm start
```

`npm run ejemplos` regenera las tres capturas ficticias de `public/ejemplos/`.

Para el modelo de visión opcional, copiá `.env.example` a `.env.local` y completá `VISION_API_KEY`. Sin eso, todo el análisis es local.

## Números y comprobantes de la demo

Son ficticios. Están marcados en la interfaz.

| Número | Semáforo | Por qué |
| --- | --- | --- |
| 6060 3030 | Rojo | Comprobante falso, número reciclado y pidió devolución, todo reciente |
| 7070 2020 | Amarillo | Pidió devolución y otro aviso reciente |
| 8881 0001 | Verde | Un reporte viejo, de poca gravedad |
| 5111 9090 | Verde | Sin reportes |

Capturas en `public/ejemplos/`:

- `comprobante-legitimo.png`: un banco, fecha pasada, un monto, referencia larga. Sale verde.
- `comprobante-precaucion.png`: menciona un banco pero no dice SINPE. Sale amarillo.
- `comprobante-sospechoso.png`: fecha 31/02, hora 25:99, dos montos, dos bancos y referencia `12`. Sale rojo.

En la pantalla del comprobante hay dos mensajes de ejemplo. El normal no cambia un comprobante verde. El de «me equivoqué, devuélvame» lo pone en rojo aunque la captura se vea bien.

## Arquitectura

- Next.js (App Router), TypeScript y Tailwind. Los botones, campos y tarjetas usan shadcn/ui. Node 22.
- Reportes: SQLite local con `node:sqlite` si no hay variables de Turso (`data/semaforo.sqlite`). En Vercel, [Turso](https://turso.tech) por HTTP (`@libsql/client/web`) cuando están `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN`. Si en Vercel no hay base, la semilla vive en memoria y la demo abre igual.
- Rutas: `POST /api/consultar`, `POST /api/reportar`, `POST /api/analizar`, `GET /api/estadisticas`.
- La lógica de puntaje (`lib/semaforo.ts`) y las heurísticas (`lib/comprobante.ts`) son funciones puras, cubiertas por Vitest. Un test corre el OCR sobre las tres imágenes. Otro comprueba el texto de respaldo y la semilla en memoria y en SQLite.
- El OCR vive en el servidor (`lib/ocr.ts`). El archivo de idioma español va en el repo. La función de análisis pide hasta 60 segundos. El lector se rinde a los 25 y deja un resultado, no un error 500.

## Desplegar en Vercel

El repo está en Origin, `jose-daniel/semaforo-sinpe`. Vercel se conecta directo a Origin. No hace falta un espejo en GitHub.

Hace falta una cuenta de Vercel con rol de dueño o miembro, y el equipo de Origin donde vive el repo.

### 1. Base que persiste (Turso)

Sin este paso el sitio igual abre y muestra los números de la demo. Un reporte nuevo se ve en esa instancia y se pierde cuando la función se enfría. Para que el jurado reporte desde el celular y el aviso se quede, creá la base antes de desplegar.

1. Creá una cuenta en [turso.tech](https://turso.tech) e instalá el CLI: `curl -sSfL https://get.tur.so/install.sh | bash`. En macOS también sirve `brew install tursodatabase/tap/turso`. Abrí una terminal nueva para que encuentre el comando.
2. Iniciá sesión: `turso auth login`.
3. Creá la base: `turso db create semaforo-sinpe`.
4. Copiá la URL: `turso db show semaforo-sinpe --url`. Sale algo como `libsql://semaforo-sinpe-….turso.io`. Esa es `TURSO_DATABASE_URL`. También sirve la URL `https://` de `turso db show semaforo-sinpe --http-url`.
5. Creá el token: `turso db tokens create semaforo-sinpe`. Esa cadena es `TURSO_AUTH_TOKEN`. No la subas al repo.

La primera vez que la app habla con Turso crea las tablas y carga la semilla ficticia.

### 2. Proyecto en Vercel, desde Origin

1. En el panel de Vercel, **Add New… → Project**.
2. Elegí **Continue with Origin**. Si no aparece, conectá el equipo de Origin en los ajustes de Git del equipo de Vercel, o desde el repo en Origin: pestaña **Apps** → **Vercel**.
3. Elegí el equipo de Origin y el repositorio `semaforo-sinpe`.
4. Framework preset: **Next.js**. Node queda en 22 por el campo `engines` de `package.json`. No cambies el comando de build: `next build` (o `npm run build`).
5. En **Environment Variables**, para Production (y Preview, si querés que los previews también guarden):

| Variable | Obligatoria | Valor |
| --- | --- | --- |
| `TURSO_DATABASE_URL` | Para que los reportes persistan | La URL `libsql://` o `https://` del paso 1 |
| `TURSO_AUTH_TOKEN` | Junto con la URL | El token del paso 1 |
| `RATE_LIMIT_SALT` | Recomendada | Una frase larga, distinta de la del ejemplo |
| `VISION_API_KEY` | No | Solo si querés el modelo de visión |
| `VISION_API_BASE_URL` | No | Por defecto `https://api.openai.com/v1` |
| `VISION_MODEL` | No | Por defecto `gpt-4o-mini` |

6. **Deploy**. Al terminar, Vercel muestra un dominio `*.vercel.app`. Ese es el link para el celular.

También se puede instalar Vercel desde la pestaña Apps del repo en Origin. Cada pull request genera un preview y `main` despliega a producción. El origen del código sigue siendo Origin.

### 3. Qué revisar en el celular

- Inicio: los cuatro números de la demo y el panel de reportes (6, con la nota de ejemplos ficticios).
- `6060 3030` en rojo, `7070 2020` en amarillo, `8881 0001` y `5111 9090` en verde.
- En Comprobante, las tres capturas de ejemplo. Esas no esperan al OCR: usan el texto preparado y las mismas reglas. Una captura propia sí pasa por tesseract.js. Si el lector no arranca, la pantalla igual responde y no da luz verde.
- Reportar un número y volver a consultarlo. Con Turso, el color se queda si recargás. Sin Turso, el inicio avisa que el reporte no sobrevive a un reinicio.

En local no hace falta ninguna de esas variables: `npm install && npm run dev` sigue usando `data/semaforo.sqlite`.

## Limitaciones

- Sin Turso, en Vercel la lista es la semilla de esa instancia. No es una red nacional de reportes. Con Turso, lo que se reporta se ve en las siguientes visitas.
- Verde no significa «es seguro». Significa que esta lista no tiene alertas suficientes. Un número nuevo, o uno que nadie marcó, sale verde.
- El OCR se equivoca con capturas borrosas, recortes o tipografías raras. Por eso una lectura vacía no se presenta como luz verde.
- Las reglas de referencia y de formato son heurísticas, no el formato oficial de cada banco. Pueden marcar un comprobante real raro, o dejar pasar uno editado con cuidado.
- El límite por IP es básico. No frena a quien rota de red, y detrás de un proxy hay que mirar `X-Forwarded-For` con cuidado.
- No hay cuentas de usuario ni moderación humana. Alguien puede ensuciar un número con reportes falsos, hasta topar el límite.
- La descripción del reporte se guarda, pero no se muestra en la consulta. Igual no escribas cédulas ni cuentas.

## Guion de demo (2 a 3 minutos)

1. **El problema (20 s).** Abrí el inicio. SINPE es inmediato, y la estafa también: chip reciclado al enviar, comprobante falso al recibir, y el «devolveme la plata». Esta herramienta no es el banco.
2. **Consultar en rojo (25 s).** Entrá a Consultar y tocá `6060 3030`. Mostrá el rojo, los tipos de reporte y el índice. Leé en voz alta el recordatorio: hay que verificar el nombre que muestra la banca antes de confirmar.
3. **El verde no es un permiso (20 s).** Consultá `8881 0001` o `5111 9090`. Explicá que verde es «sin alertas en la lista», no «mandá la plata».
4. **Comprobante que se ve bien (25 s).** En Comprobante, elegí «Se ve consistente» y analizá. Sale verde, con monto, fecha y referencia. Volvé al recordatorio: igual hay que ver el depósito en la banca.
5. **La captura mentirosa (30 s).** Elegí «Varias señales raras». Mostrá la fecha imposible, la hora 25:99, los dos montos, los dos bancos y la referencia corta. El semáforo queda en rojo.
6. **El guion del chat (20 s).** Volvé al comprobante consistente, pegá «Guion de estafa» y analizá de nuevo. La imagen sola era verde; el mensaje la pone en rojo.
7. **Cerrar el círculo (20 s).** Reportá un número inventado, por ejemplo `7000 1111`, tipo «comprobante falso», con una frase. Consultalo: ya no sale limpio. Cerrá con las limitaciones: datos ficticios, OCR local, sin API key, y el semáforo no reemplaza a la banca.

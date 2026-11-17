# Investigación: Mokepon-Online — el multiplayer no funciona

> Investigación de SOLO LECTURA. No se modificó ningún archivo del proyecto.
> Repositorio: `\\wsl.localhost\Ubuntu\home\kevin\Richard\Mokepon-Online.github.io`
> Remoto Git: `git@github.com:richardnds230894-tech/Mokepon-Online.github.io.git`

---

## 1. Resumen ejecutivo

El juego **no tiene backend**. El repositorio contiene **únicamente el frontend** (HTML, CSS, JS vanilla y unas imágenes), y el JavaScript asume que existe un servidor HTTP en la dirección **`http://192.168.100.16:8080`** (la IP privada de la red local del autor original), pero ese servidor **no está incluido en el repo ni está corriendo**.

Por eso:

- Al abrir el juego y elegir un Mokepon, **solo se ve el propio** porque ese dibujo es 100% local en el navegador (se pinta en el `<canvas>` sin depender del servidor).
- Los **Mokepones de otros jugadores nunca aparecen** porque la lista de enemigos se obtiene consultando ese servidor inexistente (la función `enviarPosicion` hace `fetch(...)` y, al no haber respuesta, el arreglo `mokeponesEnemigos` se queda vacío).

Importante: el juego **NO usa WebSockets**. Usa **HTTP polling con `fetch`** (peticiones REST cada 50 ms). El curso de Platzi tiene una versión final con WebSockets, pero este código corresponde a la versión intermedia basada en `fetch` + Express. Hay que crear ese servidor Express (no viene en el repo) y corregir la URL del frontend para que apunte a una dirección alcanzable.

**En resumen, para que funcione el multiplayer hay que:**
1. Crear un servidor Node.js + Express que implemente 5 endpoints (ver §3) — hoy **no existe**.
2. Cambiar las 5 URLs hardcoded `http://192.168.100.16:8080` por una dirección real y alcanzable (localhost en la misma máquina, o la IP LAN del equipo que corre el servidor, o la URL de un host en la nube).
3. Servir el frontend por HTTP (no abrirlo como `file://`) y, si frontend y backend están en orígenes distintos, habilitar **CORS** en el servidor.

---

## 2. Arquitectura actual

El repositorio sólo tiene 15 archivos rastreados por Git (2 commits: "Initial commit" y "Mokepon en Linea"). **No hay `package.json`, no hay `server.js`/`index.js`, no hay `node_modules`, no hay config de despliegue** (`Dockerfile`, `render.yaml`, `vercel.json`, `netlify.toml`, `.nojekyll`, `CNAME`, workflows). El último `Get-ChildItem` que buscó todos esos nombres devolvió **cero coincidencias**.

Archivos y rol:

| Archivo | Rol |
|---|---|
| `README.md` | Una línea: "Mi Primer Juego en Linea". Sin instrucciones. |
| `docs/index.html` | Página del juego: 3 secciones (selección de mascota, mapa con `<canvas>`, combate). Carga `./styles.css` y `./js/mokepon.js`. |
| `docs/styles.css` | Estilos. Sólo importa una fuente de Google Fonts (`@import url(...)`). Sin referencias a assets locales. |
| `docs/js/mokepon.js` | **Toda la lógica del juego.** Define los 3 Mokepones, el mapa, el combate y **todas las llamadas al servidor** (5 `fetch`). |
| `docs/assets/*` | Imágenes de los Mokepones y 2 mapas (`mokemap.png`, `mokemap2.jpeg`). Todas las referencias usadas por el JS existen. |

Despliegue: el nombre del repo es `*.github.io` y el contenido web está bajo `docs/`, lo que es el patrón clásico de **GitHub Pages** (rama `main` → carpeta `/docs`). Como es un repo de "proyecto" (no `<usuario>.github.io`), la URL pública sería `https://richardnds230894-tech.github.io/Mokepon-Online.github.io/`. **GitHub Pages sólo sirve archivos estáticos: jamás puede ejecutar un servidor Node/WebSocket**, así que el backend tendría que vivir en otro host.

Forma de correrlo localmente esperada por el proyecto: servir la carpeta `docs/` con cualquier servidor estático (Live Server de VS Code, `python -m http.server`, etc.) — pero el multiplayer no funcionará hasta existir el backend descrito en §3.

---

## 3. Mecanismo multiplayer (con código y líneas)

**No hay WebSocket.** Búsqueda de `WebSocket|ws://|wss://|new WebSocket` en todo el repo: **0 coincidencias**. El multiplayer se implementa con **`fetch` (HTTP) en modo polling** contra un servidor REST en `http://192.168.100.16:8080`.

La IP/URL está **hardcoded** (no es variable ni config) y aparece **5 veces** en `docs/js/mokepon.js`:

- Línea 154 — `unirseAlJuego()` (GET, pide un ID de jugador al entrar):
  ```js
  fetch("http://192.168.100.16:8080/unirse")
  ```
- Línea 191 — `seleccionarMokepon()` (POST, registra la mascota elegida):
  ```js
  fetch(`http://192.168.100.16:8080/mokepon/${jugadorId}`, { method: "post", ... body: JSON.stringify({ mokepon: mascotaJugador }) })
  ```
- Línea 250 — `enviarAtaque()` (POST, envía los 5 ataques del jugador):
  ```js
  fetch(`http://192.168.100.16:8080/mokepon/${jugadorId}/ataques`, { method: "post", ... body: JSON.stringify({ ataques: ataqueJugador }) })
  ```
- Línea 264 — `obtenerAtaques()` (GET, sondea los ataques del enemigo hasta tener 5):
  ```js
  fetch(`http://192.168.100.16:8080/mokepon/${enemigoId}/ataques`)
  ```
- Línea 393 — `enviarPosicion()` (POST, envía la posición propia y **recibe la lista de enemigos**):
  ```js
  fetch(`http://192.168.100.16:8080/mokepon/${jugadorId}/posicion`, { method: "post", ... body: JSON.stringify({ x, y }) })
  ```

### Contrato de la API que el frontend espera (lo que el servidor debe implementar)

Estos son los 5 endpoints que el backend ausente tendría que proveer, deducidos del código del frontend:

1. **`GET /unirse`** → responde **texto plano** con un ID único (el nuevo `jugadorId`). El frontend lo guarda en `jugadorId = respuesta` (línea 160).
2. **`POST /mokepon/:jugadorId`** → body `{ "mokepon": "Hipodoge" }`. Registra la mascota del jugador. (No necesita body de respuesta.)
3. **`POST /mokepon/:jugadorId/ataques`** → body `{ "ataques": ["FUEGO","AGUA",...] }` (5 elementos). Guarda los ataques del jugador. (No necesita body de respuesta.)
4. **`GET /mokepon/:enemigoId/ataques`** → responde **JSON** `{ "ataques": [...] }`. El frontend hace polling cada 50 ms hasta que `ataques.length === 5`.
5. **`POST /mokepon/:jugadorId/posicion`** → body `{ "x": <n>, "y": <n> }`. Guarda la posición del jugador y responde **JSON** con los demás jugadores:
   ```json
   { "enemigos": [ { "id": "...", "x": 100, "y": 50, "mokepon": { "nombre": "Capipepo" } } ] }
   ```
   El frontend arma objetos `Mokepon` a partir de ese arreglo (sólo conoce Hipodoge, Capipepo y Ratigueya).

Este contrato coincide exactamente con la versión intermedia del curso de Mokepon de Platzi (Express + `fetch`), que es la base de este repo.

### Cómo se dibuja lo que ves en pantalla

`iniciarMapa()` (línea 496) arranca un `setInterval(pintarCanvas, 50)`. `pintarCanvas()` (línea 371) hace lo siguiente:

```js
function pintarCanvas() {
    // ...actualiza x/y y limpia canvas...
    lienzo.drawImage(mapaBackground, 0, 0, mapa.width, mapa.height)
    mascotaJugadorObjeto.pintarMokepon()                 // ← línea 382: EL ÚNICO Mokepon que se ve
    enviarPosicion(mascotaJugadorObjeto.x, mascotaJugadorObjeto.y)  // ← línea 384: pide enemigos al servidor

    mokeponesEnemigos.forEach(function (mokepon) {        // ← línea 385: recorre enemigos
        mokepon.pintarMokepon()                           // ← línea 387: dibuja cada enemigo
        revisarColision(mokepon)                          // ← línea 388: detecta colisión → combate
    })
}
```

`mascotaJugadorObjeto` es el Mokepon **local** del propio jugador (se obtiene de `obtenerObjetoMascota()`, línea 503, leyendo el arreglo local `mokepones`): por eso siempre se ve aunque el servidor esté caído. En cambio `mokeponesEnemigos` **se llena sólo dentro del `.then` de `enviarPosicion`** (línea 408):

```js
mokeponesEnemigos = enemigos.map(function (enemigo) { ... })  // ← línea 408
```

Ese `.then` sólo se ejecuta si la petición tuvo éxito (`res.ok`). Si el servidor no responde, ese bloque nunca corre y `mokeponesEnemigos` sigue siendo `[]`, por lo que el `forEach` de la línea 385 no dibuja nada.

---

## 4. Causa raíz del problema

**No existe servidor backend y la URL del frontend apunta a una IP privada ajena (`192.168.100.16`).** Consecuencia en cadena:

1. Al cargar la página, se ejecuta `unirseAlJuego()` (línea 150) que llama a `fetch("http://192.168.100.16:8080/unirse")` (línea 154). Como no hay servidor en esa IP, la petición **falla** y **no hay `.catch`**, así que el fallo es **silencioso**: `jugadorId` se queda en `null` (su valor inicial, línea ~22).
2. El jugador elige mascota y pulsa "Seleccionar". `seleccionarMascotaJugador()` (línea 166) es **puramente local**: muestra el mapa y crea `mascotaJugadorObjeto` (línea 498). El POST de `seleccionarMokepon()` (línea 191) también falla en silencio (URL `.../mokepon/null`), pero eso no impide ver el propio Mokepon.
3. `pintarCanvas()` dibuja el **propio** Mokepon (línea 382) → **ése es el único Mokepon que aparece** (síntoma reportado por el usuario).
4. `enviarPosicion()` (línea 393) intenta POST al servidor inexistente; su `.then` (con el `mokeponesEnemigos = enemigos.map(...)`, línea 408) **no se ejecuta**, así que `mokeponesEnemigos` permanece `[]`.
5. El `forEach` de enemigos (línea 385) itera sobre un arreglo vacío → **nunca se dibujan otros jugadores** (segundo síntoma: conectar otro dispositivo no muestra sus Mokepones).

Por tanto, los dos síntomas ("sólo un Mokepon" y "no aparecen otros jugadores") tienen una **causa única**: el frontend depende de un servidor HTTP que no existe ni está corriendo, y cuya dirección hardcoded (`192.168.100.16:8080`) ni siquiera corresponde a la red del usuario.

Agravantes que conviene saber:

- **IP privada hardcoded:** `192.168.100.16` es una IP de LAN del autor original. No funciona ni en otra red ni en internet; y casi seguro tampoco en la red del usuario. Hay que sustituirla por una IP real.
- **Contenido mixto en GitHub Pages:** si el frontend se sirve por HTTPS (GitHub Pages) y el backend se llama por `http://` (inseguro), el navegador **bloquea** la petición por *mixed content*. El backend debe servirse por **HTTPS** (o servir frontend y backend desde el mismo origen).
- **Falta de manejo de errores:** ningún `fetch` tiene `.catch`. Cualquier fallo de red es invisible, lo que dificulta diagnosticar el problema (el usuario no ve ningún mensaje de error).

---

## 5. Opciones de solución (recomendadas, con pasos concretos)

> Nota: esta investigación es de solo lectura. Lo siguiente son **recomendaciones**, no cambios aplicados.

### Opción A — Servidor local + jugar en la misma red WiFi (la más rápida para probar)

Ideal para probar en 2 dispositivos conectados al **mismo WiFi**.

1. **Instalar Node.js** (en WSL: `sudo apt install nodejs npm`, o descarga en Windows desde nodejs.org).
2. **Crear el backend** (fuera de `docs/`, p. ej. en una nueva carpeta `server/` en la raíz del repo). Implementar los 5 endpoints de §3 con **Express** + **CORS** + un generador de IDs (`crypto.randomUUID()` o el paquete `uuid`). Estado en memoria: un `Map` de jugadores `{ mokepon, ataques:[], x, y }`. (Esto no existe en el repo; hay que escribirlo — unos ~80 líneas.)
3. **Habilitar CORS** (`app.use(cors())`) si el frontend se servirá desde otro origen.
4. **Iniciar el servidor** en el puerto 8080: `node server/index.js` (debe escuchar en `0.0.0.0`, no sólo `localhost`, para que otros dispositivos lo alcancen).
5. **Averiguar la IP LAN** del equipo que corre el servidor (en WSL: `ip addr` o en Windows `ipconfig`; p. ej. `192.168.1.50`).
6. **Editar `docs/js/mokepon.js`** y reemplazar las 5 ocurrencias de `http://192.168.100.16:8080` por la nueva IP (p. ej. `http://192.168.1.50:8080`). Para pruebas en un solo equipo se puede usar `http://localhost:8080`.
7. **Servir el frontend por HTTP** (no `file://`): desde `docs/`, ejecutar `python -m http.server 5500` o usar Live Server de VS Code, y abrir `http://localhost:5500` (en el equipo servidor) y `http://192.168.1.50:5500` (en el otro dispositivo).
8. Abrir el juego en **dos dispositivos** de la misma red y elegir mascotas; ambos deberían verse en el mapa.

**Recomendación de robustez (opcional pero aconsejada):** en lugar de hardcodear otra IP, usar **rutas relativas** en el frontend (p. ej. `/unirse`, `/mokepon/...`) y servir **el frontend estático y la API desde el mismo Express** en el puerto 8080. Así funciona con cualquier IP sin tocar el JS y se evitan problemas de CORS. Para ello, en el servidor: `app.use(express.static('docs'))` y mantener las rutas `/unirse`, `/mokepon/...`. Luego el JS cambia a `fetch("/unirse")`, etc.

### Opción B — Desplegar el backend en la nube (para jugar desde cualquier lugar)

Si se quiere jugar fuera de la red local, el backend no puede quedar en una IP LAN. Hay que alojarlo en un host con URL pública HTTPS.

1. Crear el mismo servidor Express de la Opción A y subirlo a un repo.
2. Desplegarlo en un host gratuito que soporte Node: **Render**, **Railway** o **Fly.io**. Render es el más sencillo: crear un "Web Service", apuntar al repo, comando `node index.js`, puerto definido por `process.env.PORT`. La URL resultante será `https://<servicio>.onrender.com` (ya en HTTPS).
3. **Editar `docs/js/mokepon.js`** y cambiar las 5 URLs a la URL HTTPS desplegada (p. ej. `https://mokepon-api.onrender.com`). Como frontend (GitHub Pages, HTTPS) y backend (HTTPS) ambos van por HTTPS, **no hay mixed content**.
4. El frontend puede seguir en GitHub Pages o, mejor, servirse desde el mismo host (mismo origen → sin CORS).
5. **Consideración de coste/latencia:** los planes gratuitos de Render "duermen" tras ~15 min de inactividad y el arranque en frío tarda ~30–60 s la primera vez.

### Opción C — Migrar a WebSockets (sólo si se quiere la versión final del curso)

El curso de Platzi tiene una versión posterior que sustituye el polling por `ws` (WebSockets). Como este códigobase usa `fetch`, pasar a WebSockets sería **reescribir tanto el frontend como el backend** (crear el servidor `ws`, manejar eventos `connection`/`message`, sustituir los `fetch` por `websocket.send`). Es más trabajo y **no es necesario** para resolver el problema actual; la Opción A o B ya arreglan el multiplayer. Se menciona sólo como referencia.

---

## 6. Otros problemas encontrados (que conviene saber, aunque no bloquean el arranque)

1. **Sin manejo de errores de red (lo más importante tras el backend).** Ningún `fetch` (líneas 154, 191, 250, 264, 393) tiene `.catch`. Si el servidor falla, **no hay ningún mensaje al usuario**; el juego parece funcionar pero multiplayer nunca carga. Añadir `.catch`/`try-catch` y avisar al usuario facilitaría mucho el diagnóstico.
2. **`jugadorId` puede ser `null` y se usa igual.** Si `unirseAlJuego()` falla, `jugadorId` sigue `null` y se interpolan URLs como `.../mokepon/null` (líneas 191, 250, 393). El servidor, al crearse, debería tolerarlo o el frontend debería bloquear el flujo hasta tener un ID válido.
3. **Posible `null` al mapear enemigos.** En `enviarPosicion` (línea 408), si `enemigo.mokepon.nombre` no es ninguno de los 3 conocidos, `mokeponEnemigo` queda `null` y la siguiente línea `mokeponEnemigo.x = ...` lanzaría un error. Hoy no ocurre porque sólo existen 3 Mokepones, pero es frágil.
4. **`enemigoId` sólo se setea al colisionar.** `obtenerAtaques()` (línea 264) sondea `.../mokepon/${enemigoId}/ataques`, pero `enemigoId` se asigna recién en `revisarColision()` (línea 511+). Antes de cualquier colisión vale `null`, así que la URL es `.../mokepon/null/ataques`. No rompe nada porque ese polling sólo arranca tras `enviarAtaque()` (post-colisión), pero conviene confirmar el orden al reimplementar el servidor.
5. **Polling agresivo.** `pintarCanvas` corre cada 50 ms (línea 499) y cada ciclo hace un `POST /posicion` (línea 393). Son ~20 peticiones/segundo por jugador. Funciona, pero es ineficiente; la versión WebSockets del curso lo evita.
6. **Assets sin usar.** `mokepons_mokepon_langostelvis_attack.png`, `mokepons_mokepon_pydos_attack.png`, `mokepons_mokepon_tucapalma_attack.png` y `mokemap.png` existen pero el JS **no los referencia** (el juego sólo define 3 Mokepones: Hipodoge, Capipepo, Ratigueya). No rompe nada; son peso muerto del curso completo.
7. **`README.md` sin instrucciones.** No explica cómo levantar el proyecto ni que hace falta un servidor. Contribuye a la confusión ("al ejecutarlo sólo sale un mokepon").

### Verificación de que los assets referenciados existen (sin rutas rotas)
Todas las imágenes que el JS carga existen en `docs/assets/`: `mokemap2.jpeg`, `mokepons_mokepon_hipodoge_attack.png`, `mokepons_mokepon_capipepo_attack.png`, `mokepons_mokepon_ratigueya_attack.png`, `hipodoge.png`, `capipepo.png`, `ratigueya.png`. `index.html` carga `./styles.css`, `./js/mokepon.js` y Google Fonts; todos presentes. **No hay rutas de assets rotas.**

---

## 7. Conclusión y verificación cruzada de las hipótesis

| Hipótesis del briefing | Veredicto | Evidencia |
|---|---|---|
| Es un despliegue de GitHub Pages (sólo estáticos) | **Confirmado** | Repo `*.github.io`, contenido en `docs/`, sin backend ni config de despliegue. |
| GitHub Pages no puede alojar un servidor WS/Node | **Confirmado** | No hay server en el repo; Pages sólo sirve estáticos. |
| El frontend usa WebSocket (`new WebSocket`, `ws://`/`wss://`) | **Refutado** | 0 coincidencias; usa `fetch` (HTTP polling). |
| Hay código de servidor (Node, package.json) | **Refutado (no existe)** | `git ls-files` y el listado de archivos no contienen `package.json` ni `server.js`/`index.js`. |
| La URL del servidor está hardcoded | **Confirmado** | `http://192.168.100.16:8080` en 5 `fetch` (líneas 154, 191, 250, 264, 393). |
| Sólo aparece un Mokepon y no se ven otros jugadores | **Explicado** | El propio Mokepon se pinta localmente (línea 382); los enemigos se obtienen del servidor que no responde (línea 408 nunca se ejecuta), por lo que `mokeponesEnemigos` queda `[]` (línea 385). |

**Causa raíz única:** el multiplayer no funciona porque **falta el servidor backend** (no está en el repo) y el frontend apunta a una **IP privada hardcoded inalcanzable** (`192.168.100.16:8080`). El fix mínimo es **crear un servidor Express con los 5 endpoints de §3** y **apuntar el frontend a una URL alcanzable** (Opción A para LAN, Opción B para internet).

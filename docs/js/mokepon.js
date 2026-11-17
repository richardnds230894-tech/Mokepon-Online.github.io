
const sectionSeleccionarAtaque = document.getElementById("seleccionar-ataque")
const botonReiniciar = document.getElementById("boton-reiniciar")
const sectionReiniciar = document.getElementById("reiniciar")

const sectionSeleccionarMascota = document.getElementById("seleccionar-mascota")
const spanMascotaJugador = document.getElementById("mascota-jugador")
const spanMascotaEnemigo = document.getElementById("mascota-enemigo")
const spanVidasJugador = document.getElementById("vidas-jugador")
const spanVidasEnemigo = document.getElementById("vidas-enemigo")

const sectionMensajes = document.getElementById("resultado")
const ataquesDelJugador = document.getElementById("ataque-del-jugador")
const ataquesDelEnemigo = document.getElementById("ataque-del-enemigo")
const contenedorTarjetas = document.getElementById("contenedor-de-tarjetas")
const contenedorAtaques = document.getElementById("contenedor-ataques")
const sectionVerMapa = document.getElementById("ver-mapa")
const mapa = document.getElementById("mapa")

// URL del servidor backend.
// Para pruebas locales usa "http://localhost:8080".
// Para producción en Render usa "https://mokepon-online-github-io.onrender.com".
const BACKEND_URL = "https://mokepon-online-github-io.onrender.com"

let jugadorId = null
let enemigoId = null
let mokepones = []
let botones = []
let mokeponesEnemigos = []
let ataqueJugador = []
let ataqueEnemigo = []
let opcionesDelContenedor
let ataquesMokepon
let ataquesMokeponEnemigo
let mascotaJugador
let mascotaJugadorObjeto
let botonFuego
let botonAgua
let botonTierra
let botonMascotaJugador
let inputHipodoge
let inputCapipepo
let inputRatigueya
let vidasJugador = 0
let vidasEnemigos = 0
let resultado
let resultadoFinal
let contadorAtaque = 0
let contadorCombates = 0
let indexAtaqueJugador
let indexAtaqueEnemigo
let lienzo = mapa.getContext("2d")
let intervaloMapa      // intervalo del canvas (pintarCanvas)
let intervaloAtaques   // intervalo del polling de ataques (obtenerAtaques)
let combateEnCurso = false  // evita que revisarColision dispare el combate múltiples veces
let ultimoEnemigoDerrotadoId = null  // evita recolisar con el enemigo recién derrotado
let proximoCombatePermitidoEn = 0    // enfriamiento (ms) tras terminar un combate
let mapaBackground = new Image()
mapaBackground.src = "./assets/mokemap2.jpeg"

// Calculamos el tamaño del canvas en función del ancho visible real del contenedor,
// así el espacio lógico de movimiento siempre coincide con lo que se ve en pantalla.
const anchoMaximoDelMapa = 450
const anchoDelMapa = Math.min(mapa.parentElement.clientWidth || window.innerWidth - 20, anchoMaximoDelMapa)
const alturaQueBuscamos = Math.round(anchoDelMapa * 600 / 800)

mapa.width = anchoDelMapa
mapa.height = alturaQueBuscamos
class Mokepon {
    constructor(nombre, foto, vida, fotoMapa, id = null) {
        this.id = id
        this.nombre = nombre
        this.foto = foto
        this.vida = vida
        this.ataques = []
        this.ancho = 50
        this.alto = 50
        this.x = aleatoria(0, mapa.width - this.ancho)
        this.y = aleatoria(0, mapa.height - this.alto)
        this.mapafoto = new Image()
        this.mapafoto.src = fotoMapa
        this.velocidadX = 0
        this.velocidadY = 0
    }
    pintarMokepon() {
        lienzo.drawImage(
            this.mapafoto,
            this.x,
            this.y,
            this.ancho,
            this.alto
        )
    }
}

let hipodoge = new Mokepon("Hipodoge", "./assets/mokepons_mokepon_hipodoge_attack.png", 5, "./assets/hipodoge.png")
let capipepo = new Mokepon("Capipepo", "./assets/mokepons_mokepon_capipepo_attack.png", 5, "./assets/capipepo.png")
let ratigueya = new Mokepon("Ratigueya", "./assets/mokepons_mokepon_ratigueya_attack.png", 5, "./assets/ratigueya.png")

const HIPODOGE_ATAQUES = [
    { nombre: "💧", id: "boton-agua" },
    { nombre: "💧", id: "boton-agua" },
    { nombre: "💧", id: "boton-agua" },
    { nombre: "🔥", id: "boton-fuego" },
    { nombre: "🌱", id: "boton-tierra" }
]

hipodoge.ataques.push(...HIPODOGE_ATAQUES)

const CAPIPEPO_ATAQUES = [
    { nombre: "🔥", id: "boton-fuego" },
    { nombre: "🔥", id: "boton-fuego" },
    { nombre: "🔥", id: "boton-fuego" },
    { nombre: "💧", id: "boton-agua" },
    { nombre: "🌱", id: "boton-tierra" }
]

capipepo.ataques.push(...CAPIPEPO_ATAQUES)

const RATIGUEYA_ATAQUES = [
    { nombre: "🌱", id: "boton-tierra" },
    { nombre: "🌱", id: "boton-tierra" },
    { nombre: "🌱", id: "boton-tierra" },
    { nombre: "💧", id: "boton-agua" },
    { nombre: "🔥", id: "boton-fuego" }
]

ratigueya.ataques.push(...RATIGUEYA_ATAQUES)


mokepones.push(hipodoge, capipepo, ratigueya)

mokepones.forEach(mokepon => {
    opcionesDelContenedor = `
            <input type="radio" name="mascota" id=${mokepon.nombre}>
            <label class="tarjetas-mokepon" for=${mokepon.nombre}>
                <p>${mokepon.nombre}</p>
                <img src=${mokepon.foto} alt=${mokepon.nombre}>
            </label>`

    contenedorTarjetas.innerHTML += opcionesDelContenedor

    inputHipodoge = document.getElementById("Hipodoge")
    inputCapipepo = document.getElementById("Capipepo")
    inputRatigueya = document.getElementById("Ratigueya")
})


botonMascotaJugador = document.getElementById("boton-seleccionar")
botonMascotaJugador.addEventListener("click", seleccionarMascotaJugador)
// Deshabilitar hasta recibir el ID del servidor (evita race condition con jugadorId null)
botonMascotaJugador.disabled = true
botonMascotaJugador.title = "Conectando al servidor..."


sectionSeleccionarAtaque.style.display = "none"
sectionReiniciar.style.display = "none"
sectionVerMapa.style.display = "none"


botonReiniciar.addEventListener("click", reiniciar)
const botonSiguienteRonda = document.getElementById("boton-siguiente-ronda")
botonSiguienteRonda.addEventListener("click", irASiguienteRonda)
unirseAlJuego()

function unirseAlJuego() {
    fetch(`${BACKEND_URL}/unirse`)
        .then(function (res) {
            if (res.ok) {
                res.text()
                    .then(function (respuesta) {
                        console.log(respuesta)
                        jugadorId = respuesta
                        // Habilitar el botón ahora que tenemos ID del servidor
                        botonMascotaJugador.disabled = false
                        botonMascotaJugador.title = ""
                    })
            } else {
                // Reintenta si el servidor responde con error
                setTimeout(unirseAlJuego, 2000)
            }
        })
        .catch(function () {
            // El servidor estaba durmiendo (Render free tier) — reintenta cada 2 s
            console.warn("Servidor no disponible, reintentando en 2s...")
            setTimeout(unirseAlJuego, 2000)
        })
}

function seleccionarMascotaJugador() {

    if (inputHipodoge.checked) {
        spanMascotaJugador.innerHTML = inputHipodoge.id
        mascotaJugador = inputHipodoge.id
    } else if (inputCapipepo.checked) {
        spanMascotaJugador.innerHTML = inputCapipepo.id
        mascotaJugador = inputCapipepo.id
    } else if (inputRatigueya.checked) {
        spanMascotaJugador.innerHTML = inputRatigueya.id
        mascotaJugador = inputRatigueya.id
    } else {
        alert("Selecciona una Mascota")
        return
    }
    sectionSeleccionarMascota.style.display = "none"
    sectionVerMapa.style.display = "flex"
    seleccionarMokepon(mascotaJugador)
    iniciarMapa()
    extraerAtaques(mascotaJugador)
    secuenciaDeAtaques()  // registra los listeners de los botones de ataque una sola vez

}

function seleccionarMokepon(mascotaJugador) {
    fetch(`${BACKEND_URL}/mokepon/${jugadorId}`, {
        method: "post",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            mokepon: mascotaJugador
        })
    })
}

function extraerAtaques(mascotaJugador) {
    let ataques
    for (let i = 0; i < mokepones.length; i++) {
        if (mascotaJugador === mokepones[i].nombre) {
            ataques = mokepones[i].ataques
        }
    }
    mostrarAtaques(ataques)
}

function mostrarAtaques(ataques) {

    ataques.forEach(ataque => {
        ataquesMokepon = `<button class="sci-fi-btn btn-orange btn-general BAtaque" id=${ataque.id}>${ataque.nombre}</button>`

        contenedorAtaques.innerHTML += ataquesMokepon
    })

    botonFuego = document.getElementById("boton-fuego")
    botonAgua = document.getElementById("boton-agua")
    botonTierra = document.getElementById("boton-tierra")
    botones = document.querySelectorAll(".BAtaque")
}

function secuenciaDeAtaques() {
    botones.forEach(boton => {
        boton.addEventListener("click", (e) => {
            if (e.target.textContent === "🔥") {
                ataqueJugador.push("FUEGO")
                boton.style.background = "rgb(141, 17, 24)"
                boton.disabled = true
            } else if (e.target.textContent === "💧") {
                ataqueJugador.push("AGUA")
                boton.style.background = "rgb(141, 17, 24)"
                boton.disabled = true
            } else {
                ataqueJugador.push("TIERRA")
                boton.style.background = "rgb(141, 17, 24)"
                boton.disabled = true
            }
            if (ataqueJugador.length === 5) {
                enviarAtaque()
            }
        })
    });
}

function enviarAtaque() {
    fetch(`${BACKEND_URL}/mokepon/${jugadorId}/ataques`, {
        method: "post",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            ataques: ataqueJugador
        })
    })

    clearInterval(intervaloAtaques)  // limpia cualquier polling anterior antes de crear uno nuevo
    intervaloAtaques = setInterval(obtenerAtaques, 50)
}

let combateYaIniciado = false  // guarda contra múltiples resoluciones async en vuelo

function obtenerAtaques() {
    fetch(`${BACKEND_URL}/mokepon/${enemigoId}/ataques`)
        .then(function (res) {
            if (res.ok) {
                res.json()
                    .then(function ({ ataques }) {
                        if (ataques.length === 5 && !combateYaIniciado) {
                            combateYaIniciado = true
                            clearInterval(intervaloAtaques)
                            ataqueEnemigo = ataques
                            combateMokepon()
                        }
                    })
            }
        })
}

function seleccionarMascotaEnemigo(enemigo) {
    spanMascotaEnemigo.innerHTML = enemigo.nombre
    ataquesMokeponEnemigo = enemigo.ataques
    reiniciarBotonesAtaque()
}

function ataqueMascotaEnemigo() {
    let ataqueEnemigoActual = ataquesMokeponEnemigo[contadorAtaque]
    if (ataqueEnemigoActual.nombre === "🔥") {
        ataqueEnemigo.push("FUEGO")
    } else if (ataqueEnemigoActual.nombre === "💧") {
        ataqueEnemigo.push("AGUA")
    } else {
        ataqueEnemigo.push("TIERRA")
    }
    contadorAtaque++
    console.log(ataqueEnemigo)
}

function indexAmbosOponentes(jugador, enemigo) {
    indexAtaqueJugador = ataqueJugador[jugador]
    indexAtaqueEnemigo = ataqueEnemigo[enemigo]
    crearMensajes()
}

function combateMokepon() {
    clearInterval(intervaloAtaques)  // seguridad: asegura que el polling esté detenido
    for (let i = 0; i < ataqueJugador.length; i++) {
        if (ataqueJugador[i] === ataqueEnemigo[i]) {
            indexAmbosOponentes(i, i)
            resultado = "Empate 🤓"
        } else if (ataqueJugador[i] == "AGUA" && ataqueEnemigo[i] == "FUEGO") {
            indexAmbosOponentes(i, i)
            resultado = "Gana el Jugador"
            vidasJugador++
        } else if (ataqueJugador[i] == "TIERRA" && ataqueEnemigo[i] == "AGUA") {
            indexAmbosOponentes(i, i)
            resultado = "Gana el Jugador"
            vidasJugador++
        } else if (ataqueJugador[i] == "FUEGO" && ataqueEnemigo[i] == "TIERRA") {
            indexAmbosOponentes(i, i)
            resultado = "Gana el Jugador"
            vidasJugador++
        } else {
            indexAmbosOponentes(i, i)
            resultado = "Gana la PC"
            vidasEnemigos++
        }
    }

    spanVidasJugador.innerHTML = vidasJugador
    spanVidasEnemigo.innerHTML = vidasEnemigos
    contadorCombates++

    conteoVidas()
}

function conteoVidas() {
    // Cada combate se resuelve una vez: revisarColision reinicia contadorCombates
    // a 0 y combateMokepon lo lleva a 1 al terminar.
    if (contadorCombates !== 1) return

    if (vidasJugador === vidasEnemigos) {
        empatarCombate()
    } else if (vidasJugador > vidasEnemigos) {
        ganarCombate()
    } else {
        perderCombate()
    }
}

function crearMensajes() {
    let nuevoAtaqueJugador = document.createElement("p")
    let nuevoAtaqueEnemigo = document.createElement("p")

    sectionMensajes.innerHTML = resultado
    nuevoAtaqueJugador.innerHTML = indexAtaqueJugador
    nuevoAtaqueEnemigo.innerHTML = indexAtaqueEnemigo

    ataquesDelJugador.appendChild(nuevoAtaqueJugador)
    ataquesDelEnemigo.appendChild(nuevoAtaqueEnemigo)
}

// El jugador GANÓ el combate: muestra los resultados y el botón "Ir a Siguiente Ronda".
// Mientras espera en esta pantalla, un heartbeat mantiene vivo su registro en el servidor.
function ganarCombate() {
    sectionMensajes.innerHTML = "🏆 ¡Felicidades! Has Ganado. Pasaste a la Siguiente Ronda 🏆"
    sectionReiniciar.style.display = "block"
    botonSiguienteRonda.style.display = "inline-block"
    botonReiniciar.style.display = "none"
    iniciarHeartbeat()
}

// Empate: nadie se elimina; el jugador sigue jugando.
async function empatarCombate() {
    sectionMensajes.innerHTML = "⚔️ Empate. Nadie fue eliminado. Sigues jugando. ⚔️"
    await continuarJugando()
}

// El jugador PERDIÓ: se elimina del servidor al pulsar "Reiniciar" o cerrar
// la pestaña (no aquí), para que sus ataques sigan disponibles en el servidor
// hasta que el ganador resuelva su combate.
function perderCombate() {
    sectionMensajes.innerHTML = "💀 Perdiste. Tu Mokepon ha sido eliminado. 💀"
    sectionReiniciar.style.display = "block"
}

// Al pulsar "Ir a Siguiente Ronda": limpia los ataques del ganador en el servidor
// para que el próximo rival no encuentre ataques viejos al hacer polling,
// quita al enemigo del mapa local y vuelve a jugar.
async function irASiguienteRonda() {
    detenerHeartbeat()
    botonSiguienteRonda.style.display = "none"
    botonReiniciar.style.display = "inline-block"
    // Resetea los ataques en el servidor ANTES de volver al mapa
    await resetearAtaquesServidor().catch(function () {})
    await continuarJugando()
}

let intervaloHeartbeat = null

// Envía la última posición conocida al servidor cada 4s para evitar que el
// timeout de inactividad elimine al ganador mientras está en la pantalla de resultados.
function iniciarHeartbeat() {
    detenerHeartbeat()
    intervaloHeartbeat = setInterval(function () {
        if (!jugadorId || !mascotaJugadorObjeto) return
        enviarPosicion(mascotaJugadorObjeto.x, mascotaJugadorObjeto.y)
    }, 4000)
}

function detenerHeartbeat() {
    clearInterval(intervaloHeartbeat)
    intervaloHeartbeat = null
}

// Vuelve al mapa tras ganar o empatar: limpia el estado del combate y reanuda
// el juego. Si la red falla, igualmente reanuda el mapa para no bloquear al jugador.
async function continuarJugando() {
    // Limpia el estado local del combate
    ataqueJugador = []
    ataqueEnemigo = []
    combateYaIniciado = false
    combateEnCurso = false
    reiniciarBotonesAtaque()

    // Quita al enemigo derrotado de la lista local para no volver a colisionar
    if (enemigoId) {
        mokeponesEnemigos = mokeponesEnemigos.filter(function (m) { return m.id !== enemigoId })
        ultimoEnemigoDerrotadoId = enemigoId
    }

    enemigoId = null
    proximoCombatePermitidoEn = Date.now() + 1000

    // Limpia el filtro del enemigo derrotado tras 5 s: si el perdedor recarga
    // y vuelve con un nuevo ID, debe aparecer como enemigo válido en el mapa.
    setTimeout(function () { ultimoEnemigoDerrotadoId = null }, 5000)

    // Muestra el mapa y reanuda el juego
    sectionSeleccionarAtaque.style.display = "none"
    sectionVerMapa.style.display = "flex"
    clearInterval(intervaloMapa)
    intervaloMapa = setInterval(pintarCanvas, 50)
}

function reiniciarBotonesAtaque() {
    if (!botones) return
    botones.forEach(function (boton) {
        boton.disabled = false
        boton.style.background = ""
    })
}

function resetearAtaquesServidor() {
    if (!jugadorId) return Promise.resolve()
    return fetch(`${BACKEND_URL}/mokepon/${jugadorId}/ataques`, {
        method: "post",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ataques: [] })
    })
}

function eliminarJugador(id) {
    if (!id) return Promise.resolve()
    return fetch(`${BACKEND_URL}/mokepon/${id}`, { method: "delete" })
}

let recargandoIntencionalmente = false  // evita que beforeunload duplique la eliminación al reiniciar

async function reiniciar() {
    recargandoIntencionalmente = true
    // Espera a que el servidor elimine al jugador antes de recargar
    await eliminarJugador(jugadorId).catch(function () {})
    location.reload()
}

// Si el jugador cierra la pestaña o navega fuera (sin pulsar Reiniciar),
// se elimina del servidor. sendBeacon garantiza que la petición se envíe
// incluso al cerrar. No se envía si la recarga la inició el botón Reiniciar.
window.addEventListener("beforeunload", function () {
    if (jugadorId && !recargandoIntencionalmente) {
        navigator.sendBeacon(`${BACKEND_URL}/mokepon/${jugadorId}/salir`)
    }
})

function aleatoria(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

function pintarCanvas() {
    mascotaJugadorObjeto.x = mascotaJugadorObjeto.x + mascotaJugadorObjeto.velocidadX
    mascotaJugadorObjeto.y = mascotaJugadorObjeto.y + mascotaJugadorObjeto.velocidadY
    lienzo.clearRect(0, 0, mapa.width, mapa.height)
    lienzo.drawImage(
        mapaBackground,
        0,
        0,
        mapa.width,
        mapa.height
    )
    mascotaJugadorObjeto.pintarMokepon()
    enviarPosicion(mascotaJugadorObjeto.x, mascotaJugadorObjeto.y)

    mokeponesEnemigos.forEach(function (mokepon) {
        mokepon.pintarMokepon()
        revisarColision(mokepon)
    })
}

function enviarPosicion(x, y) {
    fetch(`${BACKEND_URL}/mokepon/${jugadorId}/posicion`, {
        method: "post",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            x,
            y
        })
    })
    .then(function (res) {
        if (res.ok) {
            res.json()
            .then(function ({ enemigos }) {
                        

                mokeponesEnemigos = enemigos
                    .filter(function (enemigo) {
                        // Ignorar jugadores que aún no eligieron Mokepon
                        if (!enemigo.mokepon || !enemigo.mokepon.nombre) return false
                        // Ignorar al enemigo derrotado hasta que él mismo salga del servidor
                        if (enemigo.id === ultimoEnemigoDerrotadoId) return false
                        return true
                    })
                    .map(function (enemigo) {
                    let mokeponEnemigo = null
                    const mokeponNombre = enemigo.mokepon.nombre
                    if (mokeponNombre === "Hipodoge") {
                        mokeponEnemigo = new Mokepon("Hipodoge", "./assets/mokepons_mokepon_hipodoge_attack.png", 5, "./assets/hipodoge.png", enemigo.id)
                    } else if (mokeponNombre === "Capipepo") {
                        mokeponEnemigo = new Mokepon("Capipepo", "./assets/mokepons_mokepon_capipepo_attack.png", 5, "./assets/capipepo.png", enemigo.id)
                    } else if (mokeponNombre === "Ratigueya") {
                        mokeponEnemigo = new Mokepon("Ratigueya", "./assets/mokepons_mokepon_ratigueya_attack.png", 5, "./assets/ratigueya.png", enemigo.id)
                    }

                    if (!mokeponEnemigo) return null  // nombre desconocido, ignorar

                    mokeponEnemigo.x = enemigo.x || 0
                    mokeponEnemigo.y = enemigo.y || 0

                    return mokeponEnemigo
                }).filter(function(m) { return m !== null })
            })
       }
   })
}

function moverDerecha() {
    
    let limiteDerecha = mapa.width - mascotaJugadorObjeto.ancho - 5;
    if (mascotaJugadorObjeto.x + mascotaJugadorObjeto.velocidadX <= limiteDerecha) {
        mascotaJugadorObjeto.velocidadX = 5
    }else{
        detenerMovimiento()
    }
}

function moverAbajo() {
    
    let limiteAbajo = mapa.height - mascotaJugadorObjeto.alto - 5;
    if (mascotaJugadorObjeto.y + mascotaJugadorObjeto.velocidadY <= limiteAbajo) {
        mascotaJugadorObjeto.velocidadY = 5
    }else{
        detenerMovimiento()
    }
    
}

function moverIzquierda() {
    
    if (mascotaJugadorObjeto.x - mascotaJugadorObjeto.velocidadX >= 10) {
        mascotaJugadorObjeto.velocidadX = - 5
    }else{
        detenerMovimiento()
    }
}

function moverArriba() {
    
    if (mascotaJugadorObjeto.y - mascotaJugadorObjeto.velocidadY >= 10) {
        mascotaJugadorObjeto.velocidadY = - 5
    }else{
        detenerMovimiento()
    }   
}


function detenerMovimiento() {
    mascotaJugadorObjeto.velocidadX = 0
    mascotaJugadorObjeto.velocidadY = 0
}

function sePresionaUnaTecla(event) {
    switch (event.key) {
        case "ArrowUp":
            moverArriba()
            break;
        case "ArrowDown":
            moverAbajo()
            break;
        case "ArrowLeft":
            moverIzquierda()
            break;
        case "ArrowRight":
            moverDerecha()
            break;
        default:
            break;
    }
}


function iniciarMapa() {
    mascotaJugadorObjeto = obtenerObjetoMascota(mascotaJugador)
    combateEnCurso = false
    combateYaIniciado = false
    clearInterval(intervaloMapa)
    intervaloMapa = setInterval(pintarCanvas, 50)
    window.addEventListener("keydown", sePresionaUnaTecla)
    window.addEventListener("keyup", detenerMovimiento)
}

function obtenerObjetoMascota() {
    for (let i = 0; i < mokepones.length; i++) {
        if (mascotaJugador === mokepones[i].nombre) {
            return mokepones[i]
        }
    }
}

function revisarColision(enemigo) {
    const arribaEnemigo = enemigo.y
    const abajoEnemigo = enemigo.y + enemigo.alto
    const derechaEnemigo = enemigo.x + enemigo.ancho
    const izquierdaEnemigo = enemigo.x

    const arribaMascota = mascotaJugadorObjeto.y
    const abajoMascota = mascotaJugadorObjeto.y + mascotaJugadorObjeto.alto
    const derechaMascota = mascotaJugadorObjeto.x + mascotaJugadorObjeto.ancho
    const izquierdaMascota = mascotaJugadorObjeto.x

    if (
        abajoMascota < arribaEnemigo ||
        arribaMascota > abajoEnemigo ||
        derechaMascota < izquierdaEnemigo ||
        izquierdaMascota > derechaEnemigo
    ) {
        return
    }

    // Ignorar al enemigo que acabamos de derrotar: puede seguir dibujándose un
    // frame mientras el servidor procesa la baja, y no queremos volver a
    // combatir con él.
    if (enemigo.id === ultimoEnemigoDerrotadoId) return

    // Enfriamiento tras terminar un combate: evita recolisar de inmediato con
    // el rival (p. ej. tras un empate ambos quedan en el mismo punto).
    if (Date.now() < proximoCombatePermitidoEn) return

    detenerMovimiento()
    clearInterval(intervaloMapa)

    if (combateEnCurso) return  // evita disparar el combate dos veces con la misma colisión
    combateEnCurso = true

    // Limpiar el estado y el DOM del combate anterior para empezar uno nuevo
    ataqueJugador = []
    ataqueEnemigo = []
    combateYaIniciado = false
    vidasJugador = 0
    vidasEnemigos = 0
    contadorCombates = 0
    spanVidasJugador.innerHTML = "0"
    spanVidasEnemigo.innerHTML = "0"
    sectionMensajes.innerHTML = "Mucha Suerte"
    ataquesDelJugador.innerHTML = ""
    ataquesDelEnemigo.innerHTML = ""
    sectionReiniciar.style.display = "none"

    enemigoId = enemigo.id
    sectionSeleccionarAtaque.style.display = "flex"
    sectionVerMapa.style.display = "none"
    seleccionarMascotaEnemigo(enemigo)

}



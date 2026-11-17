const express = require("express")
const cors = require("cors")

const app = express()
app.use(express.static("public"))
app.use(cors())
app.use(express.json())

const jugadores = []
const TIMEOUT_INACTIVIDAD_MS = 10000  // eliminar jugador tras 10s sin enviar posición

// Limpia jugadores inactivos cada 5 segundos.
// Solo aplica a jugadores que ya entraron al mapa (ultimaActividad != null).
// Jugadores en pantalla de selección tienen ultimaActividad = null y no se tocan.
setInterval(() => {
    const ahora = Date.now()
    for (let i = jugadores.length - 1; i >= 0; i--) {
        const j = jugadores[i]
        if (j.ultimaActividad !== null && ahora - j.ultimaActividad > TIMEOUT_INACTIVIDAD_MS) {
            jugadores.splice(i, 1)
        }
    }
}, 5000)

class Jugador {
    constructor(id) {
        this.id = id
        this.ultimaActividad = null  // null = aún en pantalla de selección, no cuenta timeout
    }

    asignarMokepon(mokepon) {
        this.mokepon = mokepon
        // El timeout empieza a contar desde que elige Mokepon y entra al mapa
        this.ultimaActividad = Date.now()
    }

    actualizarPosicion(x, y) {
        this.x = x
        this.y = y
        this.ultimaActividad = Date.now()
    }

    asignarAtaques(ataques) {
        this.ataques = ataques
        this.ultimaActividad = Date.now()
    }
}

class Mokepon {
    constructor(nombre) {
        this.nombre = nombre
    }
}

app.get("/unirse", (req, res) => {
    const id = `${Math.random()}`
    const jugador = new Jugador(id)
    jugadores.push(jugador)
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.send(id)
})

app.post("/mokepon/:jugadorId", (req, res) => {
    const jugadorId = req.params.jugadorId || ""
    const nombre = req.body.mokepon || ""
    const mokepon = new Mokepon(nombre)

    const jugadorIndex = jugadores.findIndex((jugador) => jugadorId === jugador.id)

    if (jugadorIndex >= 0) {
        jugadores[jugadorIndex].asignarMokepon(mokepon)
    }

    console.log(jugadores)
    console.log(jugadorId)

    res.end()
})

app.post("/mokepon/:jugadorId/posicion", (req, res) => {
    const jugadorId = req.params.jugadorId || ""
    const x = req.body.x || 0
    const y = req.body.y || 0

    const jugadorIndex = jugadores.findIndex((jugador) => jugadorId === jugador.id)

    if (jugadorIndex >= 0) {
        jugadores[jugadorIndex].actualizarPosicion(x, y)
    }

    // Solo devolver enemigos que ya eligieron Mokepon (evita crash en el frontend)
    const enemigos = jugadores.filter((jugador) => jugadorId !== jugador.id && jugador.mokepon)

    res.send({ enemigos })
})

app.post("/mokepon/:jugadorId/ataques", (req, res) => {
    const jugadorId = req.params.jugadorId || ""
    const ataques = req.body.ataques || []

    const jugadorIndex = jugadores.findIndex((jugador) => jugadorId === jugador.id)

    if (jugadorIndex >= 0) {
        jugadores[jugadorIndex].asignarAtaques(ataques)
    }

    res.end()
})

app.delete("/mokepon/:jugadorId", (req, res) => {
    const jugadorId = req.params.jugadorId || ""
    const jugadorIndex = jugadores.findIndex((jugador) => jugadorId === jugador.id)
    if (jugadorIndex >= 0) {
        jugadores.splice(jugadorIndex, 1)
        console.log(`Jugador ${jugadorId} eliminado tras combate`)
    }
    res.end()
})


    const jugadorId = req.params.jugadorId || ""
    const jugador = jugadores.find((jugador) => jugador.id === jugadorId)
    res.send({
        ataques: jugador?.ataques || []
    })
})

const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
    console.log(`Servidor Mokepon funcionando en puerto ${PORT}`)
})

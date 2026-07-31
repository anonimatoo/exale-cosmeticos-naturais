const next = require("next")
const http = require("http")

const dev = true
const hostname = "127" + "." + "0" + "." + "0" + "." + "1"
const port = Number(process.env.PORT || 3000)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  http.createServer((req, res) => handle(req, res)).listen(port, hostname, () => {
    console.log("Servidor local ativo na porta " + port)
  })
})

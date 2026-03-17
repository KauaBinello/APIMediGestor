const express = require("express");
require("dotenv").config();

const cors = require('cors');

const medicamentosRouter = require("./routes/medicamentos");
const clientesRouter = require("./routes/clientes");
const usuariosRouter = require("./routes/usuarios");
const distribuicoesRouter = require("./routes/distribuicoes");

const app = express();
app.use(cors());
app.use(express.json());


// =====================
// Rotas principais
// =====================
app.use("/medicamentos", medicamentosRouter);
app.use("/clientes", clientesRouter);
app.use("/usuarios", usuariosRouter);
app.use("/distribuicoes", distribuicoesRouter);

// Rota raiz
app.get("/", (req, res) => {
  res.send("🌎 API de Medicamentos rodando! Acesse a documentação em /api-docs");
});

// =====================
// Servidor
// =====================
const PORT = process.env.PORT || 3000;


app.listen(PORT, "127.0.0.1", () => {
  console.log("✅ Servidor rodando em http://127.0.0.1:3000");
});

const express = require("express");
const path = require("path"); // Import necessário para o path
const cors = require('cors');

// Configura o dotenv - Removi o __dirname se o .env estiver na raiz do projeto
require("dotenv").config(); 

const app = express();

// =====================
// Middlewares
// =====================

// CONFIGURAÇÃO DO CORS: 
// IMPORTANTE: Aqui deve ser a URL da VERCEL, não a do Render.
app.use(cors({
  origin: '*', // Dica: Use '*' temporariamente para testar se funciona, depois troque pela URL da Vercel
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// =====================
// Importação de Rotas
// =====================
const medicamentosRouter = require("./routes/medicamentos");
const clientesRouter = require("./routes/clientes");
const usuariosRouter = require("./routes/usuarios");
const distribuicoesRouter = require("./routes/distribuicoes");

// =====================
// Rotas principais
// =====================
app.use("/medicamentos", medicamentosRouter);
app.use("/clientes", clientesRouter);
app.use("/usuarios", usuariosRouter);
app.use("/distribuicoes", distribuicoesRouter);

// Rota raiz
app.get("/", (req, res) => {
  res.send("🌎 API de Medicamentos rodando!");
});

// =====================
// Servidor
// =====================
const PORT = process.env.PORT || 3000;

// No Render, é importante não fixar o IP '0.0.0.0' às vezes causa conflito, 
// deixe o servidor ouvir na porta que o Render providenciar.
app.listen(PORT, () => {
    console.log(`Servidor rodando com sucesso na porta ${PORT}`);
});
const swaggerJsDoc = require("swagger-jsdoc");

// Configuração do Swagger
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API de Medicamentos",
      version: "1.0.0",
      description:
        "API REST construída com Express e PostgreSQL para listar, criar, atualizar e remover medicamentos, usuários, clientes e distribuições.",
    },
    servers: [{ url: "http://localhost:3000" }],
  },
  apis: ["./routes/*.js"], // Caminho para os comentários JSDoc das rotas
};

// Gerar a especificação
const swaggerSpec = swaggerJsDoc(options);

// Exportar para o server.js usar
module.exports = swaggerSpec;

const swaggerJsDoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API de Medicamentos",
      version: "1.0.0",
      description:
        "API REST construída com Express e PostgreSQL para listar, criar, atualizar e remover medicamentos, usuários, clientes e distribuições.",
    },
    servers: [
      {
        // URL de produção (Render)
        url: "https://apimedigestor.onrender.com",
        description: "Servidor de Produção"
      },
      {
        // URL local para desenvolvimento
        url: "http://localhost:3000",
        description: "Servidor Local"
      }
    ],
  },
  apis: ["./routes/*.js"], 
};

const swaggerSpec = swaggerJsDoc(options);

module.exports = swaggerSpec;
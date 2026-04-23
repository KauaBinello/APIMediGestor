require("dotenv").config();
const { Pool } = require("pg");

// O segredo está em usar a string de conexão completa e o objeto SSL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    // Essa linha resolve o erro de conexão segura no Render/Supabase
    rejectUnauthorized: false
  }
});

// Teste de conexão imediato para o log do Render te avisar se deu certo
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Erro ao conectar no banco de dados:', err.message);
  } else {
    console.log('✅ Banco de dados conectado com sucesso!');
  }
});

module.exports = pool;
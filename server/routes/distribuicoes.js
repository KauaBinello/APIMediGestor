const express = require("express");
const pool = require("../db");

const router = express.Router();

// LISTAR DISTRIBUIÇÕES (Com JOIN para trazer nomes em vez de apenas IDs)
router.get("/", async (req, res) => {
  try {
    let { offset, limit } = req.query;
    offset = parseInt(offset) || 0;
    limit = parseInt(limit) || 16;

    const query = `
      SELECT 
        d.serial, 
        m.nome AS medicamento_nome, 
        d.quantidade, 
        TO_CHAR(d.saida, 'DD/MM/YYYY') AS data_saida, 
        u.nome AS usuario_nome, 
        c.nome AS cliente_nome
      FROM distribuicoes d
      JOIN medicamentos m ON d.medicamento_id = m.id
      JOIN usuarios u ON d.usuario_id = u.id
      JOIN clientes c ON d.cliente_id = c.id
      ORDER BY d.serial DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(query, [limit, offset]);
    res.json(result.rows);

  } catch (err) {
    res.status(500).json({ error: "Erro ao listar distribuições", detalhes: err.message });
  }
});

// INSERIR DISTRIBUIÇÃO (Com baixa automática no estoque)
router.post("/", async (req, res) => {
  const client = await pool.connect(); // Usando transação para garantir consistência
  try {
    const { medicamento_id, quantidade, usuario_id, cliente_id } = req.body;

    if (!medicamento_id || !quantidade || !usuario_id || !cliente_id) {
      return res.status(400).json({ error: "Todos os campos são obrigatórios" });
    }

    await client.query('BEGIN');

    // 1. Verificar se há saldo suficiente
    const resEstoque = await client.query("SELECT saldo FROM medicamentos WHERE id = $1", [medicamento_id]);
    if (resEstoque.rows.length === 0) throw new Error("Medicamento não encontrado");
    
    const saldoAtual = resEstoque.rows[0].saldo;
    if (saldoAtual < quantidade) {
        throw new Error(`Saldo insuficiente. Estoque atual: ${saldoAtual}`);
    }

    // 2. Registrar a distribuição (A data 'saida' usa CURRENT_DATE do SQL)
    const queryDist = `
      INSERT INTO distribuicoes (medicamento_id, quantidade, saida, usuario_id, cliente_id) 
      VALUES ($1, $2, CURRENT_DATE, $3, $4) 
      RETURNING *
    `;
    const novaDist = await client.query(queryDist, [medicamento_id, quantidade, usuario_id, cliente_id]);

    // 3. Atualizar o saldo na tabela de medicamentos
    await client.query("UPDATE medicamentos SET saldo = saldo - $1 WHERE id = $2", [quantidade, medicamento_id]);

    await client.query('COMMIT');
    res.status(201).json(novaDist.rows[0]);

  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: "Erro ao processar distribuição", detalhes: err.message });
  } finally {
    client.release();
  }
});

// DELETAR DISTRIBUIÇÃO (Opcional: Estorna o estoque se deletar?)
router.delete("/:serial", async (req, res) => {
  try {
    const serial = parseInt(req.params.serial);
    const result = await pool.query("DELETE FROM distribuicoes WHERE serial = $1 RETURNING *", [serial]);

    if (result.rows.length === 0) return res.status(404).json({ error: "Distribuição não encontrada" });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar distribuição" });
  }
});

module.exports = router;
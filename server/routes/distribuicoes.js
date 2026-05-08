const express = require("express");
const pool = require("../db");

const router = express.Router();

// LISTAR DISTRIBUIÇÕES (Com JOIN para trazer nomes em vez de apenas IDs)
router.get("/", async (req, res) => {
  try {
    let { cliente, offset, limit } = req.query;
    offset = parseInt(offset) || 0;
    limit = parseInt(limit) || 16;
    
    const nomeCliente = cliente ? `%${cliente}%` : '%';
    
    const query = `
      SELECT
        d.distribuicao_id,
        TO_CHAR(MIN(d.saida), 'DD/MM/YYYY') AS data_saida,
        u.nome AS usuario_nome,
        c.nome AS cliente_nome,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'serial', d.serial,
            'medicamento', m.nome,
            'quantidade', d.quantidade
          ) ORDER BY d.serial
        ) AS itens
      FROM distribuicoes d
      JOIN medicamentos m ON d.medicamento_id = m.id
      JOIN usuarios u ON d.usuario_id = u.id
      JOIN clientes c ON d.cliente_id = c.id
      WHERE c.nome ILIKE $1
      GROUP BY d.distribuicao_id, u.nome, c.nome
      ORDER BY d.distribuicao_id DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(query, [nomeCliente, limit, offset]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao listar distribuições", detalhes: err.message });
  }
});

// INSERIR DISTRIBUIÇÃO (Com baixa automática no estoque)
router.post("/", async (req, res) => {
  const client = await pool.connect();
  try {
    const { itens, usuario_id, cliente_id } = req.body;
    // itens = [{ medicamento_id, quantidade }, ...]

    if (!itens || itens.length === 0 || !usuario_id || !cliente_id) {
      return res.status(400).json({ error: "Dados incompletos" });
    }

    await client.query('BEGIN');

    // Gera um distribuicao_id único pra esse lote
    const seqRes = await client.query("SELECT nextval('distribuicao_id_seq')");
    const distribuicao_id = seqRes.rows[0].nextval;

    for (const item of itens) {
      const { medicamento_id, quantidade } = item;

      const estoque = await client.query(
        "SELECT saldo FROM medicamentos WHERE id = $1", [medicamento_id]
      );
      if (estoque.rows.length === 0) throw new Error(`Medicamento ${medicamento_id} não encontrado`);

      const saldo = estoque.rows[0].saldo;
      if (saldo < quantidade) throw new Error(`Saldo insuficiente para medicamento ${medicamento_id}. Saldo: ${saldo}`);

      await client.query(
        `INSERT INTO distribuicoes (medicamento_id, quantidade, saida, usuario_id, cliente_id, distribuicao_id)
         VALUES ($1, $2, CURRENT_DATE, $3, $4, $5)`,
        [medicamento_id, quantidade, usuario_id, cliente_id, distribuicao_id]
      );

      await client.query(
        "UPDATE medicamentos SET saldo = saldo - $1 WHERE id = $2",
        [quantidade, medicamento_id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ sucesso: true, distribuicao_id });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: "Erro ao processar distribuição", detalhes: err.message });
  } finally {
    client.release();
  }
});

// DELETAR DISTRIBUIÇÃO (Opcional: Estorna o estoque se deletar?)
router.delete("/:distribuicao_id", async (req, res) => {
  try {
    const distribuicao_id = parseInt(req.params.distribuicao_id);
    const result = await pool.query(
      "DELETE FROM distribuicoes WHERE distribuicao_id = $1 RETURNING *",
      [distribuicao_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Distribuição não encontrada" });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Erro ao deletar distribuição" });
  }
});

module.exports = router;
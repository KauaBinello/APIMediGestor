const API = 'http://localhost:3000/medicamentos';
const limit = 16;
let offset = 0;
let listaMedicamentos = [];
let idEmEdicao = null;

const corpoTabela = document.getElementById('corpo-tabela');
const campoBusca = document.getElementById('campo-pesquisa');
const modal = document.getElementById('modal-container');

window.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btnPaginacao").addEventListener("click", () => atualizarMedicamentos("mais"));
    document.getElementById("btnPaginacaoMenos").addEventListener("click", () => atualizarMedicamentos("menos"));
    campoBusca.addEventListener("input", filtrarMedicamentos);
    atualizarMedicamentos("inicio");
});

// --- DIÁLOGOS ---
function exibirDialogo(titulo, mensagem, tipo = "alert") {
    return new Promise((resolve) => {
        const modalAviso = document.getElementById('modal-aviso-container');
        document.getElementById('aviso-titulo').innerText = titulo;
        document.getElementById('aviso-texto').innerText = mensagem;
        document.getElementById('btn-aviso-cancelar').style.display = (tipo === "alert") ? "none" : "block";
        modalAviso.style.display = "flex";

        document.getElementById('btn-aviso-ok').onclick = () => { modalAviso.style.display = "none"; resolve(true); };
        document.getElementById('btn-aviso-cancelar').onclick = () => { modalAviso.style.display = "none"; resolve(false); };
    });
}

// --- DADOS ---
async function atualizarMedicamentos(acao = "") {
    if (acao === "inicio") offset = 0;
    if (acao === "mais") offset += limit;
    if (acao === "menos") offset = Math.max(0, offset - limit);

    try {
        const resposta = await fetch(`${API}?limit=${limit}&offset=${offset}`);
        const dados = await resposta.json();
        if (dados.length === 0 && acao === "mais") { offset -= limit; return; }
        listaMedicamentos = dados;
        renderizarTabela(dados);
        document.getElementById("btnPaginacaoMenos").disabled = offset === 0;
        document.getElementById("btnPaginacao").disabled = dados.length < limit;
    } catch (err) { console.error(err); }
}

// --- CORREÇÃO DA TABELA (DASHBOARD) ---
function renderizarTabela(lista) {
    corpoTabela.innerHTML = "";
    lista.forEach(m => {
        const tr = document.createElement("tr");
        
        // Se m.validade já for "YYYY-MM-DD", o split garante que pegamos só a data
        const dataLimpa = m.validade ? m.validade.split('T')[0] : null;
        let dataExibicao = '---';

        if (dataLimpa) {
            const [ano, mes, dia] = dataLimpa.split('-');
            dataExibicao = `${dia}/${mes}/${ano}`; // Formata MANUALMENTE para BR
        }
        
        tr.innerHTML = `
            <td><strong>${m.nome}</strong><br><small style="color: #666">${m.embalagem}</small></td>
            <td>${m.saldo} unidades</td>
            <td>${dataExibicao}</td>
            <td style="text-align: center;">
                <button onclick="modalEdicao(${m.id})" style="background:none; color:var(--color-primary); border:none; cursor:pointer;">
                    <i data-lucide="edit-3"></i>
                </button>
                <button onclick="deletar(${m.id})" style="background:none; color:#d9534f; border:none; cursor:pointer;">
                    <i data-lucide="trash-2"></i>
                </button>
            </td>`;
        corpoTabela.appendChild(tr);
    });
    lucide.createIcons();
}

function filtrarMedicamentos() {
    const termo = campoBusca.value;
    offset = 0;
    fetch(`${API}?nome=${termo}&limit=${limit}&offset=${offset}`)
        .then(res => res.json()).then(dados => renderizarTabela(dados));
}

// --- MODAL ---
window.novoMedicamento = function() {
    idEmEdicao = null;
    document.getElementById("tituloModal").innerText = "Novo Medicamento";
    limparCampos();
    modal.style.display = "flex";
}

// --- CORREÇÃO DO MODAL (EDIÇÃO) ---
window.modalEdicao = async function(id) {
    idEmEdicao = id;
    document.getElementById("tituloModal").innerText = "Editar Medicamento";
    try {
        const res = await fetch(`${API}/${id}`);
        const m = await res.json();
        
        document.getElementById("editNome").value = m.nome;
        document.getElementById("editEmbalagem").value = m.embalagem;
        document.getElementById("editSaldo").value = m.saldo;

        if (m.validade) {
            // O input type="date" SÓ aceita YYYY-MM-DD. 
            // Como seu banco já manda assim, vamos garantir que não tenha lixo
            const dataISO = m.validade.split('T')[0];
            document.getElementById("editValidade").value = dataISO;
        }
        
        modal.style.display = "flex";
    } catch (e) { exibirDialogo("Erro", "Erro ao carregar dados."); }
}

window.salvarEdicao = async function() {
    const nome = document.getElementById("editNome").value;
    const embalagem = document.getElementById("editEmbalagem").value;
    const saldo = parseInt(document.getElementById("editSaldo").value);
    const validade = document.getElementById("editValidade").value;

    if(!nome || !embalagem || isNaN(saldo) || !validade) {
        await exibirDialogo("Atenção", "Preencha todos os campos corretamente.");
        return;
    }

    // Validação de data retroativa (considerando fuso local)
    const dataVal = new Date(validade + 'T00:00:00');
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    if (dataVal < hoje) {
        await exibirDialogo("Data Inválida", "A validade não pode ser uma data passada.");
        return;
    }

    const medicamento = { nome, embalagem, saldo, validade };
    const metodo = idEmEdicao ? "PUT" : "POST";
    const url = idEmEdicao ? `${API}/${idEmEdicao}` : API;

    try {
        const res = await fetch(url, {
            method: metodo,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(medicamento)
        });
        if (res.ok) {
            fecharModal();
            atualizarMedicamentos();
            exibirDialogo("Sucesso", "Dados salvos com sucesso!");
        }
    } catch (e) { exibirDialogo("Erro", "Erro ao conectar com o servidor."); }
}

window.deletar = async function(id) {
    const confirma = await exibirDialogo("Confirmar", "Deseja excluir este item?", "confirm");
    if (confirma) {
        await fetch(`${API}/${id}`, { method: "DELETE" });
        atualizarMedicamentos();
    }
}

window.fecharModal = () => modal.style.display = "none";

window.limparCampos = function() {
    document.getElementById("editNome").value = "";
    document.getElementById("editEmbalagem").value = "";
    document.getElementById("editSaldo").value = "";
    document.getElementById("editValidade").value = "";
}   
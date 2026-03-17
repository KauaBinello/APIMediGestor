const API = 'http://localhost:3000/medicamentos';
const limit = 12;
let offset = 0;
let listaMedicamentos = [];
let idEmEdicao = null;

const corpoTabela = document.getElementById('corpo-tabela');
const campoBusca = document.getElementById('campo-pesquisa');
const modal = document.getElementById('modal-container');

// --- INICIALIZAÇÃO ---
document.addEventListener("DOMContentLoaded", () => {
    // Vincular botões fixos do HTML
    document.getElementById("btnPaginacao").addEventListener("click", () => atualizarMedicamentos("mais"));
    document.getElementById("btnPaginacaoMenos").addEventListener("click", () => atualizarMedicamentos("menos"));
    document.getElementById("cadastrar-novo").addEventListener("click", novoMedicamento);
    document.getElementById("btn-salvar").addEventListener("click", salvarEdicao);
    document.getElementById("btn-limpar").addEventListener("click", limparCampos);
    document.getElementById("btn-fechar-modal").addEventListener("click", fecharModal);
    
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

// --- TABELA (USANDO DOM PARA EVITAR WINDOW) ---
function renderizarTabela(lista) {
    corpoTabela.innerHTML = "";
    lista.forEach(m => {
        const tr = document.createElement("tr");

        const dataLimpa = m.validade ? m.validade.split('T')[0] : null;
        let dataExibicao = '---';
        if (dataLimpa) {
            const [ano, mes, dia] = dataLimpa.split('-');
            dataExibicao = `${dia}/${mes}/${ano}`;
        }

        // Criamos o conteúdo da linha
        tr.innerHTML = `
            <td><strong>${m.nome}</strong><br><small style="color: #666">${m.embalagem}</small></td>
            <td>${m.saldo} unidades</td>
            <td>${dataExibicao}</td>
            <td style="text-align: center;">
                <button class="btn-editar" style="background:none; color:var(--color-primary); border:none; cursor:pointer;">
                    <i data-lucide="edit-3"></i>
                </button>
                <button class="btn-deletar" style="background:none; color:#d9534f; border:none; cursor:pointer;">
                    <i data-lucide="trash-2"></i>
                </button>
            </td>`;

        // Agora vinculamos os eventos aos botões recém-criados antes de adicionar na tabela
        tr.querySelector('.btn-editar').addEventListener('click', () => modalEdicao(m.id));
        tr.querySelector('.btn-deletar').addEventListener('click', () => deletar(m.id));

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
function novoMedicamento() {
    idEmEdicao = null;
    document.getElementById("tituloModal").innerText = "Novo Medicamento";
    limparCampos();
    modal.style.display = "flex";
}

async function modalEdicao(id) {
    idEmEdicao = id;
    document.getElementById("tituloModal").innerText = "Editar Medicamento";
    try {
        const res = await fetch(`${API}/${id}`);
        const m = await res.json();

        document.getElementById("editNome").value = m.nome;
        document.getElementById("editEmbalagem").value = m.embalagem;
        document.getElementById("editSaldo").value = m.saldo;

        if (m.validade) {
            const dataISO = m.validade.split('T')[0];
            document.getElementById("editValidade").value = dataISO;
        }

        modal.style.display = "flex";
    } catch (e) { exibirDialogo("Erro", "Erro ao carregar dados."); }
}

async function salvarEdicao() {
    const nome = document.getElementById("editNome").value;
    const embalagem = document.getElementById("editEmbalagem").value;
    const saldo = document.getElementById("editSaldo").value;
    const validade = document.getElementById("editValidade").value;

    if (!nome.trim() || !embalagem.trim() || isNaN(saldo) || saldo < 0 || !validade) {
        await exibirDialogo("Erro", "Verifique se todos os campos estão preenchidos corretamente.");
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

async function deletar(id) {
    const confirma = await exibirDialogo("Confirmar", "Deseja excluir este medicamento?", "confirm");
    if (confirma) {
        try {
            const resposta = await fetch(`${API}/${id}`, { method: "DELETE" });
            if (resposta.ok) {
                exibirDialogo("Sucesso", "Medicamento removido com sucesso!");
                atualizarMedicamentos();
            } else {
                exibirDialogo("Não é possível excluir", "Este medicamento possui vínculos no sistema.");
            }
        } catch (erro) {
            exibirDialogo("Erro", "Erro ao conectar ao servidor.");
        }
    }
}

function fecharModal() { modal.style.display = "none"; }

function limparCampos() {
    document.getElementById("editNome").value = "";
    document.getElementById("editEmbalagem").value = "";
    document.getElementById("editSaldo").value = "";
    document.getElementById("editValidade").value = "";
}
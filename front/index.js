const API = 'http://localhost:3000/medicamentos';

const listagem = document.getElementById('listagem');

const btnCarregar = document.getElementById('btnCarregar');
btnCarregar.addEventListener('click', carregarMedicamentos);

const btnInserir = document.getElementById('btnInserir');
btnInserir.addEventListener('click', inserirMedicamento);

const btnPaginacao = document.getElementById("btnPaginacao");
const btnPaginacaoMenos = document.getElementById("btnPaginacaoMenos");

btnCarregar.addEventListener("click", () => atualizarMedicamentos("inicio"));
btnPaginacao.addEventListener("click", () => atualizarMedicamentos("mais"));
btnPaginacaoMenos.addEventListener("click", () => atualizarMedicamentos("menos"));

const limit = 5;
let offset = 0;
let listaMedicamentos = [];


async function carregarMedicamentos() {

    try {
        const resposta = await fetch(API);
        const medicamentos = await resposta.json();
        listagem.innerHTML = '';

        renderizarLista(medicamentos);

    } catch (error) {
        console.log("Erro ao carregar medicamentos:", error);
    }
}

async function inserirMedicamento() {
    const nome = document.getElementById('campoNome').value;
    const embalagem = document.getElementById('campoEmbalagem').value;
    const saldo = document.getElementById('campoSaldo').value;
    const validade = document.getElementById('campoValidade').value;

    const medicamento = {
        nome,
        embalagem,
        saldo,
        validade
    };

    try {
        const resposta = await fetch(API, {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(medicamento)
        });

        if (!resposta.ok) {
            throw new Error("Erro ao inserir medicamento");
        }
        carregarMedicamentos();
    } catch (error) {
        console.log("Erro ao inserir medicamento:", error);
    }
}

async function atualizarMedicamentos(acao = "") {

    if (acao === "inicio") offset = 0;
    if (acao === "mais") offset += limit;
    if (acao === "menos") {
        offset -= limit;
        if (offset < 0) offset = 0;
    }

    try {
        const resposta = await fetch(`${API}/?limit=${limit}&offset=${offset}`);
        const dados = await resposta.json();

        listaMedicamentos = dados;   // 🔥 GUARDA A LISTA
        renderizarLista(dados);      // 🔥 NOVA FUNÇÃO

    } catch (erro) {
        console.error("Erro ao carregar:", erro.message);
    }
}

function renderizarLista(lista) {
    listagem.innerHTML = "";
    lista.forEach(m => criarCard(m));
}

document.getElementById("campoBusca").addEventListener("input", filtrarMedicamentos);

function filtrarMedicamentos() {
    const termo = document.getElementById("campoBusca").value.toLowerCase();

    const filtrados = listaMedicamentos.filter(m =>
        m.nome.toLowerCase().includes(termo)
    );

    renderizarLista(filtrados);
}


function criarCard(m) {
    const card = document.createElement("div");
    card.classList.add("card");

    card.innerHTML = `
        <h3>${m.nome} (${m.embalagem})</h3>
        <p>Saldo: ${m.saldo}</p>
        <p>Validade: ${m.validade}</p>
        <button class="btn-editar" onclick="modalEdicao(${m.id})">Editar</button>
        <button class="btn-delete" onclick="deletar(${m.id})">Deletar</button>
    `;

    listagem.appendChild(card);
}

async function deletar(id) {

    try {

        const resposta = await fetch(`${API}/${id}`, {
            method: "DELETE"
        });

        if (!resposta.ok) {
            throw new Error("Erro ao deletar!");
        }

        carregarMedicamentos();

    } catch (erro) {
        console.error("Erro ao deletar:", erro.message);
    }
}

let idEmEdicao = null;

async function modalEdicao(id) {

    document.getElementById("modal").style.display = "block";
    idEmEdicao = id;

    const resposta = await fetch(`${API}/${id}`);
    const m = await resposta.json()
    document.getElementById("id").value = m.id;
    document.getElementById("editNome").value = m.nome;
    document.getElementById("editEmbalagem").value = m.embalagem;
    document.getElementById("editSaldo").value = m.saldo;
    document.getElementById("editValidade").value = m.validade;

}

function fecharModal() {
    document.getElementById("modal").style.display = "none";
}

async function salvarEdicao() {

    const id = document.getElementById("id").value;
    const medicamentoAtualizado = {
        id: id,
        nome: document.getElementById("editNome").value,
        embalagem: document.getElementById("editEmbalagem").value,
        saldo: document.getElementById("editSaldo").value,
        validade: document.getElementById("editValidade").value
    };

    if (id === '') {
        await fetch(API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(medicamentoAtualizado)
        });
    } else {
        await fetch(`${API}/${idEmEdicao}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(medicamentoAtualizado)
        });
    }

    fecharModal();
    carregarMedicamentos();
}

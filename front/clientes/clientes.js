const API = 'http://localhost:3000/clientes';
const limit = 12;
let offset = 0;
let listaClientes = [];
let idEmEdicao = null;

const corpoTabela = document.getElementById('corpo-tabela');
const campoBusca = document.getElementById('campo-pesquisa');
const modal = document.getElementById('modal-container');

// --- INICIALIZAÇÃO ---
document.addEventListener("DOMContentLoaded", () => {
    // Vincular botões fixos
    document.getElementById("btnPaginacao").addEventListener("click", () => atualizarClientes("mais"));
    document.getElementById("btnPaginacaoMenos").addEventListener("click", () => atualizarClientes("menos"));
    document.getElementById("cadastrar-novo").addEventListener("click", novoCliente);
    document.getElementById("btn-salvar").addEventListener("click", salvarEdicao);
    document.getElementById("btn-limpar").addEventListener("click", limparCampos);
    document.getElementById("btn-fechar-modal").addEventListener("click", fecharModal);

    campoBusca.addEventListener("input", filtrarClientes);
    
    atualizarClientes("inicio");
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

// --- BUSCAR DADOS ---
async function atualizarClientes(acao = "") {
    if (acao === "inicio") offset = 0;
    if (acao === "mais") offset += limit;
    if (acao === "menos") offset = Math.max(0, offset - limit);

    try {
        const resposta = await fetch(`${API}?limit=${limit}&offset=${offset}`);
        const dados = await resposta.json();
        
        if (dados.length === 0 && acao === "mais") { 
            offset -= limit; 
            return; 
        }

        listaClientes = dados;
        renderizarTabela(dados);
        
        document.getElementById("btnPaginacaoMenos").disabled = offset === 0;
        document.getElementById("btnPaginacao").disabled = dados.length < limit;
    } catch (erro) { 
        console.error("Erro ao buscar clientes:", erro); 
    }
}

// --- RENDERIZAR TABELA ---
function renderizarTabela(lista) {
    corpoTabela.innerHTML = "";
    lista.forEach(c => {
        const tr = document.createElement("tr");

        let nascimentoFormatado = "---";
        if (c.nascimento) {
            const data = c.nascimento.split('T')[0];
            const [ano, mes, dia] = data.split('-');
            nascimentoFormatado = `${dia}/${mes}/${ano}`;
        }

        tr.innerHTML = `
            <td><strong>${c.nome}</strong></td>
            <td>${c.cpf}</td>
            <td>${c.telefone}</td>
            <td>${nascimentoFormatado}</td>
            <td>${c.cidade} - ${c.uf}</td>
            <td style="text-align: center;">
                <button class="btn-editar" style="background:none; color:var(--color-primary); border:none; cursor:pointer;">
                    <i data-lucide="edit-3"></i>
                </button>
                <button class="btn-deletar" style="background:none; color:#d9534f; border:none; cursor:pointer;">
                    <i data-lucide="trash-2"></i>
                </button>
            </td>`;

        // Adiciona os eventos aos botões específicos desta linha
        tr.querySelector('.btn-editar').addEventListener('click', () => modalEdicao(c.id));
        tr.querySelector('.btn-deletar').addEventListener('click', () => deletar(c.id));

        corpoTabela.appendChild(tr);
    });
    
    if (window.lucide) lucide.createIcons();
}

// --- FILTRO ---
function filtrarClientes() {
    const termo = campoBusca.value;
    offset = 0;
    fetch(`${API}?nome=${termo}&limit=${limit}&offset=${offset}`)
        .then(res => res.json())
        .then(dados => renderizarTabela(dados));
}

// --- MODAL NOVO ---
function novoCliente() {
    idEmEdicao = null;
    document.getElementById("tituloModal").innerText = "Novo Cliente";
    limparCampos();
    modal.style.display = "flex";
}

// --- MODAL EDIÇÃO ---
async function modalEdicao(id) {
    idEmEdicao = id;
    document.getElementById("tituloModal").innerText = "Editar Cliente";
    
    try {
        const res = await fetch(`${API}/${id}`);
        if (!res.ok) throw new Error();
        const c = await res.json();

        document.getElementById("editNome").value = c.nome || "";
        document.getElementById("editCpf").value = c.cpf || "";
        document.getElementById("editTelefone").value = c.telefone || "";
        document.getElementById("editEndereco").value = c.endereco || "";
        document.getElementById("editNumero").value = c.numero_residencial || "";
        document.getElementById("editBairro").value = c.bairro || "";
        document.getElementById("editCidade").value = c.cidade || "";
        document.getElementById("editUf").value = c.uf || "";

        if (c.nascimento) {
            document.getElementById("editNascimento").value = c.nascimento.split('T')[0];
        }

        modal.style.display = "flex";
    } catch {
        exibirDialogo("Erro", "Erro ao carregar dados do cliente.");
    }
}

// --- SALVAR ---
async function salvarEdicao() {
    const cliente = {
        nome: document.getElementById("editNome").value.trim(),
        cpf: document.getElementById("editCpf").value.trim(),
        telefone: document.getElementById("editTelefone").value.trim(),
        nascimento: document.getElementById("editNascimento").value,
        endereco: document.getElementById("editEndereco").value.trim(),
        numero_residencial: document.getElementById("editNumero").value.trim(),
        bairro: document.getElementById("editBairro").value.trim(),
        cidade: document.getElementById("editCidade").value.trim(),
        uf: document.getElementById("editUf").value.toUpperCase().trim()
    };

    if (!cliente.nome || !cliente.cpf) {
        return exibirDialogo("Campo Obrigatório", "O nome e o CPF são obrigatórios.");
    }

    const metodo = idEmEdicao ? "PUT" : "POST";
    const url = idEmEdicao ? `${API}/${idEmEdicao}` : API;

    try {
        const res = await fetch(url, {
            method: metodo,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(cliente)
        });

        if (res.ok) {
            fecharModal();
            atualizarClientes();
            exibirDialogo("Sucesso", "Cliente salvo com sucesso!");
        } else {
            throw new Error();
        }
    } catch {
        exibirDialogo("Erro", "Erro ao conectar com o servidor.");
    }
}

// --- DELETAR ---
async function deletar(id) {
    const confirma = await exibirDialogo("Confirmar", "Deseja realmente excluir este cliente?", "confirm");

    if (confirma) {
        try {
            const resposta = await fetch(`${API}/${id}`, { method: "DELETE" });

            if (resposta.ok) {
                exibirDialogo("Sucesso", "Cliente excluído com sucesso!");
                atualizarClientes();
            } else {
                exibirDialogo("Não é possível excluir", "Este cliente possui distribuições vinculadas.");
            }
        } catch (erro) {
            console.error("Erro ao deletar:", erro);
            exibirDialogo("Erro", "Ocorreu um erro interno.");
        }
    }
}

// --- UTILS ---
function fecharModal() { modal.style.display = "none"; }

function limparCampos() {
    const campos = ["editNome", "editCpf", "editTelefone", "editNascimento", 
                    "editEndereco", "editNumero", "editBairro", "editCidade", "editUf"];
    campos.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
}
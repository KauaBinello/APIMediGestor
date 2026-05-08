// --- TRAVA DE SEGURANÇA REFORÇADA ---
if (localStorage.getItem('usuarioLogado') !== 'true') {
    window.location.href = '../auth/login.html';
    // Para a execução de todo o resto do script
    throw new Error("Acesso não autorizado");
}
const API = 'https://apimedigestor.onrender.com/medicamentos';
const limit = 12;
let offset = 0;
let idEmEdicao = null;

const corpoTabela = document.getElementById('corpo-tabela');
const campoBusca = document.getElementById('campo-pesquisa');
const modal = document.getElementById('modal-container');

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btn-sair").addEventListener("click", () => {
        localStorage.removeItem('usuarioLogado');
        localStorage.removeItem('nomeUsuario');
        window.location.href = '../auth/login.html';
    });
    const nomeUsuario = localStorage.getItem('nomeUsuario') || 'Usuário';
    document.getElementById('user-nome').textContent = nomeUsuario;

    // Iniciais do avatar
    const iniciais = nomeUsuario.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
    document.getElementById('user-initials').textContent = iniciais;
    document.getElementById("btnPaginacao").addEventListener("click", () => atualizarMedicamentos("mais"));
    document.getElementById("btnPaginacaoMenos").addEventListener("click", () => atualizarMedicamentos("menos"));
    document.getElementById("cadastrar-novo").addEventListener("click", novoMedicamento);
    document.getElementById("btn-salvar").addEventListener("click", salvarEdicao);
    document.getElementById("btn-limpar").addEventListener("click", limparCampos);
    document.getElementById("btn-fechar-modal").addEventListener("click", fecharModal);
    campoBusca.addEventListener("input", filtrarMedicamentos);

    // Trava visual de data (HTML5 min)
    document.getElementById("editValidade").setAttribute("min", new Date().toISOString().split("T")[0]);

    atualizarMedicamentos("inicio");
});

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

async function atualizarMedicamentos(acao = "") {
    if (acao === "inicio") offset = 0;
    if (acao === "mais") offset += limit;
    if (acao === "menos") offset = Math.max(0, offset - limit);

    try {
        const resposta = await fetch(`${API}?limit=${limit}&offset=${offset}`);
        const dados = await resposta.json();

        // LOG PARA DEBUG: Abre o F12 e veja o que está chegando aqui
        console.log("Dados recebidos da API:", dados);

        // Se o servidor mandou um objeto com os dados dentro (ex: dados.medicamentos)
        // ou se mandou a lista direta, a gente garante que seja uma Array
        const listaFinal = Array.isArray(dados) ? dados : (dados.medicamentos || []);

        if (listaFinal.length === 0 && acao === "mais") { 
            offset -= limit; 
            return; 
        }

        renderizarTabela(listaFinal);

        document.getElementById("btnPaginacaoMenos").disabled = offset === 0;
        document.getElementById("btnPaginacao").disabled = listaFinal.length < limit;
    } catch (err) { 
        console.error("Erro ao buscar medicamentos:", err); 
    }
}

function renderizarTabela(lista) {
    corpoTabela.innerHTML = "";
    lista.forEach(m => {
        const tr = document.createElement("tr");
        const dataExibicao = m.validade ? m.validade.split('-').reverse().join('/') : '---';
        const infoEmbalagem = `${m.concentracao}${m.unidade_concentracao} (${m.quantidade_embalagem} ${m.tipo_unidade})`;

        tr.innerHTML = `
            <td><strong>${m.nome}</strong><br><small style="color: #666">${infoEmbalagem}</small></td>
            <td>${m.saldo} unidades</td>
            <td>${dataExibicao}</td>
            <td style="text-align: center;">
                <button class="btn-editar" style="background:none; color:var(--color-primary); padding:5px;"><i data-lucide="edit-3"></i></button>
                <button class="btn-deletar" style="background:none; color:#e05252; padding:5px;"><i data-lucide="trash-2"></i></button>
            </td>`;
        tr.querySelector('.btn-editar').onclick = () => modalEdicao(m.id);
        tr.querySelector('.btn-deletar').onclick = () => deletar(m.id);
        corpoTabela.appendChild(tr);
    });
    lucide.createIcons();
}

function filtrarMedicamentos() {
    const termo = campoBusca.value;
    fetch(`${API}?nome=${termo}&limit=${limit}&offset=0`)
        .then(res => res.json()).then(dados => renderizarTabela(dados));
}

function novoMedicamento() {
    idEmEdicao = null;
    document.getElementById("tituloModal").innerText = "Novo Medicamento";
    limparCampos();
    modal.style.display = "flex";
}

async function modalEdicao(id) {
    idEmEdicao = id;
    try {
        const res = await fetch(`${API}/${id}`);
        const m = await res.json();
        document.getElementById("editNome").value = m.nome;
        document.getElementById("editConcentracao").value = m.concentracao;
        document.getElementById("editUnidadeMedida").value = m.unidade_concentracao;
        document.getElementById("editQtdEmbalagem").value = m.quantidade_embalagem;
        document.getElementById("editTipoUnidade").value = m.tipo_unidade;
        document.getElementById("editSaldo").value = m.saldo;
        document.getElementById("editValidade").value = m.validade;
        document.getElementById("tituloModal").innerText = "Editar Medicamento";
        modal.style.display = "flex";
    } catch (e) { exibirDialogo("Erro", "Falha ao carregar."); }
}

async function salvarEdicao() {
    const med = {
        nome: document.getElementById("editNome").value.trim(),
        concentracao: document.getElementById("editConcentracao").value.trim(),
        unidade_concentracao: document.getElementById("editUnidadeMedida").value,
        quantidade_embalagem: parseInt(document.getElementById("editQtdEmbalagem").value),
        tipo_unidade: document.getElementById("editTipoUnidade").value,
        saldo: parseInt(document.getElementById("editSaldo").value),
        validade: document.getElementById("editValidade").value
    };

    if (!med.nome || !med.concentracao || !quantidade_embalagem || isNaN(med.saldo) || !med.validade) {
        return exibirDialogo("Atenção", "Preencha todos os campos.");
    }

    // Validação de Data Retroativa
    const dataSel = new Date(med.validade + 'T00:00:00');
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    if (dataSel < hoje) return exibirDialogo("Data Inválida", "A validade não pode ser anterior a hoje.");

    try {
        const res = await fetch(idEmEdicao ? `${API}/${idEmEdicao}` : API, {
            method: idEmEdicao ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(med)
        });
        if (res.ok) { fecharModal(); atualizarMedicamentos(); exibirDialogo("Sucesso", "Salvo!"); }
    } catch (e) { exibirDialogo("Erro", "Erro de conexão."); }
}

async function deletar(id) {
    const confirma = await exibirDialogo("Confirmar", "Deseja realmente excluir este medicamento?", "confirm");

    if (confirma) {
        try {
            const resposta = await fetch(`${API}/${id}`, { method: "DELETE" });
            console.log("Status:", resposta.status, "Ok:", resposta.ok); // <- adiciona isso

            if (resposta.ok) {
                exibirDialogo("Sucesso", "Medicamento excluído com sucesso!");
                atualizarMedicamentos();
            } else {
                const erro = await resposta.json();
                console.log("Erro retornado:", erro); // <- e isso
                exibirDialogo("Não é possível excluir", "Este medicamento possui distribuições vinculadas.");
            }
        } catch (erro) {
            console.error("Erro ao deletar:", erro);
            exibirDialogo("Erro", "Ocorreu um erro interno.");
        }
    }
}

function fecharModal() { modal.style.display = "none"; }
function limparCampos() {
    ["editNome", "editConcentracao", "editQtdEmbalagem", "editSaldo", "editValidade"].forEach(id => document.getElementById(id).value = "");
}
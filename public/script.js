// ============================================================
//  SISTEMA DE ESTOQUE - INTEGRAÇÃO VIA MICROSOFT FORMS
// ============================================================

// URL do seu Microsoft Forms (envio automático)
const FORMS_URL = "https://forms.microsoft.com/r/cYKFvRQbRV";

// ============================================================
//  FUNÇÃO: ENVIAR PRODUTO PARA O MICROSOFT FORMS
// ============================================================
async function enviarProdutoForms(dadosProduto) {
    try {
        const response = await fetch("/enviarForms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dadosProduto)
        });

        if (!response.ok) throw new Error("Erro ao enviar dados");

        alert("✅ Produto enviado com sucesso! Aguarde alguns segundos e verifique a lista no SharePoint.");
        document.getElementById("form-cadastro").reset();
        navegarPara("tela-cadastro", "tela-principal");
    } catch (error) {
        alert(`❌ Falha ao enviar: ${error.message}`);
        console.error("Erro ao enviar produto:", error);
    }
}


// ============================================================
//  NAVEGAÇÃO ENTRE TELAS
// ============================================================
function navegarPara(telaAtualId, proximaTelaId) {
    document.querySelectorAll('.screen').forEach(tela => tela.classList.remove('active'));
    const proximaTela = document.getElementById(proximaTelaId);
    if (proximaTela) proximaTela.classList.add('active');
}

// ============================================================
//  EVENTOS PRINCIPAIS
// ============================================================
document.addEventListener("DOMContentLoaded", () => {

    // ----- Botões principais -----
    document.getElementById("btn-cadastro").addEventListener("click", () => navegarPara("tela-principal", "tela-cadastro"));
    document.getElementById("btn-voltar-cadastro").addEventListener("click", () => navegarPara("tela-cadastro", "tela-principal"));

    // ----- Envio do formulário -----
    document.getElementById("form-cadastro").addEventListener("submit", async (e) => {
        e.preventDefault();

        const dadosProduto = {
            codigoFabrica: document.getElementById("codigoFabrica").value.trim(),
            codigoFornecedor: document.getElementById("codigoFornecedor").value.trim(),
            descricaoProduto: document.getElementById("descricaoProduto").value.trim(),
            nomeFornecedor: document.getElementById("nomeFornecedor").value.trim(),
            unidadeMedida: document.getElementById("unidadeMedida").value.trim()
        };

        if (!dadosProduto.codigoFabrica || !dadosProduto.codigoFornecedor || !dadosProduto.descricaoProduto || !dadosProduto.nomeFornecedor || !dadosProduto.unidadeMedida) {
            alert("⚠️ Preencha todos os campos antes de salvar!");
            return;
        }

        await enviarProdutoForms(dadosProduto);
    });
});


// ============================================================
// CONFIGURAÇÃO
// ============================================================
const SHAREPOINT_SITE = "https://borexpress.sharepoint.com/sites/EstoqueJC";
const LISTA_ENTRADA_API = "EntradaAPI";

// ============================================================
// FUNÇÃO DE ENVIO PARA ENTRADAAPI
// ============================================================
async function salvarNaEntradaAPI(dados) {
  try {
    const url = `${SHAREPOINT_SITE}/_api/web/lists/getbytitle('${LISTA_ENTRADA_API}')/items`;

    // Token de segurança do SharePoint
    const digest = document.getElementById("__REQUESTDIGEST")
      ? document.getElementById("__REQUESTDIGEST").value
      : "";

    const resposta = await fetch(url, {
      method: "POST",
      headers: {
        "Accept": "application/json;odata=verbose",
        "Content-Type": "application/json;odata=verbose",
        "X-RequestDigest": digest
      },
      body: JSON.stringify({
        "__metadata": { "type": "SP.Data.EntradaAPIListItem" },
        "Title": dados.codigoFabrica,
        "CodigoFornecedor": dados.codigoFornecedor,
        "DescricaoProduto": dados.descricaoProduto,
        "NomeFornecedor": dados.nomeFornecedor,
        "UnidadeMedida": dados.unidadeMedida
      })
    });

    if (!resposta.ok) {
      const erro = await resposta.text();
      throw new Error(erro);
    }

    alert("✅ Produto enviado com sucesso para o Power Automate!");
    document.getElementById("form-cadastro").reset();
  } catch (error) {
    console.error("Erro ao enviar para EntradaAPI:", error);
    alert("❌ Falha ao enviar o produto: " + error.message);
  }
}

// ============================================================
// FUNÇÕES DE NAVEGAÇÃO
// ============================================================
function navegarPara(telaAtualId, proximaTelaId) {
  document.querySelectorAll(".screen").forEach(tela => tela.classList.remove("active"));
  const proximaTela = document.getElementById(proximaTelaId);
  if (proximaTela) proximaTela.classList.add("active");
}

// ============================================================
// EVENTOS
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  // NAVEGAÇÃO
  document.getElementById("btn-cadastro").addEventListener("click", () => navegarPara("tela-principal", "tela-cadastro"));
  document.getElementById("btn-entrada").addEventListener("click", () => navegarPara("tela-principal", "tela-entrada"));
  document.getElementById("btn-saida").addEventListener("click", () => navegarPara("tela-principal", "tela-saida"));
  document.getElementById("btn-saldo").addEventListener("click", () => navegarPara("tela-principal", "tela-saldo"));
  document.getElementById("btn-voltar-cadastro").addEventListener("click", () => navegarPara("tela-cadastro", "tela-principal"));

  // ============================================================
  // ENVIO DO CADASTRO PARA ENTRADAAPI
  // ============================================================
  document.getElementById("form-cadastro").addEventListener("submit", async (e) => {
    e.preventDefault();

    const codigoFabrica = document.getElementById("codigoFabrica").value.trim().toUpperCase();
    const codigoFornecedor = document.getElementById("codigoFornecedor").value.trim().toUpperCase();
    const descricaoProduto = document.getElementById("descricaoProduto").value.trim();
    const nomeFornecedor = document.getElementById("nomeFornecedor").value.trim();
    const unidadeMedida = document.getElementById("unidadeMedida").value.trim();

    if (!codigoFabrica || !codigoFornecedor || !descricaoProduto || !nomeFornecedor || !unidadeMedida) {
      alert("⚠️ Preencha todos os campos antes de salvar.");
      return;
    }

    const dados = {
      codigoFabrica,
      codigoFornecedor,
      descricaoProduto,
      nomeFornecedor,
      unidadeMedida
    };

    await salvarNaEntradaAPI(dados);
  });
});

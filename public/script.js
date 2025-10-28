// ===========================================================
// CONFIGURAÇÃO GERAL
// ===========================================================
const SHAREPOINT_SITE = "https://borexpress.sharepoint.com/sites/EstoqueJC";
const LISTA_ENTRADA_API = "EntradaAPI";

// ===========================================================
// FUNÇÃO PRINCIPAL: ENVIA PRODUTO PARA ENTRADAAPI
// ===========================================================
async function salvarNaEntradaAPI(dados) {
  try {
    const siteUrl = `${SHAREPOINT_SITE}`;
    const listUrl = `${siteUrl}/_api/web/lists/getbytitle('${LISTA_ENTRADA_API}')/items`;

    // 🔹 Gera token __REQUESTDIGEST dinamicamente
    const digestResponse = await fetch(`${siteUrl}/_api/contextinfo`, {
      method: "POST",
      headers: { "Accept": "application/json;odata=verbose" },
      credentials: "include",
    });

    if (!digestResponse.ok) throw new Error("Falha ao gerar token de segurança");
    const digestData = await digestResponse.json();
    const digestValue = digestData.d.GetContextWebInformation.FormDigestValue;

    // 🔹 Envia item para a lista EntradaAPI
    const response = await fetch(listUrl, {
      method: "POST",
      headers: {
        "Accept": "application/json;odata=verbose",
        "Content-Type": "application/json;odata=verbose",
        "X-RequestDigest": digestValue,
      },
      credentials: "include",
      body: JSON.stringify({
        "__metadata": { "type": "SP.Data.EntradaAPIListItem" },
        "Title": dados.codigoFabrica,
        "CodigoFornecedor": dados.codigoFornecedor,
        "DescricaoProduto": dados.descricaoProduto,
        "NomeFornecedor": dados.nomeFornecedor,
        "UnidadeMedida": dados.unidadeMedida,
      }),
    });

    if (!response.ok) {
      const erro = await response.text();
      throw new Error(erro);
    }

    alert("✅ Produto enviado com sucesso para o Power Automate!");
    document.getElementById("form-cadastro").reset();
    navegarPara("tela-cadastro", "tela-principal");

  } catch (error) {
    console.error("Erro ao enviar para EntradaAPI:", error);
    alert("❌ Falha ao enviar o produto: " + error.message);
  }
}

// ===========================================================
// FUNÇÕES DE NAVEGAÇÃO
// ===========================================================
function navegarPara(atual, proxima) {
  document.querySelectorAll(".screen").forEach(tela => tela.classList.remove("active"));
  const destino = document.getElementById(proxima);
  if (destino) destino.classList.add("active");
}

// ===========================================================
// FUNÇÕES AUXILIARES
// ===========================================================
function calcularValorTotal() {
  const qtd = parseFloat(document.getElementById("entradaQuantidade").value) || 0;
  const unit = parseFloat(document.getElementById("entradaValorUnitario").value) || 0;
  document.getElementById("entradaValorTotal").value = (qtd * unit).toFixed(2);
}

// ===========================================================
// EVENTOS GERAIS
// ===========================================================
document.addEventListener("DOMContentLoaded", () => {

  // ----------------------------------------------------------
  // NAVEGAÇÃO ENTRE TELAS
  // ----------------------------------------------------------
  document.getElementById("btn-cadastro").addEventListener("click", () => navegarPara("tela-principal", "tela-cadastro"));
  document.getElementById("btn-entrada").addEventListener("click", () => navegarPara("tela-principal", "tela-entrada"));
  document.getElementById("btn-saida").addEventListener("click", () => navegarPara("tela-principal", "tela-saida"));
  document.getElementById("btn-saldo").addEventListener("click", () => navegarPara("tela-principal", "tela-saldo"));

  document.getElementById("btn-voltar-cadastro").addEventListener("click", () => navegarPara("tela-cadastro", "tela-principal"));
  document.getElementById("btn-voltar-entrada").addEventListener("click", () => navegarPara("tela-entrada", "tela-principal"));
  document.getElementById("btn-voltar-saida").addEventListener("click", () => navegarPara("tela-saida", "tela-principal"));
  document.getElementById("btn-voltar-saldo").addEventListener("click", () => navegarPara("tela-saldo", "tela-principal"));
  document.getElementById("btn-voltar-historico").addEventListener("click", () => navegarPara("tela-historico-saida", "tela-saida"));
  document.getElementById("btn-historico-saida").addEventListener("click", () => navegarPara("tela-saida", "tela-historico-saida"));

  // ----------------------------------------------------------
  // CADASTRO DE PRODUTO → ENVIAR PARA EntradaAPI
  // ----------------------------------------------------------
  document.getElementById("form-cadastro").addEventListener("submit", async (e) => {
    e.preventDefault();

    const dados = {
      codigoFabrica: document.getElementById("codigoFabrica").value.trim().toUpperCase(),
      codigoFornecedor: document.getElementById("codigoFornecedor").value.trim().toUpperCase(),
      descricaoProduto: document.getElementById("descricaoProduto").value.trim(),
      nomeFornecedor: document.getElementById("nomeFornecedor").value.trim(),
      unidadeMedida: document.getElementById("unidadeMedida").value.trim(),
    };

    // Campos obrigatórios
    if (!dados.codigoFabrica || !dados.codigoFornecedor || !dados.descricaoProduto || !dados.nomeFornecedor || !dados.unidadeMedida) {
      alert("⚠️ Preencha todos os campos antes de salvar!");
      return;
    }

    await salvarNaEntradaAPI(dados);
  });

  // ----------------------------------------------------------
  // FUNÇÕES DE ENTRADA
  // ----------------------------------------------------------
  document.getElementById("entradaQuantidade").addEventListener("input", calcularValorTotal);
  document.getElementById("entradaValorUnitario").addEventListener("input", calcularValorTotal);

  // ----------------------------------------------------------
  // PLACEHOLDERS DE SAÍDA / SALDO (ainda não integrados)
  // ----------------------------------------------------------
  document.getElementById("form-entrada").addEventListener("submit", (e) => {
    e.preventDefault();
    alert("📦 Registro de entrada será implementado após integração de produtos.");
  });

  document.getElementById("form-saida").addEventListener("submit", (e) => {
    e.preventDefault();
    alert("🚚 Registro de saída será integrado em breve.");
  });
});

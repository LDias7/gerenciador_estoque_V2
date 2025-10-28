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
    const digestResponse = await fetch(`${SHAREPOINT_SITE}/_api/contextinfo`, {
      method: "POST",
      headers: { "Accept": "application/json;odata=verbose" },
      credentials: "include",
    });

    if (!digestResponse.ok) throw new Error("Falha ao gerar token de segurança.");

    const digestData = await digestResponse.json();
    const digestValue = digestData.d.GetContextWebInformation.FormDigestValue;

    const response = await fetch(
      `${SHAREPOINT_SITE}/_api/web/lists/getbytitle('${LISTA_ENTRADA_API}')/items`,
      {
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
      }
    );

    if (!response.ok) {
      const erro = await response.text();
      throw new Error(erro);
    }

    alert("✅ Produto enviado com sucesso para o Power Automate!");
    document.getElementById("form-cadastro").reset();
    navegarPara("tela-cadastro", "tela-principal");

  } catch (error) {
    console.error("❌ Erro ao enviar produto:", error);
    alert("❌ Falha ao enviar o produto: " + error.message);
  }
}

// ===========================================================
// FUNÇÃO DE NAVEGAÇÃO ENTRE TELAS
// ===========================================================
function navegarPara(telaAtual, proximaTela) {
  document.querySelectorAll(".screen").forEach(tela => tela.classList.remove("active"));
  const proxima = document.getElementById(proximaTela);
  if (proxima) {
    proxima.classList.add("active");
  } else {
    console.warn(`⚠️ Tela "${proximaTela}" não encontrada.`);
  }
}

// ===========================================================
// UTILITÁRIAS
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
  // Garante que a tela principal fique visível no início
  document.querySelectorAll(".screen").forEach(t => t.classList.remove("active"));
  const principal = document.getElementById("tela-principal");
  if (principal) principal.classList.add("active");

  // ----------------------------------------------------------
  // NAVEGAÇÃO ENTRE TELAS
  // ----------------------------------------------------------
  const mapa = {
    "btn-cadastro": "tela-cadastro",
    "btn-entrada": "tela-entrada",
    "btn-saida": "tela-saida",
    "btn-saldo": "tela-saldo",
    "btn-voltar-cadastro": "tela-principal",
    "btn-voltar-entrada": "tela-principal",
    "btn-voltar-saida": "tela-principal",
    "btn-voltar-saldo": "tela-principal",
    "btn-voltar-historico": "tela-saida",
    "btn-historico-saida": "tela-historico-saida",
  };

  Object.entries(mapa).forEach(([botao, destino]) => {
    const el = document.getElementById(botao);
    if (el) el.addEventListener("click", () => navegarPara(null, destino));
  });

  // ----------------------------------------------------------
  // CADASTRO DE PRODUTO
  // ----------------------------------------------------------
  const formCadastro = document.getElementById("form-cadastro");
  if (formCadastro) {
    formCadastro.addEventListener("submit", async e => {
      e.preventDefault();

      const dados = {
        codigoFabrica: document.getElementById("codigoFabrica").value.trim().toUpperCase(),
        codigoFornecedor: document.getElementById("codigoFornecedor").value.trim().toUpperCase(),
        descricaoProduto: document.getElementById("descricaoProduto").value.trim(),
        nomeFornecedor: document.getElementById("nomeFornecedor").value.trim(),
        unidadeMedida: document.getElementById("unidadeMedida").value.trim(),
      };

      if (
        !dados.codigoFabrica ||
        !dados.codigoFornecedor ||
        !dados.descricaoProduto ||
        !dados.nomeFornecedor ||
        !dados.unidadeMedida
      ) {
        alert("⚠️ Preencha todos os campos antes de salvar!");
        return;
      }

      await salvarNaEntradaAPI(dados);
    });
  }

  // ----------------------------------------------------------
  // ENTRADA
  // ----------------------------------------------------------
  const formEntrada = document.getElementById("form-entrada");
  if (formEntrada)
    formEntrada.addEventListener("submit", e => {
      e.preventDefault();
      alert("📦 Registro de entrada será ativado após integração de estoque.");
    });

  const entradaQuantidade = document.getElementById("entradaQuantidade");
  const entradaValorUnitario = document.getElementById("entradaValorUnitario");
  if (entradaQuantidade) entradaQuantidade.addEventListener("input", calcularValorTotal);
  if (entradaValorUnitario) entradaValorUnitario.addEventListener("input", calcularValorTotal);

  // ----------------------------------------------------------
  // SAÍDA
  // ----------------------------------------------------------
  const formSaida = document.getElementById("form-saida");
  if (formSaida)
    formSaida.addEventListener("submit", e => {
      e.preventDefault();
      alert("🚚 Registro de saída será ativado após integração completa.");
    });

  // ----------------------------------------------------------
  // SALDO
  // ----------------------------------------------------------
  const saldoCodigo = document.getElementById("saldoCodigoFabrica");
  const saldoDescricao = document.getElementById("saldoDescricao");
  if (saldoCodigo)
    saldoCodigo.addEventListener("input", () => {
      document.getElementById("saldoDisplayDescricao").textContent = "Consulta em andamento...";
    });
  if (saldoDescricao)
    saldoDescricao.addEventListener("input", () => {
      document.getElementById("saldoDisplayDescricao").textContent = "Consulta em andamento...";
    });

  console.log("✅ Sistema de estoque inicializado.");
});

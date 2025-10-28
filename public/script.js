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
    console.log("📦 Enviando produto:", dados);

    const digestResponse = await fetch(`${SHAREPOINT_SITE}/_api/contextinfo`, {
      method: "POST",
      headers: { "Accept": "application/json;odata=verbose" },
      credentials: "include",
    });

    if (!digestResponse.ok) throw new Error("Falha ao gerar token SharePoint.");
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
  } catch (err) {
    console.error("❌ Erro ao enviar produto:", err);
    alert("❌ Falha ao enviar o produto: " + err.message);
  }
}

// ===========================================================
// FUNÇÃO DE NAVEGAÇÃO ENTRE TELAS
// ===========================================================
function navegarPara(atual, proxima) {
  document.querySelectorAll(".screen").forEach(tela => tela.classList.remove("active"));
  const destino = document.getElementById(proxima);
  if (destino) destino.classList.add("active");
  else console.warn("⚠️ Tela não encontrada:", proxima);
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
// EVENTOS PRINCIPAIS
// ===========================================================
document.addEventListener("DOMContentLoaded", () => {
  // ----------------------------------------------------------
  // NAVEGAÇÃO ENTRE TELAS
  // ----------------------------------------------------------
  const botoes = [
    ["btn-cadastro", "tela-cadastro"],
    ["btn-entrada", "tela-entrada"],
    ["btn-saida", "tela-saida"],
    ["btn-saldo", "tela-saldo"],
  ];
  botoes.forEach(([id, tela]) => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener("click", () => navegarPara("tela-principal", tela));
  });

  const botoesVoltar = [
    ["btn-voltar-cadastro", "tela-principal"],
    ["btn-voltar-entrada", "tela-principal"],
    ["btn-voltar-saida", "tela-principal"],
    ["btn-voltar-saldo", "tela-principal"],
    ["btn-voltar-historico", "tela-saida"],
  ];
  botoesVoltar.forEach(([id, tela]) => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener("click", () => navegarPara(id, tela));
  });

  const btnHistorico = document.getElementById("btn-historico-saida");
  if (btnHistorico)
    btnHistorico.addEventListener("click", () =>
      navegarPara("tela-saida", "tela-historico-saida")
    );

  // ----------------------------------------------------------
  // FORMULÁRIO DE CADASTRO
  // ----------------------------------------------------------
  const formCadastro = document.getElementById("form-cadastro");
  if (formCadastro)
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

  // ----------------------------------------------------------
  // ENTRADA
  // ----------------------------------------------------------
  const formEntrada = document.getElementById("form-entrada");
  if (formEntrada)
    formEntrada.addEventListener("submit", e => {
      e.preventDefault();
      alert("📦 Função de entrada será ativada após integração com Power Automate.");
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
      alert("🚚 Função de saída será ativada após integração de estoque.");
    });

  // ----------------------------------------------------------
  // SALDO
  // ----------------------------------------------------------
  const saldoCod = document.getElementById("saldoCodigoFabrica");
  const saldoDesc = document.getElementById("saldoDescricao");
  if (saldoCod)
    saldoCod.addEventListener("input", () => {
      document.getElementById("saldoDisplayDescricao").textContent = "Consulta de saldo...";
    });
  if (saldoDesc)
    saldoDesc.addEventListener("input", () => {
      document.getElementById("saldoDisplayDescricao").textContent = "Consulta de saldo...";
    });

  console.log("✅ Sistema de Estoque inicializado com sucesso.");
});

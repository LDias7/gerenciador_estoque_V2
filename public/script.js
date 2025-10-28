// =====================================================================
// CONFIGURAÇÃO DO MICROSOFT FORMS E SHAREPOINT (SEM PREMIUM)
// =====================================================================

// URL pública do seu Microsoft Forms
const FORM_URL =
  "https://forms.microsoft.com/Pages/ResponsePage.aspx?id=V2vtxCDuGECFbJBsQgFoSMHt4qeT3V1Djd4VrtFsitxURTRUMlpWNDQ2VTJJWUM0T05BTkVGRUdDRy4u";

// =====================================================================
// FUNÇÕES PRINCIPAIS
// =====================================================================

function navegarPara(telaAtualId, proximaTelaId) {
  document.querySelectorAll(".screen").forEach((tela) => tela.classList.remove("active"));
  const proximaTela = document.getElementById(proximaTelaId);
  if (proximaTela) proximaTela.classList.add("active");
}

// =====================================================================
// FUNÇÃO DE ENVIO PARA O MICROSOFT FORMS
// =====================================================================

async function enviarParaForms(dados) {
  try {
    // O Forms aceita dados via query string (modo GET simulado)
    const formData = new URLSearchParams();
    formData.append("entry.1", dados.codigoFabrica);
    formData.append("entry.2", dados.codigoFornecedor);
    formData.append("entry.3", dados.descricaoProduto);
    formData.append("entry.4", dados.nomeFornecedor);
    formData.append("entry.5", dados.unidadeMedida);

    // O envio é feito com modo no-cors (para evitar bloqueios)
    await fetch(FORM_URL, {
      method: "POST",
      body: formData,
      mode: "no-cors",
    });

    alert("✅ Produto enviado com sucesso!");
    document.getElementById("form-cadastro").reset();
    navegarPara("tela-cadastro", "tela-principal");
  } catch (err) {
    alert("❌ Falha ao enviar o produto: " + err.message);
  }
}

// =====================================================================
// EVENTOS DE INTERFACE
// =====================================================================

document.addEventListener("DOMContentLoaded", () => {
  // BOTÕES DE NAVEGAÇÃO
  document.getElementById("btn-cadastro").addEventListener("click", () => {
    navegarPara("tela-principal", "tela-cadastro");
  });
  document.getElementById("btn-entrada").addEventListener("click", () => {
    navegarPara("tela-principal", "tela-entrada");
  });
  document.getElementById("btn-saida").addEventListener("click", () => {
    navegarPara("tela-principal", "tela-saida");
  });
  document.getElementById("btn-saldo").addEventListener("click", () => {
    navegarPara("tela-principal", "tela-saldo");
  });

  document.getElementById("btn-voltar-cadastro").addEventListener("click", () => {
    navegarPara("tela-cadastro", "tela-principal");
  });
  document.getElementById("btn-voltar-entrada").addEventListener("click", () => {
    navegarPara("tela-entrada", "tela-principal");
  });
  document.getElementById("btn-voltar-saida").addEventListener("click", () => {
    navegarPara("tela-saida", "tela-principal");
  });
  document.getElementById("btn-voltar-saldo").addEventListener("click", () => {
    navegarPara("tela-saldo", "tela-principal");
  });

  // =====================================================================
  // FORMULÁRIO DE CADASTRO
  // =====================================================================
  document.getElementById("form-cadastro").addEventListener("submit", async (e) => {
    e.preventDefault();

    const dados = {
      codigoFabrica: document.getElementById("codigoFabrica").value.trim(),
      codigoFornecedor: document.getElementById("codigoFornecedor").value.trim(),
      descricaoProduto: document.getElementById("descricaoProduto").value.trim(),
      nomeFornecedor: document.getElementById("nomeFornecedor").value.trim(),
      unidadeMedida: document.getElementById("unidadeMedida").value.trim(),
    };

    // Validação básica
    if (!dados.codigoFabrica || !dados.codigoFornecedor || !dados.descricaoProduto) {
      alert("⚠️ Preencha todos os campos obrigatórios!");
      return;
    }

    // Envia para o Microsoft Forms
    await enviarParaForms(dados);
  });
});

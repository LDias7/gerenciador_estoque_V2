export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const formUrl = "https://forms.microsoft.com/r/cYKFvRQbRV";

  try {
    // Recebe os dados do corpo da requisição
    const dados = req.body;

    // Monta o corpo que será enviado ao Forms
    const formData = new URLSearchParams();
    formData.append("Código de Fábrica", dados.codigoFabrica);
    formData.append("Código do Fornecedor", dados.codigoFornecedor);
    formData.append("Descrição do Produto", dados.descricaoProduto);
    formData.append("Nome do Fornecedor", dados.nomeFornecedor);
    formData.append("Unidade de Medida", dados.unidadeMedida);

    // Faz o POST direto do servidor (sem CORS)
    const response = await fetch(formUrl, {
      method: "POST",
      body: formData,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Erro ao enviar para o Forms:", error);
    return res.status(500).json({ error: "Falha ao enviar para o Forms" });
  }
}

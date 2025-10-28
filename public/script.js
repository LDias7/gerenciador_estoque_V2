async function salvarNaEntradaAPI(dados) {
  try {
    const siteUrl = `${SHAREPOINT_SITE}`;
    const listUrl = `${siteUrl}/_api/web/lists/getbytitle('${LISTA_ENTRADA_API}')/items`;

    // 🔹 Gera um token __REQUESTDIGEST automaticamente
    const digestResponse = await fetch(`${siteUrl}/_api/contextinfo`, {
      method: "POST",
      headers: {
        "Accept": "application/json;odata=verbose"
      },
      credentials: "include" // importante para manter o login ativo
    });

    const digestData = await digestResponse.json();
    const digestValue = digestData.d.GetContextWebInformation.FormDigestValue;

    // 🔹 Envia o item
    const response = await fetch(listUrl, {
      method: "POST",
      headers: {
        "Accept": "application/json;odata=verbose",
        "Content-Type": "application/json;odata=verbose",
        "X-RequestDigest": digestValue
      },
      credentials: "include",
      body: JSON.stringify({
        "__metadata": { "type": "SP.Data.EntradaAPIListItem" },
        "Title": dados.codigoFabrica,
        "CodigoFornecedor": dados.codigoFornecedor,
        "DescricaoProduto": dados.descricaoProduto,
        "NomeFornecedor": dados.nomeFornecedor,
        "UnidadeMedida": dados.unidadeMedida
      })
    });

    if (!response.ok) {
      const erro = await response.text();
      throw new Error(erro);
    }

    alert("✅ Produto enviado com sucesso para o Power Automate!");
    document.getElementById("form-cadastro").reset();

  } catch (error) {
    console.error("Erro ao enviar para EntradaAPI:", error);
    alert("❌ Falha ao enviar o produto: " + error.message);
  }
}

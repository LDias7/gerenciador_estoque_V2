// =========================================================================
// CONFIGURAÇÃO DA API E SHAREPOINT (FINAL)
// =========================================================================

const SHAREPOINT_SITE_ROOT = 'https://borexpress.sharepoint.com/sites/EstoqueJC';
const API_BASE_URL_START = "/_api/web/lists/GetByTitle";
const API_BASE_URL = `${SHAREPOINT_SITE_ROOT}${API_BASE_URL_START}`;


/**
 * Obtém o token de segurança do SharePoint (Request Digest)
 * Retorna o token ou lança um erro que será capturado na rotina de escrita.
 */
function getSharePointDigest() {
    try {
        let digest;
        
        // 1. Tenta obter o token da própria página (IFrame)
        digest = document.getElementById('__REQUESTDIGEST')?.value;
        if (digest) return digest;

        // 2. Tenta acessar o documento pai (SharePoint), se permitido
        if (window.parent && window.parent.document) {
            digest = window.parent.document.getElementById('__REQUESTDIGEST')?.value;
            if (digest) return digest;
        }

        // Se falhar na leitura, lança um erro específico (para ser pego no catch do formulário)
        throw new Error("Token de segurança do SharePoint (__REQUESTDIGEST) ausente.");
    } catch (err) {
        // Lança um erro claro para o usuário saber que é um problema de segurança
        throw new Error("Falha de segurança: Token (__REQUESTDIGEST) ausente.");
    }
}

/**
 * Gera headers para chamadas REST do SharePoint.
 */
function getSharePointHeaders(method) {
    const headers = {
        "Accept": "application/json;odata=verbose",
        "Content-Type": "application/json;odata=verbose",
    };

    if (method !== 'GET') {
        headers["X-RequestDigest"] = getSharePointDigest();
    }
    return headers;
}

/**
 * Função utilitária para chamar a API REST do SharePoint.
 */
async function sharepointFetch(listTitle, endpoint, method = 'GET', data = null) {
    const url = `${API_BASE_URL}('${listTitle}')${endpoint}`;
    
    // OBTEM OS HEADERS (que irá verificar o token para POST)
    const headers = getSharePointHeaders(method);

    const config = {
        method: method,
        headers: headers,
        body: data ? JSON.stringify(data) : null,
        credentials: "include"
    };

    const response = await fetch(url, config);

    if (response.status === 404) return null;
    if (!response.ok) {
        const errorText = await response.text();
        console.error("Erro na resposta do SharePoint:", errorText);
        throw new Error(`SharePoint API Error: ${response.status} - ${response.statusText}. Verifique Colunas/Permissões.`);
    }

    const json = await response.json();
    return json.d;
}

// =========================================================================
// ROTINAS DE NEGÓCIO (Aqui usamos os Nomes Estáticos Corretos)
// =========================================================================

async function buscarProdutoAPI(params) {
    let filter = '';
    
    if (params.codigoFornecedor) {
        filter = `?$filter=CodigoFornecedor eq '${params.codigoFornecedor}'`;
    } else if (params.codigoFabrica) {
        filter = `?$filter=Title eq '${params.codigoFabrica}'`; 
    } else if (params.descricao) {
        filter = `?$filter=substringof('${params.descricao}', DescricaoProduto)`;
    } else {
        return null;
    }

    try {
        const data = await sharepointFetch('Produtos', `/items${filter}&$top=1`, 'GET');
        
        if (data && data.results && data.results.length > 0) {
            const spItem = data.results[0];
            return {
                // USANDO OS NOMES ESTÁTICOS CORRETOS
                codigoFabrica: spItem.Title,
                codigoFornecedor: spItem.CodigoFornecedor,
                descricaoProduto: spItem.DescricaoProduto,
                nomeFornecedor: spItem.NomeFornecedor,
                unidadeMedida: spItem.UnidadeMedida,
                __metadata: spItem.__metadata
            };
        }
        return null;
    } catch (error) {
        console.error('Erro ao buscar produto no SharePoint:', error);
        return null;
    }
}

async function obterSaldoAPI(codigoFabrica) {
    try {
        // As listas Entradas e Saídas usam Title para o Cód. Fábrica
        const filter = `?$filter=Title eq '${codigoFabrica}'`;
        const entradasData = await sharepointFetch('Entradas', `/items${filter}`, 'GET');
        const totalEntradas = entradasData.results.reduce((sum, item) => sum + (item.Quantidade || 0), 0);

        const saidasData = await sharepointFetch('Saidas', `/items${filter}`, 'GET');
        const totalSaidas = saidasData.results.reduce((sum, item) => sum + (item.Quantidade || 0), 0);

        return totalEntradas - totalSaidas;
    } catch (error) {
        console.error('Erro ao calcular saldo no SharePoint:', error);
        return 0; 
    }
}

async function carregarHistoricoSaidas() {
    const tbody = document.getElementById('historico-saidas-body');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Carregando histórico...</td></tr>';

    try {
        // Note: Title é o Cód. Fábrica, e Created é a data
        const historico = await sharepointFetch('Saidas', `/items?$select=Title,DescricaoProduto,Quantidade,PlacaCaminhao,Destinatario,Created`, 'GET');
        tbody.innerHTML = ''; 

        if (historico.results.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Nenhum registro de saída encontrado.</td></tr>';
            return;
        }

        historico.results.forEach(registro => {
            const tr = document.createElement('tr');
            const dataFormatada = new Date(registro.Created).toLocaleDateString('pt-BR'); 
            
            tr.innerHTML = `
                <td>${dataFormatada}</td>
                <td>${registro.Title}</td>
                <td>${registro.DescricaoProduto}</td>
                <td>${registro.Quantidade}</td>
                <td>${registro.PlacaCaminhao}</td>
                <td>${registro.Destinatario}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">Erro ao carregar dados do SharePoint.</td></tr>';
    }
}


function calcularValorTotal() {
    const quantidade = parseFloat(document.getElementById('entradaQuantidade').value) || 0;
    const valorUnitario = parseFloat(document.getElementById('entradaValorUnitario').value) || 0;
    const valorTotalElement = document.getElementById('entradaValorTotal');
    const btnSalvar = document.getElementById('btn-salvar-entrada');

    let valorTotal = quantidade * valorUnitario;
    valorTotalElement.value = valorTotal.toFixed(2);
    
    if (quantidade > 0 && valorUnitario >= 0) {
        btnSalvar.disabled = false;
    } else {
        btnSalvar.disabled = true;
    }
}

function limparResultadoSaldo() {
    document.getElementById('saldoDisplayDescricao').textContent = 'Nenhum produto selecionado';
    document.getElementById('saldoDisplayCodFabrica').textContent = 'N/A';
    document.getElementById('saldoDisplayQuantidade').textContent = '0';
    document.getElementById('saldoDisplayUnidade').textContent = '';
    document.getElementById('saldoDisplayQuantidade').classList.remove('baixo');
}

function exibirSaldo(produto, saldo) {
    const saldoElement = document.getElementById('saldoDisplayQuantidade');
    
    document.getElementById('saldoDisplayDescricao').textContent = produto.descricaoProduto;
    document.getElementById('saldoDisplayCodFabrica').textContent = produto.codigoFabrica;
    saldoElement.textContent = saldo;
    document.getElementById('saldoDisplayUnidade').textContent = produto.unidadeMedida;

    if (saldo <= 5) {
        saldoElement.classList.add('baixo');
    } else {
        saldoElement.classList.remove('baixo');
    }
}

async function processarFiltroSaldo(campoAlterado) {
    const inputFabrica = document.getElementById('saldoCodigoFabrica');
    const inputDescricao = document.getElementById('saldoDescricao');
    
    let produto = null;
    const codFabricaValue = inputFabrica.value.trim().toUpperCase();
    const descricaoValue = inputDescricao.value.trim();

    if (campoAlterado === 'fabrica' && codFabricaValue) {
        produto = await buscarProdutoAPI({ codigoFabrica: codFabricaValue });
        if (produto) {
            inputDescricao.value = produto.descricaoProduto; 
        } else {
            inputDescricao.value = '';
            limparResultadoSaldo();
            return;
        }

    } else if (campoAlterado === 'descricao' && descricaoValue) {
        produto = await buscarProdutoAPI({ descricao: descricaoValue }); 
        if (produto) {
            inputFabrica.value = produto.codigoFabrica;
        } else {
            inputFabrica.value = '';
            limparResultadoSaldo();
            return;
        }
    } else {
        limparResultadoSaldo();
        return;
    }

    if (produto) {
        const saldo = await obterSaldoAPI(produto.codigoFabrica);
        exibirSaldo(produto, saldo);
    } else {
        limparResultadoSaldo();
    }
}


// =========================================================================
// EVENT LISTENERS (Ao carregar a página)
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
    
    // ---------------------------------------------------------------------
    // 1. NAVEGAÇÃO
    // ---------------------------------------------------------------------
    document.getElementById('btn-cadastro').addEventListener('click', () => { navegarPara('tela-principal', 'tela-cadastro'); });
    document.getElementById('btn-entrada').addEventListener('click', () => { 
        navegarPara('tela-principal', 'tela-entrada');
        document.getElementById('form-entrada').reset();
        document.getElementById('entrada-dados-produto').style.display = 'none';
        document.getElementById('entrada-new-fields').style.display = 'none';
        document.getElementById('btn-salvar-entrada').disabled = true;
        document.getElementById('entradaQuantidade').value = '';
        document.getElementById('entradaValorUnitario').value = '';
        document.getElementById('entradaValorTotal').value = '0.00';
    });
    document.getElementById('btn-saida').addEventListener('click', () => { 
        navegarPara('tela-principal', 'tela-saida'); 
        document.getElementById('form-saida').reset();
        document.getElementById('saida-dados-produto').style.display = 'none';
        document.getElementById('saida-new-fields').style.display = 'none';
        document.getElementById('btn-salvar-saida').disabled = true;
    });
    document.getElementById('btn-saldo').addEventListener('click', () => { navegarPara('tela-principal', 'tela-saldo'); });

    document.getElementById('btn-voltar-cadastro').addEventListener('click', () => { navegarPara('tela-cadastro', 'tela-principal'); });
    document.getElementById('btn-voltar-entrada').addEventListener('click', () => { navegarPara('tela-entrada', 'tela-principal'); });
    document.getElementById('btn-voltar-saida').addEventListener('click', () => { navegarPara('tela-saida', 'tela-principal'); });
    document.getElementById('btn-voltar-saldo').addEventListener('click', () => { navegarPara('tela-saldo', 'tela-principal'); });

    document.getElementById('btn-historico-saida').addEventListener('click', () => { navegarPara('tela-saida', 'tela-historico-saida'); });
    document.getElementById('btn-voltar-historico').addEventListener('click', () => { navegarPara('tela-historico-saida', 'tela-saida'); });

    // ATENÇÃO: A lógica de busca automática de Entrada e Saída (keyup no ENTER) deve ser recolocada aqui
    document.getElementById('entradaCodigoFornecedor').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); 
            processarBuscaEntrada();
        }
    });

    document.getElementById('saidaCodigoFabrica').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); 
            carregarDadosSaida();
        }
    });


    // ---------------------------------------------------------------------
    // 2. TELA DE CADASTRO - SALVAMENTO (SHAREPOINT)
    // ---------------------------------------------------------------------
    document.getElementById('form-cadastro').addEventListener('submit', async (e) => {
        e.preventDefault(); 

        const novosDados = {
            '__metadata': { 'type': 'SP.Data.ProdutosListItem' }, 
            'Title': document.getElementById('codigoFabrica').value.trim().toUpperCase(), 
            'CodigoFornecedor': document.getElementById('codigoFornecedor').value.trim().toUpperCase(),
            'DescricaoProduto': document.getElementById('descricaoProduto').value.trim(),
            'NomeFornecedor': document.getElementById('nomeFornecedor').value.trim(),
            'UnidadeMedida': document.getElementById('unidadeMedida').value.trim(),
        };

        try {
            const produtoExistente = await buscarProdutoAPI({ codigoFabrica: novosDados.Title });

            if (produtoExistente) {
                alert(`ERRO: O Código de Fábrica "${novosDados.Title}" já existe no SharePoint.`);
                return;
            }

            await sharepointFetch('Produtos', '/items', 'POST', novosDados);

            alert(`Produto ${novosDados.DescricaoProduto} cadastrado com sucesso no SharePoint!`);
            document.getElementById('form-cadastro').reset(); 
            navegarPara('tela-cadastro', 'tela-principal'); 

        } catch (error) {
            console.error('Erro ao cadastrar no SharePoint:', error);
            alert(`Erro ao cadastrar: ${error.message}.`);
        }
    });


    // ---------------------------------------------------------------------
    // 3. TELA DE ENTRADA - SALVAMENTO (SHAREPOINT)
    // ---------------------------------------------------------------------
    document.getElementById('form-entrada').addEventListener('submit', async (e) => {
        e.preventDefault();

        const codigoFabrica = document.getElementById('displayCodFabrica').textContent;
        
        const dadosEntrada = {
            '__metadata': { 'type': 'SP.Data.EntradasListItem' },
            'Title': codigoFabrica,
            'CodigoFabrica': codigoFabrica,
            'Quantidade': parseFloat(document.getElementById('entradaQuantidade').value),
            'ValorUnitario': parseFloat(document.getElementById('entradaValorUnitario').value),
            'ValorTotal': parseFloat(document.getElementById('entradaValorTotal').value),
            'NotaFiscal': document.getElementById('entradaNotaFiscal').value,
        };

        try {
            await sharepointFetch('Entradas', '/items', 'POST', dadosEntrada);

            alert(`Entrada de ${dadosEntrada.Quantidade} unidades registrada com sucesso no SharePoint!`);
            
            document.getElementById('form-entrada').reset();
            navegarPara('tela-entrada', 'tela-principal');

        } catch (error) {
            console.error('Erro ao registrar entrada no SharePoint:', error);
            alert(`Erro ao registrar entrada: ${error.message}.`);
        }
    });

    
    // ---------------------------------------------------------------------
    // 4. TELA DE SAÍDA - SALVAMENTO (SHAREPOINT)
    // ---------------------------------------------------------------------
    document.getElementById('form-saida').addEventListener('submit', async (e) => {
        e.preventDefault();

        const inputSaidaCodFabrica = document.getElementById('saidaCodigoFabrica');
        const codigoFabrica = inputSaidaCodFabrica.value.trim().toUpperCase();
        const quantidadeSaida = parseInt(document.getElementById('saidaQuantidade').value);
        const descricaoProduto = document.getElementById('saidaDisplayDescricao').textContent;
        
        const saldoAtual = parseInt(document.getElementById('saidaDisplayEstoque').textContent);

        if (quantidadeSaida > saldoAtual) {
            alert(`ERRO: A quantidade de saída (${quantidadeSaida}) é maior que o saldo atual (${saldoAtual}).`);
            return; 
        }

        const dadosSaida = {
            '__metadata': { 'type': 'SP.Data.SaidasListItem' },
            'Title': codigoFabrica,
            'CodigoFabrica': codigoFabrica,
            'DescricaoProduto': descricaoProduto,
            'Quantidade': quantidadeSaida,
            'PlacaCaminhao': document.getElementById('saidaPlacaCaminhao').value.trim().toUpperCase(),
            'Destinatario': document.getElementById('saidaDestinatario').value.trim(),
        };

        try {
            await sharepointFetch('Saidas', '/items', 'POST', dadosSaida);

            alert(`Saída de ${dadosSaida.Quantidade} de ${codigoFabrica} registrada com sucesso no SharePoint!`);
            
            document.getElementById('form-saida').reset();
            navegarPara('tela-saida', 'tela-principal');
            
        } catch (error) {
            console.error('Erro ao registrar saída no SharePoint:', error);
            alert(`Erro ao registrar saída: ${error.message}.`);
        }
    });

    
    // ---------------------------------------------------------------------
    // 5. TELA DE SALDO - LÓGICA (API)
    // ---------------------------------------------------------------------
    document.getElementById('saldoCodigoFabrica').addEventListener('input', () => {
        processarFiltroSaldo('fabrica');
    });

    document.getElementById('saldoDescricao').addEventListener('input', () => {
        processarFiltroSaldo('descricao');
    });
});

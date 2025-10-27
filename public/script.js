// =========================================================================
// CONFIGURAÇÃO DA API E SHAREPOINT (FINAL - CORREÇÃO DE SEGURANÇA)
// =========================================================================

const SHAREPOINT_SITE_ROOT = 'https://borexpress.sharepoint.com/sites/EstoqueJC';
const API_BASE_URL_START = "/_api/web/lists/GetByTitle";
const API_BASE_URL = `${SHAREPOINT_SITE_ROOT}${API_BASE_URL_START}`;


// =========================================================================
// FUNÇÕES DE SEGURANÇA E API (AGORA FOCADAS APENAS NO IFrame)
// =========================================================================

/**
 * Obtém o token de segurança do SharePoint (Request Digest)
 * Tenta ler APENAS o elemento do IFrame, eliminando o erro de bloqueio cross-origin.
 */
function getSharePointDigest() {
    try {
        // Tenta ler o token APENAS no IFrame (única tentativa)
        const digest = document.getElementById('__REQUESTDIGEST')?.value;
        
        if (!digest) {
            // Se falhar na leitura, lança um erro para o usuário.
            throw new Error("Token de segurança do SharePoint (__REQUESTDIGEST) ausente.");
        }
        return digest;
    } catch (err) {
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
    const headers = getSharePointHeaders(method);

    // Verifica se o token está ausente em operações de escrita (POST)
    if (method !== 'GET' && !headers["X-RequestDigest"]) {
        throw new Error("Token de segurança do SharePoint (__REQUESTDIGEST) ausente. A operação de escrita não pode ser concluída.");
    }

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
// ROTINAS DE NEGÓCIO E UTILIDADE
// =========================================================================

function navegarPara(telaAtualId, proximaTelaId) {
    document.querySelectorAll('.screen').forEach(tela => tela.classList.remove('active'));
    const proximaTela = document.getElementById(proximaTelaId);
    if (proximaTela) {
        proximaTela.classList.add('active');
    }
}

// Rotinas de Consulta à API (Adaptadas para usar 'sharepointFetch' e os nomes estáticos)
async function buscarProdutoAPI(params) {
    let filter = '';
    if (params.codigoFornecedor) {
        filter = `?$filter=CodigoFornecedor eq '${params.codigoFornecedor}'`;
    } else if (params.codigoFabrica) {
        filter = `?$filter=Title eq '${params.codigoFabrica}'`; 
    } else if (params.descricao) {
        filter = `?$filter=substringof('${params.descricao}', DescricaoProduto)`;
    }
    try {
        const data = await sharepointFetch('Produtos', `/items${filter}&$top=1`, 'GET');
        if (data && data.results && data.results.length > 0) {
            const spItem = data.results[0];
            return {
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

// Funções de Utilitário e Tela
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

async function processarBuscaEntrada() {
    const inputEntradaCodFornecedor = document.getElementById('entradaCodigoFornecedor');
    const displayDados = document.getElementById('entrada-dados-produto');
    const newFields = document.getElementById('entrada-new-fields');
    const btnSalvar = document.getElementById('btn-salvar-entrada');

    const codigoBuscado = inputEntradaCodFornecedor.value.trim().toUpperCase();
    
    if (!codigoBuscado) return;

    const produto = await buscarProdutoAPI({ codigoFornecedor: codigoBuscado });
    
    if (produto) {
        document.getElementById('displayDescricao').textContent = produto.descricaoProduto;
        document.getElementById('displayCodFabrica').textContent = produto.codigoFabrica;
        document.getElementById('displayFornecedor').textContent = produto.nomeFornecedor;
        document.getElementById('displayUnidade').textContent = produto.unidadeMedida;
        
        displayDados.style.display = 'block';
        newFields.style.display = 'block';
        document.getElementById('entradaQuantidade').focus();
    } else {
        alert(`Produto com Código do Fornecedor "${codigoBuscado}" não encontrado no cadastro.`);
        displayDados.style.display = 'none';
        newFields.style.display = 'none';
        btnSalvar.disabled = true;
    }
}

async function carregarDadosSaida() {
    const inputSaidaCodFabrica = document.getElementById('saidaCodigoFabrica');
    const displayDados = document.getElementById('saida-dados-produto');
    const newFields = document.getElementById('saida-new-fields');
    const btnSalvar = document.getElementById('btn-salvar-saida');

    const codigoBuscado = inputSaidaCodFabrica.value.trim().toUpperCase();
    
    if (!codigoBuscado) return;

    const produto = await buscarProdutoAPI({ codigoFabrica: codigoBuscado });

    if (produto) {
        const saldoAtual = await obterSaldoAPI(produto.codigoFabrica); 

        document.getElementById('saidaDisplayDescricao').textContent = produto.descricaoProduto;
        document.getElementById('saidaDisplayCodFornecedor').textContent = produto.codigoFornecedor;
        document.getElementById('saidaDisplayEstoque').textContent = saldoAtual;
        document.getElementById('saidaDisplayData').textContent = new Date().toLocaleDateString('pt-BR');
        
        const estoqueElement = document.getElementById('saidaDisplayEstoque');
        if (saldoAtual <= 5) {
            estoqueElement.classList.add('baixo');
        } else {
            estoqueElement.classList.remove('baixo');
        }

        displayDados.style.display = 'block';
        newFields.style.display = 'block';
        btnSalvar.disabled = false; 

    } else {
        alert(`Produto com Código de Fábrica "${codigoBuscado}" não encontrado no cadastro.`);
        displayDados.style.display = 'none';
        newFields.style.display = 'none';
        btnSalvar.disabled = true;
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

    // ATENÇÃO: A lógica de busca automática de Entrada e Saída (keyup no ENTER)
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

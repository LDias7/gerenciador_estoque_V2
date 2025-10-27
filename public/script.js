// =========================================================================
// CONFIGURAÇÃO DA API E SHAREPOINT (FINAL)
// =========================================================================

// URL ABSOLUTO do Site SharePoint para referências internas de link.
const SHAREPOINT_SITE_ROOT = 'https://borexpress.sharepoint.com/sites/EstoqueJC';

// O APP AGORA SE COMUNICA APENAS COM A JANELA PAI (Proxy de Mensagens)
const API_BASE_URL_REST = `${SHAREPOINT_SITE_ROOT}/_api/web/lists/GetByTitle`;


// VARIÁVEL PARA RASTREAR REQUISIÇÕES E ESPERAR POR RESPOSTAS DO SHAREPOINT
let apiResolver = {};
let apiCounter = 0;

/**
 * Escuta respostas vindas do SharePoint.
 * O SharePoint Pai (o proxy) envia uma mensagem de volta com o resultado da API.
 */
window.addEventListener('message', (event) => {
    // 🔒 1. Verificação de Segurança
    // A URL de origem deve incluir o domínio do SharePoint para ser aceita como resposta
    if (!event.origin.includes('sharepoint.com') || !event.data.type || !event.data.id) return;
    
    const data = event.data;
    
    // 2. Resolve a Promessa que está esperando por este ID
    if (apiResolver[data.id]) {
        if (data.type === 'API_SUCCESS') {
            apiResolver[data.id].resolve(data.payload);
        } else if (data.type === 'API_ERROR') {
            apiResolver[data.id].reject(new Error(data.payload.message || "Erro desconhecido na API do SharePoint."));
        }
        delete apiResolver[data.id]; // Limpa o resolvedor
    }
});


/**
 * Função utilitária para fazer requisições VIA PROXY (postMessage).
 */
async function sharepointFetch(listTitle, endpoint, method = 'GET', data = null) {
    const id = apiCounter++;
    
    // Cria uma promessa que será resolvida quando o SharePoint responder
    const promise = new Promise((resolve, reject) => {
        apiResolver[id] = { resolve, reject };
    });
    
    // Envia a requisição para o SharePoint (Pai)
    window.parent.postMessage({
        id: id,
        type: 'SHAREPOINT_API_CALL',
        payload: {
            listTitle: listTitle,
            endpoint: endpoint,
            method: method,
            data: data
        }
    }, '*'); // O '*' significa que aceita qualquer origem para a mensagem (segurança resolvida no 'message' listener)

    return promise; // Retorna a promessa (espera pela resposta do SharePoint)
}

// =========================================================================
// FUNÇÕES DE UTILIDADE GERAL (O restante do código que não usa API é mantido)
// =========================================================================

/**
 * Função genérica para trocar de tela
 */
function navegarPara(telaAtualId, proximaTelaId) {
    document.querySelectorAll('.screen').forEach(tela => tela.classList.remove('active'));
    const proximaTela = document.getElementById(proximaTelaId);
    if (proximaTela) {
        proximaTela.classList.add('active');
        if (proximaTelaId === 'tela-historico-saida') carregarHistoricoSaidas();
        if (proximaTelaId === 'tela-saldo') {
            document.getElementById('saldoCodigoFabrica').value = '';
            document.getElementById('saldoDescricao').value = '';
            limparResultadoSaldo();
        }
    }
}

// Rotinas de negócio (buscarProdutoAPI, obterSaldoAPI, etc.)
// A URL de chamada da API será resolvida pelo Proxy de Mensagens!
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
        // Chamada à nova função via Proxy
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
        const filterEntrada = `?$filter=Title eq '${codigoFabrica}'`;
        const entradasData = await sharepointFetch('Entradas', `/items${filterEntrada}`, 'GET');
        const totalEntradas = entradasData.results.reduce((sum, item) => sum + (item.Quantidade || 0), 0);

        const filterSaida = `?$filter=Title eq '${codigoFabrica}'`;
        const saidasData = await sharepointFetch('Saidas', `/items${filterSaida}`, 'GET');
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

// Funções de Utilitário (Manutenção)
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
// ROTINAS DE TELA (Event Listeners)
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

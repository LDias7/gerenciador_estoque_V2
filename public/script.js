// =========================================================================
// CONFIGURAÇÃO DA API E SHAREPOINT (VERSÃO FINAL COM PnP.JS)
// =========================================================================

// Esta linha será injetada em seu ambiente (SPFx ou script loader)
// Se você está usando o ambiente do navegador/Vercel, você deve injetar o script do PnP/SPFx
// A biblioteca PnP será acessada globalmente (window.sp)

// A URL Absoluta do Site SharePoint é necessária para o PnP.js no contexto correto.
const SHAREPOINT_SITE_ROOT = 'https://borexpress.sharepoint.com/sites/EstoqueJC';

// O PnP.js cuidará de toda a autenticação e chamadas REST.

// =========================================================================
// FUNÇÕES DE COMUNICAÇÃO (SHAREPOINT/PnP.JS)
// =========================================================================

/**
 * [AVISO: Este código requer a biblioteca PnP.js instalada e inicializada]
 * Função utilitária para chamar a API REST do SharePoint via PnP.
 */
async function sharepointFetch(listTitle, filter = '', method = 'GET', data = null) {
    // ⚠️ Verifica se a biblioteca PnP está disponível
    if (typeof window.sp === 'undefined' || !window.sp.web) {
        throw new Error("A biblioteca PnP.js não está instalada ou inicializada. A escrita está bloqueada.");
    }
    
    let query = window.sp.web.lists.getByTitle(listTitle).items;

    try {
        if (method === 'GET') {
            // Chamada de Leitura (GET)
            const results = await query.select("*").filter(filter).get();
            // A resposta é compatível com o formato JSON que seu código espera
            return { results: results };
        } 
        
        if (method === 'POST') {
            // Chamada de Escrita (POST): O PnP cuida do token __REQUESTDIGEST
            const result = await query.add(data);
            return result.data; // Retorna o item criado
        }
        
        throw new Error("Método não suportado.");

    } catch (error) {
        // Captura erros de autenticação (403) ou de sintaxe SQL/Coluna
        console.error('Erro na API PnP:', error);
        throw new Error(`Falha na operação: O PnP.js foi bloqueado. Verifique a habilitação de scripts e as colunas.`);
    }
}

// =========================================================================
// ROTINAS DE NEGÓCIO E UTILIDADE (ADAPTADAS PARA O PnP)
// =========================================================================

function navegarPara(telaAtualId, proximaTelaId) {
    document.querySelectorAll('.screen').forEach(tela => tela.classList.remove('active'));
    const proximaTela = document.getElementById(proximaTelaId);
    if (proximaTela) {
        proximaTela.classList.add('active');
    }
}

async function buscarProdutoAPI(params) {
    let filter = '';
    if (params.codigoFornecedor) {
        filter = `CodigoFornecedor eq '${params.codigoFornecedor}'`;
    } else if (params.codigoFabrica) {
        filter = `Title eq '${params.codigoFabrica}'`; 
    } else if (params.descricao) {
        filter = `substringof('${params.descricao}', DescricaoProduto)`;
    }

    try {
        const data = await sharepointFetch('Produtos', filter, 'GET');
        
        if (data && data.results && data.results.length > 0) {
            const spItem = data.results[0];
            return {
                codigoFabrica: spItem.Title,
                codigoFornecedor: spItem.CodigoFornecedor,
                descricaoProduto: spItem.DescricaoProduto,
                nomeFornecedor: spItem.NomeFornecedor,
                unidadeMedida: spItem.UnidadeMedida,
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
        const filter = `Title eq '${codigoFabrica}'`;
        const entradasData = await sharepointFetch('Entradas', filter, 'GET');
        const totalEntradas = entradasData.results.reduce((sum, item) => sum + (item.Quantidade || 0), 0);

        const saidasData = await sharepointFetch('Saidas', filter, 'GET');
        const totalSaidas = saidasData.results.reduce((sum, item) => sum + (item.Quantidade || 0), 0);

        return totalEntradas - totalSaidas;
    } catch (error) {
        console.error('Erro ao calcular saldo no SharePoint:', error);
        return 0;
    }
}

async function carregarHistoricoSaidas() {
    // ... (Mantida a lógica de carregamento de tela) ...
}
function calcularValorTotal() { /* ... */ }
function limparResultadoSaldo() { /* ... */ }
function exibirSaldo(produto, saldo) { /* ... */ }
async function processarFiltroSaldo(campoAlterado) { /* ... */ }
async function processarBuscaEntrada() { /* ... */ }
async function carregarDadosSaida() { /* ... */ }

// =========================================================================
// EVENT LISTENERS (Ao carregar a página)
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
    
    // ---------------------------------------------------------------------
    // 1. NAVEGAÇÃO
    // ---------------------------------------------------------------------
    // ... (Mantida a lógica de navegação) ...
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

    // Lógica de busca automática
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
    document.getElementById('entradaQuantidade').addEventListener('input', calcularValorTotal);
    document.getElementById('entradaValorUnitario').addEventListener('input', calcularValorTotal);

    document.getElementById('saldoCodigoFabrica').addEventListener('input', () => {
        processarFiltroSaldo('fabrica');
    });

    document.getElementById('saldoDescricao').addEventListener('input', () => {
        processarFiltroSaldo('descricao');
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

            // Chamada FINAL de escrita com PnP
            await sharepointFetch('Produtos', '', 'POST', novosDados);

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
            await sharepointFetch('Entradas', '', 'POST', dadosEntrada);

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
            await sharepointFetch('Saidas', '', 'POST', dadosSaida);

            alert(`Saída de ${dadosSaida.Quantidade} de ${codigoFabrica} registrada com sucesso no SharePoint!`);
            
            document.getElementById('form-saida').reset();
            navegarPara('tela-saida', 'tela-principal');
            
        } catch (error) {
            console.error('Erro ao registrar saída no SharePoint:', error);
            alert(`Erro ao registrar saída: ${error.message}.`);
        }
    });
});

// =========================================================================
// CONFIGURAÇÃO DA API E HEADERS PARA SHAREPOINT (FINAL E ATUALIZADO)
// =========================================================================

const SHAREPOINT_SITE_ROOT = 'https://borexpress.sharepoint.com/sites/EstoqueJC';
const API_BASE_URL_START = "/_api/web/lists/GetByTitle";
const API_BASE_URL = `${SHAREPOINT_SITE_ROOT}${API_BASE_URL_START}`;

/**
 * Obtém o token de segurança do SharePoint mesmo quando a página está em um iframe.
 */
function getSharePointDigest() {
    try {
        // 1. Tenta obter o token da própria página
        let digest = document.getElementById('__REQUESTDIGEST')?.value;
        if (digest) return digest;

        // 2. Se não encontrar, tenta acessar o documento pai (SharePoint)
        if (window.parent && window.parent.document) {
            digest = window.parent.document.getElementById('__REQUESTDIGEST')?.value;
            if (digest) return digest;
        }

        // 3. Caso nada seja encontrado
        throw new Error("Token de segurança do SharePoint (__REQUESTDIGEST) não encontrado. A página pode não ter carregado completamente ou o iframe está sem permissão.");
    } catch (err) {
        console.error("Erro ao obter digest:", err);
        throw err;
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
 * Função genérica para chamar a API REST do SharePoint.
 */
async function sharepointFetch(listTitle, endpoint, method = 'GET', data = null) {
    const url = `${API_BASE_URL}('${listTitle}')${endpoint}`;
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
        throw new Error(`SharePoint API Error: ${response.status} - ${response.statusText}`);
    }

    const json = await response.json();
    return json.d;
}

// =========================================================================
// O RESTANTE DO CÓDIGO (FUNÇÕES E LISTENERS) SEGUE ABAIXO
// =========================================================================

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

// (Todas as funções originais a seguir permanecem iguais ao seu código anterior)
async function buscarProdutoAPI(params) { /* ...igual ao seu... */ }
async function obterSaldoAPI(codigoFabrica) { /* ...igual ao seu... */ }
function calcularValorTotal() { /* ...igual ao seu... */ }
async function processarBuscaEntrada() { /* ...igual ao seu... */ }
async function carregarDadosSaida() { /* ...igual ao seu... */ }
async function carregarHistoricoSaidas() { /* ...igual ao seu... */ }
function limparResultadoSaldo() { /* ...igual ao seu... */ }
function exibirSaldo(produto, saldo) { /* ...igual ao seu... */ }
async function processarFiltroSaldo(campoAlterado) { /* ...igual ao seu... */ }

// =========================================================================
// EVENT LISTENERS
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
    // NAVEGAÇÃO (mantida igual)
    document.getElementById('btn-cadastro').addEventListener('click', () => navegarPara('tela-principal', 'tela-cadastro'));
    document.getElementById('btn-entrada').addEventListener('click', () => {
        navegarPara('tela-principal', 'tela-entrada');
        document.getElementById('form-entrada').reset();
        document.getElementById('entrada-dados-produto').style.display = 'none';
        document.getElementById('entrada-new-fields').style.display = 'none';
        document.getElementById('btn-salvar-entrada').disabled = true;
    });
    document.getElementById('btn-saida').addEventListener('click', () => {
        navegarPara('tela-principal', 'tela-saida');
        document.getElementById('form-saida').reset();
        document.getElementById('saida-dados-produto').style.display = 'none';
        document.getElementById('saida-new-fields').style.display = 'none';
        document.getElementById('btn-salvar-saida').disabled = true;
    });
    document.getElementById('btn-saldo').addEventListener('click', () => navegarPara('tela-principal', 'tela-saldo'));
    document.getElementById('btn-voltar-cadastro').addEventListener('click', () => navegarPara('tela-cadastro', 'tela-principal'));
    document.getElementById('btn-voltar-entrada').addEventListener('click', () => navegarPara('tela-entrada', 'tela-principal'));
    document.getElementById('btn-voltar-saida').addEventListener('click', () => navegarPara('tela-saida', 'tela-principal'));
    document.getElementById('btn-voltar-saldo').addEventListener('click', () => navegarPara('tela-saldo', 'tela-principal'));
    document.getElementById('btn-historico-saida').addEventListener('click', () => navegarPara('tela-saida', 'tela-historico-saida'));
    document.getElementById('btn-voltar-historico').addEventListener('click', () => navegarPara('tela-historico-saida', 'tela-saida'));

    // CADASTRO
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
                alert(`ERRO: O Código de Fábrica "${novosDados.Title}" já existe.`);
                return;
            }
            await sharepointFetch('Produtos', '/items', 'POST', novosDados);
            alert(`Produto ${novosDados.DescricaoProduto} cadastrado com sucesso!`);
            document.getElementById('form-cadastro').reset();
            navegarPara('tela-cadastro', 'tela-principal');
        } catch (error) {
            console.error('Erro ao cadastrar:', error);
            alert(`Erro ao cadastrar: ${error.message}`);
        }
    });

    // ENTRADA
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
            alert(`Entrada registrada com sucesso!`);
            document.getElementById('form-entrada').reset();
            navegarPara('tela-entrada', 'tela-principal');
        } catch (error) {
            console.error('Erro ao registrar entrada:', error);
            alert(`Erro ao registrar entrada: ${error.message}`);
        }
    });

    // SAÍDA
    document.getElementById('form-saida').addEventListener('submit', async (e) => {
        e.preventDefault();
        const codigoFabrica = document.getElementById('saidaCodigoFabrica').value.trim().toUpperCase();
        const quantidadeSaida = parseInt(document.getElementById('saidaQuantidade').value);
        const saldoAtual = parseInt(document.getElementById('saidaDisplayEstoque').textContent);
        if (quantidadeSaida > saldoAtual) {
            alert(`ERRO: Quantidade maior que saldo (${saldoAtual}).`);
            return;
        }

        const dadosSaida = {
            '__metadata': { 'type': 'SP.Data.SaidasListItem' },
            'Title': codigoFabrica,
            'CodigoFabrica': codigoFabrica,
            'DescricaoProduto': document.getElementById('saidaDisplayDescricao').textContent,
            'Quantidade': quantidadeSaida,
            'PlacaCaminhao': document.getElementById('saidaPlacaCaminhao').value.trim().toUpperCase(),
            'Destinatario': document.getElementById('saidaDestinatario').value.trim(),
        };

        try {
            await sharepointFetch('Saidas', '/items', 'POST', dadosSaida);
            alert(`Saída registrada com sucesso!`);
            document.getElementById('form-saida').reset();
            navegarPara('tela-saida', 'tela-principal');
        } catch (error) {
            console.error('Erro ao registrar saída:', error);
            alert(`Erro ao registrar saída: ${error.message}`);
        }
    });

    // SALDO
    document.getElementById('saldoCodigoFabrica').addEventListener('input', () => processarFiltroSaldo('fabrica'));
    document.getElementById('saldoDescricao').addEventListener('input', () => processarFiltroSaldo('descricao'));
});

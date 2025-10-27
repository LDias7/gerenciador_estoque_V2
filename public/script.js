// =========================================================================
// CONFIGURAÇÃO DA API E HEADERS PARA SHAREPOINT (FINAL E ATUALIZADO)
// =========================================================================

const SHAREPOINT_SITE_ROOT = 'https://borexpress.sharepoint.com/sites/EstoqueJC';
const API_BASE_URL_START = "/_api/web/lists/GetByTitle";
const API_BASE_URL = `${SHAREPOINT_SITE_ROOT}${API_BASE_URL_START}`;


/**
 * Obtém o token de segurança do SharePoint (Request Digest)
 * Tenta obter o token do IFrame ou do documento pai (SharePoint)
 * Retorna o token ou null.
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

        // Se não encontrar, retorna NULL, sem lançar erro que travaria a inicialização.
        return null; 
    } catch (err) {
        // Ignora erros de CORS/Segurança que travariam o JS
        return null; 
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
        const digest = getSharePointDigest();
        if (!digest) {
             // AVISO: A navegação funcionará, mas o POST/Cadastro falhará com erro de token.
             console.warn("Atenção: Token de segurança para escrita ausente. O cadastro pode falhar.");
        } else {
            headers["X-RequestDigest"] = digest;
        }
    }
    return headers;
}

/**
 * Função genérica para chamar a API REST do SharePoint.
 */
async function sharepointFetch(listTitle, endpoint, method = 'GET', data = null) {
    const url = `${API_BASE_URL}('${listTitle}')${endpoint}`;
    const headers = getSharePointHeaders(method);

    // Verifica se é uma operação de escrita sem o token (para lançar o erro correto)
    if (method !== 'GET' && !headers["X-RequestDigest"]) {
        throw new Error("Token de segurança (__REQUESTDIGEST) não encontrado. A operação de escrita não pode ser concluída. Verifique as permissões do SharePoint.");
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
// O RESTANTE DO CÓDIGO (ROTINAS DE NEGÓCIO E LISTENERS) SEGUE IGUAL
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

// Rotinas de negócio (buscarProdutoAPI, obterSaldoAPI, etc.)
// ... (Toda a lógica de negócio aqui) ...

// Função calcularValorTotal (manter)
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

// ... (Todas as outras funções como buscarProdutoAPI, obterSaldoAPI, etc.
// devem ser copiadas aqui, pois você não as incluiu no seu último prompt.)

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
        // Limpa e carrega
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
    // ... (restante dos listeners de formulário - DEVE SER REINSERIDO AQUI)
    // ---------------------------------------------------------------------
    
    // ATENÇÃO: Todo o código de listeners de formulário deve ser reinserido aqui.
});

const API_URL = 'http://localhost:3000/api/formulario';

// AJUSTE: limites usados quando o perguntas.json não define "limiteCaracteres" para o campo
const LIMITE_PADRAO = { texto: 500, area_texto: 2000 };

// 1. FUNÇÃO DE SEGURANÇA: Prevenção contra XSS
// Escapa caracteres sensíveis do HTML antes de renderizar os dados da API
function escaparHTML(texto) {
    if (typeof texto !== 'string') return texto;
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const resposta = await fetch(API_URL);
        // AJUSTE: verifica o status HTTP antes de tentar ler o JSON
        if (!resposta.ok) throw new Error(`A API respondeu com status ${resposta.status}`);
        const dados = await resposta.json();

        renderizarInterface(dados.secoes);
        inicializarComportamentos(dados.secoes);
    } catch (erro) {
        console.error("Erro ao carregar o formulário da API:", erro);
        document.getElementById('form-sections').innerHTML = '<p style="color: red;">Erro ao carregar o formulário. Verifique se a API está rodando.</p>';
    }
});

// 2. Função para desenhar o HTML com Validações Estritas
function renderizarInterface(secoes) {
    const navContainer = document.getElementById('lista-botoes-bloco-visitado');
    const formContainer = document.getElementById('form-sections');

    let navHTML = '';
    let secoesHTML = '';

    secoes.forEach((secao, index) => {
        // Renderiza Navegação
        navHTML += `<button type="button" class="botao-bloco-visitado" id="botao-secao-${index + 1}">${index + 1}</button>`;

        // Renderiza Seção com proteção XSS no título
        secoesHTML += `<div class="secao-container"><h2>${escaparHTML(secao.titulo)}</h2>`;
        
        secao.campos.forEach(campo => {
            const isCondicional = campo.exibicaoCondicional ? true : false;
            const isObrigatorioFixo = campo.obrigatorio === true;
            const isObrigatorioCondicional = typeof campo.obrigatorio === 'string' && campo.obrigatorio.includes('Condicional');
            
            // Variáveis seguras
            const safeId = escaparHTML(campo.id);
            const safePlaceholder = escaparHTML(campo.placeholder);

            // AJUSTE: o limite de caracteres vem do perguntas.json (mesmo valor validado no backend)
            const limite = Number(campo.limiteCaracteres) || LIMITE_PADRAO[campo.type];

            // Configuração da div container do campo
            let divAtributos = `class="campo-container"`;
            if (isCondicional) {
                divAtributos += ` data-condicao-campo="${escaparHTML(campo.exibicaoCondicional.campo)}" 
                                  data-condicao-valor="${escaparHTML(campo.exibicaoCondicional.valor)}" 
                                  data-condicao-obrigatorio="${isObrigatorioCondicional}" 
                                  style="display: none;"`;
            }

            secoesHTML += `<div ${divAtributos}>
                <label for="${safeId}">${safePlaceholder}
                    ${isObrigatorioFixo ? '<span class="obrigatorio">*</span>' : ''}
                    ${isObrigatorioCondicional ? '<span class="obrigatorio condicional-asterisco" style="display: none;">*</span>' : ''}
                </label>`;

            // Renderiza o input dependendo do tipo com VALIDAÇÕES EXTRAS
            if (['texto', 'email', 'tel', 'ano'].includes(campo.type)) {
                let inputType = (campo.type === 'texto' || campo.type === 'ano') ? 'text' : campo.type;
                let atributosExtras = '';

                // Validação estrita baseada no tipo
                if (campo.type === 'email') {
                    inputType = 'email';
                    atributosExtras = 'maxlength="254"'; 
                } else if (campo.type === 'tel') {
                    inputType = 'tel';
                    atributosExtras = 'pattern="[0-9\\s\\-\\(\\)\\+]+" maxlength="20" title="Digite um telefone válido"';
                } else if (campo.type === 'ano') {
                    atributosExtras = 'pattern="[0-9]{4}" maxlength="4" inputmode="numeric" title="Digite um ano válido com 4 dígitos numéricos"';
                } else if (campo.type === 'texto') {
                    atributosExtras = `maxlength="${limite}"`;
                }

                secoesHTML += `<input type="${inputType}" id="${safeId}" name="${safeId}" placeholder="${safePlaceholder}" data-tipo="${campo.type}" ${isObrigatorioFixo ? 'required' : ''} ${atributosExtras}>`;
                
            } else if (campo.type === 'selecao') {
                secoesHTML += `<select id="${safeId}" name="${safeId}" ${isObrigatorioFixo ? 'required' : ''}>
                    <option value="" disabled selected>Selecione uma opção</option>
                    ${campo.opcoes.map(opcao => `<option value="${escaparHTML(opcao)}">${escaparHTML(opcao)}</option>`).join('')}
                </select>`;
                
            } else if (campo.type === 'multipla_escolha') {
                secoesHTML += `<div class="opcoes-multiplas">
                    ${campo.categorias.map(cat => `
                        <label class="checkbox-label">
                            <input type="checkbox" name="${safeId}[]" value="${escaparHTML(cat)}"> ${escaparHTML(cat)}
                        </label>
                    `).join('')}
                </div>`;
                
            } else if (campo.type === 'area_texto') {
                secoesHTML += `<textarea id="${safeId}" name="${safeId}" placeholder="${safePlaceholder}" rows="4" maxlength="${limite}" ${isObrigatorioFixo ? 'required' : ''}></textarea>`;
            }
            
            secoesHTML += `</div>`;
        });
        secoesHTML += `</div>`;
    });

    // Adiciona o botão de resumo na navegação e a tela de resumo nas seções
    navHTML += `<button type="button" class="botao-bloco-visitado" id="botao-secao-resumo" title="Resumo das Respostas">✓</button>`;
    secoesHTML += `
        <div class="secao-container" id="secao-resumo">
            <h2>Resumo das Respostas</h2>
            <p style="margin-bottom: 24px; color: var(--cinza-700);">Confira os dados informados abaixo. Se estiver tudo correto, clique em "Enviar Respostas".</p>
            <div id="conteudo-resumo" class="conteudo-resumo"></div>
        </div>`;

    navContainer.innerHTML = navHTML;
    formContainer.innerHTML = secoesHTML;
}

// 3. INICIALIZA A LÓGICA DO FORMULÁRIO (Navegação, Validação e Envio)
function inicializarComportamentos(secoesData) {
    const btnVoltar = document.getElementById('btnVoltar');
    const btnProximo = document.getElementById('btnProximo');
    const btnEnviar = document.getElementById('btnEnviar');
    const secoes = document.querySelectorAll('.secao-container');
    const botoesBloco = document.querySelectorAll('.botao-bloco-visitado');
    const formulario = document.getElementById('formulario-diagnostico');
    const aviso = document.getElementById('aviso-formulario');
    const campoWhatsapp = document.getElementById('whatsapp');
    const campoEmail = document.getElementById('email');

    let etapaAtual = 0;
    let enviado = false;
    const totalEtapas = secoes.length;
    const etapasConcluidas = new Set();

    // AJUSTE: mensagens exibidas na própria página, no lugar dos alerts
    function mostrarAviso(mensagem, tipo) {
        aviso.textContent = mensagem;
        aviso.className = `aviso aviso-${tipo}`;
        aviso.hidden = false;
        aviso.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function esconderAviso() {
        aviso.hidden = true;
        aviso.textContent = '';
    }

    function gerarResumo() {
        const containerResumo = document.getElementById('conteudo-resumo');
        if (!containerResumo) return;
        containerResumo.innerHTML = ''; 
        
        for (let i = 0; i < totalEtapas - 1; i++) {
            const secao = secoes[i];
            const tituloSecao = secao.querySelector('h2').textContent;
            const divSecaoResumo = document.createElement('div');
            divSecaoResumo.innerHTML = `<h3 class="titulo-secao-resumo">${escaparHTML(tituloSecao)}</h3>`;
            
            let temRespostaValida = false;
            secao.querySelectorAll('.campo-container').forEach(campo => {
                if (campo.style.display === 'none') return; 
            
                const labelElement = campo.querySelector('label');
                let labelText = labelElement ? labelElement.textContent.replace('*', '').trim() : 'Pergunta';
                let valorResposta = '';
                const inputElement = campo.querySelector('input:not([type="checkbox"]), select, textarea');
                
                if (inputElement) {
                    valorResposta = inputElement.value.trim();
                } else {
                    const checkboxes = campo.querySelectorAll('input[type="checkbox"]:checked');
                    if (checkboxes.length > 0) {
                        valorResposta = Array.from(checkboxes).map(cb => cb.value).join(', ');
                    }
                }
            
                // Usa textContent ao invés de innerHTML para setar o valor no resumo (Segurança extra contra XSS via input do usuário)
                const itemResumo = document.createElement('div');
                itemResumo.className = 'item-resumo';
                
                const labelSpan = document.createElement('strong');
                labelSpan.textContent = labelText;
                itemResumo.appendChild(labelSpan);

                const valorSpan = document.createElement('span');
                if (!valorResposta) {
                    valorSpan.innerHTML = '<span style="color: var(--cinza-500); font-style: italic;">Não respondido</span>';
                } else {
                    valorSpan.textContent = valorResposta; 
                }
                itemResumo.appendChild(valorSpan);

                divSecaoResumo.appendChild(itemResumo);
                temRespostaValida = true;
            });
            if (temRespostaValida) containerResumo.appendChild(divSecaoResumo);
        }
    }

    function verificarCondicionais() {
        document.querySelectorAll('.campo-container[data-condicao-campo]').forEach(container => {
            const campoAlvoId = container.getAttribute('data-condicao-campo');
            const valorEsperado = container.getAttribute('data-condicao-valor');
            const precisaSerObrigatorio = container.getAttribute('data-condicao-obrigatorio') === 'true';
            const elementoAlvo = document.getElementById(campoAlvoId);
        
            if (elementoAlvo) {
                const valorAtual = elementoAlvo.value;
                const inputElement = container.querySelector('input:not([type="checkbox"]), select, textarea');
                const asterisco = container.querySelector('.condicional-asterisco');
            
                if (valorAtual === valorEsperado) {
                    container.style.display = 'flex';
                    if (precisaSerObrigatorio) {
                        if (asterisco) asterisco.style.display = 'inline';
                        if (inputElement) inputElement.required = true;
                    }
                } else {
                    container.style.display = 'none';
                    if (asterisco) asterisco.style.display = 'none';
                    if (inputElement) inputElement.required = false;
                    
                    // Limpa o valor do campo se ele for oculto para não enviar dados fantasmas
                    if(inputElement) inputElement.value = '';
                    // AJUSTE: desmarca também os checkboxes de grupos ocultos (ex.: categorias de renda)
                    container.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = false; });
                }
            }
        });
    }

    formulario.addEventListener('change', verificarCondicionais);

    // AJUSTE: valida no navegador as mesmas regras de contato do backend
    function validarContato() {
        if (!campoWhatsapp || !campoEmail) return;

        const digitos = campoWhatsapp.value.replace(/\D/g, '');
        const whatsappInvalido = campoWhatsapp.value.trim() !== '' && (digitos.length < 10 || digitos.length > 15);
        campoWhatsapp.setCustomValidity(whatsappInvalido ? 'Informe um WhatsApp válido, com DDD (entre 10 e 15 dígitos).' : '');

        const semContato = !campoWhatsapp.value.trim() && !campoEmail.value.trim();
        campoEmail.setCustomValidity(semContato ? 'Informe pelo menos WhatsApp ou E-mail.' : '');
    }

    if (campoWhatsapp) campoWhatsapp.addEventListener('input', validarContato);
    if (campoEmail) campoEmail.addEventListener('input', validarContato);

    // AJUSTE: exibição dos erros de validação devolvidos pelo backend, embaixo de cada campo
    function limparErroCampo(container) {
        container.classList.remove('campo-com-erro');
        const mensagem = container.querySelector('.mensagem-erro');
        if (mensagem) mensagem.remove();
    }

    function limparErros() {
        document.querySelectorAll('.campo-com-erro').forEach(limparErroCampo);
    }

    // O erro de um campo some assim que o usuário mexe nele
    formulario.addEventListener('input', (evento) => {
        const container = evento.target.closest('.campo-container');
        if (container) limparErroCampo(container);
    });

    // Junta as mensagens de um nó do z.treeifyError (inclui itens de listas, como as categorias)
    function coletarMensagens(no) {
        if (!no) return [];
        const mensagens = [...(no.errors || [])];
        (no.items || []).forEach(item => mensagens.push(...coletarMensagens(item)));
        Object.values(no.properties || {}).forEach(prop => mensagens.push(...coletarMensagens(prop)));
        return mensagens;
    }

    function mostrarErrosDoServidor(detalhes) {
        limparErros();
        const semCampo = [...(detalhes?.errors || [])];
        let primeiraSecao = null;

        for (const [campoId, no] of Object.entries(detalhes?.properties || {})) {
            const mensagens = [...new Set(coletarMensagens(no))];
            if (!mensagens.length) continue;

            const elemento = document.getElementById(campoId)
                || Array.from(formulario.elements).find(el => el.name === `${campoId}[]`);
            const container = elemento ? elemento.closest('.campo-container') : null;

            // Campo inexistente ou oculto: a mensagem vai para o aviso geral
            if (!container || container.style.display === 'none') {
                semCampo.push(...mensagens);
                continue;
            }

            container.classList.add('campo-com-erro');
            const mensagemErro = document.createElement('small');
            mensagemErro.className = 'mensagem-erro';
            mensagemErro.textContent = mensagens.join(' ');
            container.appendChild(mensagemErro);

            const indiceSecao = Array.from(secoes).indexOf(container.closest('.secao-container'));
            if (primeiraSecao === null || indiceSecao < primeiraSecao) primeiraSecao = indiceSecao;
        }

        return { primeiraSecao, semCampo };
    }

    function validarSecao(secIndex, reportar = false) {
        if(!secoes[secIndex]) return true;
        let valida = true;
        secoes[secIndex].querySelectorAll('input, select, textarea').forEach(campo => {
            if (!campo.checkValidity()) {
                valida = false;
                if(reportar) campo.reportValidity();
            }
        });
        return valida;
    }

    function renderizar() {
        etapasConcluidas.forEach(index => {
            if (!validarSecao(index, false)) etapasConcluidas.delete(index);
        });

        secoes.forEach((secao, index) => secao.classList.toggle('ativa', index === etapaAtual));
        botoesBloco.forEach((botao, index) => {
            botao.classList.toggle('ativo', index === etapaAtual);
            botao.classList.toggle('concluido', etapasConcluidas.has(index));
        });

        btnVoltar.style.display = etapaAtual === 0 ? 'none' : 'inline-block';

        if (etapaAtual === totalEtapas - 1) {
            btnProximo.style.display = 'none';
            btnEnviar.style.display = 'inline-block';
            gerarResumo();
        } else {
            btnProximo.style.display = 'inline-block';
            btnEnviar.style.display = 'none';
        }
    }

    btnProximo.addEventListener('click', () => {
        if (!validarSecao(etapaAtual, true)) return;
        etapasConcluidas.add(etapaAtual);
        if (etapaAtual < totalEtapas - 1) { etapaAtual++; renderizar(); }
    });

    btnVoltar.addEventListener('click', () => {
        if (etapaAtual > 0) { etapaAtual--; renderizar(); }
    });

    botoesBloco.forEach((botao, index) => {
        botao.addEventListener('click', () => {
            if (index > etapaAtual) {
                for (let i = 0; i < index; i++) {
                    if (!validarSecao(i, false)) {
                        etapaAtual = i; renderizar(); validarSecao(i, true); return;
                    }
                    etapasConcluidas.add(i);
                }
            }
            if (index < totalEtapas) { etapaAtual = index; renderizar(); }
        });
    });

    // 4. ENVIO DE DADOS PARA A API (POST)
    formulario.addEventListener('submit', async (evento) => {
        evento.preventDefault(); 

        // AJUSTE: Enter num campo antes do resumo avança a seção em vez de enviar o formulário
        if (etapaAtual !== totalEtapas - 1) {
            btnProximo.click();
            return;
        }

        // AJUSTE: impede reenvio depois de um envio bem-sucedido
        if (enviado) return;

        esconderAviso();
        limparErros();
        
        const formData = new FormData(formulario);
        const formObj = {};
        
        // Sanitização: Remoção de espaços extras (trim) no momento da extração
        for (let [key, value] of formData.entries()) {
            const valorLimpo = typeof value === 'string' ? value.trim() : value;
            
            if (key.endsWith('[]')) {
                const cleanKey = key.slice(0, -2);
                if (!formObj[cleanKey]) formObj[cleanKey] = [];
                formObj[cleanKey].push(valorLimpo);
            } else {
                formObj[key] = valorLimpo;
            }
        }

        // AJUSTE: envia o WhatsApp só com dígitos (e o + inicial), formato exigido pelo backend
        if (formObj.whatsapp) {
            const digitos = formObj.whatsapp.replace(/\D/g, '');
            formObj.whatsapp = formObj.whatsapp.startsWith('+') ? `+${digitos}` : digitos;
        }

        try {
            btnEnviar.disabled = true;
            btnEnviar.textContent = "Enviando...";

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formObj)
            });

            // AJUSTE: tolera respostas que não sejam JSON (ex.: erro de proxy)
            const data = await response.json().catch(() => ({}));

            if (response.ok) {
                enviado = true;
                btnEnviar.textContent = "Enviado";
                mostrarAviso(data.mensagem || 'Respostas enviadas com sucesso!', 'sucesso');

            } else if (response.status === 400 && data.detalhes) {
                const { primeiraSecao, semCampo } = mostrarErrosDoServidor(data.detalhes);
                if (primeiraSecao !== null) {
                    etapaAtual = primeiraSecao;
                    renderizar();
                }
                const partes = [];
                if (primeiraSecao !== null) partes.push('Alguns campos precisam de correção. Confira as mensagens destacadas em vermelho.');
                partes.push(...semCampo);
                mostrarAviso(partes.length ? partes.join(' ') : (data.mensagem || 'Erro de validação nos dados enviados.'), 'erro');

            } else if (response.status >= 500) {
                // Erros internos podem ter mensagens técnicas; o usuário recebe uma mensagem genérica
                mostrarAviso('Não foi possível processar o envio agora. Tente novamente em alguns minutos.', 'erro');

            } else {
                mostrarAviso(data.mensagem || `Não foi possível enviar (erro ${response.status}).`, 'erro');
            }
        } catch (erro) {
            console.error(erro);
            mostrarAviso('Erro de conexão ao enviar o formulário. Verifique sua internet e tente novamente.', 'erro');
        } finally {
            if (!enviado) {
                btnEnviar.disabled = false;
                btnEnviar.textContent = "Enviar Respostas";
            }
        }
    });

    verificarCondicionais();
    validarContato();
    renderizar();
}

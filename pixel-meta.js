// Pixel da Meta (medição de anúncios).
// Equivale ao código padrão da Meta, mas num arquivo próprio: a política de segurança do site (_headers)
// bloqueia scripts colados no HTML. Envia só o PageView (ao abrir a página) e o Lead (no envio aceito,
// disparado pelo app.js), sem nenhuma resposta do formulário.
(function () {
    // ID do pixel (conjunto de dados) no Gerenciador de Eventos da Meta. Vazio = pixel desligado.
    const META_PIXEL_ID = '1362205025278415';

    // Desligado sem ID e nos testes locais, para não misturar acessos de teste com as estatísticas das campanhas
    const local = ['127.0.0.1', 'localhost'].includes(location.hostname);
    if (!META_PIXEL_ID || local || window.fbq) return;

    // Fila de comandos do fbq até a biblioteca da Meta carregar
    const fbq = function () {
        if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments);
        else fbq.queue.push(arguments);
    };
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    window.fbq = fbq;
    if (!window._fbq) window._fbq = fbq;

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);

    // Desliga a configuração automática (captura de cliques e de dados da página), antes do init
    fbq('set', 'autoConfig', false, META_PIXEL_ID);
    fbq('init', META_PIXEL_ID);
    fbq('track', 'PageView');
})();

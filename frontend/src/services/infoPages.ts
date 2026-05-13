import { brand } from './brand';

export interface InfoPageBlock {
  title: string;
  body: string;
}

export interface InfoPageContent {
  group: 'Suporte' | 'Marca' | 'Políticas';
  title: string;
  kicker: string;
  lead: string;
  blocks: InfoPageBlock[];
}

export const infoPages = {
  'shipping-returns': {
    group: 'Suporte',
    title: 'Envio e Devoluções',
    kicker: 'SUPORTE / LOGÍSTICA',
    lead: 'Processo logístico claro, seguro e acompanhado do pedido à entrega.',
    blocks: [
      { title: 'Processamento e postagem', body: 'Após a confirmação do pagamento, o pedido entra em controle de qualidade, separação e embalagem. A postagem ocorre em até 2 dias úteis.' },
      { title: 'Entrega', body: 'A VELKOR utiliza parceiros logísticos como Correios e transportadoras privadas. O prazo de entrega é calculado no checkout e começa a contar após a postagem.' },
      { title: 'Tentativas e endereço', body: 'São realizadas até 3 tentativas formais de entrega. Revise o endereço antes de finalizar a compra; reenvios por erro cadastral podem gerar nova cobrança de frete.' },
      { title: 'Devoluções', body: `Para iniciar uma devolução, fale com o suporte oficial pelo WhatsApp ${brand.whatsapp} ou pelo email ${brand.supportEmail}.` }
    ]
  },
  'size-guide': {
    group: 'Suporte',
    title: 'Guia de Tamanhos',
    kicker: 'SUPORTE / TAMANHOS',
    lead: 'Medidas certas reduzem trocas e deixam a compra mais precisa.',
    blocks: [
      { title: 'Modelagem', body: 'As peças e sneakers VELKOR seguem padrões específicos de modelagem. Consulte as medidas disponíveis em cada página de produto antes de comprar.' },
      { title: 'Comparação', body: 'Recomendamos medir uma peça ou tênis de uso pessoal e comparar com as medidas informadas. Esse cuidado ajuda a encontrar o fit ideal.' },
      { title: 'Suporte de tamanho', body: `Se estiver entre dois tamanhos, envie sua dúvida pelo WhatsApp ${brand.whatsapp}. Informe altura, peso, numeração habitual e o produto desejado.` }
    ]
  },
  'track-order': {
    group: 'Suporte',
    title: 'Rastrear Pedido',
    kicker: 'SUPORTE / RASTREIO',
    lead: 'Acompanhamento transparente desde o despacho até a entrega.',
    blocks: [
      { title: 'Código de rastreamento', body: 'Assim que o pedido é despachado, um código de rastreamento alfanumérico é enviado automaticamente para o email cadastrado.' },
      { title: 'Atualização logística', body: 'O acompanhamento pode ser feito pelo portal de rastreio indicado no email ou pelos canais oficiais da transportadora responsável.' },
      { title: 'Suporte', body: `Caso o rastreio não atualize após o despacho, envie o número do pedido para ${brand.supportEmail} ou chame no WhatsApp ${brand.whatsapp}.` }
    ]
  },
  contact: {
    group: 'Suporte',
    title: 'Contato',
    kicker: 'SUPORTE / ATENDIMENTO',
    lead: 'Canais oficiais para suporte personalizado e seguro.',
    blocks: [
      { title: 'WhatsApp oficial', body: `${brand.whatsapp} — canal direto para dúvidas rápidas, rastreio, tamanho, troca e pós-compra.` },
      { title: 'Email de suporte', body: `${brand.supportEmail} — recomendado para solicitações formais, comprovantes, reembolso e análise de pedidos.` },
      { title: 'Instagram oficial', body: `${brand.instagramUrl} — acompanhe drops, novidades e referências da marca.` },
      { title: 'Horário', body: 'Atendimento de segunda a sexta, das 09h às 18h.' }
    ]
  },
  faq: {
    group: 'Suporte',
    title: 'FAQ',
    kicker: 'SUPORTE / FAQ',
    lead: 'Respostas objetivas para comprar com mais confiança.',
    blocks: [
      { title: 'Qual a procedência dos produtos?', body: 'A VELKOR trabalha com curadoria de itens premium, selecionados por critérios de design, material, acabamento e presença urbana.' },
      { title: 'Posso alterar o endereço após a compra?', body: 'Alterações só são garantidas quando solicitadas em até 2 horas após a confirmação do pedido, devido ao fluxo ágil de processamento.' },
      { title: 'Como funcionam os estornos?', body: 'Estornos no cartão seguem o ciclo da operadora. Para PIX, o processamento ocorre em até 5 dias úteis após a conferência da devolução.' },
      { title: 'Como falo com a VELKOR?', body: `Use apenas os canais oficiais: WhatsApp ${brand.whatsapp}, email ${brand.supportEmail} e Instagram ${brand.instagramUrl}.` }
    ]
  },
  story: {
    group: 'Marca',
    title: 'Nossa História',
    kicker: 'MARCA / HISTÓRIA',
    lead: 'A VELKOR é mais que uma loja: é uma curadoria de estilo urbano premium.',
    blocks: [
      { title: 'Conceito', body: 'A marca nasce da vontade de aproximar design premium, tendência global e estética streetwear de quem valoriza exclusividade sem excesso.' },
      { title: 'Curadoria', body: 'Cada peça do catálogo passa por uma pesquisa focada em material, acabamento, silhueta e relevância visual.' },
      { title: 'Identidade', body: 'A VELKOR combina linguagem sneaker, presença de rua e experiência de compra limpa, moderna e confiável.' }
    ]
  },
  stockists: {
    group: 'Marca',
    title: 'Lojas Parceiras',
    kicker: 'MARCA / EXPANSÃO',
    lead: 'Parcerias selecionadas para expansão da curadoria VELKOR.',
    blocks: [
      { title: 'Revenda', body: 'Pontos de venda físicos ou digitais interessados em revender a curadoria VELKOR podem enviar apresentação para análise.' },
      { title: 'Análise de perfil', body: 'Avaliamos alinhamento estético, posicionamento, público, operação e compatibilidade com a identidade premium da marca.' },
      { title: 'Contato institucional', body: `Envie propostas para ${brand.supportEmail} com o assunto "Parceria VELKOR".` }
    ]
  },
  careers: {
    group: 'Marca',
    title: 'Carreiras',
    kicker: 'MARCA / CARREIRAS',
    lead: 'A VELKOR cresce com pessoas que entendem estética, produto e cultura urbana.',
    blocks: [
      { title: 'Oportunidades', body: 'A marca considera perfis ligados a atendimento, conteúdo, design, operação, tecnologia, produto e experiência de compra.' },
      { title: 'Como se apresentar', body: `Envie currículo, portfólio ou apresentação profissional para ${brand.supportEmail} com o assunto "Carreiras VELKOR".` },
      { title: 'Perfil', body: 'Valorizamos atenção ao detalhe, comunicação objetiva, repertório streetwear e mentalidade premium.' }
    ]
  },
  press: {
    group: 'Marca',
    title: 'Imprensa',
    kicker: 'MARCA / IMPRENSA',
    lead: 'Canal oficial para press kit, collabs e solicitações editoriais.',
    blocks: [
      { title: 'Press kit', body: `Solicitações de imagens, informações institucionais e materiais de marca devem ser enviadas para ${brand.supportEmail}.` },
      { title: 'Influenciadores e collabs', body: 'Propostas devem incluir apresentação, canais, audiência, objetivo da parceria e formato sugerido.' },
      { title: 'Uso de marca', body: 'Logos, textos e imagens da VELKOR não devem ser usados comercialmente sem autorização prévia.' }
    ]
  },
  sustainability: {
    group: 'Marca',
    title: 'Sustentabilidade',
    kicker: 'MARCA / ÉTICA',
    lead: 'Reduzir excesso e evoluir com responsabilidade também faz parte da estética.',
    blocks: [
      { title: 'Embalagem', body: 'A VELKOR prioriza embalagens recicláveis e uma apresentação limpa, sem desperdício desnecessário.' },
      { title: 'Parceiros', body: 'Buscamos trabalhar com parceiros que respeitam boas práticas, normas éticas de produção e uma operação transparente.' },
      { title: 'Consumo consciente', body: 'A curadoria valoriza peças com propósito, presença visual e potencial de uso real no dia a dia.' }
    ]
  },
  privacy: {
    group: 'Políticas',
    title: 'Privacidade',
    kicker: 'POLÍTICA / LGPD',
    lead: 'Dados tratados com finalidade, segurança e transparência.',
    blocks: [
      { title: 'Proteção de dados', body: 'Em conformidade com a LGPD, a VELKOR utiliza protocolos de segurança para proteger dados informados durante navegação, cadastro e compra.' },
      { title: 'Finalidade', body: 'As informações coletadas são usadas para operacionalizar pedidos, melhorar a experiência do usuário, prestar suporte e cumprir obrigações legais.' },
      { title: 'Sigilo', body: 'A VELKOR não compartilha dados sensíveis com terceiros para fins comerciais sem base legal ou autorização aplicável.' },
      { title: 'Contato', body: `Dúvidas sobre privacidade podem ser enviadas para ${brand.supportEmail}.` }
    ]
  },
  terms: {
    group: 'Políticas',
    title: 'Termos',
    kicker: 'POLÍTICA / TERMOS',
    lead: 'Condições para uso seguro e responsável da plataforma.',
    blocks: [
      { title: 'Propriedade intelectual', body: 'Conteúdos visuais, textos, identidade, logos e elementos da experiência VELKOR são de propriedade da marca.' },
      { title: 'Preços e promoções', body: 'A VELKOR pode ajustar preços, condições e promoções sem aviso prévio, sempre honrando pedidos já confirmados.' },
      { title: 'Uso do site', body: 'O usuário compromete-se a utilizar a plataforma de forma lícita, sem tentativa de invasão, fraude, automação abusiva ou uso indevido de dados.' }
    ]
  },
  'refund-policy': {
    group: 'Políticas',
    title: 'Reembolso',
    kicker: 'POLÍTICA / TROCAS',
    lead: 'Regras alinhadas ao Código de Defesa do Consumidor.',
    blocks: [
      { title: 'Direito de arrependimento', body: 'O cliente possui 7 dias corridos após o recebimento para solicitar devolução por desistência, com direito ao reembolso conforme análise do pedido.' },
      { title: 'Defeitos', body: 'Caso seja identificada anomalia de fabricação, a comunicação deve ocorrer em até 7 dias. O produto poderá passar por perícia técnica.' },
      { title: 'Critérios de aceitação', body: 'A peça deve estar com etiquetas originais, sem indícios de lavagem, uso, odores ou danos, acompanhada de acessórios e embalagens recebidas.' },
      { title: 'Solicitação', body: `Para abrir um pedido de troca, devolução ou reembolso, acione ${brand.supportEmail} ou ${brand.whatsapp}.` }
    ]
  },
  cookies: {
    group: 'Políticas',
    title: 'Cookies',
    kicker: 'POLÍTICA / COOKIES',
    lead: 'Tecnologias usadas para uma navegação mais fluida e assertiva.',
    blocks: [
      { title: 'Uso de cookies', body: 'A VELKOR utiliza cookies e armazenamento local para otimizar performance, manter preferências e melhorar a experiência de navegação.' },
      { title: 'Personalização', body: 'Essas tecnologias podem apoiar recomendações, análise de navegação e comunicações mais relevantes.' },
      { title: 'Controle', body: 'Ao navegar na plataforma, você consente com o uso dessas tecnologias. Também pode gerenciar cookies nas configurações do navegador.' }
    ]
  }
} satisfies Record<string, InfoPageContent>;

export type InfoPageKey = keyof typeof infoPages;

export const infoNavGroups: Record<InfoPageContent['group'], InfoPageKey[]> = {
  Suporte: ['shipping-returns', 'size-guide', 'track-order', 'contact', 'faq'],
  Marca: ['story', 'stockists', 'careers', 'press', 'sustainability'],
  Políticas: ['privacy', 'terms', 'cookies', 'refund-policy']
};

export const infoPageSlugs: Record<InfoPageKey, string> = {
  'shipping-returns': 'envio-e-devolucoes',
  'size-guide': 'guia-de-tamanhos',
  'track-order': 'rastrear-pedido',
  contact: 'contato',
  faq: 'faq',
  story: 'nossa-historia',
  stockists: 'lojas-parceiras',
  careers: 'carreiras',
  press: 'imprensa',
  sustainability: 'sustentabilidade',
  privacy: 'privacidade',
  terms: 'termos',
  'refund-policy': 'reembolso',
  cookies: 'cookies'
};

export const infoPageKeysBySlug = Object.fromEntries(
  Object.entries(infoPageSlugs).map(([key, slug]) => [slug, key])
) as Record<string, InfoPageKey>;

export function getInfoHref(key: InfoPageKey) {
  return `/${infoPageSlugs[key]}`;
}

export function getInfoPageKeyBySlug(slug: string | undefined): InfoPageKey | null {
  return slug ? infoPageKeysBySlug[slug] ?? null : null;
}

export function getInfoPageKey(value: string | string[] | undefined): InfoPageKey {
  const key = Array.isArray(value) ? value[0] : value;
  return key && key in infoPages ? key as InfoPageKey : 'shipping-returns';
}

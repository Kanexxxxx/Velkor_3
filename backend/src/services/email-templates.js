function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function orderTotal(order) {
  if (typeof order?.total === 'number') return money(order.total);
  if (typeof order?.totalCents === 'number') return money(order.totalCents / 100);
  return money(0);
}

function baseHtml(title, body) {
  return `
    <div style="margin:0;padding:32px;background:#080808;font-family:Arial,sans-serif;color:#f7f2ea;line-height:1.55">
      <div style="max-width:620px;margin:0 auto;border:1px solid #2a2a2a;border-radius:18px;padding:28px;background:#111">
        <div style="letter-spacing:.22em;text-transform:uppercase;color:#ff1744;font-size:12px">VELKOR</div>
        <h1 style="margin:12px 0 20px;font-size:28px;line-height:1.15">${title}</h1>
        ${body}
        <p style="margin-top:32px;font-size:12px;color:#999">Mensagem automatica da VELKOR. Se precisar de ajuda, responda este email ou fale com nosso suporte oficial.</p>
      </div>
    </div>
  `;
}

function passwordResetTemplate({ resetUrl }) {
  return {
    subject: 'VELKOR - redefinir sua senha',
    text: `Use este link para redefinir sua senha VELKOR: ${resetUrl}\n\nSe voce nao pediu isso, ignore este email.`,
    html: baseHtml('Redefinir senha', `<p>Recebemos uma solicitacao para trocar a senha da sua conta.</p><p><a style="display:inline-block;margin:16px 0;padding:14px 20px;border-radius:999px;background:#ff1744;color:#fff;text-decoration:none;font-weight:bold;letter-spacing:.08em;text-transform:uppercase" href="${resetUrl}">Criar nova senha</a></p><p style="color:#bbb">Se voce nao pediu isso, ignore este email.</p>`),
  };
}

function emailVerificationTemplate({ verificationUrl }) {
  return {
    subject: 'VELKOR - confirme seu email',
    text: `Confirme seu email VELKOR neste link: ${verificationUrl}`,
    html: baseHtml('Confirmar email', `<p>Confirme seu email para receber atualizacoes de pedidos, envio e recuperacao de acesso.</p><p><a style="display:inline-block;margin:16px 0;padding:14px 20px;border-radius:999px;background:#ff1744;color:#fff;text-decoration:none;font-weight:bold;letter-spacing:.08em;text-transform:uppercase" href="${verificationUrl}">Confirmar email</a></p>`),
  };
}

function orderConfirmationTemplate({ order }) {
  const total = orderTotal(order);
  const itemCount = Array.isArray(order.items) ? order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0) : 0;
  return {
    subject: `VELKOR - pedido ${order.id} confirmado`,
    text: `Parabens pela compra. Recebemos seu pedido ${order.id}. Total: ${total}. Itens: ${itemCount}. Voce recebera novas atualizacoes por email.`,
    html: baseHtml('Pedido confirmado', `<p>Parabens pela compra. Recebemos seu pedido e ele ja esta registrado no sistema.</p><div style="margin:20px 0;padding:18px;border:1px solid #333;border-radius:14px;background:#0b0b0b"><p style="margin:0 0 8px;color:#aaa">Codigo do pedido</p><p style="margin:0;font-size:22px;font-weight:bold">${order.id}</p><p style="margin:16px 0 0;color:#aaa">Total</p><p style="margin:0;font-size:20px;font-weight:bold">${total}</p><p style="margin:16px 0 0;color:#aaa">Itens</p><p style="margin:0">${itemCount}</p></div><p>Quando o status mudar para enviado, voce recebe outro email com a atualizacao.</p>`),
  };
}

function orderPaymentApprovedTemplate({ order }) {
  const total = orderTotal(order);
  return {
    subject: `VELKOR - pagamento aprovado do pedido ${order.id}`,
    text: `Pagamento aprovado para o pedido ${order.id}. Total: ${total}. Agora vamos preparar seu pedido. Se precisar falar com a loja, responda este email com o codigo do pedido.`,
    html: baseHtml('Pagamento aprovado', `<p>Pagamento aprovado. Agora vamos preparar seu pedido com cuidado e manter voce informado por email.</p><div style="margin:20px 0;padding:18px;border:1px solid #333;border-radius:14px;background:#0b0b0b"><p style="margin:0 0 8px;color:#aaa">Codigo do pedido</p><p style="margin:0;font-size:22px;font-weight:bold">${order.id}</p><p style="margin:16px 0 0;color:#aaa">Total confirmado</p><p style="margin:0;font-size:20px;font-weight:bold">${total}</p></div><p>Se precisar entrar em contato com a loja, responda este email informando o codigo do pedido.</p>`),
  };
}

function orderShippedTemplate({ order }) {
  const tracking = order.trackingCode ? `<p style="margin:16px 0 0;color:#aaa">Codigo de rastreio</p><p style="margin:0;font-size:20px;font-weight:bold">${order.trackingCode}</p>` : '';
  return {
    subject: `VELKOR - pedido ${order.id} enviado`,
    text: `Seu pedido ${order.id} foi enviado.${order.trackingCode ? ` Codigo de rastreio: ${order.trackingCode}.` : ''} Acompanhe as atualizacoes pelos canais da VELKOR.`,
    html: baseHtml('Pedido enviado', `<p>Seu pedido <strong>${order.id}</strong> saiu para a etapa de envio.</p><div style="margin:20px 0;padding:18px;border:1px solid #333;border-radius:14px;background:#0b0b0b"><p style="margin:0 0 8px;color:#aaa">Codigo do pedido</p><p style="margin:0;font-size:22px;font-weight:bold">${order.id}</p>${tracking}</div><p>Guarde este codigo para acompanhamento e suporte. Assim que houver novas atualizacoes logisticas, elas ficam vinculadas ao mesmo pedido.</p>`),
  };
}

function newsletterOptInTemplate() {
  return {
    subject: 'VELKOR - inscricao confirmada',
    text: 'Sua inscricao na newsletter VELKOR foi confirmada.',
    html: baseHtml('Newsletter VELKOR', '<p>Sua inscricao na newsletter VELKOR foi confirmada.</p>'),
  };
}

module.exports = {
  emailVerificationTemplate,
  newsletterOptInTemplate,
  orderConfirmationTemplate,
  orderPaymentApprovedTemplate,
  orderShippedTemplate,
  passwordResetTemplate,
};

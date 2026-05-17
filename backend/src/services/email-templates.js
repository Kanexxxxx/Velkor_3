function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function baseHtml(title, body) {
  return `
    <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.5">
      <h1 style="letter-spacing: .08em; text-transform: uppercase">VELKOR</h1>
      <h2>${title}</h2>
      ${body}
      <p style="margin-top: 32px; font-size: 12px; color: #555">Mensagem automatica da VELKOR.</p>
    </div>
  `;
}

function passwordResetTemplate({ resetUrl }) {
  return {
    subject: 'VELKOR - redefinir sua senha',
    text: `Use este link para redefinir sua senha VELKOR: ${resetUrl}\n\nSe voce nao pediu isso, ignore este email.`,
    html: baseHtml('Redefinir senha', `<p>Use o link abaixo para redefinir sua senha:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Se voce nao pediu isso, ignore este email.</p>`),
  };
}

function emailVerificationTemplate({ verificationUrl }) {
  return {
    subject: 'VELKOR - confirme seu email',
    text: `Confirme seu email VELKOR neste link: ${verificationUrl}`,
    html: baseHtml('Confirmar email', `<p>Confirme seu email pelo link abaixo:</p><p><a href="${verificationUrl}">${verificationUrl}</a></p>`),
  };
}

function orderConfirmationTemplate({ order }) {
  const total = money(order.total);
  const itemCount = Array.isArray(order.items) ? order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0) : 0;
  return {
    subject: `VELKOR - pedido ${order.id} confirmado`,
    text: `Parabens pela compra. Recebemos seu pedido ${order.id}. Total: ${total}. Itens: ${itemCount}. Voce recebera novas atualizacoes por email.`,
    html: baseHtml('Pedido confirmado', `<p>Parabens pela compra. Recebemos seu pedido <strong>${order.id}</strong>.</p><p>Total: <strong>${total}</strong></p><p>Itens: ${itemCount}</p><p>Voce recebera novas atualizacoes por email.</p>`),
  };
}

function orderShippedTemplate({ order }) {
  return {
    subject: `VELKOR - pedido ${order.id} enviado`,
    text: `Seu pedido ${order.id} foi enviado. Em breve voce recebe ou acompanha as atualizacoes de entrega pelos canais da VELKOR.`,
    html: baseHtml('Pedido enviado', `<p>Seu pedido <strong>${order.id}</strong> foi enviado.</p><p>Em breve voce recebe ou acompanha as atualizacoes de entrega pelos canais da VELKOR.</p>`),
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
  orderShippedTemplate,
  passwordResetTemplate,
};

const nodemailer = require('nodemailer');
const {
  emailVerificationTemplate,
  newsletterOptInTemplate,
  orderConfirmationTemplate,
  orderPaymentApprovedTemplate,
  orderShippedTemplate,
  passwordResetTemplate,
} = require('./email-templates');

function boolEnv(value) {
  return String(value).toLowerCase() === 'true';
}

function getEmailConfig(env = process.env) {
  return {
    host: env.GMAIL_HOST || 'smtp.gmail.com',
    port: Number(env.GMAIL_PORT || 587),
    user: env.GMAIL_USER || env.GMAIL_SMTP_USER || '',
    pass: env.GMAIL_PASS || env.GMAIL_SMTP_APP_PASSWORD || '',
    from: env.EMAIL_FROM || env.GMAIL_FROM || 'VELKOR <velkor.officiall@gmail.com>',
    devMode: boolEnv(env.EMAIL_DEV_MODE ?? 'true'),
  };
}

function isEmailConfigured(env = process.env) {
  const config = getEmailConfig(env);
  return Boolean(config.host && config.port && config.user && config.pass && !config.devMode);
}

function createEmailClient(env = process.env) {
  const config = getEmailConfig(env);
  let transporter = null;

  function getTransporter() {
    if (!transporter) {
      transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: {
          user: config.user,
          pass: config.pass,
        },
      });
    }
    return transporter;
  }

  async function sendEmail({ to, subject, text, html, template }) {
    if (!to || !subject) {
      const error = new Error('Email invalido.');
      error.statusCode = 400;
      throw error;
    }

    if (!isEmailConfigured(env)) {
      console.log(`email.dev template=${template || 'custom'} to=${to} subject=${subject}`);
      return { sent: false, mode: 'dev', template: template || 'custom', to };
    }

    await getTransporter().sendMail({
      from: config.from,
      to,
      subject,
      text,
      html,
    });
    console.log(`email.sent template=${template || 'custom'} to=${to} subject=${subject}`);
    return { sent: true, mode: 'smtp', template: template || 'custom', to };
  }

  return {
    sendEmail,
    sendPasswordResetEmail({ to, resetUrl }) {
      return sendEmail({ to, ...passwordResetTemplate({ resetUrl }), template: 'password-reset' });
    },
    sendEmailVerification({ to, verificationUrl }) {
      return sendEmail({ to, ...emailVerificationTemplate({ verificationUrl }), template: 'email-verification' });
    },
    sendOrderConfirmation({ to, order }) {
      return sendEmail({ to, ...orderConfirmationTemplate({ order }), template: 'order-confirmation' });
    },
    sendOrderPaymentApproved({ to, order }) {
      return sendEmail({ to, ...orderPaymentApprovedTemplate({ order }), template: 'order-payment-approved' });
    },
    sendOrderShipped({ to, order }) {
      return sendEmail({ to, ...orderShippedTemplate({ order }), template: 'order-shipped' });
    },
    sendNewsletterOptIn({ to }) {
      return sendEmail({ to, ...newsletterOptInTemplate(), template: 'newsletter-opt-in' });
    },
  };
}

module.exports = { createEmailClient, getEmailConfig, isEmailConfigured };

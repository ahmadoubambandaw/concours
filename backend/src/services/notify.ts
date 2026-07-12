// Service de notifications multi-canal (Email, SMS, WhatsApp, Push, in-app).
//
// Chaque canal a un adaptateur activé par variables d'environnement :
//   EMAIL    → SMTP (nodemailer) : SendGrid, Gmail, Mailgun, Resend, OVH…
//   SMS      → Twilio
//   WHATSAPP → WhatsApp Business Cloud API (Meta) ou Twilio WhatsApp
//   PUSH     → (à venir : Firebase Cloud Messaging)
//
// Si un canal n'est pas configuré, on retombe proprement sur un envoi
// « console » (journalisé) sans faire échouer la requête — l'app reste
// fonctionnelle, les envois deviennent réels dès que les clés sont posées.

import nodemailer from 'nodemailer';
import type { MessageChannel } from '@prisma/client';
import { prisma } from '../config/db';
import { env } from '../config/env';

export interface OutboundMessage {
  to: string; // email, numéro de téléphone ou token push
  subject?: string;
  body: string;
}

export interface SendResult {
  ok: boolean;
  simulated?: boolean;
  providerId?: string;
  error?: string;
}

/** Normalise un numéro sénégalais/international au format E.164 (+221…). */
export const toE164 = (raw: string, defaultCountry = '221'): string => {
  let s = raw.replace(/[^\d+]/g, '');
  if (s.startsWith('+')) return s;
  if (s.startsWith('00')) return '+' + s.slice(2);
  // Numéro local (ex. 77xxxxxxx) → préfixe pays par défaut.
  if (s.length <= 9) return `+${defaultCountry}${s}`;
  return '+' + s;
};

// ------------------------------------------------------------------
// Adaptateurs
// ------------------------------------------------------------------

let mailer: nodemailer.Transporter | null = null;
const getMailer = () => {
  if (!mailer) {
    mailer = nodemailer.createTransport({
      host: env.email.host,
      port: env.email.port,
      secure: env.email.secure,
      auth: { user: env.email.user, pass: env.email.pass },
    });
  }
  return mailer;
};

const sendEmail = async (msg: OutboundMessage): Promise<SendResult> => {
  if (!env.email.configured) return simulate('email', msg);
  const info = await getMailer().sendMail({
    from: env.email.from,
    to: msg.to,
    subject: msg.subject ?? 'Message de votre établissement',
    text: msg.body,
  });
  return { ok: true, providerId: info.messageId };
};

const twilioAuthHeader = () =>
  'Basic ' + Buffer.from(`${env.sms.twilioSid}:${env.sms.twilioToken}`).toString('base64');

const sendTwilio = async (from: string, to: string, body: string): Promise<SendResult> => {
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${env.sms.twilioSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: twilioAuthHeader(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: from, To: to, Body: body }),
    },
  );
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data.message ?? `HTTP ${res.status}` };
  return { ok: true, providerId: data.sid };
};

const sendSms = async (msg: OutboundMessage): Promise<SendResult> => {
  if (!env.sms.configured) return simulate('sms', msg);
  return sendTwilio(env.sms.twilioFrom, toE164(msg.to), msg.body);
};

const sendWhatsapp = async (msg: OutboundMessage): Promise<SendResult> => {
  const provider = env.whatsapp.provider;
  if (!provider) return simulate('whatsapp', msg);
  const to = toE164(msg.to);

  if (provider === 'meta') {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${env.whatsapp.metaPhoneId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.whatsapp.metaToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to.replace('+', ''),
          type: 'text',
          text: { body: msg.body },
        }),
      },
    );
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error?.message ?? `HTTP ${res.status}` };
    return { ok: true, providerId: data.messages?.[0]?.id };
  }

  // Twilio WhatsApp : les numéros sont préfixés par "whatsapp:".
  return sendTwilio(env.whatsapp.twilioFrom, `whatsapp:${to}`, msg.body);
};

const simulate = (channel: string, msg: OutboundMessage): SendResult => {
  console.log(`[notify:${channel}:SIMULÉ] → ${msg.to} : ${msg.subject ?? ''} ${msg.body.slice(0, 120)}`);
  return { ok: true, simulated: true };
};

// ------------------------------------------------------------------
// API publique
// ------------------------------------------------------------------

export const sendViaChannel = async (
  channel: MessageChannel,
  message: OutboundMessage,
): Promise<SendResult> => {
  if (channel === 'INTERNAL') return { ok: true }; // stocké en base uniquement
  try {
    switch (channel) {
      case 'EMAIL':
        return await sendEmail(message);
      case 'SMS':
        return await sendSms(message);
      case 'WHATSAPP':
        return await sendWhatsapp(message);
      case 'PUSH':
        return simulate('push', message); // FCM à venir
      default:
        return { ok: false, error: 'Canal inconnu' };
    }
  } catch (err) {
    console.error(`[notify:${channel}] échec`, err);
    return { ok: false, error: (err as Error).message };
  }
};

/** État de configuration de chaque canal (pour l'UI). */
export const channelStatus = () => ({
  INTERNAL: { configured: true, provider: 'in-app' },
  EMAIL: { configured: env.email.configured, provider: env.email.configured ? 'SMTP' : null },
  SMS: { configured: env.sms.configured, provider: env.sms.configured ? 'Twilio' : null },
  WHATSAPP: { configured: env.whatsapp.configured, provider: env.whatsapp.provider },
  PUSH: { configured: false, provider: null },
});

/** Notification in-app pour un utilisateur. */
export const notifyUser = async (
  userId: string,
  schoolId: string | null,
  title: string,
  body?: string,
  link?: string,
) => {
  await prisma.notification.create({
    data: { userId, schoolId, title, body, link },
  });
};

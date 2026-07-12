// Service de notifications multi-canal (Email, SMS, WhatsApp, Push).
//
// Architecture par adaptateurs : chaque canal implémente `ChannelProvider`.
// En développement (ou sans clés API), l'adaptateur "console" journalise
// simplement l'envoi. En production, brancher ici les fournisseurs réels
// (SMTP/SendGrid, Twilio, API WhatsApp Business, FCM) via les variables
// d'environnement correspondantes.

import type { MessageChannel } from '@prisma/client';
import { prisma } from '../config/db';

export interface OutboundMessage {
  to: string; // email, numéro de téléphone ou token push
  subject?: string;
  body: string;
}

export interface ChannelProvider {
  send(message: OutboundMessage): Promise<{ ok: boolean; providerId?: string }>;
}

class ConsoleProvider implements ChannelProvider {
  constructor(private channel: string) {}
  async send(message: OutboundMessage) {
    console.log(`[notify:${this.channel}] → ${message.to} : ${message.subject ?? ''} ${message.body.slice(0, 120)}`);
    return { ok: true };
  }
}

// Points d'extension production — remplacer par les vrais SDK :
//   EMAIL    : nodemailer/SendGrid  (SMTP_URL / SENDGRID_API_KEY)
//   SMS      : Twilio / Orange SMS API (TWILIO_SID…)
//   WHATSAPP : WhatsApp Business Cloud API (WA_TOKEN, WA_PHONE_ID)
//   PUSH     : Firebase Cloud Messaging (FCM_SERVER_KEY)
const providers: Record<Exclude<MessageChannel, 'INTERNAL'>, ChannelProvider> = {
  EMAIL: new ConsoleProvider('email'),
  SMS: new ConsoleProvider('sms'),
  WHATSAPP: new ConsoleProvider('whatsapp'),
  PUSH: new ConsoleProvider('push'),
};

export const sendViaChannel = async (
  channel: MessageChannel,
  message: OutboundMessage,
): Promise<boolean> => {
  if (channel === 'INTERNAL') return true; // stocké en base uniquement
  try {
    const result = await providers[channel].send(message);
    return result.ok;
  } catch (err) {
    console.error(`[notify:${channel}] échec`, err);
    return false;
  }
};

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

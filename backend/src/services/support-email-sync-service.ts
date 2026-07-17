import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { desc, eq, inArray } from "drizzle-orm";
import { env } from "../config/env.js";
import { db } from "../lib/db/drizzle.js";
import { adminNotifications, supportMessages, supportTickets } from "../lib/db/schema.js";
import { logger } from "../lib/logger.js";

type SyncOptions = {
  limit?: number;
  markSeen?: boolean;
};

type SyncResult = {
  configured: boolean;
  processed: number;
  imported: number;
  skipped: number;
};

let syncInProgress = false;
let schedulerStarted = false;

export function isSupportEmailSyncConfigured() {
  return Boolean(env.SUPPORT_IMAP_HOST && env.SUPPORT_IMAP_USER && env.SUPPORT_IMAP_PASS);
}

export function startSupportEmailSyncScheduler() {
  if (schedulerStarted || env.NODE_ENV === "test" || !isSupportEmailSyncConfigured()) return;
  schedulerStarted = true;

  const intervalMs = env.SUPPORT_IMAP_SYNC_INTERVAL_SECONDS * 1000;
  setInterval(() => {
    void syncSupportInboxEmails({ limit: 25 }).catch((error) => {
      logger.warn({ error }, "support_email_sync_scheduled_failed");
    });
  }, intervalMs).unref();
}

export async function syncSupportInboxEmails(options: SyncOptions = {}): Promise<SyncResult> {
  if (!isSupportEmailSyncConfigured()) {
    return { configured: false, processed: 0, imported: 0, skipped: 0 };
  }

  if (syncInProgress) {
    return { configured: true, processed: 0, imported: 0, skipped: 0 };
  }

  syncInProgress = true;
  const result: SyncResult = { configured: true, processed: 0, imported: 0, skipped: 0 };
  const mailbox = env.SUPPORT_IMAP_MAILBOX;

  const client = new ImapFlow({
    host: env.SUPPORT_IMAP_HOST!,
    port: env.SUPPORT_IMAP_PORT ?? 993,
    secure: env.SUPPORT_IMAP_SECURE ?? true,
    auth: {
      user: env.SUPPORT_IMAP_USER!,
      pass: env.SUPPORT_IMAP_PASS!,
    },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock(mailbox);
    try {
      const searched = await client.search({ seen: false }, { uid: true });
      const uids = Array.isArray(searched) ? searched.slice(-(options.limit ?? 25)) : [];

      for (const uid of uids) {
        result.processed += 1;
        const message = await client.fetchOne(String(uid), { source: true, envelope: true, uid: true }, { uid: true });
        if (!message || !message.source) {
          result.skipped += 1;
          continue;
        }

        const parsed = await simpleParser(message.source);
        const imported = await importParsedSupportEmail({
          uid,
          mailbox,
          fromName: firstAddressName(parsed.from) || firstAddressAddress(parsed.from) || "Customer",
          fromEmail: firstAddressAddress(parsed.from),
          subject: parsed.subject || "(no subject)",
          text: messageBody(parsed.text, parsed.html),
          date: parsed.date || new Date(),
          messageId: normalizeMessageId(parsed.messageId) || `<support-${mailbox}-${uid}@yehagerbahillibs.com>`,
          inReplyTo: normalizeMessageId(parsed.inReplyTo),
          references: normalizeReferences(parsed.references),
          attachmentNames: parsed.attachments?.flatMap((attachment) => (attachment.filename ? [attachment.filename] : [])) ?? [],
        });

        if (imported) {
          result.imported += 1;
        } else {
          result.skipped += 1;
        }

        if (options.markSeen !== false) {
          await client.messageFlagsAdd([uid], ["\\Seen"], { uid: true });
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    syncInProgress = false;
    await client.logout().catch(() => undefined);
  }

  return result;
}

async function importParsedSupportEmail(input: {
  uid: number;
  mailbox: string;
  fromName: string;
  fromEmail?: string | null;
  subject: string;
  text: string;
  date: Date;
  messageId: string;
  inReplyTo?: string | null;
  references: string[];
  attachmentNames: string[];
}) {
  const fromEmail = input.fromEmail?.trim().toLowerCase();
  const internalSenders = [
    env.SUPPORT_IMAP_USER,
    env.SMTP_SUPPORT_USER,
    env.SMTP_TEAM_USER,
    env.SMTP_INFO_USER,
    env.SMTP_USER,
  ]
    .filter(Boolean)
    .map((email) => email!.toLowerCase());
  if (!fromEmail || internalSenders.includes(fromEmail)) return false;

  const existing = await db.query.supportMessages.findFirst({
    where: eq(supportMessages.emailMessageId, input.messageId),
  });
  if (existing) return false;

  const ticket = await findMatchingTicket(input, fromEmail);
  const ticketId = ticket?.id ?? (await createEmailSupportTicket(input, fromEmail)).id;
  const body =
    input.attachmentNames.length > 0
      ? `${input.text}\n\nAttachments received by email: ${input.attachmentNames.join(", ")}`
      : input.text;

  await db.insert(supportMessages).values({
    ticketId,
    senderType: "customer",
    senderName: input.fromName,
    senderEmail: fromEmail,
    messageBody: body,
    attachments: [],
    isRead: false,
    createdAt: input.date,
    emailMessageId: input.messageId,
    emailInReplyTo: input.inReplyTo,
    emailReferences: input.references.join(" "),
    emailUid: input.uid,
    emailMailbox: input.mailbox,
    emailSubject: input.subject,
  });

  await db
    .update(supportTickets)
    .set({
      status: ticket ? "open" : "new",
      unreadByAdmin: true,
      unreadByCustomer: false,
      lastMessageAt: input.date,
      updatedAt: new Date(),
    })
    .where(eq(supportTickets.id, ticketId));

  await db.insert(adminNotifications).values({
    type: ticket ? "support_reply_received" : "new_ticket",
    title: ticket ? `New reply: ${ticket.ticketNumber}` : `New Email Ticket: ${input.subject}`,
    message: `${input.fromName} emailed support from ${fromEmail}.`,
    relatedTicketId: ticketId,
    isRead: false,
  });

  return true;
}

async function findMatchingTicket(
  input: {
    subject: string;
    inReplyTo?: string | null;
    references: string[];
  },
  fromEmail: string,
) {
  const ticketNumber = extractTicketNumber(input.subject);
  if (ticketNumber) {
    const byNumber = await db.query.supportTickets.findFirst({
      where: eq(supportTickets.ticketNumber, ticketNumber),
    });
    if (byNumber) return byNumber;
  }

  const referenceIds = [input.inReplyTo, ...input.references].filter(Boolean) as string[];
  if (referenceIds.length > 0) {
    const referencedMessage = await db.query.supportMessages.findFirst({
      where: inArray(supportMessages.emailMessageId, referenceIds),
    });
    if (referencedMessage) {
      const byReference = await db.query.supportTickets.findFirst({
        where: eq(supportTickets.id, referencedMessage.ticketId),
      });
      if (byReference) return byReference;
    }
  }

  const threadKey = emailThreadKey(fromEmail, input.subject);
  return db.query.supportTickets.findFirst({
    where: eq(supportTickets.emailThreadKey, threadKey),
    orderBy: [desc(supportTickets.lastMessageAt)],
  });
}

async function createEmailSupportTicket(
  input: {
    fromName: string;
    subject: string;
    text: string;
  },
  fromEmail: string,
) {
  const ticketNumber = await nextTicketNumber();
  const [ticket] = await db
    .insert(supportTickets)
    .values({
      ticketNumber,
      customerName: input.fromName,
      customerEmail: fromEmail,
      subject: input.subject,
      category: autoDetectCategory(input.subject, input.text),
      priority: "medium",
      status: "new",
      source: "email",
      emailThreadKey: emailThreadKey(fromEmail, input.subject),
      unreadByAdmin: true,
      unreadByCustomer: false,
    })
    .returning();

  return ticket;
}

async function nextTicketNumber() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const ticketNumber = `TK-${Math.floor(100000 + Math.random() * 900000)}`;
    const existing = await db.query.supportTickets.findFirst({
      where: eq(supportTickets.ticketNumber, ticketNumber),
    });
    if (!existing) return ticketNumber;
  }
  return `TK-${Date.now().toString().slice(-6)}`;
}

function normalizeMessageId(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const wrapped = trimmed.startsWith("<") ? trimmed : `<${trimmed}>`;
  return wrapped.toLowerCase();
}

function normalizeReferences(value: unknown) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => normalizeMessageId(String(item))).filter(Boolean) as string[];
  return String(value)
    .split(/\s+/)
    .map((item) => normalizeMessageId(item))
    .filter(Boolean) as string[];
}

function firstAddressAddress(addressObject: unknown) {
  const value = (addressObject as { value?: Array<{ address?: string }> } | undefined)?.value?.[0]?.address;
  return value || null;
}

function firstAddressName(addressObject: unknown) {
  const value = (addressObject as { value?: Array<{ name?: string }> } | undefined)?.value?.[0]?.name;
  return value || null;
}

function messageBody(text?: string | false, html?: string | false) {
  if (text && text.trim()) return stripQuotedEmailHistory(text);
  if (!html) return "(no message body)";
  return stripQuotedEmailHistory(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
}

function stripQuotedEmailHistory(value: string) {
  const lines = value.replace(/\r\n/g, "\n").split("\n");
  const quoteStart = lines.findIndex((line) => {
    const trimmed = line.trim();
    return /^On .+ wrote:\s*$/i.test(trimmed) || /^-{2,}\s*Original Message\s*-{2,}$/i.test(trimmed);
  });
  const unquotedLines = quoteStart >= 0 ? lines.slice(0, quoteStart) : lines;
  const cleaned = unquotedLines.filter((line) => !/^\s*>/.test(line));
  return cleaned.join("\n").trim() || "(no message body)";
}

function extractTicketNumber(subject: string) {
  return subject.match(/\bTK-\d{6}\b/i)?.[0]?.toUpperCase() ?? null;
}

function emailThreadKey(email: string, subject: string) {
  const normalizedSubject = subject
    .replace(/\b(re|fw|fwd):\s*/gi, "")
    .replace(/\bTK-\d{6}\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return `${email.toLowerCase()}::${normalizedSubject || "(no subject)"}`;
}

function autoDetectCategory(subject: string, message = "") {
  const text = `${subject} ${message}`.toLowerCase();
  if (text.includes("payment") || text.includes("checkout") || text.includes("bank")) return "payment_issue";
  if (text.includes("order") || text.includes("track") || text.includes("receipt")) return "order_question";
  if (text.includes("delivery") || text.includes("shipping")) return "delivery_issue";
  if (text.includes("size") || text.includes("measurement") || text.includes("tailor")) return "measurement_question";
  if (text.includes("refund") || text.includes("return") || text.includes("cancel")) return "return_refund";
  if (text.includes("complain") || text.includes("delay")) return "complaint";
  if (text.includes("error") || text.includes("login") || text.includes("website")) return "technical_issue";
  return "general_question";
}

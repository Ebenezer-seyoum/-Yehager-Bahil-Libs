import nodemailer from "nodemailer";
import { Resend } from "resend";
import { env } from "../config/env.js";

type MailChannel = "notifications" | "support" | "team";

type MailPayload = {
  to?: string | string[] | null;
  subject: string;
  text: string;
  html?: string;
  channel?: MailChannel;
  replyTo?: string;
  messageId?: string;
  inReplyTo?: string;
  references?: string | string[];
  headers?: Record<string, string>;
};

type PasswordLinkPayload = {
  to?: string | null;
  name?: string | null;
  link: string;
  expiresAt: Date;
  accountType?: "customer" | "employee" | "admin";
};

type CustomDesignPayload = {
  to?: string | null;
  customerName?: string | null;
  submissionNumber?: string | null;
  designTitle?: string | null;
  quotedPriceUsd?: string | number | null;
  estimatedDeliveryLabel?: string | null;
  reason?: string | null;
  imageUrls?: string[];
  fabricType?: string | null;
  embroideryStyle?: string | null;
  colorPreference?: string | null;
  gender?: string | null;
  measurementSnapshot?: Record<string, unknown> | null;
  memberPricing?: Array<Record<string, unknown>>;
};

type OrderStatusPayload = {
  to?: string | null;
  customerName?: string | null;
  orderNumber?: string | null;
  status?: string | null;
  deliveryStatus?: string | null;
  paymentStatus?: string | null;
  fulfillmentType?: string | null;
  carrier?: string | null;
  trackingNumber?: string | null;
  designTitle?: string | null;
  fabricType?: string | null;
  embroideryStyle?: string | null;
  colorPreference?: string | null;
  gender?: string | null;
  measurementSnapshot?: Record<string, unknown> | null;
  imageUrls?: string[];
  memberPricing?: Array<Record<string, unknown>>;
  /** Pass true to show the cancellation policy block (e.g. on new order confirmation). */
  showCancellationPolicy?: boolean;
};

type VerificationCodePayload = {
  to?: string | null;
  name?: string | null;
  code: string;
  expiresInMinutes: number;
};

type AdminOrderPayload = {
  orderId?: string | null;
  orderNumber?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  status?: string | null;
  paymentStatus?: string | null;
  totalUsd?: string | number | null;
  paymentMethod?: string | null;
};

type AdminOrderStatusPayload = AdminOrderPayload & {
  previousStatus?: string | null;
  deliveryStatus?: string | null;
  carrier?: string | null;
  trackingNumber?: string | null;
  changedBy?: string | null;
};

type AccountStatusPayload = {
  to?: string | null;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  status?: string | null;
  changedBy?: string | null;
};

type SupportTicketPayload = {
  ticketNumber?: string | null;
  subject?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  message?: string | null;
};

type EmployeeRoleAssignedPayload = {
  to?: string | null;
  name?: string | null;
  roleName?: string | null;
  permissionKeys?: string[];
};

// ─── Transport setup ─────────────────────────────────────────────────────────

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

function smtpCredentials(channel: MailChannel = "notifications") {
  if (channel === "team") {
    return {
      user: env.SMTP_TEAM_USER || env.SMTP_USER,
      pass: env.SMTP_TEAM_PASS || env.SMTP_PASS,
    };
  }

  if (channel === "support") {
    return {
      user: env.SMTP_SUPPORT_USER || env.SMTP_USER,
      pass: env.SMTP_SUPPORT_PASS || env.SMTP_PASS,
    };
  }

  return {
    user: env.SMTP_INFO_USER || env.SMTP_USER,
    pass: env.SMTP_INFO_PASS || env.SMTP_PASS,
  };
}

function smtpTransporter(channel: MailChannel = "notifications") {
  if (resend || !env.SMTP_HOST) return null;
  const credentials = smtpCredentials(channel);
  if (!credentials.user || !credentials.pass) return null;

  const port = env.SMTP_PORT ?? 587;
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure: env.SMTP_SECURE ?? port === 465,
    auth: credentials,
  });
}

function isConfigured(channel: MailChannel = "notifications") {
  return Boolean(resend || smtpTransporter(channel));
}

function smtpDefaultFrom(name: string, smtpUser?: string | null) {
  return smtpUser ? `${name} <${smtpUser}>` : null;
}

function fromAddress(channel: MailChannel = "notifications", smtpUser?: string | null) {
  let configuredFrom = env.EMAIL_NOTIFICATIONS_FROM;
  let defaultName = "Yehager Bahil Libs";

  if (channel === "support") {
    configuredFrom = env.EMAIL_SUPPORT_FROM;
    defaultName = "Yehager Bahil Support";
  } else if (channel === "team") {
    configuredFrom = env.EMAIL_TEAM_FROM;
    defaultName = "Yehager Bahil Team";
  }

  const baseFrom = configuredFrom || env.EMAIL_FROM;

  // If using Resend (verified domains allowed), return as-is
  if (resend) {
    return baseFrom || `${defaultName} <info@yehagerbahillibs.com>`;
  }

  // If using SMTP, force the email portion to be env.SMTP_USER to prevent 553 errors
  if (smtpUser) {
    let displayName = defaultName;
    if (baseFrom) {
      const match = baseFrom.match(/^(.*?)\s*<.*?>/);
      if (match && match[1]) {
        displayName = match[1].trim();
      } else if (!baseFrom.includes("@")) {
        displayName = baseFrom.trim();
      }
    }
    // Clean up surrounding quotes
    displayName = displayName.replace(/^["']|["']$/g, "").trim();
    return `${displayName} <${smtpUser}>`;
  }

  return baseFrom || `${defaultName} <info@yehagerbahillibs.com>`;
}

function defaultReplyTo(channel: MailChannel = "notifications") {
  return env.EMAIL_SUPPORT_FROM || "Yehager Bahil Support <support@yehagerbahillibs.com>";
}

function internalNotificationRecipients() {
  return emailAddress(env.EMAIL_TEAM_FROM, "") || undefined;
}

// ─── HTML helpers ─────────────────────────────────────────────────────────────

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function paragraph(lines: Array<string | null | undefined>) {
  return lines.filter(Boolean).join("\n\n");
}

function detailsList(items: Array<[string, unknown]>) {
  const rows = items
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 16px 8px 0;color:#b8a46e;font-size:13px;white-space:nowrap">${escapeHtml(label)}</td><td style="padding:8px 0;color:#fff7df;font-size:13px;font-weight:700;text-align:right">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  if (!rows) return "";
  return `<table role="presentation" style="width:100%;border-collapse:collapse;margin:20px 0;border-top:1px solid #3d321d;border-bottom:1px solid #3d321d">${rows}</table>`;
}

function actionButton(label: string, href: string) {
  return `<p style="margin:24px 0"><a href="${escapeHtml(href)}" style="display:inline-block;background:#d6a43d;color:#18130a;text-decoration:none;border-radius:6px;padding:14px 24px;font-weight:800;font-size:14px;letter-spacing:.02em">${escapeHtml(label)}</a></p>`;
}

function logoUrl() {
  // Prefer an explicit logo URL env var; fall back to the production website.
  return env.EMAIL_LOGO_URL || "https://www.yehagerbahillibs.com/images/email-logo.jpg";
}

function emailAddress(value: string | undefined, fallback: string) {
  const match = value?.match(/<([^>]+)>/);
  return match?.[1] ?? value ?? fallback;
}

function emailImage(url: string | null | undefined, alt: string, width = 560) {
  if (!url || !/^https:\/\//i.test(url)) return "";
  return `<div style="margin:20px 0;text-align:center"><img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" width="${width}" style="display:block;width:100%;max-width:${width}px;height:auto;margin:0 auto;border:0;border-radius:8px" /></div>`;
}

function designImageGrid(imageUrls: string[] = []) {
  const labels = ["Front View", "Side View", "Back View", "Detail / Close-Up"];
  const images = imageUrls
    .filter((url): url is string => Boolean(url) && /^https:\/\//i.test(url))
    .slice(0, 4);
  if (!images.length) return "";
  const cells = images.map((url, index) => `
    <td style="width:${Math.floor(100 / images.length)}%;padding:4px;vertical-align:top;text-align:center">
      <img src="${escapeHtml(url)}" alt="${escapeHtml(labels[index])}" width="140" style="display:block;width:100%;height:120px;object-fit:cover;margin:0 auto;border:1px solid #4d3714;border-radius:6px" />
      <p style="margin:6px 0 0;color:#d6a43d;font-size:11px;font-weight:800;line-height:1.2">${escapeHtml(labels[index])}</p>
    </td>`).join("");
  return `<div style="margin:20px 0"><p style="margin:0 0 8px;color:#d6a43d;font-size:16px;font-weight:900">🖼️ Uploaded Design Images</p><table role="presentation" style="width:100%;border-collapse:collapse;table-layout:fixed"><tr>${cells}</tr></table></div>`;
}

function designSpecificationsSection(payload: CustomDesignPayload) {
  const rows: Array<[string, unknown]> = [
    ["Outfit Type", payload.designTitle],
    ["Fabric", payload.fabricType],
    ["Embroidery Type", payload.embroideryStyle],
    ["Color Theme", payload.colorPreference],
    ["Gender", payload.gender],
  ];
  const measurementEntries = Object.entries(payload.measurementSnapshot ?? {}).filter(([, value]) => value != null && String(value).trim() !== "");
  if (!rows.some(([, value]) => value) && !measurementEntries.length) return "";
  const measurementHtml = measurementEntries.length
    ? `<p style="margin:18px 0 8px;color:#d6a43d;font-size:15px;font-weight:900">📏 Custom Measurements</p>${detailsList(measurementEntries.map(([key, value]) => [key.replaceAll("_", " "), value]))}`
    : "";
  return `<div style="margin:20px 0"><p style="margin:0 0 8px;color:#d6a43d;font-size:16px;font-weight:900">🎨 Your Design Specifications</p>${detailsList(rows)}${measurementHtml}</div>`;
}

function memberPricingSection(memberPricing: Array<Record<string, unknown>> = []) {
  if (!memberPricing.length) return "";
  return `<div style="margin:20px 0"><p style="margin:0 0 8px;color:#d6a43d;font-size:16px;font-weight:900">👥 Member Pricing</p>${detailsList(memberPricing.map((member) => [String(member.member_name ?? member.member_id ?? "Member"), `$${Number(member.price_usd ?? 0).toFixed(2)}`]))}</div>`;
}

export function appLink(path: string) {
  const base = env.FRONTEND_APP_URL.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

// ─── Order Journey Tracker ────────────────────────────────────────────────────

function orderJourneyHtml() {
  const steps = [
    { emoji: "🔍", label: "Order Review", days: "1–2 days" },
    { emoji: "✂️", label: "Production", days: "20–35 days" },
    { emoji: "🔍", label: "Quality Check", days: "3–5 days" },
    { emoji: "🚚", label: "Shipping", days: "5–15 days" },
    { emoji: "🎉", label: "Delivery", days: "At your door" },
  ];

  const cells = steps
    .map(
      (step, i) => `
      <td style="text-align:center;padding:0 4px;vertical-align:top;width:${Math.floor(100 / (steps.length * 2 - 1))}%">
        <div style="font-size:22px;margin-bottom:6px">${step.emoji}</div>
        <div style="color:#fff7df;font-size:11px;font-weight:700;margin-bottom:2px">${escapeHtml(step.label)}</div>
        <div style="color:#b8a46e;font-size:10px">${escapeHtml(step.days)}</div>
      </td>
      ${i < steps.length - 1 ? `<td style="text-align:center;vertical-align:middle;color:#d6a43d;font-size:16px;padding:0 2px">→</td>` : ""}
    `,
    )
    .join("");

  return `
    <div style="margin:24px 0">
      <p style="margin:0 0 12px;color:#d6a43d;font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase">📦 Your Order Journey</p>
      <table role="presentation" style="width:100%;border-collapse:collapse">
        <tr>${cells}</tr>
      </table>
    </div>
  `;
}

// ─── ETB Awaiting Verification Block ─────────────────────────────────────────

function etbVerificationBlock() {
  return `
    <div style="margin:20px 0;padding:16px;background:#3d2e00;border:1px solid #b8860b;border-radius:8px">
      <p style="margin:0 0 6px;color:#ffd166;font-size:14px;font-weight:800">⏳ ETB Bank Transfer — Awaiting Verification</p>
      <p style="margin:0;color:#e8cc7a;font-size:13px;line-height:1.6">Your payment proof has been received. Our team will verify your transfer within a few hours and begin tailoring once confirmed.</p>
    </div>
  `;
}

// ─── Production / Cancellation Policy Block ──────────────────────────────────

function cancellationPolicyBlock(orderNumber?: string | null, customerName?: string | null) {
  const hasDetails = orderNumber || customerName;
  const cancellationSection = hasDetails
    ? `
      <div style="margin:20px 0;padding:16px;background:#1b1010;border-left:4px solid #c0392b;border-radius:0 6px 6px 0">
        <p style="margin:0 0 8px;color:#e74c3c;font-size:14px;font-weight:800">❌ How to Request a Cancellation</p>
        <p style="margin:0 0 10px;color:#c8b98b;font-size:13px">Submit your request <strong style="color:#fff7df">via email within 3 days</strong>. Include:</p>
        <ul style="margin:0 0 10px;padding-left:20px;color:#c8b98b;font-size:13px;line-height:1.8">
          ${orderNumber ? `<li>Your Order Number: <strong style="color:#d6a43d">${escapeHtml(orderNumber)}</strong></li>` : ""}
          ${customerName ? `<li>Your Full Name: <strong style="color:#fff7df">${escapeHtml(customerName)}</strong></li>` : ""}
        </ul>
        <p style="margin:0;color:#c8b98b;font-size:13px">Send to: <a href="mailto:support@yehagerbahillibs.com" style="color:#d6a43d;text-decoration:none;font-weight:700">support@yehagerbahillibs.com</a></p>
      </div>
    `
    : "";

  return `
    <div style="margin:20px 0;padding:16px;background:#2a0a0a;border:1px solid #8b0000;border-radius:8px">
      <p style="margin:0 0 10px;color:#ff6b6b;font-size:14px;font-weight:800">⚠️ IMPORTANT — Production &amp; Cancellation Policy</p>
      <ul style="margin:0;padding-left:20px;color:#c8b98b;font-size:13px;line-height:2">
        <li><strong style="color:#fff7df">Production begins shortly after order confirmation.</strong></li>
        <li>You have <strong style="color:#fff7df">3 days (72 hours)</strong> to request cancellations or adjustments.</li>
        <li>Once cutting begins, <strong style="color:#ff6b6b">no changes or cancellations are possible.</strong></li>
      </ul>
    </div>
    ${cancellationSection}
  `;
}

// ─── Track Online Box ─────────────────────────────────────────────────────────

function trackOnlineBox() {
  const link = appLink("/my-orders");
  return `
    <div style="margin:20px 0;padding:14px 16px;background:#1a1f2e;border:1px solid #2a3a5c;border-radius:8px">
      <p style="margin:0 0 4px;color:#7aa3e0;font-size:13px;font-weight:800">🔐 Track Your Order Online</p>
      <p style="margin:0;color:#9ab0d0;font-size:13px">Log in at <a href="${escapeHtml(link)}" style="color:#d6a43d;text-decoration:none;font-weight:700">YehagerBahilLibs.com</a> to track your order in real time.</p>
    </div>
  `;
}

// ─── HTML Shell ───────────────────────────────────────────────────────────────

function htmlShell(title: string, body: string) {
  return `
    <div style="margin:0;padding:0;background:#120f09">
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#f8f1dc;max-width:640px;margin:0 auto;padding:28px 18px">
        <div style="background:#1b160d;border:1px solid #4d3714;border-radius:8px;padding:32px 28px">

          <!-- Header -->
          <div style="text-align:center;margin-bottom:22px">
            <div style="text-align:center">
              <img src="${escapeHtml(logoUrl())}" alt="Yehager Bahil Libs" width="88" height="88" style="display:block;width:88px;height:88px;object-fit:contain;margin:0 auto;border:3px solid #fff;border-radius:50%;background:#fff;outline:none;text-decoration:none" />
            </div>
          </div>
          <p style="margin:0 0 4px;text-align:center;color:#d6a43d;font-size:22px;font-weight:900;letter-spacing:.01em">Yehager Bahil Libs</p>
          <p style="margin:0 0 20px;text-align:center;color:#a88b4a;font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase">Where Tradition Meets Your Perfect Fit</p>

          <!-- Title -->
          <h1 style="font-size:22px;line-height:1.25;margin:0 0 20px;color:#fff7df;border-bottom:1px solid #3d321d;padding-bottom:16px">${escapeHtml(title)}</h1>

          <!-- Body -->
          ${body}

          <!-- Footer -->
          <div style="margin-top:28px;padding-top:20px;border-top:1px solid #3d321d;color:#c8b98b;font-size:13px">
            <p style="margin:0 0 12px">If you have any questions or need any changes before placing your order, please contact us at the details below before proceeding.</p>
            <div style="margin:18px 0;padding:16px;border:1px solid #6d511d;border-radius:8px;background:#211a0d">
              <p style="margin:0 0 8px;color:#d6a43d;font-size:16px;font-weight:900">📞 Questions? Contact Us Directly</p>
              <p style="margin:0 0 4px;color:#fff7df;font-weight:800">Production Manager (Ethiopia)</p>
              <p style="margin:0 0 4px">📞 <a href="tel:${escapeHtml(env.PRODUCTION_PHONE)}" style="color:#d6a43d;text-decoration:none;font-weight:800">${escapeHtml(env.PRODUCTION_PHONE)}</a> (WhatsApp)</p>
              <p style="margin:0">✉️ <a href="mailto:${escapeHtml(env.PRODUCTION_EMAIL)}" style="color:#d6a43d;text-decoration:none">${escapeHtml(env.PRODUCTION_EMAIL)}</a></p>
            </div>
            <div style="margin:18px 0;padding:16px;border:1px solid #4d3714;border-radius:8px;background:#1b160d">
              <p style="margin:0 0 4px;color:#fff7df;font-weight:800">Customer Support</p>
              <p style="margin:0">✉️ <a href="mailto:${escapeHtml(emailAddress(env.SUPPORT_NOTIFICATION_EMAIL, "support@yehagerbahillibs.com"))}" style="color:#d6a43d;text-decoration:none">${escapeHtml(emailAddress(env.SUPPORT_NOTIFICATION_EMAIL, "support@yehagerbahillibs.com"))}</a></p>
            </div>
            <div style="margin:26px -4px 0;padding:28px 16px;background:#1b160d;text-align:center">
              <p style="margin:0 0 6px;color:#d6a43d;font-size:22px;font-weight:700;font-style:italic">Thank you for choosing us.</p>
              <p style="margin:0 0 12px;color:#b8b0a5;font-size:18px">Wear your culture with pride.</p>
              <p style="margin:0 0 14px"><a href="https://www.yehagerbahillibs.com/" style="color:#d6a43d;text-decoration:none;font-size:18px;font-weight:800">🌐 YehagerBahilLibs.com</a></p>
              <p style="margin:0;color:#706b66;font-size:14px;line-height:1.5">© ${new Date().getFullYear()} Yehager Bahil Libs · Naomi Investments LLC ·<br />Minnesota, USA</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ─── Send helpers ─────────────────────────────────────────────────────────────

export async function sendTransactionalEmail(payload: MailPayload) {
  if (!payload.to || (Array.isArray(payload.to) && payload.to.length === 0)) return { sent: false, skipped: true, reason: "missing_recipient" };
  const channel = payload.channel ?? "notifications";
  if (!isConfigured(channel)) return { sent: false, skipped: true, reason: "mail_not_configured" };

  const credentials = smtpCredentials(channel);
  const from = fromAddress(channel, credentials.user);
  const replyTo = payload.replyTo ?? defaultReplyTo(channel);

  if (resend) {
    await resend.emails.send({
      from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      replyTo,
      headers: payload.headers,
    });
  } else {
    const transporter = smtpTransporter(channel);
    if (!transporter) return { sent: false, skipped: true, reason: "mail_not_configured" };
    await transporter.sendMail({
      from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      replyTo,
      messageId: payload.messageId,
      inReplyTo: payload.inReplyTo,
      references: payload.references,
      headers: payload.headers,
    });
  }

  return { sent: true, skipped: false };
}

export async function sendTransactionalEmailSafely(payload: MailPayload) {
  try {
    return await sendTransactionalEmail(payload);
  } catch (error) {
    console.warn("transactional_email_failed", {
      to: payload.to,
      subject: payload.subject,
      error: error instanceof Error ? error.message : "Unknown mail error",
    });
    return { sent: false, skipped: false, reason: "send_failed" };
  }
}

export function resetPasswordLink(token: string, isSetup = false) {
  const url = `/reset-password?token=${encodeURIComponent(token)}`;
  return appLink(isSetup ? `${url}&setup=true` : url);
}

// ─── Customer auth emails ─────────────────────────────────────────────────────

export async function sendCustomerVerificationCodeEmail(payload: VerificationCodePayload) {
  const name = payload.name || "Customer";
  return sendTransactionalEmailSafely({
    channel: "notifications",
    to: payload.to,
    subject: "✅ Verify your Yehager Bahil account",
    text: paragraph([
      `Hello ${name},`,
      `Your verification code is ${payload.code}.`,
      `This code expires in ${payload.expiresInMinutes} minutes.`,
      "If you did not request this, you can ignore this email.",
    ]),
    html: htmlShell(
      "Verify Your Account",
      `
      <p>Hello <strong>${escapeHtml(name)}</strong>,</p>
      <p>Use this one-time code to finish creating your Yehager Bahil Libs account.</p>
      <div style="margin:28px 0;padding:24px;border:2px solid #d6a43d;border-radius:12px;background:#241b0c;text-align:center">
        <p style="margin:0 0 8px;color:#c8b98b;font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Verification Code</p>
        <p style="margin:0;color:#ffd166;font-size:40px;letter-spacing:10px;font-weight:900;font-family:monospace">${escapeHtml(payload.code)}</p>
      </div>
      <p style="color:#c8b98b;font-size:13px">⏱ This code expires in <strong style="color:#fff7df">${escapeHtml(payload.expiresInMinutes)} minutes</strong>.</p>
      <p style="color:#c8b98b;font-size:13px">If you did not request this, you can safely ignore this email.</p>
      `,
    ),
  });
}

export async function sendRegistrationEmail(payload: { to?: string | null; name?: string | null }) {
  const name = payload.name || "Customer";
  const signInUrl = appLink("/signin");
  const catalogUrl = appLink("/catalog");
  return sendTransactionalEmailSafely({
    channel: "notifications",
    to: payload.to,
    subject: "🎉 Welcome to Yehager Bahil Libs — Your account is ready!",
    text: paragraph([
      `Hello ${name},`,
      "Welcome to Yehager Bahil Libs! Your account has been created successfully.",
      "Explore our collection of handcrafted Ethiopian traditional garments made to your exact measurements.",
      `Sign in here: ${signInUrl}`,
    ]),
    html: htmlShell(
      "Welcome to Yehager Bahil Libs! 🎉",
      `
      <p>Hello <strong>${escapeHtml(name)}</strong>,</p>
      <p>Your Yehager Bahil Libs account has been created successfully. We are thrilled to have you!</p>
      <div style="margin:20px 0;padding:16px;background:#1a2410;border:1px solid #3a5c1a;border-radius:8px">
        <p style="margin:0 0 8px;color:#7dc45a;font-size:13px;font-weight:800">✅ Account Created Successfully</p>
        <p style="margin:0;color:#a8c88b;font-size:13px">You can now browse our catalog, save measurements, and place custom garment orders.</p>
      </div>
      ${actionButton("Sign In to Your Account", signInUrl)}
      ${actionButton("Browse Our Catalog", catalogUrl)}
      <p style="color:#c8b98b;font-size:13px">Our master tailors in Ethiopia will handcraft every garment to your exact measurements. Every piece is made with love and precision.</p>
      `,
    ),
  });
}

export async function sendPasswordSetupEmail(payload: PasswordLinkPayload) {
  const name = payload.name || "there";
  const expires = payload.expiresAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  const isStaff = payload.accountType === "employee" || payload.accountType === "admin";
  const roleLabel = payload.accountType === "admin" ? "Administrator" : payload.accountType === "employee" ? "Team Member" : "Customer";
  return sendTransactionalEmailSafely({
    channel: isStaff ? "team" : "notifications",
    to: payload.to,
    subject: isStaff ? "🔐 Set up your Yehager Bahil staff account password" : "🔐 Set up your Yehager Bahil account password",
    text: paragraph([
      `Hello ${name},`,
      `An account has been created for you as ${payload.accountType ?? "user"} at Yehager Bahil Libs.`,
      `Create your password using this secure link: ${payload.link}`,
      `This link expires at ${expires}.`,
    ]),
    html: htmlShell(
      isStaff ? "Welcome to the Team! 👋" : "Create Your Password",
      `
      <p>Hello <strong>${escapeHtml(name)}</strong>,</p>
      ${isStaff
        ? `<p>You have been added as a <strong style="color:#d6a43d">${escapeHtml(roleLabel)}</strong> at Yehager Bahil Libs. Click the button below to create your password and access your account.</p>`
        : `<p>Your Yehager Bahil Libs account has been created. Click the button below to set up your password and get started.</p>`
      }
      <div style="margin:20px 0;padding:16px;background:#1a1d10;border:1px solid #4d5a14;border-radius:8px">
        <p style="margin:0 0 4px;color:#d6a43d;font-size:13px;font-weight:800">⏱ Link Expiry</p>
        <p style="margin:0;color:#c8c880;font-size:13px">This setup link expires at <strong style="color:#fff7df">${escapeHtml(expires)}</strong>.</p>
      </div>
      ${actionButton(isStaff ? "Create My Staff Password" : "Create My Password", payload.link)}
      <p style="color:#c8b98b;font-size:13px">If you did not expect this email or do not recognize Yehager Bahil Libs, please ignore it — your account will not be activated without completing this step.</p>
      `,
    ),
  });
}

export async function sendPasswordResetEmail(payload: PasswordLinkPayload) {
  const name = payload.name || "there";
  const expires = payload.expiresAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  return sendTransactionalEmailSafely({
    channel: payload.accountType === "employee" || payload.accountType === "admin" ? "team" : "notifications",
    to: payload.to,
    subject: "🔑 Reset your Yehager Bahil password",
    text: paragraph([
      `Hello ${name},`,
      `Reset your password using this secure link: ${payload.link}`,
      `This link expires at ${expires}.`,
      "If you did not request this, you can ignore this email.",
    ]),
    html: htmlShell(
      "Reset Your Password",
      `
      <p>Hello <strong>${escapeHtml(name)}</strong>,</p>
      <p>We received a request to reset your Yehager Bahil Libs password. Click the button below to create a new password.</p>
      ${actionButton("Reset My Password", payload.link)}
      <div style="margin:16px 0;padding:14px;background:#1a1310;border:1px solid #5c3a14;border-radius:8px">
        <p style="margin:0;color:#c8b98b;font-size:13px">⏱ This link expires at <strong style="color:#fff7df">${escapeHtml(expires)}</strong>.</p>
      </div>
      <p style="color:#c8b98b;font-size:13px">If you did not request a password reset, you can safely ignore this email — your password will not change.</p>
      `,
    ),
  });
}

// ─── Account status emails ────────────────────────────────────────────────────

export async function sendAccountStatusChangedEmail(payload: AccountStatusPayload) {
  const status = String(payload.status ?? "updated").toLowerCase();
  const isActive = status === "active";
  const isStaff = payload.role === "employee" || payload.role === "admin";
  const signInUrl = appLink("/signin");
  return sendTransactionalEmailSafely({
    channel: isStaff ? "team" : "notifications",
    to: payload.to,
    subject: isActive ? "✅ Your Yehager Bahil account is now active" : "⚠️ Your Yehager Bahil account has been deactivated",
    text: paragraph([
      `Hello ${payload.name || "there"},`,
      isActive
        ? "Your account has been activated. You can now sign in and continue using Yehager Bahil Libs."
        : "Your account has been deactivated. Access is paused until an administrator activates it again.",
      isStaff ? "This notice applies to your staff workspace access." : "This notice applies to your customer account access.",
      isActive ? `Sign in: ${signInUrl}` : "If you believe this is a mistake, please contact support.",
    ]),
    html: htmlShell(
      isActive ? "Account Activated ✅" : "Account Deactivated ⚠️",
      `
      <p>Hello <strong>${escapeHtml(payload.name || "there")}</strong>,</p>
      <div style="margin:20px 0;padding:16px;background:${isActive ? "#0d1f0d" : "#1f0d0d"};border:1px solid ${isActive ? "#2a6e2a" : "#6e2a2a"};border-radius:8px">
        <p style="margin:0 0 6px;color:${isActive ? "#5ecf5e" : "#cf5e5e"};font-size:14px;font-weight:800">${isActive ? "✅ Account Activated" : "❌ Account Deactivated"}</p>
        <p style="margin:0;color:${isActive ? "#9ecf9e" : "#cf9e9e"};font-size:13px">
          ${isActive
            ? "Your account has been activated. You can now sign in and continue using Yehager Bahil Libs."
            : "Your account has been deactivated. Access is paused until an administrator activates it again."
          }
        </p>
      </div>
      ${detailsList([
        ["Account", payload.email],
        ["Role", payload.role],
        ["Status", status],
      ])}
      ${isActive ? actionButton("Sign In to Your Account", signInUrl) : "<p style=\"color:#c8b98b;font-size:13px\">If you believe this is a mistake, please contact our support team.</p>"}
      `,
    ),
  });
}

export async function sendAdminAccountStatusChangedEmail(payload: AccountStatusPayload) {
  const adminUrl = payload.role === "customer" ? appLink("/admin/customers") : appLink("/admin/users");
  const status = String(payload.status ?? "updated").toLowerCase();
  return sendTransactionalEmailSafely({
    channel: "team",
    to: internalNotificationRecipients(),
    subject: `Account ${status}: ${payload.email ?? payload.name ?? "user"}`,
    text: paragraph([
      `Account status changed to ${status}.`,
      payload.email ? `Account: ${payload.email}` : null,
      payload.role ? `Role: ${payload.role}` : null,
      payload.changedBy ? `Changed by: ${payload.changedBy}` : null,
      `Open admin: ${adminUrl}`,
    ]),
    html: htmlShell(
      "Account Status Changed",
      `<p>An account status was updated.</p>${detailsList([
        ["Account", payload.email],
        ["Name", payload.name],
        ["Role", payload.role],
        ["Status", status],
        ["Changed by", payload.changedBy],
      ])}${actionButton("Open Admin", adminUrl)}`,
    ),
  });
}

// ─── Employee role assigned email ─────────────────────────────────────────────

export async function sendEmployeeRoleAssignedEmail(payload: EmployeeRoleAssignedPayload) {
  const name = payload.name || "Team Member";
  const dashboardUrl = appLink("/employee");
  const hasPermissions = Array.isArray(payload.permissionKeys) && payload.permissionKeys.length > 0;
  return sendTransactionalEmailSafely({
    channel: "team",
    to: payload.to,
    subject: payload.roleName
      ? `🎯 Your role has been updated: ${payload.roleName}`
      : "🎯 Your access and permissions have been updated",
    text: paragraph([
      `Hello ${name},`,
      payload.roleName
        ? `Your admin has assigned you the role: ${payload.roleName}.`
        : "Your admin has updated your permissions and access.",
      hasPermissions ? `Permissions: ${(payload.permissionKeys ?? []).join(", ")}` : null,
      `Access your dashboard: ${dashboardUrl}`,
    ]),
    html: htmlShell(
      "Your Role Has Been Updated 🎯",
      `
      <p>Hello <strong>${escapeHtml(name)}</strong>,</p>
      <p>Your administrator has updated your role and access on Yehager Bahil Libs.</p>
      ${payload.roleName
        ? `<div style="margin:20px 0;padding:16px;background:#1a1a10;border:1px solid #5c5a14;border-radius:8px">
            <p style="margin:0 0 4px;color:#d6a43d;font-size:13px;font-weight:800">🎯 Assigned Role</p>
            <p style="margin:0;color:#fff7df;font-size:18px;font-weight:900">${escapeHtml(payload.roleName)}</p>
          </div>`
        : ""
      }
      ${hasPermissions
        ? `<div style="margin:20px 0;padding:16px;background:#101a1a;border:1px solid #145c5c;border-radius:8px">
            <p style="margin:0 0 8px;color:#5ecfcf;font-size:13px;font-weight:800">🔑 Your Permissions</p>
            <p style="margin:0;color:#9ecfcf;font-size:12px;line-height:1.8">${(payload.permissionKeys ?? []).map(k => escapeHtml(k)).join(" &nbsp;·&nbsp; ")}</p>
          </div>`
        : ""
      }
      ${actionButton("Go to My Dashboard", dashboardUrl)}
      <p style="color:#c8b98b;font-size:13px">If you have questions about your new role or access, please reach out to your administrator.</p>
      `,
    ),
  });
}

// ─── Order emails ─────────────────────────────────────────────────────────────

export async function sendOrderStatusEmail(payload: OrderStatusPayload) {
  const orderUrl = payload.orderNumber ? appLink("/my-orders") : appLink("/dashboard");
  const statusLabel = String(payload.status ?? "updated").replaceAll("_", " ");
  const deliveryStatusLabel = payload.deliveryStatus ? payload.deliveryStatus.replaceAll("_", " ") : null;
  const isNewOrder = payload.status === "pending" && payload.paymentStatus === "pending";
  const isEtbAwaiting = payload.paymentStatus === "awaiting_verification";
  const isEtbOrder = payload.paymentStatus === "awaiting_verification" || payload.status === "pending";

  const trackingUrl =
    payload.carrier === "Ethiopian Mail Service"
      ? "https://www.ethiopianpostalservice.com"
      : payload.carrier === "DHL"
        ? "https://www.dhl.com/en/express/tracking.html"
        : payload.carrier === "UPS"
          ? "https://www.ups.com/track"
          : null;

  const subjectEmoji = isEtbAwaiting ? "⏳" : isNewOrder ? "✅" : "📦";
  const subjectLabel = isEtbAwaiting
    ? `ETB Payment Received — #${payload.orderNumber ?? ""} | Yehager Bahil Libs`
    : isNewOrder
      ? `Order Confirmed — #${payload.orderNumber ?? ""} | Yehager Bahil Libs`
      : `Order ${payload.orderNumber ?? ""} status updated`.trim();

  return sendTransactionalEmailSafely({
    channel: "notifications",
    to: payload.to,
    subject: `${subjectEmoji} ${subjectLabel}`.trim(),
    text: paragraph([
      `Hello ${payload.customerName || "Customer"},`,
      `Your order ${payload.orderNumber ?? ""} status is now: ${statusLabel}.`.trim(),
      payload.paymentStatus ? `Payment status: ${payload.paymentStatus.replaceAll("_", " ")}` : null,
      payload.fulfillmentType ? `Delivery method: ${payload.fulfillmentType}` : null,
      payload.carrier ? `Delivery provider: ${payload.carrier}` : null,
      deliveryStatusLabel ? `Delivery status: ${deliveryStatusLabel}` : null,
      payload.trackingNumber ? `Tracking number: ${payload.trackingNumber}` : null,
      trackingUrl && payload.trackingNumber ? `Track shipment: ${trackingUrl}` : null,
      `View your orders: ${orderUrl}`,
    ]),
    html: htmlShell(
      isEtbAwaiting
        ? `Order Received! — #${escapeHtml(payload.orderNumber ?? "")}`
        : isNewOrder
          ? `✅ Order Confirmed! — #${escapeHtml(payload.orderNumber ?? "")}`
          : `Order Updated — #${escapeHtml(payload.orderNumber ?? "")}`,
      `
      <p>Hello <strong>${escapeHtml(payload.customerName || "Customer")}</strong>,</p>

      ${designImageGrid(payload.imageUrls)}
      ${designSpecificationsSection(payload)}
      ${memberPricingSection(payload.memberPricing)}

      ${isNewOrder || isEtbAwaiting
        ? `<div style="margin:0 0 20px;padding:18px;background:${isEtbAwaiting ? "#3d2e00" : "#0d1f0d"};border:1px solid ${isEtbAwaiting ? "#b8860b" : "#2a6e2a"};border-radius:8px;text-align:center">
            <p style="margin:0 0 6px;color:${isEtbAwaiting ? "#ffd166" : "#5ecf5e"};font-size:18px;font-weight:900">${isEtbAwaiting ? "⏳ Order Received!" : "✅ Order Confirmed!"}</p>
            <p style="margin:0;color:${isEtbAwaiting ? "#e8cc7a" : "#9ecf9e"};font-size:13px">${isEtbAwaiting ? "Your custom garment is pending payment verification" : "Your custom garment is being prepared"}</p>
          </div>`
        : ""
      }

      ${detailsList([
        ["Order Number", payload.orderNumber],
        ["Order Status", statusLabel],
        ["Payment Status", payload.paymentStatus?.replaceAll("_", " ")],
        ["Delivery Method", payload.fulfillmentType],
        ["Delivery Provider", payload.carrier],
        ["Delivery Status", deliveryStatusLabel],
        ["Tracking Number", payload.trackingNumber],
      ])}

      ${isEtbAwaiting ? etbVerificationBlock() : ""}

      ${trackingUrl && payload.trackingNumber ? actionButton("Track Shipment", trackingUrl) : ""}

      ${isNewOrder || isEtbAwaiting ? trackOnlineBox() : ""}

      ${(isNewOrder || isEtbAwaiting) && (payload.showCancellationPolicy !== false) ? cancellationPolicyBlock(payload.orderNumber, payload.customerName) : ""}

      ${isNewOrder || isEtbAwaiting ? orderJourneyHtml() : ""}

      ${actionButton("View My Orders", orderUrl)}
      `,
    ),
  });
}

export async function sendAdminOrderCreatedEmail(payload: AdminOrderPayload) {
  const orderUrl = payload.orderId ? appLink(`/admin/orders/${payload.orderId}`) : appLink("/admin/orders");
  return sendTransactionalEmailSafely({
    channel: "team",
    to: internalNotificationRecipients(),
    subject: `✅ New order created${payload.orderNumber ? `: ${payload.orderNumber}` : ""}`,
    text: paragraph([
      `A new order was created${payload.orderNumber ? `: ${payload.orderNumber}` : "."}`,
      payload.customerEmail ? `Customer: ${payload.customerEmail}` : null,
      payload.totalUsd ? `Total: $${payload.totalUsd}` : null,
      `Open order: ${orderUrl}`,
    ]),
    html: htmlShell(
      "New Order Created ✅",
      `<p>A customer created a new order.</p>${detailsList([
        ["Order", payload.orderNumber],
        ["Customer", payload.customerName || payload.customerEmail],
        ["Total", payload.totalUsd ? `$${payload.totalUsd}` : null],
        ["Status", payload.status],
        ["Payment", payload.paymentStatus],
        ["Payment method", payload.paymentMethod],
      ])}${actionButton("Open Order", orderUrl)}`,
    ),
  });
}

export async function sendAdminOrderStatusChangedEmail(payload: AdminOrderStatusPayload) {
  const orderUrl = payload.orderId ? appLink(`/admin/orders/${payload.orderId}`) : appLink("/admin/orders");
  const statusLabel = String(payload.status ?? "updated").replaceAll("_", " ");
  return sendTransactionalEmailSafely({
    channel: "team",
    to: internalNotificationRecipients(),
    subject: `📦 Order status changed${payload.orderNumber ? `: ${payload.orderNumber}` : ""}`,
    text: paragraph([
      `Order ${payload.orderNumber ?? ""} status changed to ${statusLabel}.`.trim(),
      payload.previousStatus ? `Previous status: ${payload.previousStatus.replaceAll("_", " ")}` : null,
      payload.customerEmail ? `Customer: ${payload.customerEmail}` : null,
      payload.paymentStatus ? `Payment: ${payload.paymentStatus.replaceAll("_", " ")}` : null,
      payload.deliveryStatus ? `Delivery status: ${payload.deliveryStatus.replaceAll("_", " ")}` : null,
      payload.carrier ? `Delivery provider: ${payload.carrier}` : null,
      payload.trackingNumber ? `Tracking number: ${payload.trackingNumber}` : null,
      payload.changedBy ? `Changed by: ${payload.changedBy}` : null,
      `Open order: ${orderUrl}`,
    ]),
    html: htmlShell(
      "Order Status Changed 📦",
      `<p>An order status was updated and may require operational follow-up.</p>${detailsList([
        ["Order", payload.orderNumber],
        ["Customer", payload.customerName || payload.customerEmail],
        ["Previous status", payload.previousStatus?.replaceAll("_", " ")],
        ["New status", statusLabel],
        ["Payment", payload.paymentStatus?.replaceAll("_", " ")],
        ["Delivery status", payload.deliveryStatus?.replaceAll("_", " ")],
        ["Delivery provider", payload.carrier],
        ["Tracking number", payload.trackingNumber],
        ["Changed by", payload.changedBy],
      ])}${actionButton("Open Admin Order", orderUrl)}`,
    ),
  });
}

export async function sendAdminPaymentReceivedEmail(payload: AdminOrderPayload) {
  const orderUrl = payload.orderId ? appLink(`/admin/payments/${payload.orderId}`) : appLink("/admin/payments");
  return sendTransactionalEmailSafely({
    channel: "team",
    to: internalNotificationRecipients(),
    subject: `💳 Payment confirmed${payload.orderNumber ? `: ${payload.orderNumber}` : ""}`,
    text: paragraph([
      `Payment was confirmed${payload.orderNumber ? ` for ${payload.orderNumber}` : ""}.`,
      payload.customerEmail ? `Customer: ${payload.customerEmail}` : null,
      payload.totalUsd ? `Total: $${payload.totalUsd}` : null,
      `Review payment: ${orderUrl}`,
    ]),
    html: htmlShell(
      "Payment Confirmed 💳",
      `<p>A customer payment was confirmed.</p>${detailsList([
        ["Order", payload.orderNumber],
        ["Customer", payload.customerName || payload.customerEmail],
        ["Total", payload.totalUsd ? `$${payload.totalUsd}` : null],
        ["Payment", payload.paymentStatus],
        ["Method", payload.paymentMethod],
      ])}${actionButton("Review Payment", orderUrl)}`,
    ),
  });
}

// ─── Custom design emails ─────────────────────────────────────────────────────

export async function sendCustomDesignSubmittedAdminEmail(payload: CustomDesignPayload & { customerEmail?: string | null }) {
  const adminUrl = appLink("/admin/custom-orders");
  return sendTransactionalEmailSafely({
    channel: "team",
    to: internalNotificationRecipients(),
    subject: `✨ New custom design submitted${payload.submissionNumber ? `: ${payload.submissionNumber}` : ""}`,
    text: paragraph([
      `A customer submitted a custom design${payload.submissionNumber ? ` (${payload.submissionNumber})` : ""}.`,
      payload.designTitle ? `Design: ${payload.designTitle}` : null,
      payload.customerEmail ? `Customer: ${payload.customerEmail}` : null,
      `Review it here: ${adminUrl}`,
    ]),
    html: htmlShell(
      "New Custom Design Submitted ✨",
      `<p>A customer submitted a custom design request.</p>${designImageGrid(payload.imageUrls)}${designSpecificationsSection(payload)}${memberPricingSection(payload.memberPricing)}${detailsList([
        ["Submission", payload.submissionNumber],
        ["Design", payload.designTitle],
        ["Customer", payload.customerName || payload.customerEmail],
      ])}${actionButton("Review Request", adminUrl)}`,
    ),
  });
}

export async function sendCustomDesignApprovedEmail(payload: CustomDesignPayload) {
  const cartUrl = appLink("/cart");
  return sendTransactionalEmailSafely({
    channel: "notifications",
    to: payload.to,
    subject: `✅ Custom design approved${payload.submissionNumber ? `: ${payload.submissionNumber}` : ""}`,
    text: paragraph([
      `Hello ${payload.customerName || "Customer"},`,
      `Your custom design ${payload.designTitle ? `"${payload.designTitle}" ` : ""}has been approved and added to your cart.`,
      payload.quotedPriceUsd ? `Quoted price: $${payload.quotedPriceUsd}` : null,
      payload.estimatedDeliveryLabel ? `Estimated completion and delivery: ${payload.estimatedDeliveryLabel}` : null,
      payload.reason ? `Admin note: ${payload.reason}` : null,
      `Pay from your cart when you are ready: ${cartUrl}`,
    ]),
    html: htmlShell(
      "Custom Design Approved! ✅",
      `
      <p>Hello <strong>${escapeHtml(payload.customerName || "Customer")}</strong>,</p>
      ${designImageGrid(payload.imageUrls)}
      ${designSpecificationsSection(payload)}
      ${memberPricingSection(payload.memberPricing)}
      <div style="margin:20px 0;padding:16px;background:#0d1f0d;border:1px solid #2a6e2a;border-radius:8px">
        <p style="margin:0 0 6px;color:#5ecf5e;font-size:14px;font-weight:800">✅ Your custom design has been approved!</p>
        <p style="margin:0;color:#9ecf9e;font-size:13px">${payload.designTitle ? `<strong>"${escapeHtml(payload.designTitle)}"</strong> has` : "Your design has"} been approved and added to your cart. Complete your payment when ready.</p>
      </div>
      ${detailsList([
        ["Submission", payload.submissionNumber],
        ["Quoted price", payload.quotedPriceUsd ? `$${payload.quotedPriceUsd}` : null],
        ["Estimated completion", payload.estimatedDeliveryLabel],
        ["Admin note", payload.reason],
      ])}
      ${actionButton("Go to Cart and Pay", cartUrl)}
      `,
    ),
  });
}

export async function sendCustomDesignDeclinedEmail(payload: CustomDesignPayload) {
  return sendTransactionalEmailSafely({
    channel: "notifications",
    to: payload.to,
    subject: `📋 Custom design request update${payload.submissionNumber ? `: ${payload.submissionNumber}` : ""}`,
    text: paragraph([
      `Hello ${payload.customerName || "Customer"},`,
      `We reviewed your custom design ${payload.designTitle ? `"${payload.designTitle}" ` : ""}and cannot approve it at this time.`,
      payload.reason ? `Reason: ${payload.reason}` : null,
      "You can contact support if you want to revise the request.",
    ]),
    html: htmlShell(
      "Custom Design Request Update",
      `
      <p>Hello <strong>${escapeHtml(payload.customerName || "Customer")}</strong>,</p>
      ${designImageGrid(payload.imageUrls)}
      ${designSpecificationsSection(payload)}
      ${memberPricingSection(payload.memberPricing)}
      <div style="margin:20px 0;padding:16px;background:#1f0d0d;border:1px solid #6e2a2a;border-radius:8px">
        <p style="margin:0 0 6px;color:#cf5e5e;font-size:14px;font-weight:800">📋 Design Review Update</p>
        <p style="margin:0;color:#cf9e9e;font-size:13px">We reviewed your custom design ${payload.designTitle ? `<strong>"${escapeHtml(payload.designTitle)}"</strong> ` : ""}and are unable to approve it at this time.</p>
      </div>
      ${detailsList([
        ["Submission", payload.submissionNumber],
        ["Reason", payload.reason],
      ])}
      <p>You can contact our support team to revise or resubmit your request. We are happy to help you find the right design.</p>
      `,
    ),
  });
}

// ─── Support ticket emails ────────────────────────────────────────────────────

export async function sendSupportTicketCreatedAdminEmail(payload: SupportTicketPayload) {
  const supportUrl = appLink("/admin/support-inbox");
  return sendTransactionalEmailSafely({
    channel: "team",
    to: internalNotificationRecipients(),
    subject: `🎫 New support ticket${payload.ticketNumber ? `: ${payload.ticketNumber}` : ""}`,
    text: paragraph([
      `A customer submitted a support ticket${payload.ticketNumber ? ` (${payload.ticketNumber})` : ""}.`,
      payload.subject ? `Subject: ${payload.subject}` : null,
      payload.customerEmail ? `Customer: ${payload.customerEmail}` : null,
      payload.message ? `Message: ${payload.message}` : null,
      `Open support inbox: ${supportUrl}`,
    ]),
    html: htmlShell(
      "New Support Ticket 🎫",
      `<p>A customer submitted a support ticket.</p>${detailsList([
        ["Ticket", payload.ticketNumber],
        ["Subject", payload.subject],
        ["Customer", payload.customerName || payload.customerEmail],
      ])}${payload.message ? `<div style="margin:16px 0;padding:14px;background:#241b0c;border-left:3px solid #d6a43d;border-radius:0 6px 6px 0"><p style="margin:0;color:#e8d9b0;font-size:13px;line-height:1.7">${escapeHtml(payload.message)}</p></div>` : ""}${actionButton("Open Support Inbox", supportUrl)}`,
    ),
  });
}

export async function sendSupportTicketCreatedCustomerEmail(payload: SupportTicketPayload & { to?: string | null }) {
  const supportUrl = appLink("/support");
  return sendTransactionalEmailSafely({
    channel: "support",
    to: payload.to,
    subject: `🎫 We received your support request${payload.ticketNumber ? `: ${payload.ticketNumber}` : ""}`,
    text: paragraph([
      `Hello ${payload.customerName || "Customer"},`,
      "We received your support request. Our team will reply as soon as possible.",
      payload.subject ? `Subject: ${payload.subject}` : null,
      payload.message ? `Message: ${payload.message}` : null,
      `Open support: ${supportUrl}`,
    ]),
    html: htmlShell(
      "Support Request Received 🎫",
      `
      <p>Hello <strong>${escapeHtml(payload.customerName || "Customer")}</strong>,</p>
      <div style="margin:20px 0;padding:16px;background:#1a1a10;border:1px solid #5c5a14;border-radius:8px">
        <p style="margin:0 0 4px;color:#d6a43d;font-size:13px;font-weight:800">✅ Request Received</p>
        <p style="margin:0;color:#c8c880;font-size:13px">We have received your support request and our team will reply as soon as possible — typically within a few hours during business hours.</p>
      </div>
      ${detailsList([
        ["Ticket", payload.ticketNumber],
        ["Subject", payload.subject],
      ])}
      ${actionButton("View My Support Requests", supportUrl)}
      `,
    ),
  });
}

export async function sendSupportReplyEmail(
  payload: SupportTicketPayload & {
    to?: string | null;
    reply?: string | null;
    messageId?: string;
    inReplyTo?: string;
    references?: string | string[];
  },
) {
  const supportUrl = appLink("/support");
  return sendTransactionalEmailSafely({
    channel: "support",
    to: payload.to,
    subject: `💬 Support reply${payload.ticketNumber ? `: ${payload.ticketNumber}` : ""}`,
    messageId: payload.messageId,
    inReplyTo: payload.inReplyTo,
    references: payload.references,
    headers: payload.ticketNumber ? { "X-Yehager-Ticket-Number": payload.ticketNumber } : undefined,
    text: paragraph([
      `Hello ${payload.customerName || "Customer"},`,
      "Our support team replied to your ticket.",
      payload.reply,
      `Open support: ${supportUrl}`,
    ]),
    html: htmlShell(
      "New Reply From Our Team 💬",
      `
      <p>Hello <strong>${escapeHtml(payload.customerName || "Customer")}</strong>,</p>
      <p>Our support team has replied to your request.</p>
      ${detailsList([
        ["Ticket", payload.ticketNumber],
        ["Subject", payload.subject],
      ])}
      ${payload.reply
        ? `<div style="margin:20px 0;padding:16px;background:#1a1610;border:1px solid #5c4a14;border-radius:8px">
            <p style="margin:0 0 6px;color:#d6a43d;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em">Reply from Support</p>
            <p style="margin:0;color:#e8d9b0;font-size:13px;line-height:1.8;white-space:pre-line">${escapeHtml(payload.reply)}</p>
          </div>`
        : ""
      }
      ${actionButton("View My Support Requests", supportUrl)}
      `,
    ),
  });
}

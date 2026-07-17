import nodemailer from "nodemailer";
import { Resend } from "resend";
import { env } from "../config/env.js";
import { getObjectKeyFromPublicUrl, getSignedReadUrl } from "../lib/storage/s3.js";

type MailChannel = "notifications" | "support" | "team";

export type MailAttachment = {
  filename: string;
  path?: string;
  content?: Buffer;
  contentType?: string;
};

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
  attachments?: MailAttachment[];
};

type PasswordLinkPayload = {
  to?: string | null;
  name?: string | null;
  link: string;
  expiresAt: Date;
  accountType?: "customer" | "employee" | "admin";
};

type AccountActivityPayload = {
  to?: string | null;
  name?: string | null;
  accountType?: "customer" | "employee" | "admin";
  changedBy?: string | null;
  changeType?: "changed" | "reset" | "admin_reset";
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
  quotedPriceEtb?: string | number | null;
  groupOrderUrl?: string | null;
};

export type OrderEmailEvent =
  | "payment_verification_pending"
  | "payment_pending"
  | "payment_confirmed"
  | "payment_failed"
  | "payment_refunded"
  | "order_confirmed"
  | "order_in_production"
  | "order_shipped"
  | "order_ready_for_pickup"
  | "order_fulfilled"
  | "order_delivered"
  | "order_cancelled"
  | "order_status_updated";

type OrderStatusPayload = {
  event?: OrderEmailEvent;
  productionStage?: string | null;
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
  orderItems?: Array<OrderEmailItem>;
  totalUsd?: string | number | null;
  shippingAddress?: string | null;
  /** Pass true to show the cancellation policy block (e.g. on new order confirmation). */
  showCancellationPolicy?: boolean;
};

type OrderEmailItem = {
  name?: string | null;
  itemNumber?: string | null;
  quantity?: string | number | null;
  priceUsd?: string | number | null;
  imageUrl?: string | null;
  measurements?: Record<string, unknown> | null;
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
  attachments?: MailAttachment[];
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
  return `<p style="margin:24px 0;text-align:center"><a href="${escapeHtml(href)}" style="display:inline-block;background:#d6a43d;color:#18130a;text-decoration:none;border-radius:6px;padding:14px 24px;font-weight:800;font-size:14px;letter-spacing:.02em">${escapeHtml(label)}</a></p>`;
}

function logoMarkUrl() {
  return appLink("/images/email-logo-mark.png");
}

function emailAddress(value: string | undefined, fallback: string) {
  const match = value?.match(/<([^>]+)>/);
  return match?.[1] ?? value ?? fallback;
}

function emailImageUrl(value: unknown) {
  const url = String(value ?? "").trim();
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return appLink(url);
  return "";
}

function designImageGrid(imageUrls: string[] = []) {
  const labels = ["Front View", "Side View", "Back View", "Detail / Close-Up"];
  const images = imageUrls
    .map((url) => emailImageUrl(url))
    .filter(Boolean)
    .slice(0, 4);
  if (!images.length) return "";
  const cells = images.map((url, index) => `
    <td style="width:${Math.floor(100 / images.length)}%;padding:4px;vertical-align:top;text-align:center">
      <a href="${escapeHtml(url)}" style="display:block;text-decoration:none" target="_blank" rel="noopener noreferrer">
        <img src="${escapeHtml(url)}" alt="${escapeHtml(labels[index])} — click to view full size" width="120" height="150" style="display:block;width:100%;height:150px;object-fit:cover;margin:0 auto;border:1px solid #695126;border-radius:6px;background:#14110c" />
      </a>
      <p style="margin:6px 0 0;color:#fff7df;font-size:11px;font-weight:800;line-height:1.15">${escapeHtml(labels[index])}</p>
    </td>`).join("");
  return `<div style="margin:20px 0"><p style="margin:0 0 8px;color:#d6a43d;font-size:16px;font-weight:900">🖼️ Uploaded Design Images</p><table role="presentation" style="width:100%;border-collapse:collapse;table-layout:fixed"><tr>${cells}</tr></table></div>`;
}

function measurementLabel(key: string) {
  return key
    .replaceAll("_", " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function measurementValue(key: string, value: unknown) {
  const normalized = String(value ?? "").trim();
  if (!normalized || key.toLowerCase() === "gender" || /[a-z]/i.test(normalized) || normalized.includes('"')) return normalized;
  return `${normalized}"`;
}

function compactMeasurementGrid(entries: Array<[string, unknown]>) {
  const visible = entries.filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "");
  if (!visible.length) return "";
  const rows = [];
  for (let index = 0; index < visible.length; index += 2) {
    const cells = visible.slice(index, index + 2).map(([key, value]) => `
      <td style="width:50%;padding:4px 10px 4px 0;color:#a99d8a;font-size:12px;line-height:1.2;vertical-align:top">
        ${escapeHtml(measurementLabel(key))}
        <strong style="color:#fff7df;font-size:12px;white-space:nowrap">${escapeHtml(measurementValue(key, value))}</strong>
      </td>`).join("");
    rows.push(`<tr>${cells}${visible[index + 1] ? "" : '<td style="width:50%">&nbsp;</td>'}</tr>`);
  }
  return `<table role="presentation" style="width:100%;border-collapse:collapse;margin:10px 0 0;border-top:1px solid #3d321d">${rows.join("")}</table>`;
}

function compactMeasurementList(entries: Array<[string, unknown]>) {
  const visible = entries.filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "");
  if (!visible.length) return "";
  const rows = visible.map(([key, value]) => `
    <tr>
      <td style="padding:2px 8px 2px 0;color:#a99d8a;font-size:11px;line-height:1.15;vertical-align:top">${escapeHtml(measurementLabel(key))}</td>
      <td style="padding:2px 0;color:#fff7df;font-size:11px;font-weight:800;line-height:1.15;vertical-align:top;white-space:nowrap">${escapeHtml(measurementValue(key, value))}</td>
    </tr>`).join("");
  return `<table role="presentation" style="width:auto;border-collapse:collapse;margin:7px 0 0">${rows}</table>`;
}

function adaptiveMeasurementLayout(entries: Array<[string, unknown]>) {
  const visible = entries.filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "");
  if (!visible.length) return "";
  return visible.length >= 6 ? compactMeasurementGrid(visible) : compactMeasurementList(visible);
}

function orderItemsSection(items: OrderEmailItem[] = [], totalUsd?: string | number | null) {
  if (!items.length) return "";
  const rows = items.map((item) => {
    const itemImageUrl = emailImageUrl(item.imageUrl);
    const image = itemImageUrl
      ? `<a href="${escapeHtml(itemImageUrl)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtml(itemImageUrl)}" alt="${escapeHtml(item.name || "Order item")}" width="64" height="78" style="display:block;width:64px;height:78px;object-fit:cover;border:1px solid #4d3714;border-radius:5px" /></a>`
      : `<div style="width:64px;height:78px;border:1px solid #4d3714;border-radius:5px;color:#8f8067;font-size:10px;text-align:center;padding-top:28px;box-sizing:border-box">No image</div>`;
    const measurements = Object.entries(item.measurements ?? {}).filter(([, value]) => value != null && String(value).trim() !== "");
    return `<tr>
      <td style="width:72px;padding:10px 8px 10px 0;vertical-align:top">${image}</td>
      <td style="padding:10px 8px 10px 0;vertical-align:top;color:#c8b98b;font-size:12px;line-height:1.35">
        <strong style="display:block;color:#fff7df;font-size:15px;line-height:1.2">${escapeHtml(item.name || "Order item")}</strong>
        <span>${escapeHtml(item.itemNumber ? `Item ${item.itemNumber}` : "Item")} · Qty: ${escapeHtml(item.quantity ?? 1)}</span>
        ${measurements.length ? adaptiveMeasurementLayout(measurements) : ""}
      </td>
      <td style="width:78px;padding:10px 0;vertical-align:top;text-align:right;color:#fff7df;font-size:16px;font-weight:900;white-space:nowrap">${item.priceUsd != null ? `$${Number(item.priceUsd).toFixed(2)}` : "—"}</td>
    </tr>`;
  }).join("");
  const totalRow = totalUsd != null
    ? `<tr><td colspan="2" style="padding:12px 8px;color:#fff7df;font-size:16px;font-weight:900;border-top:1px solid #3d321d">Total</td><td style="padding:12px 0;color:#d6a43d;font-size:22px;font-weight:900;text-align:right;border-top:1px solid #3d321d;white-space:nowrap">$${Number(totalUsd).toFixed(2)}</td></tr>`
    : "";
  return `<div style="margin:20px 0"><p style="margin:0 0 8px;color:#d6a43d;font-size:16px;font-weight:900">🧵 Your Order Details</p><table role="presentation" style="width:100%;border-collapse:collapse;border-top:1px solid #3d321d"><tr><th colspan="2" style="padding:8px 8px 8px 0;text-align:left;color:#a99d8a;font-size:12px;text-transform:uppercase">Item / Measurements</th><th style="padding:8px 0;text-align:right;color:#a99d8a;font-size:12px;text-transform:uppercase">Price</th></tr>${rows}${totalRow}</table></div>`;
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
    ? `<p style="margin:16px 0 6px;color:#d6a43d;font-size:14px;font-weight:900">📏 Custom Measurements</p>${compactMeasurementGrid(measurementEntries)}`
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

function contactAndFooterHtml() {
  const supportEmail = emailAddress(env.SUPPORT_NOTIFICATION_EMAIL, "support@yehagerbahillibs.com");
  const socialLinks = [
    ["Facebook", "https://www.facebook.com/profile.php?id=61559444502598", "facebook.png"],
    ["Instagram", "https://www.instagram.com/yehagerbahillibs?igsh=dHZtOXc2b2gwbGk0", "instagram.png"],
    ["X (Twitter)", "https://x.com/yehagerbah54327", "x.png"],
    ["YouTube", "https://www.youtube.com/@YehagerbahilLibs", "youtube.png"],
    ["TikTok", "https://www.tiktok.com/@yehager.bahil.lib", "tiktok.png"],
  ] as const;
  const socialHtml = socialLinks
    .map(([label, href, imageName]) => `<td style="padding:4px 5px"><a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}" style="display:block;width:40px;height:40px;text-decoration:none"><img src="${escapeHtml(appLink(`/images/email-social/${imageName}`))}" alt="${escapeHtml(label)}" width="40" height="40" style="display:block;width:40px;height:40px;object-fit:contain;border:0;border-radius:10px" /></a></td>`)
    .join("");
  const productionEmail = env.PRODUCTION_EMAIL || "naomiinvestments2100@gmail.com";
  const year = new Date().getFullYear();

  return `
    <style>
      @media only screen and (max-width:620px) {
        .email-footer-identity { display:block !important; width:100% !important; text-align:center !important; }
        .email-footer-logo { margin:0 auto 12px !important; }
      }
    </style>
    <div style="margin-top:30px;color:#c8b98b;font-family:Arial,sans-serif">
      <div style="padding:25px 0 20px;text-align:center">
        <table role="presentation" style="width:100%;border-collapse:collapse"><tr>
          <td style="width:31%;border-top:1px solid #5a431d"></td>
          <td style="width:74px;padding:0 10px"><span style="display:inline-block;width:54px;height:54px;border:1px solid #d6a43d;border-radius:50%;color:#f8f1dc;font-size:27px;line-height:54px">🎧</span></td>
          <td style="width:31%;border-top:1px solid #5a431d"></td>
        </tr></table>
        <p style="margin:12px 0 2px;color:#d6a43d;font-size:19px;font-weight:900;line-height:1.25">Questions? Contact Us Directly</p>
        <p style="margin:0;color:#b8b0a5;font-size:16px;line-height:1.4">We’re here to help!</p>
      </div>

      <div style="padding:14px 12px 18px">
        <table role="presentation" style="width:100%;border-collapse:collapse"><tr>
          <td style="width:68px;padding-right:14px;vertical-align:middle"><span style="display:block;width:54px;height:54px;border:1px solid #d6a43d;border-radius:50%;color:#f8f1dc;font-size:29px;line-height:54px;text-align:center">☎</span></td>
          <td style="vertical-align:middle">
            <p style="margin:0 0 7px;color:#fff7df;font-size:16px;font-weight:900;line-height:1.3">Production Manager (Ethiopia)</p>
            <p style="margin:0 0 6px;color:#d6a43d;font-size:15px;font-weight:800;line-height:1.4"><a href="tel:${escapeHtml(env.PRODUCTION_PHONE)}" style="color:#d6a43d;text-decoration:none">${escapeHtml(env.PRODUCTION_PHONE)}</a> <span style="color:#c8b98b;font-weight:400">(WhatsApp)</span></p>
            <p style="margin:0;color:#d6a43d;font-size:12px;line-height:1.45;overflow-wrap:anywhere">✉ <a href="mailto:${escapeHtml(productionEmail)}" style="color:#d6a43d;text-decoration:none">${escapeHtml(productionEmail)}</a></p>
          </td>
        </tr></table>
      </div>

      <table role="presentation" style="width:82%;border-collapse:collapse;margin:0 auto"><tr><td style="border-top:1px solid #5a431d;height:1px;line-height:1px">&nbsp;</td></tr></table>

      <div style="padding:18px 12px 25px">
        <table role="presentation" style="width:100%;border-collapse:collapse"><tr>
          <td style="width:68px;padding-right:14px;vertical-align:middle"><span style="display:block;width:54px;height:54px;border:1px solid #d6a43d;border-radius:50%;color:#f8f1dc;font-size:25px;line-height:54px;text-align:center">✉</span></td>
          <td style="vertical-align:middle">
            <p style="margin:0 0 7px;color:#fff7df;font-size:16px;font-weight:900">Customer Support</p>
            <p style="margin:0;color:#d6a43d;font-size:13px;line-height:1.45;overflow-wrap:anywhere"><a href="mailto:${escapeHtml(supportEmail)}" style="color:#d6a43d;text-decoration:none">${escapeHtml(supportEmail)}</a></p>
          </td>
        </tr></table>
      </div>

      <table role="presentation" style="width:82%;border-collapse:collapse;margin:0 auto"><tr><td style="border-top:1px solid #5a431d;height:1px;line-height:1px">&nbsp;</td></tr></table>

      <div style="padding:25px 0 22px;text-align:center">
        <span style="display:inline-block;width:54px;height:54px;border:1px solid #d6a43d;border-radius:50%;color:#f8f1dc;font-size:29px;line-height:54px">♡</span>
        <p style="margin:12px 0 4px;color:#d6a43d;font-size:21px;font-weight:900;line-height:1.25">Thank you for choosing us.</p>
        <p style="margin:0;color:#b8b0a5;font-size:16px;line-height:1.4">Wear your culture with pride.</p>
      </div>

      <table role="presentation" style="width:82%;border-collapse:collapse;margin:0 auto"><tr><td style="border-top:1px solid #5a431d;height:1px;line-height:1px">&nbsp;</td></tr></table>

      <div style="padding:23px 0 22px;text-align:center">
        <p style="margin:0 0 13px"><a href="https://www.yehagerbahillibs.com/" style="color:#35a7de;text-decoration:none;font-size:18px;font-weight:900"><span style="font-size:24px;vertical-align:-2px">🌐</span> YehagerBahilLibs.com</a></p>
        <table role="presentation" style="border-collapse:collapse;margin:0 auto"><tr>${socialHtml}</tr></table>
      </div>

      <table role="presentation" style="width:82%;border-collapse:collapse;margin:0 auto"><tr><td style="border-top:1px solid #5a431d;height:1px;line-height:1px">&nbsp;</td></tr></table>

      <table role="presentation" style="width:100%;border-collapse:collapse;margin-top:20px">
        <tr>
          <td class="email-footer-identity" style="width:35%;text-align:center;vertical-align:middle">
            <img class="email-footer-logo" src="${escapeHtml(logoMarkUrl())}" alt="Yehager Bahil Libs" width="78" height="78" style="display:block;width:78px;height:78px;object-fit:contain;margin:0 auto;padding:4px;border:2px solid #d6a43d;border-radius:50%;background:#fff" />
          </td>
          <td class="email-footer-identity" style="width:65%;padding:10px 0 10px 16px;color:#706b66;font-size:12px;line-height:1.6;vertical-align:middle">
            <p style="margin:0;color:#c8b98b;font-size:13px">© ${year} Yehager Bahil Libs · Naomi Investments LLC</p>
            <p style="margin:0">Minnesota, USA</p>
          </td>
        </tr>
      </table>
    </div>
  `;
}

function htmlShell(title: string, body: string) {
  return `
    <div style="margin:0;padding:0;background:#120f09">
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#f8f1dc;max-width:640px;margin:0 auto;padding:28px 18px">
        <div style="background:#1b160d;border:1px solid #4d3714;border-radius:8px;padding:32px 28px">

          <!-- Header -->
          <div style="text-align:center;margin-bottom:22px">
            <div style="text-align:center">
              <img src="${escapeHtml(logoMarkUrl())}" alt="Yehager Bahil Libs" width="82" height="82" style="display:block;width:82px;height:82px;object-fit:contain;margin:0 auto;padding:6px;border:3px solid #fff;border-radius:50%;background:#fff;outline:none;text-decoration:none" />
            </div>
          </div>
          <p style="margin:0 0 4px;text-align:center;color:#d6a43d;font-size:22px;font-weight:900;letter-spacing:.01em">Yehager Bahil Libs</p>
          <p style="margin:0 0 20px;text-align:center;color:#a88b4a;font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase">Where Tradition Meets Your Perfect Fit</p>

          <!-- Title -->
          <h1 style="font-size:22px;line-height:1.25;margin:0 0 20px;color:#fff7df;border-bottom:1px solid #3d321d;padding-bottom:16px">${escapeHtml(title)}</h1>

          <!-- Body -->
          ${body}

          <!-- Contact and footer -->
          ${contactAndFooterHtml()}
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
  const attachments = payload.attachments?.length
    ? await Promise.all(payload.attachments.map(async (attachment) => {
        if (attachment.content) return attachment;
        if (!attachment.path) throw new Error(`Attachment ${attachment.filename} has no source`);

        const objectKey = getObjectKeyFromPublicUrl(attachment.path);
        const downloadUrl = objectKey ? await getSignedReadUrl(objectKey) : attachment.path;
        const response = await fetch(downloadUrl);
        if (!response.ok) {
          throw new Error(`Could not download attachment ${attachment.filename} (${response.status})`);
        }

        return {
          filename: attachment.filename,
          content: Buffer.from(await response.arrayBuffer()),
          contentType: response.headers.get("content-type") || attachment.contentType,
        };
      }))
    : undefined;

  if (resend) {
    await resend.emails.send({
      from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      replyTo,
      headers: payload.headers,
      attachments,
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
      attachments,
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
    subject: "✉️ Verify Your Email Address | Yehager Bahil Libs",
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
    subject: "🎉 Welcome to Yehager Bahil Libs — Your Account Is Ready",
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
    subject: isStaff ? "🔐 Set Up Your Staff Account Password | Yehager Bahil Libs" : "🔐 Set Up Your Account Password | Yehager Bahil Libs",
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
    subject: "🔑 Reset Your Password | Yehager Bahil Libs",
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

export async function sendPasswordChangedEmail(payload: AccountActivityPayload) {
  const name = payload.name || "there";
  const isStaff = payload.accountType === "employee" || payload.accountType === "admin";
  const wasReset = payload.changeType === "reset" || payload.changeType === "admin_reset";
  const subject = wasReset
    ? "🔒 Password Reset Successfully | Yehager Bahil Libs"
    : "🔒 Password Changed Successfully | Yehager Bahil Libs";
  const actionLabel = wasReset ? "reset" : "changed";
  return sendTransactionalEmailSafely({
    channel: isStaff ? "team" : "notifications",
    to: payload.to,
    subject,
    text: paragraph([
      `Hello ${name},`,
      `Your Yehager Bahil Libs account password was ${actionLabel} successfully.`,
      payload.changeType === "admin_reset" && payload.changedBy ? `This reset was completed by ${payload.changedBy}.` : null,
      "If you did not make or authorize this change, contact support immediately.",
    ]),
    html: htmlShell(
      wasReset ? "Password Reset Successfully 🔒" : "Password Changed Successfully 🔒",
      `
      <p>Hello <strong>${escapeHtml(name)}</strong>,</p>
      <div style="margin:20px 0;padding:16px;background:#0d1f0d;border:1px solid #2a6e2a;border-radius:8px">
        <p style="margin:0 0 6px;color:#5ecf5e;font-size:14px;font-weight:800">✅ Security Update Completed</p>
        <p style="margin:0;color:#9ecf9e;font-size:13px">Your Yehager Bahil Libs account password was ${escapeHtml(actionLabel)} successfully.</p>
      </div>
      ${payload.changeType === "admin_reset" && payload.changedBy ? `<p style="color:#c8b98b;font-size:13px">This reset was completed by <strong style="color:#fff7df">${escapeHtml(payload.changedBy)}</strong>.</p>` : ""}
      <div style="margin:18px 0;padding:14px;background:#251313;border:1px solid #6e2a2a;border-radius:8px">
        <p style="margin:0;color:#e1aaaa;font-size:13px"><strong style="color:#ff8a8a">Did not authorize this change?</strong> Contact our support team immediately so we can protect your account.</p>
      </div>
      `,
    ),
  });
}

export async function sendAccountUpdatedEmail(payload: AccountActivityPayload) {
  const name = payload.name || "there";
  const isStaff = payload.accountType === "employee" || payload.accountType === "admin";
  const signInUrl = appLink("/signin");
  return sendTransactionalEmailSafely({
    channel: isStaff ? "team" : "notifications",
    to: payload.to,
    subject: "📝 Account Information Updated Successfully | Yehager Bahil Libs",
    text: paragraph([
      `Hello ${name},`,
      "Your Yehager Bahil Libs account information was updated successfully.",
      payload.changedBy ? `Updated by: ${payload.changedBy}` : null,
      "If you did not authorize this update, contact support immediately.",
      `Review your account: ${signInUrl}`,
    ]),
    html: htmlShell(
      "Account Information Updated 📝",
      `
      <p>Hello <strong>${escapeHtml(name)}</strong>,</p>
      <div style="margin:20px 0;padding:16px;background:#141d2b;border:1px solid #375678;border-radius:8px">
        <p style="margin:0 0 6px;color:#9fc4ff;font-size:14px;font-weight:800">✅ Account Update Completed</p>
        <p style="margin:0;color:#c4d4ec;font-size:13px">Your Yehager Bahil Libs account information was updated successfully.</p>
      </div>
      ${payload.changedBy ? `<p style="color:#c8b98b;font-size:13px">Updated by: <strong style="color:#fff7df">${escapeHtml(payload.changedBy)}</strong></p>` : ""}
      <p style="color:#c8b98b;font-size:13px">If you did not authorize this update, please contact our support team immediately.</p>
      ${actionButton("Review My Account", signInUrl)}
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
    subject: isActive ? "✅ Account Activated Successfully | Yehager Bahil Libs" : "⏸️ Account Deactivated — Access Paused | Yehager Bahil Libs",
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
  const isActive = status === "active";
  return sendTransactionalEmailSafely({
    channel: "team",
    to: internalNotificationRecipients(),
    subject: `🔄 Account ${isActive ? "Activated" : "Deactivated"} — ${payload.email ?? payload.name ?? "User"} | Yehager Bahil Libs`,
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
      ? `🎯 Role and Access Updated — ${payload.roleName} | Yehager Bahil Libs`
      : "🎯 Role and Access Updated | Yehager Bahil Libs",
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

function inferOrderEmailEvent(payload: OrderStatusPayload): OrderEmailEvent {
  const payment = String(payload.paymentStatus ?? "").toLowerCase();
  const status = String(payload.status ?? "").toLowerCase();
  if (payment === "awaiting_verification") return "payment_verification_pending";
  if (payment === "refunded") return "payment_refunded";
  if (["failed", "declined", "rejected"].includes(payment)) return "payment_failed";
  if (status === "shipped") return "order_shipped";
  if (status === "delivered" || status === "picked_up") return "order_delivered";
  if (status === "ready_for_pickup") return "order_ready_for_pickup";
  if (status === "fulfilled") return "order_fulfilled";
  if (["tailoring", "processing", "quality_check"].includes(status)) return "order_in_production";
  if (status === "cancelled") return "order_cancelled";
  if (payment === "paid") return "payment_confirmed";
  if (["pending", "unpaid"].includes(payment)) return "payment_pending";
  if (status === "pending") return "order_confirmed";
  return "order_status_updated";
}

function orderEmailPresentation(event: OrderEmailEvent, orderNumber?: string | null, productionStage?: string | null) {
  const reference = orderNumber ? `Order #${orderNumber}` : "Your Order";
  const suffix = " | Yehager Bahil Libs";
  const normalizedProductionStage = String(productionStage ?? "").toLowerCase();
  const production = normalizedProductionStage === "processing"
    ? {
        subjectLabel: "🧵 Order in Production — Processing",
        title: `🧵 Your Order Is Being Processed — #${orderNumber ?? ""}`,
        message: "Your order has entered processing. Our team is preparing the materials and production details before tailoring begins.",
        tone: "blue" as const,
      }
    : normalizedProductionStage === "quality_check"
      ? {
          subjectLabel: "🔍 Order in Quality Check",
          title: `🔍 Your Order Is in Quality Check — #${orderNumber ?? ""}`,
          message: "Your garment has been completed and is now being inspected carefully for quality, measurements, and finishing details.",
          tone: "blue" as const,
        }
      : {
          subjectLabel: "✂️ Order in Production — Tailoring",
          title: `✂️ Your Order Is Being Tailored — #${orderNumber ?? ""}`,
          message: "Your garment is now being handcrafted by our tailoring team according to your selected design and measurements.",
          tone: "blue" as const,
        };
  const presentations: Record<OrderEmailEvent, { subject: string; title: string; message: string; tone: "green" | "amber" | "red" | "blue" }> = {
    payment_verification_pending: {
      subject: `⏳ ETB Payment Verification Pending — ${reference}${suffix}`,
      title: `⏳ ETB Payment Verification Pending — #${orderNumber ?? ""}`,
      message: "Your payment proof has been received and is waiting for verification.",
      tone: "amber",
    },
    payment_pending: {
      subject: `⏳ Payment Pending — ${reference}${suffix}`,
      title: `⏳ Payment Pending — #${orderNumber ?? ""}`,
      message: "Payment is still required before production can begin.",
      tone: "amber",
    },
    payment_confirmed: {
      subject: `✅ Payment Confirmed — ${reference}${suffix}`,
      title: `✅ Payment Confirmed — #${orderNumber ?? ""}`,
      message: "Your payment has been confirmed successfully.",
      tone: "green",
    },
    payment_failed: {
      subject: `⚠️ Payment Failed — ${reference}${suffix}`,
      title: `⚠️ Payment Could Not Be Confirmed — #${orderNumber ?? ""}`,
      message: "We could not confirm your payment. Please review the payment details or contact support.",
      tone: "red",
    },
    payment_refunded: {
      subject: `💵 Payment Refunded — ${reference}${suffix}`,
      title: `💵 Payment Refunded — #${orderNumber ?? ""}`,
      message: "The payment for this order has been marked as refunded.",
      tone: "blue",
    },
    order_confirmed: {
      subject: `✅ Order Confirmed — ${reference}${suffix}`,
      title: `✅ Order Confirmed — #${orderNumber ?? ""}`,
      message: "Your order has been received and confirmed.",
      tone: "green",
    },
    order_in_production: {
      subject: `${production.subjectLabel} — ${reference}${suffix}`,
      title: production.title,
      message: production.message,
      tone: production.tone,
    },
    order_shipped: {
      subject: `🚚 Order Shipped — ${reference}${suffix}`,
      title: `🚚 Your Order Has Shipped — #${orderNumber ?? ""}`,
      message: "Your order has left our facility and is on its way.",
      tone: "blue",
    },
    order_ready_for_pickup: {
      subject: `📦 Order Ready for Pickup — ${reference}${suffix}`,
      title: `📦 Your Order Is Ready for Pickup — #${orderNumber ?? ""}`,
      message: "Your completed order is ready for pickup.",
      tone: "green",
    },
    order_fulfilled: {
      subject: `✅ Order Fulfilled — ${reference}${suffix}`,
      title: `✅ Your Order Has Been Fulfilled — #${orderNumber ?? ""}`,
      message: "Your order has been completed and is being prepared for shipment or pickup.",
      tone: "green",
    },
    order_delivered: {
      subject: `🎉 Order Delivered — ${reference}${suffix}`,
      title: `🎉 Your Order Has Been Delivered — #${orderNumber ?? ""}`,
      message: "Your order has been delivered successfully. Thank you for choosing us.",
      tone: "green",
    },
    order_cancelled: {
      subject: `❌ Order Cancelled — ${reference}${suffix}`,
      title: `❌ Order Cancelled — #${orderNumber ?? ""}`,
      message: "This order has been cancelled. Contact support if you need assistance.",
      tone: "red",
    },
    order_status_updated: {
      subject: `📦 Order Status Updated — ${reference}${suffix}`,
      title: `📦 Order Status Updated — #${orderNumber ?? ""}`,
      message: "The status of your order has been updated.",
      tone: "blue",
    },
  };
  return presentations[event];
}

function orderEventBanner(presentation: ReturnType<typeof orderEmailPresentation>) {
  const colors = {
    green: { background: "#1f7a2e", border: "#3fa653", heading: "#ffffff", body: "#d7f2dc" },
    amber: { background: "#3d2e00", border: "#b8860b", heading: "#ffd166", body: "#e8cc7a" },
    red: { background: "#321010", border: "#9b3434", heading: "#ff8a8a", body: "#e7b0b0" },
    blue: { background: "#151f32", border: "#3b5c8a", heading: "#9fc4ff", body: "#c4d4ec" },
  }[presentation.tone];
  return `<div style="margin:0 0 20px;padding:18px;background:${colors.background};border:1px solid ${colors.border};border-radius:8px;text-align:center"><p style="margin:0 0 6px;color:${colors.heading};font-size:18px;font-weight:900">${escapeHtml(presentation.title)}</p><p style="margin:0;color:${colors.body};font-size:13px;line-height:1.5">${escapeHtml(presentation.message)}</p></div>`;
}

export async function sendOrderStatusEmail(payload: OrderStatusPayload) {
  const orderUrl = payload.orderNumber ? appLink("/my-orders") : appLink("/dashboard");
  const statusLabel = String(payload.status ?? "updated").replaceAll("_", " ");
  const deliveryStatusLabel = payload.deliveryStatus ? payload.deliveryStatus.replaceAll("_", " ") : null;
  const event = payload.event ?? inferOrderEmailEvent(payload);
  const presentation = orderEmailPresentation(event, payload.orderNumber, payload.productionStage ?? payload.status);
  const isNewOrder = event === "order_confirmed";
  const isEtbAwaiting = event === "payment_verification_pending";

  const trackingUrl =
    payload.carrier === "Ethiopian Mail Service"
      ? "https://www.ethiopianpostalservice.com"
      : payload.carrier === "DHL"
        ? "https://www.dhl.com/en/express/tracking.html"
        : payload.carrier === "UPS"
          ? "https://www.ups.com/track"
          : null;

  return sendTransactionalEmailSafely({
    channel: "notifications",
    to: payload.to,
    subject: presentation.subject,
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
      presentation.title,
      `
      <p>Hello <strong>${escapeHtml(payload.customerName || "Customer")}</strong>,</p>

      ${orderEventBanner(presentation)}

      ${orderItemsSection(payload.orderItems, payload.totalUsd)}
      ${designImageGrid(payload.imageUrls)}
      ${designSpecificationsSection(payload)}
      ${memberPricingSection(payload.memberPricing)}

      ${detailsList([
        ["Order Number", payload.orderNumber],
        ["Order Status", statusLabel],
        ["Payment Status", payload.paymentStatus?.replaceAll("_", " ")],
        ["Delivery Method", payload.fulfillmentType],
        ["Delivery Provider", payload.carrier],
        ["Delivery Status", deliveryStatusLabel],
        ["Tracking Number", payload.trackingNumber],
        ["Ships to", payload.shippingAddress],
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
    subject: `✅ New Order Created${payload.orderNumber ? ` — Order #${payload.orderNumber}` : ""} | Yehager Bahil Libs`,
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
    subject: `📦 Order Status Updated${payload.orderNumber ? ` — Order #${payload.orderNumber}` : ""} | Yehager Bahil Libs`,
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
    subject: `💳 Payment Confirmed${payload.orderNumber ? ` — Order #${payload.orderNumber}` : ""} | Yehager Bahil Libs`,
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
    subject: `✨ Custom Design Request Received${payload.submissionNumber ? ` — #${payload.submissionNumber}` : ""} | Yehager Bahil Libs`,
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

function formattedDesignPrice(value: string | number | null | undefined, currency: "USD" | "ETB") {
  if (value === undefined || value === null || value === "") return "";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "";
  return currency === "USD"
    ? `$${amount.toFixed(2)} USD`
    : `${Math.round(amount).toLocaleString("en-US")} ETB`;
}

function customDesignApprovedEmailHtml(payload: CustomDesignPayload, cartUrl: string) {
  const customerName = payload.customerName || "Customer";
  const designTitle = payload.designTitle || "Custom Design";
  const requestNumber = payload.submissionNumber ? `#${payload.submissionNumber}` : "Custom Design Request";
  const deliveryLabel = payload.estimatedDeliveryLabel || "40–50 days";
  const usdPrice = formattedDesignPrice(payload.quotedPriceUsd, "USD");
  const etbPrice = formattedDesignPrice(payload.quotedPriceEtb, "ETB");
  const noteBlock = payload.reason
    ? `<div style="margin:18px 0;padding:14px;background:#241d11;border-left:4px solid #b57a13;border-radius:0 7px 7px 0"><p style="margin:0 0 4px;color:#d6a43d;font-size:13px;font-weight:800">Admin Note</p><p style="margin:0;color:#c9bdad;font-size:13px;line-height:1.6">${escapeHtml(payload.reason)}</p></div>`
    : "";
  const groupOrderBlock = payload.groupOrderUrl
    ? `
      <div style="margin:24px 0;padding:18px 20px;background:#302600;border:1px solid #9a6c12;border-radius:9px">
        <p style="margin:0 0 8px;color:#c88920;font-size:17px;font-weight:900">👥 Wedding or Group Order?</p>
        <p style="margin:0 0 12px;color:#e5dac8;font-size:14px;line-height:1.65">Share this link with family members or guests so everyone can enter their own measurements and pay for their matching outfit:</p>
        <div style="padding:10px 12px;background:#1c1d0d;border-radius:5px;word-break:break-all">
          <a href="${escapeHtml(payload.groupOrderUrl)}" style="color:#c88920;text-decoration:none;font-size:12px;font-weight:800">${escapeHtml(payload.groupOrderUrl)}</a>
        </div>
      </div>`
    : "";

  return `
    <div style="margin:0;padding:0;background:#11151b">
      <div style="max-width:640px;margin:0 auto;padding:24px 14px;font-family:Georgia,'Times New Roman',serif;color:#f5efe6;line-height:1.55">
        <div style="overflow:hidden;background:#1b1814;border:1px solid #40372e">
          <div style="padding:28px 28px 24px;text-align:center;background:#17120e">
            <img src="${escapeHtml(logoMarkUrl())}" alt="Yehager Bahil Libs" width="64" height="64" style="display:block;width:64px;height:64px;box-sizing:border-box;object-fit:contain;margin:0 auto 14px;padding:4px;border:2px solid #ffffff;border-radius:50%;background:#ffffff" />
            <p style="margin:0;color:#c88920;font-size:30px;font-weight:900;line-height:1.15">Yehager Bahil Libs</p>
            <p style="margin:8px 0 0;color:#9f947f;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase">Where Tradition Meets Your Perfect Fit</p>
          </div>

          <div style="padding:20px 24px;background:#2c8734;text-align:center">
            <p style="margin:0;color:#ffffff;font-size:29px;font-weight:900;line-height:1.15">✅ Your Custom Design<br />is Approved!</p>
            <p style="margin:8px 0 0;color:#c9e0ca;font-size:15px;line-height:1.35">Request ${escapeHtml(requestNumber)} · ${escapeHtml(designTitle)}</p>
          </div>

          <div style="padding:30px">
            <p style="margin:0 0 24px;color:#f5efe6;font-size:18px">Dear <strong>${escapeHtml(customerName)}</strong>,</p>
            <p style="margin:0 0 24px;color:#e3ddd4;font-size:18px;line-height:1.8">Great news! Our master tailors have carefully reviewed your uploaded design request and we are ready to bring your vision to life. Below are your full order details:</p>

            <div style="margin:0 0 22px;padding:13px 16px;border:2px solid #23803a;border-radius:9px;text-align:center;background:#142219">
              <p style="margin:0;color:#58b85f;font-size:21px;font-weight:900">✅ Status: Approved</p>
            </div>

            <div style="margin:0 0 22px;padding:18px 18px 16px;background:#211f1b;border-left:4px solid #b57a13;border-radius:0 8px 8px 0">
              <p style="margin:0 0 12px;color:#ffffff;font-size:21px;font-weight:900">Your Custom Design Quote</p>
              <table role="presentation" style="width:100%;border-collapse:collapse">
                <tr>
                  <td style="padding:8px 0;color:#9d958a;font-size:16px;border-bottom:1px solid #38332d">Outfit</td>
                  <td style="padding:8px 0;color:#ffffff;font-size:16px;font-weight:900;text-align:right;border-bottom:1px solid #38332d">${escapeHtml(designTitle)}</td>
                </tr>
                ${payload.fabricType ? `<tr><td style="padding:8px 0;color:#9d958a;font-size:16px;border-bottom:1px solid #38332d">Fabric</td><td style="padding:8px 0;color:#ffffff;font-size:16px;font-weight:900;text-align:right;border-bottom:1px solid #38332d">${escapeHtml(payload.fabricType)}</td></tr>` : ""}
                ${usdPrice ? `<tr><td style="padding:10px 0;color:#c3bbb0;font-size:17px;font-weight:800">Final Price (USD)</td><td style="padding:10px 0;color:#c88920;font-size:27px;font-weight:900;line-height:1.05;text-align:right">${escapeHtml(usdPrice)}</td></tr>` : ""}
                ${etbPrice ? `<tr><td style="padding:8px 0;color:#9d958a;font-size:15px;border-bottom:1px solid #38332d">Also payable in ETB</td><td style="padding:8px 0;color:#dfb36d;font-size:20px;font-weight:900;text-align:right;border-bottom:1px solid #38332d">${escapeHtml(etbPrice)}</td></tr>` : ""}
                <tr>
                  <td style="padding:12px 0 4px;color:#aaa197;font-size:15px">⏱ Estimated<br />Completion &amp; Delivery</td>
                  <td style="padding:12px 0 4px;color:#ffffff;font-size:17px;font-weight:900;text-align:right">${escapeHtml(deliveryLabel)}</td>
                </tr>
              </table>
              <p style="margin:3px 0 0;color:#8f877d;font-size:12px">Counted from when your order and payment are confirmed.</p>
            </div>

            ${noteBlock}
            ${designImageGrid(payload.imageUrls)}

            <p style="margin:25px 0 10px;color:#ffffff;font-size:21px;font-weight:900;text-align:center">Ready to place your order?</p>
            <a href="${escapeHtml(cartUrl)}" style="display:block;padding:15px 18px;background:#d18d27;border-radius:7px;color:#ffffff;text-align:center;text-decoration:none;font-size:21px;font-weight:900;line-height:1.15">🛍️ Complete Your Custom<br />Design Order →</a>
            <p style="margin:9px 0 0;color:#aaa197;font-size:13px;text-align:center">Secure checkout · Pay in USD (Stripe) or ETB (Bank Transfer)</p>

            ${groupOrderBlock}

            <div style="margin:24px 0;padding:20px;background:#202532;border:1px solid #596174;border-radius:8px">
              <p style="margin:0 0 12px;color:#a9baff;font-size:18px;font-weight:900">📋 How to complete your order:</p>
              <ol style="margin:0;padding-left:24px;color:#eee9e2;font-size:15px;line-height:1.7">
                <li style="margin-bottom:7px;padding-left:5px">Click the button above to open your personalized checkout page.</li>
                <li style="margin-bottom:7px;padding-left:5px">Select who the outfit is for (Man, Woman, Boy, or Girl).</li>
                <li style="margin-bottom:7px;padding-left:5px">Enter your measurements or choose a standard size.</li>
                <li style="margin-bottom:7px;padding-left:5px">Complete payment via Stripe (USD) or ETB Bank Transfer.</li>
                <li style="padding-left:5px">Our tailors begin crafting your garment within 3 business days.<br /><strong>Estimated completion: ${escapeHtml(deliveryLabel)}.</strong></li>
              </ol>
            </div>

            ${contactAndFooterHtml()}
          </div>
        </div>
      </div>
    </div>
  `;
}

export async function sendCustomDesignApprovedEmail(payload: CustomDesignPayload) {
  const cartUrl = appLink("/cart");
  return sendTransactionalEmailSafely({
    channel: "notifications",
    to: payload.to,
    subject: `✅ Your Custom Design is Approved! Quote Inside${payload.submissionNumber ? ` — #${payload.submissionNumber}` : ""} | Yehager Bahil Libs`,
    text: paragraph([
      `Dear ${payload.customerName || "Customer"},`,
      "Great news! Our master tailors have reviewed your uploaded design request and it has been approved.",
      payload.submissionNumber ? `Request: #${payload.submissionNumber}` : null,
      payload.designTitle ? `Outfit: ${payload.designTitle}` : null,
      payload.quotedPriceUsd ? `Quoted price: $${payload.quotedPriceUsd}` : null,
      payload.quotedPriceEtb ? `Also payable in ETB: ${payload.quotedPriceEtb} ETB` : null,
      payload.estimatedDeliveryLabel ? `Estimated completion and delivery: ${payload.estimatedDeliveryLabel}` : null,
      payload.reason ? `Admin note: ${payload.reason}` : null,
      `Complete your custom design order: ${cartUrl}`,
      payload.groupOrderUrl ? `Group order link: ${payload.groupOrderUrl}` : null,
    ]),
    html: customDesignApprovedEmailHtml(payload, cartUrl),
  });
}

export async function sendCustomDesignDeclinedEmail(payload: CustomDesignPayload) {
  return sendTransactionalEmailSafely({
    channel: "notifications",
    to: payload.to,
    subject: `📝 Action Required: Custom Design Revision${payload.submissionNumber ? ` — #${payload.submissionNumber}` : ""} | Yehager Bahil Libs`,
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
    subject: payload.subject?.trim() || "We received your support message",
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
        ["Subject", payload.subject],
      ])}
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
  const replyText = payload.reply?.trim() || "";
  return sendTransactionalEmailSafely({
    channel: "support",
    to: payload.to,
    subject: payload.subject?.trim() || "New message from Yehager Bahil Support",
    messageId: payload.messageId,
    inReplyTo: payload.inReplyTo,
    references: payload.references,
    attachments: payload.attachments,
    text: replyText,
    html: `<div style="white-space:pre-line">${escapeHtml(replyText)}</div>`,
  });
}

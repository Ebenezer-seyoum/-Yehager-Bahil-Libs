import nodemailer from "nodemailer";
import { env } from "../config/env.js";

type MailPayload = {
  to?: string | null;
  subject: string;
  text: string;
  html?: string;
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
};

type OrderStatusPayload = {
  to?: string | null;
  customerName?: string | null;
  orderNumber?: string | null;
  status?: string | null;
  paymentStatus?: string | null;
  fulfillmentType?: string | null;
};

function isConfigured() {
  return Boolean(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS);
}

function transporter() {
  if (!isConfigured()) return null;
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

function fromAddress() {
  return env.EMAIL_FROM || env.SMTP_USER || "no-reply@localhost";
}

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

function htmlShell(title: string, body: string) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;max-width:640px;margin:0 auto;padding:24px">
      <h1 style="font-size:24px;margin:0 0 16px">${escapeHtml(title)}</h1>
      ${body}
      <p style="margin-top:28px;color:#64748b;font-size:13px">Yehager Bahil</p>
    </div>
  `;
}

export function appLink(path: string) {
  const base = env.FRONTEND_APP_URL.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function sendTransactionalEmail(payload: MailPayload) {
  if (!payload.to) return { sent: false, skipped: true, reason: "missing_recipient" };
  const mailer = transporter();
  if (!mailer) return { sent: false, skipped: true, reason: "smtp_not_configured" };

  await mailer.sendMail({
    from: fromAddress(),
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });
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

export function resetPasswordLink(token: string) {
  return appLink(`/reset-password?token=${encodeURIComponent(token)}`);
}

export async function sendRegistrationEmail(payload: { to?: string | null; name?: string | null }) {
  const name = payload.name || "Customer";
  const signInUrl = appLink("/signin");
  return sendTransactionalEmailSafely({
    to: payload.to,
    subject: "Your Yehager Bahil account is ready",
    text: paragraph([
      `Hello ${name},`,
      "Your Yehager Bahil account has been created successfully.",
      `You can sign in here: ${signInUrl}`,
    ]),
    html: htmlShell(
      "Your account is ready",
      `<p>Hello ${escapeHtml(name)},</p><p>Your Yehager Bahil account has been created successfully.</p><p><a href="${escapeHtml(signInUrl)}">Sign in to your account</a></p>`,
    ),
  });
}

export async function sendPasswordSetupEmail(payload: PasswordLinkPayload) {
  const name = payload.name || "there";
  const expires = payload.expiresAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  return sendTransactionalEmailSafely({
    to: payload.to,
    subject: "Create your Yehager Bahil password",
    text: paragraph([
      `Hello ${name},`,
      `An account has been created for you as ${payload.accountType ?? "user"}.`,
      `Create your password using this secure link: ${payload.link}`,
      `This link expires at ${expires}.`,
    ]),
    html: htmlShell(
      "Create your password",
      `<p>Hello ${escapeHtml(name)},</p><p>An account has been created for you as <b>${escapeHtml(payload.accountType ?? "user")}</b>.</p><p><a href="${escapeHtml(payload.link)}">Create your password</a></p><p style="color:#64748b">This link expires at ${escapeHtml(expires)}.</p>`,
    ),
  });
}

export async function sendPasswordResetEmail(payload: PasswordLinkPayload) {
  const name = payload.name || "there";
  const expires = payload.expiresAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  return sendTransactionalEmailSafely({
    to: payload.to,
    subject: "Reset your Yehager Bahil password",
    text: paragraph([
      `Hello ${name},`,
      `Reset your password using this secure link: ${payload.link}`,
      `This link expires at ${expires}.`,
      "If you did not request this, you can ignore this email.",
    ]),
    html: htmlShell(
      "Reset your password",
      `<p>Hello ${escapeHtml(name)},</p><p>Reset your password using the secure link below.</p><p><a href="${escapeHtml(payload.link)}">Reset password</a></p><p style="color:#64748b">This link expires at ${escapeHtml(expires)}. If you did not request this, you can ignore this email.</p>`,
    ),
  });
}

export async function sendCustomDesignApprovedEmail(payload: CustomDesignPayload) {
  const cartUrl = appLink("/cart");
  return sendTransactionalEmailSafely({
    to: payload.to,
    subject: `Custom design approved${payload.submissionNumber ? `: ${payload.submissionNumber}` : ""}`,
    text: paragraph([
      `Hello ${payload.customerName || "Customer"},`,
      `Your custom design ${payload.designTitle ? `"${payload.designTitle}" ` : ""}has been approved and added to your cart.`,
      payload.quotedPriceUsd ? `Quoted price: $${payload.quotedPriceUsd}` : null,
      payload.estimatedDeliveryLabel ? `Estimated completion and delivery: ${payload.estimatedDeliveryLabel}` : null,
      payload.reason ? `Admin note: ${payload.reason}` : null,
      `Pay from your cart when you are ready: ${cartUrl}`,
    ]),
    html: htmlShell(
      "Custom design approved",
      `<p>Hello ${escapeHtml(payload.customerName || "Customer")},</p><p>Your custom design ${payload.designTitle ? `<b>${escapeHtml(payload.designTitle)}</b> ` : ""}has been approved and added to your cart.</p><ul><li>Quoted price: $${escapeHtml(payload.quotedPriceUsd ?? "Pending")}</li><li>Estimated completion and delivery: ${escapeHtml(payload.estimatedDeliveryLabel ?? "Pending")}</li></ul>${payload.reason ? `<p><b>Admin note:</b> ${escapeHtml(payload.reason)}</p>` : ""}<p><a href="${escapeHtml(cartUrl)}">Go to cart and pay</a></p>`,
    ),
  });
}

export async function sendCustomDesignDeclinedEmail(payload: CustomDesignPayload) {
  return sendTransactionalEmailSafely({
    to: payload.to,
    subject: `Custom design request update${payload.submissionNumber ? `: ${payload.submissionNumber}` : ""}`,
    text: paragraph([
      `Hello ${payload.customerName || "Customer"},`,
      `We reviewed your custom design ${payload.designTitle ? `"${payload.designTitle}" ` : ""}and cannot approve it at this time.`,
      payload.reason ? `Reason: ${payload.reason}` : null,
      "You can contact support if you want to revise the request.",
    ]),
    html: htmlShell(
      "Custom design request update",
      `<p>Hello ${escapeHtml(payload.customerName || "Customer")},</p><p>We reviewed your custom design ${payload.designTitle ? `<b>${escapeHtml(payload.designTitle)}</b> ` : ""}and cannot approve it at this time.</p>${payload.reason ? `<p><b>Reason:</b> ${escapeHtml(payload.reason)}</p>` : ""}<p>You can contact support if you want to revise the request.</p>`,
    ),
  });
}

export async function sendOrderStatusEmail(payload: OrderStatusPayload) {
  const orderUrl = payload.orderNumber ? appLink("/dashboard/orders") : appLink("/dashboard");
  const statusLabel = String(payload.status ?? "updated").replaceAll("_", " ");
  return sendTransactionalEmailSafely({
    to: payload.to,
    subject: `Order ${payload.orderNumber ?? ""} status updated`.trim(),
    text: paragraph([
      `Hello ${payload.customerName || "Customer"},`,
      `Your order ${payload.orderNumber ?? ""} status is now: ${statusLabel}.`.trim(),
      payload.paymentStatus ? `Payment status: ${payload.paymentStatus.replaceAll("_", " ")}` : null,
      payload.fulfillmentType ? `Delivery method: ${payload.fulfillmentType}` : null,
      `View your orders: ${orderUrl}`,
    ]),
    html: htmlShell(
      "Order status updated",
      `<p>Hello ${escapeHtml(payload.customerName || "Customer")},</p><p>Your order <b>${escapeHtml(payload.orderNumber ?? "")}</b> status is now <b>${escapeHtml(statusLabel)}</b>.</p><ul>${payload.paymentStatus ? `<li>Payment status: ${escapeHtml(payload.paymentStatus.replaceAll("_", " "))}</li>` : ""}${payload.fulfillmentType ? `<li>Delivery method: ${escapeHtml(payload.fulfillmentType)}</li>` : ""}</ul><p><a href="${escapeHtml(orderUrl)}">View your orders</a></p>`,
    ),
  });
}

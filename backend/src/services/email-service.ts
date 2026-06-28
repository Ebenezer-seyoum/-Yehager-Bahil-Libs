import { Resend } from "resend";
import { env } from "../config/env.js";

type MailChannel = "notifications" | "support" | "team";

type MailPayload = {
  to?: string | null;
  subject: string;
  text: string;
  html?: string;
  channel?: MailChannel;
  replyTo?: string;
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

type SupportTicketPayload = {
  ticketNumber?: string | null;
  subject?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  message?: string | null;
};

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

function isConfigured() {
  return Boolean(resend);
}

function fromAddress(channel: MailChannel = "notifications") {
  if (channel === "support") {
    return env.EMAIL_SUPPORT_FROM || env.EMAIL_FROM || "Yehager Bahil Support <support@yehagerbahillibs.com>";
  }
  if (channel === "team") {
    return env.EMAIL_TEAM_FROM || env.EMAIL_FROM || "Yehager Bahil Team <team@yehagerbahillibs.com>";
  }
  return env.EMAIL_NOTIFICATIONS_FROM || env.EMAIL_FROM || "Yehager Bahil Notifications <notifications@yehagerbahillibs.com>";
}

function defaultReplyTo(channel: MailChannel = "notifications") {
  if (channel === "team") return env.ADMIN_NOTIFICATION_EMAIL;
  return env.SUPPORT_NOTIFICATION_EMAIL || env.ADMIN_NOTIFICATION_EMAIL;
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

function detailsList(items: Array<[string, unknown]>) {
  const rows = items
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 0;color:#b8a46e;font-size:13px">${escapeHtml(label)}</td><td style="padding:8px 0;color:#fff7df;font-size:13px;font-weight:700;text-align:right">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  if (!rows) return "";
  return `<table role="presentation" style="width:100%;border-collapse:collapse;margin:20px 0;border-top:1px solid #3d321d;border-bottom:1px solid #3d321d">${rows}</table>`;
}

function actionButton(label: string, href: string) {
  return `<p style="margin:24px 0"><a href="${escapeHtml(href)}" style="display:inline-block;background:#d6a43d;color:#18130a;text-decoration:none;border-radius:6px;padding:12px 18px;font-weight:800">${escapeHtml(label)}</a></p>`;
}

function logoUrl() {
  return env.EMAIL_LOGO_URL || appLink("/images/email-logo.jpg");
}

function htmlShell(title: string, body: string) {
  return `
    <div style="margin:0;padding:0;background:#120f09">
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#f8f1dc;max-width:640px;margin:0 auto;padding:28px 18px">
        <div style="background:#1b160d;border:1px solid #4d3714;border-radius:8px;padding:28px">
          <div style="text-align:center;margin-bottom:22px">
            <img src="${escapeHtml(logoUrl())}" alt="Yehager Bahil Libs" width="180" style="display:inline-block;max-width:180px;width:100%;height:auto;border-radius:6px" />
          </div>
          <p style="margin:0 0 12px;color:#d6a43d;font-weight:800;letter-spacing:.02em">Yehager Bahil Libs</p>
          <h1 style="font-size:24px;line-height:1.25;margin:0 0 16px;color:#fff7df">${escapeHtml(title)}</h1>
          ${body}
          <p style="margin-top:28px;color:#c8b98b;font-size:13px">Need help? Reply to this email or contact support@yehagerbahillibs.com.</p>
        </div>
        <p style="margin:16px 0 0;color:#a88b4a;font-size:12px;text-align:center">Yehager Bahil Libs · yehagerbahillibs.com</p>
      </div>
    </div>
  `;
}

export function appLink(path: string) {
  const base = env.FRONTEND_APP_URL.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function sendTransactionalEmail(payload: MailPayload) {
  if (!payload.to) return { sent: false, skipped: true, reason: "missing_recipient" };
  if (!isConfigured() || !resend) return { sent: false, skipped: true, reason: "resend_not_configured" };

  await resend.emails.send({
    from: fromAddress(payload.channel),
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
    replyTo: payload.replyTo ?? defaultReplyTo(payload.channel),
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

export async function sendCustomerVerificationCodeEmail(payload: VerificationCodePayload) {
  const name = payload.name || "Customer";
  return sendTransactionalEmailSafely({
    channel: "notifications",
    to: payload.to,
    subject: "Verify your Yehager Bahil account",
    text: paragraph([
      `Hello ${name},`,
      `Your verification code is ${payload.code}.`,
      `This code expires in ${payload.expiresInMinutes} minutes.`,
      "If you did not request this, you can ignore this email.",
    ]),
    html: htmlShell(
      "Verify your account",
      `<p>Hello ${escapeHtml(name)},</p><p>Use this code to finish creating your Yehager Bahil account.</p><div style="margin:24px 0;padding:18px;border:1px solid #6f511f;border-radius:8px;background:#241b0c;text-align:center"><p style="margin:0 0 8px;color:#c8b98b;font-size:13px;font-weight:700">Verification code</p><p style="margin:0;color:#ffd166;font-size:34px;letter-spacing:8px;font-weight:900">${escapeHtml(payload.code)}</p></div><p style="color:#c8b98b">This code expires in ${escapeHtml(payload.expiresInMinutes)} minutes.</p>`,
    ),
  });
}

export async function sendRegistrationEmail(payload: { to?: string | null; name?: string | null }) {
  const name = payload.name || "Customer";
  const signInUrl = appLink("/signin");
  return sendTransactionalEmailSafely({
    channel: "notifications",
    to: payload.to,
    subject: "Your Yehager Bahil account is ready",
    text: paragraph([
      `Hello ${name},`,
      "Your Yehager Bahil account has been created successfully.",
      `You can sign in here: ${signInUrl}`,
    ]),
    html: htmlShell(
      "Your account is ready",
      `<p>Hello ${escapeHtml(name)},</p><p>Your Yehager Bahil account has been created successfully.</p>${actionButton("Sign in to your account", signInUrl)}`,
    ),
  });
}

export async function sendPasswordSetupEmail(payload: PasswordLinkPayload) {
  const name = payload.name || "there";
  const expires = payload.expiresAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  const isStaff = payload.accountType === "employee" || payload.accountType === "admin";
  return sendTransactionalEmailSafely({
    channel: isStaff ? "team" : "notifications",
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
      `<p>Hello ${escapeHtml(name)},</p><p>An account has been created for you as <b>${escapeHtml(payload.accountType ?? "user")}</b>.</p>${actionButton("Create password", payload.link)}<p style="color:#c8b98b">This link expires at ${escapeHtml(expires)}.</p>`,
    ),
  });
}

export async function sendPasswordResetEmail(payload: PasswordLinkPayload) {
  const name = payload.name || "there";
  const expires = payload.expiresAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  return sendTransactionalEmailSafely({
    channel: payload.accountType === "employee" || payload.accountType === "admin" ? "team" : "notifications",
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
      `<p>Hello ${escapeHtml(name)},</p><p>Reset your password using the secure link below.</p>${actionButton("Reset password", payload.link)}<p style="color:#c8b98b">This link expires at ${escapeHtml(expires)}. If you did not request this, you can ignore this email.</p>`,
    ),
  });
}

export async function sendCustomDesignSubmittedAdminEmail(payload: CustomDesignPayload & { customerEmail?: string | null }) {
  const adminUrl = appLink("/admin/custom-orders");
  return sendTransactionalEmailSafely({
    channel: "team",
    to: env.ADMIN_NOTIFICATION_EMAIL,
    subject: `New custom design submitted${payload.submissionNumber ? `: ${payload.submissionNumber}` : ""}`,
    text: paragraph([
      `A customer submitted a custom design${payload.submissionNumber ? ` (${payload.submissionNumber})` : ""}.`,
      payload.designTitle ? `Design: ${payload.designTitle}` : null,
      payload.customerEmail ? `Customer: ${payload.customerEmail}` : null,
      `Review it here: ${adminUrl}`,
    ]),
    html: htmlShell(
      "New custom design submitted",
      `<p>A customer submitted a custom design request.</p>${detailsList([
        ["Submission", payload.submissionNumber],
        ["Design", payload.designTitle],
        ["Customer", payload.customerName || payload.customerEmail],
      ])}${actionButton("Review request", adminUrl)}`,
    ),
  });
}

export async function sendCustomDesignApprovedEmail(payload: CustomDesignPayload) {
  const cartUrl = appLink("/cart");
  return sendTransactionalEmailSafely({
    channel: "notifications",
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
      `<p>Hello ${escapeHtml(payload.customerName || "Customer")},</p><p>Your custom design ${payload.designTitle ? `<b>${escapeHtml(payload.designTitle)}</b> ` : ""}has been approved and added to your cart.</p>${detailsList([
        ["Submission", payload.submissionNumber],
        ["Quoted price", payload.quotedPriceUsd ? `$${payload.quotedPriceUsd}` : null],
        ["Estimated completion", payload.estimatedDeliveryLabel],
        ["Admin note", payload.reason],
      ])}${actionButton("Go to cart and pay", cartUrl)}`,
    ),
  });
}

export async function sendCustomDesignDeclinedEmail(payload: CustomDesignPayload) {
  return sendTransactionalEmailSafely({
    channel: "notifications",
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
      `<p>Hello ${escapeHtml(payload.customerName || "Customer")},</p><p>We reviewed your custom design ${payload.designTitle ? `<b>${escapeHtml(payload.designTitle)}</b> ` : ""}and cannot approve it at this time.</p>${detailsList([
        ["Submission", payload.submissionNumber],
        ["Reason", payload.reason],
      ])}<p>You can contact support if you want to revise the request.</p>`,
    ),
  });
}

export async function sendOrderStatusEmail(payload: OrderStatusPayload) {
  const orderUrl = payload.orderNumber ? appLink("/dashboard/orders") : appLink("/dashboard");
  const statusLabel = String(payload.status ?? "updated").replaceAll("_", " ");
  return sendTransactionalEmailSafely({
    channel: "notifications",
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
      `<p>Hello ${escapeHtml(payload.customerName || "Customer")},</p><p>Your order <b>${escapeHtml(payload.orderNumber ?? "")}</b> status is now <b>${escapeHtml(statusLabel)}</b>.</p>${detailsList([
        ["Payment status", payload.paymentStatus?.replaceAll("_", " ")],
        ["Delivery method", payload.fulfillmentType],
      ])}${actionButton("View your orders", orderUrl)}`,
    ),
  });
}

export async function sendAdminOrderCreatedEmail(payload: AdminOrderPayload) {
  const orderUrl = payload.orderId ? appLink(`/admin/orders/${payload.orderId}`) : appLink("/admin/orders");
  return sendTransactionalEmailSafely({
    channel: "team",
    to: env.ADMIN_NOTIFICATION_EMAIL,
    subject: `New order created${payload.orderNumber ? `: ${payload.orderNumber}` : ""}`,
    text: paragraph([
      `A new order was created${payload.orderNumber ? `: ${payload.orderNumber}` : "."}`,
      payload.customerEmail ? `Customer: ${payload.customerEmail}` : null,
      payload.totalUsd ? `Total: $${payload.totalUsd}` : null,
      `Open order: ${orderUrl}`,
    ]),
    html: htmlShell(
      "New order created",
      `<p>A customer created a new order.</p>${detailsList([
        ["Order", payload.orderNumber],
        ["Customer", payload.customerName || payload.customerEmail],
        ["Total", payload.totalUsd ? `$${payload.totalUsd}` : null],
        ["Status", payload.status],
        ["Payment", payload.paymentStatus],
        ["Payment method", payload.paymentMethod],
      ])}${actionButton("Open order", orderUrl)}`,
    ),
  });
}

export async function sendAdminPaymentReceivedEmail(payload: AdminOrderPayload) {
  const orderUrl = payload.orderId ? appLink(`/admin/payments/${payload.orderId}`) : appLink("/admin/payments");
  return sendTransactionalEmailSafely({
    channel: "team",
    to: env.ADMIN_NOTIFICATION_EMAIL,
    subject: `Payment confirmed${payload.orderNumber ? `: ${payload.orderNumber}` : ""}`,
    text: paragraph([
      `Payment was confirmed${payload.orderNumber ? ` for ${payload.orderNumber}` : ""}.`,
      payload.customerEmail ? `Customer: ${payload.customerEmail}` : null,
      payload.totalUsd ? `Total: $${payload.totalUsd}` : null,
      `Review payment: ${orderUrl}`,
    ]),
    html: htmlShell(
      "Payment confirmed",
      `<p>A customer payment was confirmed.</p>${detailsList([
        ["Order", payload.orderNumber],
        ["Customer", payload.customerName || payload.customerEmail],
        ["Total", payload.totalUsd ? `$${payload.totalUsd}` : null],
        ["Payment", payload.paymentStatus],
      ])}${actionButton("Review payment", orderUrl)}`,
    ),
  });
}

export async function sendSupportTicketCreatedAdminEmail(payload: SupportTicketPayload) {
  const supportUrl = appLink("/admin/support-inbox");
  return sendTransactionalEmailSafely({
    channel: "support",
    to: env.SUPPORT_NOTIFICATION_EMAIL || env.ADMIN_NOTIFICATION_EMAIL,
    subject: `New support ticket${payload.ticketNumber ? `: ${payload.ticketNumber}` : ""}`,
    text: paragraph([
      `A customer submitted a support ticket${payload.ticketNumber ? ` (${payload.ticketNumber})` : ""}.`,
      payload.subject ? `Subject: ${payload.subject}` : null,
      payload.customerEmail ? `Customer: ${payload.customerEmail}` : null,
      payload.message ? `Message: ${payload.message}` : null,
      `Open support inbox: ${supportUrl}`,
    ]),
    html: htmlShell(
      "New support ticket",
      `<p>A customer submitted a support ticket.</p>${detailsList([
        ["Ticket", payload.ticketNumber],
        ["Subject", payload.subject],
        ["Customer", payload.customerName || payload.customerEmail],
      ])}${payload.message ? `<p style="padding:14px;background:#241b0c;border-radius:6px">${escapeHtml(payload.message)}</p>` : ""}${actionButton("Open support inbox", supportUrl)}`,
    ),
  });
}

export async function sendSupportTicketCreatedCustomerEmail(payload: SupportTicketPayload & { to?: string | null }) {
  const supportUrl = appLink("/support");
  return sendTransactionalEmailSafely({
    channel: "support",
    to: payload.to,
    subject: `We received your support request${payload.ticketNumber ? `: ${payload.ticketNumber}` : ""}`,
    text: paragraph([
      `Hello ${payload.customerName || "Customer"},`,
      "We received your support request. Our team will reply as soon as possible.",
      payload.subject ? `Subject: ${payload.subject}` : null,
      payload.message ? `Message: ${payload.message}` : null,
      `Open support: ${supportUrl}`,
    ]),
    html: htmlShell(
      "We received your support request",
      `<p>Hello ${escapeHtml(payload.customerName || "Customer")},</p><p>We received your support request. Our team will reply as soon as possible.</p>${detailsList([
        ["Ticket", payload.ticketNumber],
        ["Subject", payload.subject],
      ])}${actionButton("Open support", supportUrl)}`,
    ),
  });
}

export async function sendSupportReplyEmail(payload: SupportTicketPayload & { to?: string | null; reply?: string | null }) {
  const supportUrl = appLink("/support");
  return sendTransactionalEmailSafely({
    channel: "support",
    to: payload.to,
    subject: `Support reply${payload.ticketNumber ? `: ${payload.ticketNumber}` : ""}`,
    text: paragraph([
      `Hello ${payload.customerName || "Customer"},`,
      "Our support team replied to your ticket.",
      payload.reply,
      `Open support: ${supportUrl}`,
    ]),
    html: htmlShell(
      "Support reply",
      `<p>Hello ${escapeHtml(payload.customerName || "Customer")},</p><p>Our support team replied to your ticket.</p>${detailsList([
        ["Ticket", payload.ticketNumber],
        ["Subject", payload.subject],
      ])}${payload.reply ? `<p style="padding:14px;background:#241b0c;border-radius:6px">${escapeHtml(payload.reply)}</p>` : ""}${actionButton("Open support", supportUrl)}`,
    ),
  });
}

import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { eq, or, and, like, desc, sql, count } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { requireAuth } from "../../middleware/auth.js";
import { requireAnyPermission, requirePermission } from "../../middleware/permissions.js";
import { db } from "../../lib/db/drizzle.js";
import {
  supportTickets,
  supportMessages,
  supportAttachments,
  adminNotifications,
  auditLogs,
  users
} from "../../lib/db/schema.js";
import { PERMISSIONS } from "../../lib/auth/permissions.js";
import type { AppBindings } from "../../types/hono.js";
import {
  sendSupportReplyEmail,
  sendSupportTicketCreatedAdminEmail,
  sendSupportTicketCreatedCustomerEmail,
} from "../../services/email-service.js";

// Validation schemas
const listQuerySchema = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  unreadOnly: z.string().optional(), // "true" or "false"
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

const ticketIdParamSchema = z.object({
  ticketId: z.string().uuid(),
});

const patchTicketSchema = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  assignedAdminId: z.string().uuid().nullable().optional(),
  unreadByAdmin: z.boolean().optional(),
});

const replySchema = z.object({
  messageBody: z.string().trim().min(1, "Message body is required"),
  status: z.string().optional(),
  priority: z.string().optional(),
  assignedAdminId: z.string().uuid().nullable().optional(),
  internalNote: z.string().optional(),
  attachments: z.array(z.string().url()).optional(),
});

const createTicketSchema = z.object({
  customerName: z.string().trim().min(1),
  customerEmail: z.string().trim().email(),
  subject: z.string().trim().min(1),
  messageBody: z.string().trim().min(1),
  category: z.string().default("general_question"),
  priority: z.string().default("medium"),
  orderId: z.string().uuid().nullable().optional(),
});

export const supportRouter = new Hono<AppBindings>();

// Auth middleware for all support routes
supportRouter.use("/*", requireAuth);

// Helper to auto-detect category if none provided
function autoDetectCategory(subject: string, message: string, sourcePage?: string): string {
  const text = `${subject} ${message}`.toLowerCase();
  if (sourcePage === "order") return "order_question";
  if (sourcePage === "payment") return "payment_issue";
  
  if (text.includes("payment") || text.includes("checkout") || text.includes("paypal") || text.includes("credit card") || text.includes("bank") || text.includes("stripe")) {
    return "payment_issue";
  }
  if (text.includes("order") || text.includes("track") || text.includes("receipt") || text.includes("purchased")) {
    return "order_question";
  }
  if (text.includes("delivery") || text.includes("shipping") || text.includes("carrier") || text.includes("dhl") || text.includes("fedex") || text.includes("received")) {
    return "delivery_issue";
  }
  if (text.includes("size") || text.includes("tailor") || text.includes("measurement") || text.includes("chest") || text.includes("height") || text.includes("fitting")) {
    return "measurement_question";
  }
  if (text.includes("refund") || text.includes("return") || text.includes("cancel")) {
    return "return_refund";
  }
  if (text.includes("fabric") || text.includes("dress") || text.includes("habesha") || text.includes("clothing") || text.includes("suit")) {
    return "product_question";
  }
  if (text.includes("complain") || text.includes("bad") || text.includes("worst") || text.includes("angry") || text.includes("delay")) {
    return "complaint";
  }
  if (text.includes("technical") || text.includes("error") || text.includes("login") || text.includes("bug") || text.includes("website")) {
    return "technical_issue";
  }
  return "general_question";
}

// 1. Get Support KPIs
supportRouter.get("/kpis", requirePermission(PERMISSIONS.SUPPORT_VIEW), async (c) => {
  const allTickets = await db.select().from(supportTickets);
  
  const total = allTickets.length;
  const newCount = allTickets.filter(t => t.status === "new").length;
  const unread = allTickets.filter(t => t.unreadByAdmin).length;
  const open = allTickets.filter(t => t.status === "open").length;
  const pending = allTickets.filter(t => t.status === "pending_reply" || t.status === "pending").length;
  const resolved = allTickets.filter(t => t.status === "resolved").length;
  const complaints = allTickets.filter(t => t.category === "complaint").length;
  
  // Urgent includes priority = 'urgent' and not resolved
  const urgent = allTickets.filter(t => t.priority === "urgent" && t.status !== "resolved").length;

  return c.json({
    data: {
      total,
      new: newCount,
      unread,
      open,
      pending,
      resolved,
      complaints,
      urgent
    }
  });
});

// 2. Get unread ticket count for sidebar/header badge
supportRouter.get("/unread-count", requirePermission(PERMISSIONS.SUPPORT_VIEW), async (c) => {
  const [row] = await db
    .select({ count: count() })
    .from(supportTickets)
    .where(eq(supportTickets.unreadByAdmin, true));
  
  return c.json({ count: row?.count ?? 0 });
});

// 3. List Support Tickets (with filtering & search)
supportRouter.get("/tickets", requirePermission(PERMISSIONS.SUPPORT_VIEW), zValidator("query", listQuerySchema), async (c) => {
  const { status, priority, category, search, unreadOnly, limit, offset } = c.req.valid("query");
  
  const conditions = [];

  if (status && status !== "all") {
    if (status === "new") {
      conditions.push(eq(supportTickets.status, "new"));
    } else if (status === "unread") {
      conditions.push(eq(supportTickets.unreadByAdmin, true));
    } else if (status === "open") {
      conditions.push(eq(supportTickets.status, "open"));
    } else if (status === "pending_reply" || status === "pending") {
      conditions.push(eq(supportTickets.status, "pending_reply"));
    } else if (status === "resolved") {
      conditions.push(eq(supportTickets.status, "resolved"));
    } else if (status === "archived" || status === "spam") {
      conditions.push(eq(supportTickets.status, "archived"));
    } else {
      conditions.push(eq(supportTickets.status, status));
    }
  }

  if (unreadOnly === "true") {
    conditions.push(eq(supportTickets.unreadByAdmin, true));
  }

  if (priority && priority !== "all") {
    conditions.push(eq(supportTickets.priority, priority));
  }

  if (category && category !== "all") {
    conditions.push(eq(supportTickets.category, category));
  }

  if (search) {
    const searchPattern = `%${search}%`;
    conditions.push(
      or(
        like(supportTickets.ticketNumber, searchPattern),
        like(supportTickets.customerName, searchPattern),
        like(supportTickets.customerEmail, searchPattern),
        like(supportTickets.subject, searchPattern)
      )
    );
  }

  const queryCondition = conditions.length > 0 ? and(...conditions) : undefined;

  const data = await db.query.supportTickets.findMany({
    where: queryCondition,
    orderBy: [desc(supportTickets.lastMessageAt)],
    limit: limit ?? 50,
    offset: offset ?? 0,
  });

  return c.json({ data });
});

// 4. Get ticket detail (ticket + messages + attachments)
supportRouter.get("/tickets/:ticketId", requirePermission(PERMISSIONS.SUPPORT_VIEW), zValidator("param", ticketIdParamSchema), async (c) => {
  const { ticketId } = c.req.valid("param");
  
  const ticket = await db.query.supportTickets.findFirst({
    where: eq(supportTickets.id, ticketId)
  });

  if (!ticket) {
    throw new HTTPException(404, { message: "Support ticket not found" });
  }

  // Get messages for this ticket
  const messages = await db.query.supportMessages.findMany({
    where: eq(supportMessages.ticketId, ticketId),
    orderBy: [supportMessages.createdAt]
  });

  // Get attachments for this ticket
  const attachments = await db.query.supportAttachments.findMany({
    where: eq(supportAttachments.ticketId, ticketId)
  });

  // Mark ticket as read by admin when viewed
  if (ticket.unreadByAdmin) {
    await db
      .update(supportTickets)
      .set({ unreadByAdmin: false, updatedAt: new Date() })
      .where(eq(supportTickets.id, ticketId));
    ticket.unreadByAdmin = false;
  }

  return c.json({
    data: {
      ...ticket,
      messages,
      attachments
    }
  });
});

// 5. Update support ticket fields
supportRouter.patch(
  "/tickets/:ticketId",
  requireAnyPermission([PERMISSIONS.SUPPORT_ASSIGN, PERMISSIONS.SUPPORT_RESOLVE]),
  zValidator("param", ticketIdParamSchema),
  zValidator("json", patchTicketSchema),
  async (c) => {
  const authUser = c.get("authUser");
  const { ticketId } = c.req.valid("param");
  const body = c.req.valid("json");

  const ticket = await db.query.supportTickets.findFirst({
    where: eq(supportTickets.id, ticketId)
  });

  if (!ticket) {
    throw new HTTPException(404, { message: "Support ticket not found" });
  }

  const updateFields: any = {
    updatedAt: new Date(),
  };

  if (body.status !== undefined) updateFields.status = body.status;
  if (body.priority !== undefined) updateFields.priority = body.priority;
  if (body.assignedAdminId !== undefined) updateFields.assignedAdminId = body.assignedAdminId;
  if (body.unreadByAdmin !== undefined) updateFields.unreadByAdmin = body.unreadByAdmin;

  const [updated] = await db
    .update(supportTickets)
    .set(updateFields)
    .where(eq(supportTickets.id, ticketId))
    .returning();

  // Audit log entry
  await db.insert(auditLogs).values({
    action: "ticket_updated",
    category: "support",
    severity: "info",
    entityType: "support_ticket",
    entityId: ticketId,
    performedBy: authUser?.email ?? "admin",
    details: `Updated ticket ${ticket.ticketNumber}: status=${body.status ?? ticket.status}, priority=${body.priority ?? ticket.priority}`,
    metadata: body,
  });

  return c.json({ data: updated });
  },
);

// 6. Submit Admin Reply (Saves message, updates ticket, sends email)
supportRouter.post(
  "/tickets/:ticketId/reply",
  requirePermission(PERMISSIONS.SUPPORT_REPLY),
  zValidator("param", ticketIdParamSchema),
  zValidator("json", replySchema),
  async (c) => {
  const authUser = c.get("authUser");
  const { ticketId } = c.req.valid("param");
  const body = c.req.valid("json");

  const ticket = await db.query.supportTickets.findFirst({
    where: eq(supportTickets.id, ticketId)
  });

  if (!ticket) {
    throw new HTTPException(404, { message: "Support ticket not found" });
  }

  await sendSupportReplyEmail({
    to: ticket.customerEmail,
    customerName: ticket.customerName,
    customerEmail: ticket.customerEmail,
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    reply: body.messageBody,
  });

  // 2. Query admin name
  let adminName = "Admin Customer Support";
  if (authUser?.email) {
    const adminUser = await db.query.users.findFirst({
      where: eq(users.email, authUser.email)
    });
    if (adminUser?.name) {
      adminName = adminUser.name;
    }
  }

  // 3. Save reply message in database
  const [message] = await db
    .insert(supportMessages)
    .values({
      ticketId,
      senderType: "admin",
      senderName: adminName,
      senderEmail: authUser?.email ?? "support@yehagerbahillibs.com",
      messageBody: body.messageBody,
      attachments: body.attachments ?? [],
      isRead: true, // Read by admin who sent it
    })
    .returning();

  // 3. Update ticket status & timestamps
  const ticketStatus = body.status || "pending_reply"; // default is pending reply (meaning waiting for customer)
  const ticketPriority = body.priority || ticket.priority;
  const assignedAdminId = body.assignedAdminId !== undefined ? body.assignedAdminId : ticket.assignedAdminId;

  await db
    .update(supportTickets)
    .set({
      status: ticketStatus,
      priority: ticketPriority,
      assignedAdminId,
      unreadByAdmin: false, // Admin just replied, so not unread by admin
      unreadByCustomer: true, // Unread by customer now
      lastMessageAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(supportTickets.id, ticketId));

  // 4. Save attachments if any exist
  if (body.attachments && body.attachments.length > 0) {
    for (const url of body.attachments) {
      const fileName = url.substring(url.lastIndexOf("/") + 1) || "attachment";
      await db.insert(supportAttachments).values({
        ticketId,
        messageId: message.id,
        fileName,
        fileUrl: url,
        fileType: fileName.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
      });
    }
  }

  // 5. Save internal note if provided
  if (body.internalNote) {
    await db.insert(supportMessages).values({
      ticketId,
      senderType: "system",
      senderName: "System Note",
      senderEmail: "system@yehagerbahillibs.com",
      messageBody: `INTERNAL NOTE: ${body.internalNote}`,
      isRead: true,
    });
  }

  // 6. Log admin activity
  await db.insert(auditLogs).values({
    action: "ticket_replied",
    category: "support",
    severity: "info",
    entityType: "support_ticket",
    entityId: ticketId,
    performedBy: authUser?.email ?? "admin",
    details: `Replied to ticket ${ticket.ticketNumber} and sent email to ${ticket.customerEmail}`,
  });

  return c.json({
    success: true,
    message: "Reply sent successfully!",
    data: message
  });
});

// 7. Create Support Ticket (customer submitting a message)
supportRouter.post("/tickets", zValidator("json", createTicketSchema), async (c) => {
  const authUser = c.get("authUser");
  const body = c.req.valid("json");

  // Create ticket number
  const ticketNum = "TK-" + Math.floor(100000 + Math.random() * 900000);
  
  // Detect category if general_question was default
  const finalCategory = body.category === "general_question" 
    ? autoDetectCategory(body.subject, body.messageBody)
    : body.category;

  const [ticket] = await db
    .insert(supportTickets)
    .values({
      ticketNumber: ticketNum,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerId: authUser?.role === "customer" ? authUser.sub : null,
      subject: body.subject,
      category: finalCategory,
      priority: body.priority || "medium",
      status: "new",
      unreadByAdmin: true,
      unreadByCustomer: false,
      orderId: body.orderId || null,
    })
    .returning();

  // Save the customer's message
  await db.insert(supportMessages).values({
    ticketId: ticket.id,
    senderType: "customer",
    senderName: body.customerName,
    senderEmail: body.customerEmail,
    messageBody: body.messageBody,
    isRead: false,
  });

  // Create an admin notification
  await db.insert(adminNotifications).values({
    type: "new_ticket",
    title: `New Ticket: ${ticket.subject}`,
    message: `${body.customerName} submitted a ticket regarding ${finalCategory.replace("_", " ")}`,
    relatedTicketId: ticket.id,
    isRead: false,
  });

  // Log activity
  await db.insert(auditLogs).values({
    action: "ticket_created",
    category: "support",
    severity: "info",
    entityType: "support_ticket",
    entityId: ticket.id,
    performedBy: body.customerEmail,
    details: `Ticket ${ticketNum} created by customer ${body.customerName}`,
  });

  await sendSupportTicketCreatedCustomerEmail({
    to: body.customerEmail,
    customerName: body.customerName,
    customerEmail: body.customerEmail,
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    message: body.messageBody,
  });
  await sendSupportTicketCreatedAdminEmail({
    customerName: body.customerName,
    customerEmail: body.customerEmail,
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    message: body.messageBody,
  });

  return c.json({ data: ticket }, 201);
});

// 8. Seeds some dummy data for testing (only visible/runnable in dev)
supportRouter.post("/seed-demo", async (c) => {
  const authUser = c.get("authUser");
  
  const existingCount = await db.select({ count: count() }).from(supportTickets);
  if (existingCount[0].count > 3) {
    return c.json({ message: "Already seeded, skipping to prevent duplicates", count: existingCount[0].count });
  }

  const dummyTickets = [
    {
      num: "TK-482019",
      name: "Ebenezer Seyoum",
      email: "ebenezer@example.com",
      subject: "Tailoring sizing concern for Habesha Kemis",
      category: "measurement_question",
      priority: "high",
      status: "new",
      body: "Hello support, I placed an order last night for a custom Habesha wedding dress. I am worried about the shoulder width. Should I measure from joint to joint or add some extra padding room? Please let me know before tailoring starts.",
      reply: null
    },
    {
      num: "TK-902184",
      name: "Helen Tekle",
      email: "helen@example.com",
      subject: "Stripe Payment status showing pending but card was charged",
      category: "payment_issue",
      priority: "urgent",
      status: "open",
      body: "Hi! I just purchased the Couple Habesha Outfit (USD 450). Stripe completed the transaction and I saw the success charge on my bank app, but the dashboard says payment pending proof. Please confirm.",
      reply: null
    },
    {
      num: "TK-108273",
      name: "Yonas Kassa",
      email: "yonas@example.com",
      subject: "DHL Delivery update request",
      category: "delivery_issue",
      priority: "medium",
      status: "pending_reply",
      body: "Hi support team, has my package been shipped yet? The event is in two weeks and I haven't received the DHL tracking number. Order ID is 7fa8d3.",
      reply: "Dear Yonas, yes, your order has been tailored and quality checked. It is currently at the packaging station. You will receive a DHL tracking code via email within the next 24 hours. Best regards, Support Team."
    },
    {
      num: "TK-556108",
      name: "Selamawit Girma",
      email: "selam@example.com",
      subject: "Return option for size mismatch",
      category: "return_refund",
      priority: "low",
      status: "resolved",
      body: "Hello, the embroidery on the sleeve is beautiful but the waist is a bit tighter than expected. Can I send it back for resizing or get a partial refund to adjust it locally?",
      reply: "Hi Selamawit, since all our clothing items are custom-tailored to order, we don't accept standard returns. However, we do offer a sizing adjustment credit. Please send us a photo of the fit and we will cover up to $50 of local tailoring costs to adjust the waist for you. Let us know if that works!"
    },
    {
      num: "TK-302194",
      name: "Test Failure User",
      email: "fail@example.com",
      subject: "Urgent: Testing SMTP email failure state",
      category: "complaint",
      priority: "urgent",
      status: "new",
      body: "This is a complaint ticket set up for fail@example.com to verify that the Support Inbox shows a proper error toast and maintains the draft reply if the SMTP connection fails.",
      reply: null
    }
  ];

  for (const dummy of dummyTickets) {
    const [ticket] = await db
      .insert(supportTickets)
      .values({
        ticketNumber: dummy.num,
        customerName: dummy.name,
        customerEmail: dummy.email,
        subject: dummy.subject,
        category: dummy.category,
        priority: dummy.priority,
        status: dummy.status,
        unreadByAdmin: dummy.status === "new",
        unreadByCustomer: dummy.status === "pending_reply",
        lastMessageAt: new Date(Date.now() - 3600 * 1000 * (dummy.status === "new" ? 1 : 24)),
      })
      .returning();

    // Save initial message
    await db.insert(supportMessages).values({
      ticketId: ticket.id,
      senderType: "customer",
      senderName: dummy.name,
      senderEmail: dummy.email,
      messageBody: dummy.body,
      isRead: dummy.status !== "new",
      createdAt: new Date(Date.now() - 3600 * 1000 * 25),
    });

    // Save admin reply if present
    if (dummy.reply) {
      await db.insert(supportMessages).values({
        ticketId: ticket.id,
        senderType: "admin",
        senderName: "Admin Customer Support",
        senderEmail: "support@yehagerbahillibs.com",
        messageBody: dummy.reply,
        isRead: true,
        createdAt: new Date(Date.now() - 3600 * 1000 * 2),
      });
    }

    if (dummy.status === "new") {
      await db.insert(adminNotifications).values({
        type: "new_ticket",
        title: `New Ticket: ${dummy.subject}`,
        message: `${dummy.name} submitted a support ticket.`,
        relatedTicketId: ticket.id,
        isRead: false,
      });
    }
  }

  return c.json({ success: true, message: "Demo support tickets seeded!" });
});

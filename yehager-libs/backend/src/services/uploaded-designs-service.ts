import { and, desc, eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { db } from "../lib/db/drizzle.js";
import { auditLogs, orders, systemAlerts, uploadedDesigns } from "../lib/db/schema.js";
import { generateOrderNumber, numberToMoney } from "./checkout-utils.js";
import { getUserByEmail } from "../repositories/users-repository.js";

function makeSubmissionNumber(date = new Date(), randomPart = Math.floor(1000 + Math.random() * 9000)) {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `UD-${yyyy}${mm}${dd}-${randomPart}`;
}

export async function createUploadedDesignSubmission(payload: {
  userEmail?: string;
  userId?: string;
  designTitle: string;
  inspirationNote?: string;
  frontImageUrl: string;
  sideImageUrl?: string;
  backImageUrl?: string;
  fabricType?: string;
  embroideryStyle?: string;
  colorPreference?: string;
  measurementSnapshot?: Record<string, unknown>;
  contactPhone?: string;
  contactTelegram?: string;
  contactAddress?: Record<string, unknown>;
}) {
  if (!payload.userEmail) {
    throw new HTTPException(400, { message: "Authenticated token must include email" });
  }

  const user = await getUserByEmail(payload.userEmail);
  const customerName = user?.name ?? payload.userEmail.split("@")[0];

  const [submission] = await db
    .insert(uploadedDesigns)
    .values({
      submissionNumber: makeSubmissionNumber(),
      userId: user?.id ?? payload.userId,
      userEmail: payload.userEmail,
      customerName,
      designTitle: payload.designTitle,
      inspirationNote: payload.inspirationNote,
      frontImageUrl: payload.frontImageUrl,
      sideImageUrl: payload.sideImageUrl,
      backImageUrl: payload.backImageUrl,
      fabricType: payload.fabricType,
      embroideryStyle: payload.embroideryStyle,
      colorPreference: payload.colorPreference,
      measurementSnapshot: payload.measurementSnapshot ?? {},
      contactPhone: payload.contactPhone,
      contactTelegram: payload.contactTelegram,
      contactAddress: payload.contactAddress,
      status: "submitted",
      submittedAt: new Date(),
    })
    .returning();

  await db.insert(auditLogs).values({
    action: "uploaded_design_submitted",
    category: "order",
    severity: "info",
    entityType: "uploaded_design",
    entityId: submission.id,
    performedBy: payload.userEmail,
    details: "Customer submitted upload-your-design request",
    metadata: {
      submission_number: submission.submissionNumber,
      design_title: submission.designTitle,
    },
  });

  await db.insert(systemAlerts).values({
    title: `Uploaded design submitted: ${submission.submissionNumber}`,
    message: `${submission.userEmail} submitted a design for review`,
    type: "design_review",
    severity: "info",
    entityId: submission.id,
  });

  return submission;
}

export async function listUploadedDesignsForCurrentUser(userEmail?: string, limit = 50) {
  if (!userEmail) {
    throw new HTTPException(400, { message: "Authenticated token must include email" });
  }
  return db.query.uploadedDesigns.findMany({
    where: eq(uploadedDesigns.userEmail, userEmail),
    orderBy: [desc(uploadedDesigns.createdAt)],
    limit,
  });
}

export async function getUploadedDesignForCurrentUser(payload: { designId: string; userEmail?: string }) {
  if (!payload.userEmail) {
    throw new HTTPException(400, { message: "Authenticated token must include email" });
  }
  const row = await db.query.uploadedDesigns.findFirst({
    where: and(eq(uploadedDesigns.id, payload.designId), eq(uploadedDesigns.userEmail, payload.userEmail)),
  });
  if (!row) {
    throw new HTTPException(404, { message: "Uploaded design not found" });
  }
  return row;
}

export async function listUploadedDesignsForAdmin(params: { status?: string; limit: number }) {
  if (params.status) {
    return db.query.uploadedDesigns.findMany({
      where: eq(uploadedDesigns.status, params.status),
      orderBy: [desc(uploadedDesigns.createdAt)],
      limit: params.limit,
    });
  }
  return db.query.uploadedDesigns.findMany({
    orderBy: [desc(uploadedDesigns.createdAt)],
    limit: params.limit,
  });
}

export async function getUploadedDesignForAdmin(designId: string) {
  const row = await db.query.uploadedDesigns.findFirst({
    where: eq(uploadedDesigns.id, designId),
  });
  if (!row) {
    throw new HTTPException(404, { message: "Uploaded design not found" });
  }
  return row;
}

export async function reviewUploadedDesign(payload: {
  designId: string;
  decision: "approve" | "reject";
  performedBy?: string;
  reason?: string;
  quotedPriceUsd?: number;
}) {
  const submission = await getUploadedDesignForAdmin(payload.designId);
  if (!["submitted", "in_review"].includes(submission.status)) {
    throw new HTTPException(400, { message: `Cannot review design in status '${submission.status}'` });
  }

  if (payload.decision === "approve") {
    return db.transaction(async (tx) => {
      const customerName = submission.customerName || submission.userEmail.split("@")[0];
      const orderNumber = generateOrderNumber();
      const quotedPrice = Number.isFinite(payload.quotedPriceUsd) ? Math.max(payload.quotedPriceUsd ?? 0, 0) : 0;

      const [order] = await tx
        .insert(orders)
        .values({
          orderNumber,
          userId: submission.userId,
          userEmail: submission.userEmail,
          customerName,
          items: [
            {
              type: "uploaded_design",
              uploaded_design_id: submission.id,
              submission_number: submission.submissionNumber,
              design_title: submission.designTitle,
              front_image_url: submission.frontImageUrl,
              side_image_url: submission.sideImageUrl,
              back_image_url: submission.backImageUrl,
              fabric_type: submission.fabricType,
              embroidery_style: submission.embroideryStyle,
              color_preference: submission.colorPreference,
              measurement_snapshot: submission.measurementSnapshot,
              contact_address: submission.contactAddress,
            },
          ],
          totalUsd: numberToMoney(quotedPrice),
          shippingCostUsd: numberToMoney(0),
          status: "pending",
          paymentStatus: "pending",
          paymentMethod: "manual_review",
          paymentCurrency: "USD",
          fulfillmentType: "mail",
        })
        .returning();

      const [updated] = await tx
        .update(uploadedDesigns)
        .set({
          status: "approved",
          reviewedBy: payload.performedBy ?? "admin",
          reviewedAt: new Date(),
          reviewReason: payload.reason,
          approvedOrderId: order.id,
          updatedAt: new Date(),
        })
        .where(eq(uploadedDesigns.id, payload.designId))
        .returning();

      await tx.insert(auditLogs).values({
        action: "uploaded_design_approved",
        category: "order",
        severity: "info",
        entityType: "uploaded_design",
        entityId: updated.id,
        performedBy: payload.performedBy ?? "admin",
        details: "Uploaded design approved and converted to order",
        metadata: {
          order_id: order.id,
          order_number: order.orderNumber,
          quoted_price_usd: quotedPrice,
        },
      });

      return { submission: updated, order };
    });
  }

  const [updated] = await db
    .update(uploadedDesigns)
    .set({
      status: "rejected",
      reviewedBy: payload.performedBy ?? "admin",
      reviewedAt: new Date(),
      reviewReason: payload.reason,
      emailPlaceholderStatus: "pending_manual_delivery",
      emailPlaceholderNote:
        "TODO: send rejection email to customer when email integration is enabled.",
      updatedAt: new Date(),
    })
    .where(eq(uploadedDesigns.id, payload.designId))
    .returning();

  await db.insert(auditLogs).values({
    action: "uploaded_design_rejected",
    category: "order",
    severity: "warning",
    entityType: "uploaded_design",
    entityId: updated.id,
    performedBy: payload.performedBy ?? "admin",
    details: "Uploaded design rejected by admin review",
    metadata: {
      reason: payload.reason ?? null,
      email_placeholder_status: "pending_manual_delivery",
    },
  });

  return { submission: updated, order: null };
}

export async function setUploadedDesignInReview(payload: { designId: string; performedBy?: string }) {
  const [updated] = await db
    .update(uploadedDesigns)
    .set({
      status: "in_review",
      reviewedBy: payload.performedBy ?? "admin",
      updatedAt: new Date(),
    })
    .where(and(eq(uploadedDesigns.id, payload.designId), eq(uploadedDesigns.status, "submitted")))
    .returning();

  return updated ?? null;
}

export async function getUploadedDesignSummaryCounts() {
  const rows = await db
    .select({
      status: uploadedDesigns.status,
      count: sql<number>`count(*)::int`,
    })
    .from(uploadedDesigns)
    .groupBy(uploadedDesigns.status);

  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = row.count;
    return acc;
  }, {});
}

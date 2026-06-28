import { and, desc, eq, sql, count } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { db } from "../lib/db/drizzle.js";
import { auditLogs, cartItems, events, familyGroups, systemAlerts, uploadedDesigns, familyMembers, eventParticipants } from "../lib/db/schema.js";
import { numberToMoney } from "./checkout-utils.js";
import { getUserByEmail } from "../repositories/users-repository.js";
import { sendCustomDesignApprovedEmail, sendCustomDesignDeclinedEmail, sendCustomDesignSubmittedAdminEmail } from "./email-service.js";

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
  detailImageUrl?: string;
  childAge?: number;
  fabricType?: string;
  embroideryStyle?: string;
  colorPreference?: string;
  measurementSnapshot?: Record<string, unknown>;
  contactPhone?: string;
  contactTelegram?: string;
  contactAddress?: Record<string, unknown>;
  familyGroupId?: string;
  eventId?: string;
}) {
  if (!payload.userEmail) {
    throw new HTTPException(400, { message: "Authenticated token must include email" });
  }

  const user = await getUserByEmail(payload.userEmail);
  const customerName = user?.name ?? payload.userEmail.split("@")[0];
  if (payload.familyGroupId) {
    const group = await db.query.familyGroups.findFirst({
      where: and(eq(familyGroups.id, payload.familyGroupId), eq(familyGroups.leadEmail, payload.userEmail)),
    });
    if (!group) throw new HTTPException(404, { message: "Group order not found" });
  }
  if (payload.eventId) {
    const event = await db.query.events.findFirst({
      where: and(eq(events.id, payload.eventId), eq(events.ownerEmail, payload.userEmail)),
    });
    if (!event) throw new HTTPException(404, { message: "Event Match-Up not found" });
  }

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
      detailImageUrl: payload.detailImageUrl,
      childAge: payload.childAge,
      fabricType: payload.fabricType,
      embroideryStyle: payload.embroideryStyle,
      colorPreference: payload.colorPreference,
      measurementSnapshot: payload.measurementSnapshot ?? {},
      contactPhone: payload.contactPhone,
      contactTelegram: payload.contactTelegram,
      contactAddress: payload.contactAddress,
      familyGroupId: payload.familyGroupId,
      eventId: payload.eventId,
      status: "submitted",
      submittedAt: new Date(),
    })
    .returning();

  if (payload.familyGroupId) {
    await db
      .update(familyGroups)
      .set({
        selectionType: "custom_design",
        uploadedDesignId: submission.id,
        productId: null,
        productName: submission.designTitle,
        productImage: submission.frontImageUrl,
        updatedAt: new Date(),
      })
      .where(and(eq(familyGroups.id, payload.familyGroupId), eq(familyGroups.leadEmail, payload.userEmail)));
  }
  if (payload.eventId) {
    await db
      .update(events)
      .set({
        selectionType: "custom_design",
        uploadedDesignId: submission.id,
        productId: null,
        productName: submission.designTitle,
        updatedAt: new Date(),
      })
      .where(and(eq(events.id, payload.eventId), eq(events.ownerEmail, payload.userEmail)));
    await db
      .update(familyGroups)
      .set({
        selectionType: "custom_design",
        uploadedDesignId: submission.id,
        productId: null,
        productName: submission.designTitle,
        productImage: submission.frontImageUrl,
        updatedAt: new Date(),
      })
      .where(eq(familyGroups.eventId, payload.eventId));
  }

  await db.insert(auditLogs).values({
    action: "uploaded_design_submitted",
    category: "order",
    severity: "info",
    entityType: "uploaded_design",
    entityId: submission.id,
    performedBy: payload.userEmail,
    details: "Customer submitted custom design request",
    metadata: {
      submission_number: submission.submissionNumber,
      design_title: submission.designTitle,
    },
  });

  await db.insert(systemAlerts).values({
    title: `Custom design submitted: ${submission.submissionNumber}`,
    message: `${submission.userEmail} submitted a custom design for review`,
    type: "design_review",
    severity: "info",
    entityId: submission.id,
  });

  await sendCustomDesignSubmittedAdminEmail({
    customerName: submission.customerName,
    customerEmail: submission.userEmail,
    submissionNumber: submission.submissionNumber,
    designTitle: submission.designTitle,
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
    throw new HTTPException(404, { message: "Custom design not found" });
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
    throw new HTTPException(404, { message: "Custom design not found" });
  }
  await db
    .update(systemAlerts)
    .set({
      isResolved: true,
      resolvedBy: "admin_viewed_custom_design",
      updatedAt: new Date(),
    })
    .where(
      and(
        sql`${systemAlerts.type} IN ('design_review', 'custom_design_submitted')`,
        eq(systemAlerts.entityId, designId)
      )
    );
  return row;
}

export async function reviewUploadedDesign(payload: {
  designId: string;
  decision: "approve" | "reject";
  performedBy?: string;
  reason?: string;
  quotedPriceUsd?: number;
  estimatedDeliveryLabel?: string;
  estimatedDeliveryDaysMin?: number;
  estimatedDeliveryDaysMax?: number;
}) {
  const submission = await getUploadedDesignForAdmin(payload.designId);
  if (!["submitted", "in_review"].includes(submission.status)) {
    throw new HTTPException(400, { message: `Cannot review design in status '${submission.status}'` });
  }

  if (payload.decision === "approve") {
    const result = await db.transaction(async (tx) => {
      const quotedPrice = Number.isFinite(payload.quotedPriceUsd) ? Math.max(payload.quotedPriceUsd ?? 0, 0) : 0;
      if (quotedPrice <= 0) {
        throw new HTTPException(400, { message: "Quoted price is required before approving a custom design" });
      }
      const deliveryMin = payload.estimatedDeliveryDaysMin;
      const deliveryMax = payload.estimatedDeliveryDaysMax;
      if (!payload.estimatedDeliveryLabel || !deliveryMin || !deliveryMax || deliveryMax < deliveryMin) {
        throw new HTTPException(400, { message: "A valid estimated completion and delivery time is required" });
      }

      let memberCount = 1;
      if (submission.familyGroupId) {
        const [res] = await tx.select({ value: count() }).from(familyMembers).where(eq(familyMembers.familyGroupId, submission.familyGroupId));
        memberCount = Number(res?.value || 1);
      } else if (submission.eventId) {
        const [res] = await tx.select({ value: count() }).from(eventParticipants).where(eq(eventParticipants.eventId, submission.eventId));
        memberCount = Number(res?.value || 1);
      }

      const totalPrice = quotedPrice * memberCount;

      const [cartItem] = await tx
        .insert(cartItems)
        .values({
          userId: submission.userId,
          userEmail: submission.userEmail,
          productName: `Custom Design - ${submission.designTitle}${memberCount > 1 ? ` (Group of ${memberCount})` : ""}`,
          productImage: submission.frontImageUrl,
          priceUsd: numberToMoney(totalPrice),
          quantity: 1,
          itemType: submission.familyGroupId || submission.eventId ? "group_order" : "custom_design",
          uploadedDesignId: submission.id,
          measurementSnapshot: submission.measurementSnapshot,
          eventId: submission.eventId,
          itemMetadata: {
            type: submission.familyGroupId || submission.eventId ? "group_order" : "custom_design",
            submission_number: submission.submissionNumber,
            design_title: submission.designTitle,
            front_image_url: submission.frontImageUrl,
            side_image_url: submission.sideImageUrl,
            back_image_url: submission.backImageUrl,
            detail_image_url: submission.detailImageUrl,
            fabric_type: submission.fabricType,
            embroidery_style: submission.embroideryStyle,
            color_preference: submission.colorPreference,
            child_age: submission.childAge,
            contact_address: submission.contactAddress,
            admin_note: payload.reason,
            estimated_delivery_label: payload.estimatedDeliveryLabel,
            estimated_delivery_days_min: deliveryMin,
            estimated_delivery_days_max: deliveryMax,
            ...(submission.familyGroupId ? { group_id: submission.familyGroupId } : {}),
            ...(submission.eventId ? { event_id: submission.eventId } : {}),
          },
        })
        .returning();

      const [updated] = await tx
        .update(uploadedDesigns)
        .set({
          status: "awaiting_payment",
          reviewedBy: payload.performedBy ?? "admin",
          reviewedAt: new Date(),
          reviewReason: payload.reason,
          approvedCartItemId: cartItem?.id,
          quotedPriceUsd: numberToMoney(quotedPrice),
          estimatedDeliveryLabel: payload.estimatedDeliveryLabel,
          estimatedDeliveryDaysMin: deliveryMin,
          estimatedDeliveryDaysMax: deliveryMax,
          emailPlaceholderStatus: "approval_pending_manual_delivery",
          emailPlaceholderNote:
            "Customer should be emailed that their custom design was approved and added to cart.",
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
        details: "Custom design approved and added to cart",
        metadata: {
          cart_item_id: cartItem?.id ?? null,
          quoted_price_usd: quotedPrice,
          estimated_delivery_label: payload.estimatedDeliveryLabel,
          estimated_delivery_days_min: deliveryMin,
          estimated_delivery_days_max: deliveryMax,
          email_placeholder_status: "approval_pending_manual_delivery",
        },
      });

      await tx.insert(systemAlerts).values({
        title: `Custom design approved: ${submission.submissionNumber}`,
        message: `${submission.userEmail}'s custom design was approved and added to cart, and is awaiting payment.`,
        type: "custom_design_awaiting_payment",
        severity: "info",
        entityId: submission.id,
      });

      return { submission: updated, cartItem };
    });
    await sendCustomDesignApprovedEmail({
      to: result.submission.userEmail,
      customerName: result.submission.customerName,
      submissionNumber: result.submission.submissionNumber,
      designTitle: result.submission.designTitle,
      quotedPriceUsd: result.submission.quotedPriceUsd,
      estimatedDeliveryLabel: result.submission.estimatedDeliveryLabel,
      reason: result.submission.reviewReason,
    });
    return result;
  }

  const [updated] = await db
    .update(uploadedDesigns)
    .set({
      status: "rejected",
      reviewedBy: payload.performedBy ?? "admin",
      reviewedAt: new Date(),
      reviewReason: payload.reason,
      emailPlaceholderStatus: "rejection_pending_manual_delivery",
      emailPlaceholderNote:
        "Customer should be emailed that their custom design request was rejected.",
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
    details: "Custom design rejected by admin review",
    metadata: {
      reason: payload.reason ?? null,
      email_placeholder_status: "rejection_pending_manual_delivery",
    },
  });

  await sendCustomDesignDeclinedEmail({
    to: updated.userEmail,
    customerName: updated.customerName,
    submissionNumber: updated.submissionNumber,
    designTitle: updated.designTitle,
    reason: updated.reviewReason,
  });

  return { submission: updated, cartItem: null };
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

export async function getUnreadUploadedDesignReviewCount() {
  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(systemAlerts)
    .where(and(eq(systemAlerts.type, "design_review"), eq(systemAlerts.isResolved, false)));

  return row?.count ?? 0;
}

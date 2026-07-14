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
    await db.update(familyGroups).set({
      selectionType: "custom_design",
      uploadedDesignId: submission.id,
      productId: null,
      productName: submission.designTitle,
      productImage: submission.frontImageUrl,
      updatedAt: new Date(),
    }).where(and(eq(familyGroups.id, payload.familyGroupId), eq(familyGroups.leadEmail, payload.userEmail)));
  }

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
    fabricType: submission.fabricType,
    embroideryStyle: submission.embroideryStyle,
    colorPreference: submission.colorPreference,
    measurementSnapshot: submission.measurementSnapshot,
    imageUrls: [submission.frontImageUrl, submission.sideImageUrl, submission.backImageUrl, submission.detailImageUrl].filter((url): url is string => Boolean(url)),
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
  const members = row.familyGroupId
    ? await db.query.familyMembers.findMany({
        where: eq(familyMembers.familyGroupId, row.familyGroupId),
        orderBy: [desc(familyMembers.createdAt)],
      })
    : [];
  return { ...row, members };
}

type MemberPriceInput = {
  memberId?: string;
  memberName: string;
  roleLabel?: string;
  priceUsd: number;
  designerCostUsd?: number;
  taxPercent?: number;
  otherCostUsd?: number;
};

function numberOrZero(value: unknown) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) && amount >= 0 ? amount : 0;
}

function buildPricingSnapshot(input: {
  roleLabel?: string | null;
  roleGender?: string | null;
  sellingPriceUsd: number;
  designerCostUsd?: number;
  taxPercent?: number;
  otherCostUsd?: number;
}) {
  return {
    role_label: input.roleLabel ?? undefined,
    role_gender: input.roleGender ?? undefined,
    selling_price_usd: numberToMoney(input.sellingPriceUsd),
    designer_cost_usd: numberToMoney(numberOrZero(input.designerCostUsd)),
    tax_percent: numberOrZero(input.taxPercent).toFixed(4),
    other_cost_usd: numberToMoney(numberOrZero(input.otherCostUsd)),
  };
}

export async function reviewUploadedDesign(payload: {
  designId: string;
  decision: "approve" | "reject";
  performedBy?: string;
  reason?: string;
  quotedPriceUsd?: number;
  memberPrices?: MemberPriceInput[];
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
      const deliveryMin = payload.estimatedDeliveryDaysMin;
      const deliveryMax = payload.estimatedDeliveryDaysMax;
      if (!payload.estimatedDeliveryLabel || !deliveryMin || !deliveryMax || deliveryMax < deliveryMin) {
        throw new HTTPException(400, { message: "A valid estimated completion and delivery time is required" });
      }

      let members: Array<typeof familyMembers.$inferSelect> = [];
      let memberCount = 1;
      if (submission.familyGroupId) {
        members = await tx.query.familyMembers.findMany({
          where: eq(familyMembers.familyGroupId, submission.familyGroupId),
          orderBy: [desc(familyMembers.createdAt)],
        });
        memberCount = members.length || 1;
      } else if (submission.eventId) {
        const [res] = await tx.select({ value: count() }).from(eventParticipants).where(eq(eventParticipants.eventId, submission.eventId));
        memberCount = Number(res?.value || 1);
      }

      const memberPriceById = new Map((payload.memberPrices ?? []).filter((item) => item.memberId).map((item) => [item.memberId, item]));
      const memberPricing = members.length
        ? members.map((member) => {
            const override = memberPriceById.get(member.id);
            const price = numberOrZero(override?.priceUsd ?? quotedPrice);
            const snapshot = buildPricingSnapshot({
              roleLabel: override?.roleLabel ?? member.relation ?? member.gender,
              roleGender: member.gender,
              sellingPriceUsd: price,
              designerCostUsd: override?.designerCostUsd,
              taxPercent: override?.taxPercent,
              otherCostUsd: override?.otherCostUsd,
            });
            return {
              member_id: member.id,
              member_name: member.name,
              member_gender: member.gender,
              member_age: member.age,
              role_label: snapshot.role_label,
              price_usd: snapshot.selling_price_usd,
              pricing_snapshot: snapshot,
            };
          })
        : [];

      const totalPrice = memberPricing.length
        ? memberPricing.reduce((sum, item) => sum + numberOrZero(item.price_usd), 0)
        : quotedPrice * memberCount;
      if (totalPrice <= 0) {
        throw new HTTPException(400, { message: "A valid quote or member pricing is required before approving a custom design" });
      }
      const cartSnapshot = buildPricingSnapshot({
        sellingPriceUsd: totalPrice,
        designerCostUsd: memberPricing.reduce((sum, item) => sum + numberOrZero(item.pricing_snapshot.designer_cost_usd), 0),
        taxPercent: 0,
        otherCostUsd: memberPricing.reduce((sum, item) => sum + numberOrZero(item.pricing_snapshot.other_cost_usd), 0),
      });

      const groupMetadata = {
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
        quoted_price_usd: numberToMoney(quotedPrice),
        group_total_price_usd: numberToMoney(totalPrice),
        ...(submission.familyGroupId ? { group_id: submission.familyGroupId } : {}),
        ...(submission.eventId ? { event_id: submission.eventId } : {}),
      };

      const cartRows = memberPricing.length
        ? memberPricing.map((member) => {
            const groupMember = members.find((row) => row.id === member.member_id);
            return {
              userId: submission.userId,
              userEmail: submission.userEmail,
              productName: `Custom Design - ${submission.designTitle} — ${member.member_name}`,
              productImage: submission.frontImageUrl,
              priceUsd: numberToMoney(numberOrZero(member.price_usd)),
              quantity: 1,
              itemType: "group_order",
              uploadedDesignId: submission.id,
              measurementSnapshot: groupMember?.measurements ?? submission.measurementSnapshot,
              eventId: submission.eventId,
              itemMetadata: {
                type: "group_order",
                ...groupMetadata,
                member_id: member.member_id,
                member_name: member.member_name,
                member_gender: member.member_gender,
                member_age: member.member_age,
                role_label: member.role_label,
                member_pricing: [member],
                pricing_snapshot: member.pricing_snapshot,
              },
            };
          })
        : [{
            userId: submission.userId,
            userEmail: submission.userEmail,
            productName: `Custom Design - ${submission.designTitle}`,
            productImage: submission.frontImageUrl,
            priceUsd: numberToMoney(totalPrice),
            quantity: 1,
            itemType: submission.familyGroupId || submission.eventId ? "group_order" : "custom_design",
            uploadedDesignId: submission.id,
            measurementSnapshot: submission.measurementSnapshot,
            eventId: submission.eventId,
            itemMetadata: {
              type: submission.familyGroupId || submission.eventId ? "group_order" : "custom_design",
              ...groupMetadata,
              member_pricing: [],
              pricing_snapshot: cartSnapshot,
            },
          }];

      const insertedCartItems = await tx.insert(cartItems).values(cartRows).returning();
      const cartItem = insertedCartItems[0];

      const [updated] = await tx
        .update(uploadedDesigns)
        .set({
          status: "awaiting_payment",
          reviewedBy: payload.performedBy ?? "admin",
          reviewedAt: new Date(),
          reviewReason: payload.reason,
          approvedCartItemId: cartItem?.id,
          cartRemovedAt: null,
          quotedPriceUsd: numberToMoney(memberPricing.length ? (quotedPrice > 0 ? quotedPrice : totalPrice / memberPricing.length) : quotedPrice),
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
          total_price_usd: totalPrice,
          member_pricing: memberPricing,
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

      return { submission: updated, cartItem, memberPricing };
    });
    await sendCustomDesignApprovedEmail({
      to: result.submission.userEmail,
      customerName: result.submission.customerName,
      submissionNumber: result.submission.submissionNumber,
      designTitle: result.submission.designTitle,
      quotedPriceUsd: result.submission.quotedPriceUsd,
      estimatedDeliveryLabel: result.submission.estimatedDeliveryLabel,
      reason: result.submission.reviewReason,
      fabricType: result.submission.fabricType,
      embroideryStyle: result.submission.embroideryStyle,
      colorPreference: result.submission.colorPreference,
      measurementSnapshot: result.submission.measurementSnapshot,
      memberPricing: result.memberPricing as Array<Record<string, unknown>>,
      imageUrls: [result.submission.frontImageUrl, result.submission.sideImageUrl, result.submission.backImageUrl, result.submission.detailImageUrl].filter((url): url is string => Boolean(url)),
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
    fabricType: updated.fabricType,
    embroideryStyle: updated.embroideryStyle,
    colorPreference: updated.colorPreference,
    measurementSnapshot: updated.measurementSnapshot,
    imageUrls: [updated.frontImageUrl, updated.sideImageUrl, updated.backImageUrl, updated.detailImageUrl].filter((url): url is string => Boolean(url)),
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

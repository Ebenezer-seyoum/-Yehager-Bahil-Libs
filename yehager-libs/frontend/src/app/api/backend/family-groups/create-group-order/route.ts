import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";
import { backendPublicRequest } from "@/lib/backend-public";

type EventRecord = {
  id: string;
  name: string;
  eventCode?: string | null;
};

type FamilyGroupRecord = {
  id: string;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      groupName?: string;
      eventCode?: string;
    };
    const groupName = String(payload.groupName ?? "").trim();
    const eventCode = String(payload.eventCode ?? "").trim().toUpperCase();

    if (!groupName) {
      return NextResponse.json({ error: "Please enter a group name." }, { status: 400 });
    }

    let event: EventRecord | null = null;

    if (eventCode) {
      const eventsRes = await backendPublicRequest("/api/v1/events?limit=200");
      const events = Array.isArray(eventsRes?.data) ? (eventsRes.data as EventRecord[]) : [];
      event = events.find((item) => String(item.eventCode ?? "").toUpperCase() === eventCode) ?? null;

      if (!event) {
        return NextResponse.json({ error: "Event code not found. Please check and try again." }, { status: 404 });
      }

      await apiRequest(`/api/v1/events/${event.id}/join`, { method: "POST" }).catch(() => null);
    } else {
      const eventRes = await apiRequest<{ data: EventRecord }>("/api/v1/events", {
        method: "POST",
        body: {
          name: groupName,
          message: "Family group order created from Our Home Cart.",
        },
      });
      event = eventRes.data;
    }

    const groupRes = await apiRequest<{ data: FamilyGroupRecord }>("/api/v1/family-groups", {
      method: "POST",
      body: {
        groupName,
        eventId: event.id,
      },
    });

    return NextResponse.json({
      data: {
        id: groupRes.data.id,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create group order";
    const isUnauthorized = message.includes("401") || message.includes("No authenticated user found");
    return NextResponse.json({ error: isUnauthorized ? "Sign in is required to create a group order." : message }, { status: isUnauthorized ? 401 : 500 });
  }
}

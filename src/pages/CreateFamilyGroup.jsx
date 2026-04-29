import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, Users, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function CreateFamilyGroup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const eventId = searchParams.get("event");

  const [user, setUser] = useState(null);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
      const authed = await base44.auth.isAuthenticated();
      if (!authed) {
        base44.auth.redirectToLogin();
        return;
      }
      const me = await base44.auth.me();
      let evt = null;
      if (eventId) {
        const events = await base44.entities.Event.filter({ id: eventId });
        if (events.length > 0) evt = events[0];
      }
      // Check if a group already exists for this user+event (avoid duplicates)
      if (eventId) {
        const existingGroups = await base44.entities.FamilyGroup.filter({ event_id: eventId, lead_email: me.email });
        if (existingGroups.length > 0) {
          navigate(`/family-group/${existingGroups[0].id}`);
          return;
        }
      }
      // Create the group
      const defaultName = `${me.full_name.split(" ")[0]}'s Family`;
      const newGroup = await base44.entities.FamilyGroup.create({
        group_name: defaultName,
        event_id: eventId || "",
        event_name: evt?.name || "",
        lead_email: me.email,
        lead_name: me.full_name,
      });
      // Register as event participant
      if (eventId) {
        const existing = await base44.entities.EventParticipant.filter({ event_id: eventId, participant_email: me.email });
        if (!existing.length) {
          await base44.entities.EventParticipant.create({
            event_id: eventId,
            event_name: evt?.name || "",
            participant_email: me.email,
            participant_name: me.full_name,
            order_status: "browsing",
            payment_status: "unpaid",
          });
        }
      }
      navigate(`/family-group/${newGroup.id}`);
      } catch (err) {
        console.error("CreateFamilyGroup error:", err);
        setError(err.message || "Something went wrong. Please try again.");
      }
    };
    init();
  }, []);

  if (error) return (
    <div className="flex items-center justify-center py-40">
      <div className="text-center max-w-sm">
        <p className="text-destructive font-medium mb-2">Failed to create group</p>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => { setError(null); window.location.reload(); }}>Try Again</Button>
      </div>
    </div>
  );

  return (
    <div className="flex items-center justify-center py-40">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Setting up your family group…</p>
      </div>
    </div>
  );
}
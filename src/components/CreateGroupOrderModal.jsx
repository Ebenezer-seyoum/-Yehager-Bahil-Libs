import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { X, Users, Loader2, CalendarDays, Tag } from "lucide-react";
import { toast } from "sonner";

export default function CreateGroupOrderModal({ onClose }) {
  const navigate = useNavigate();
  const [groupName, setGroupName] = useState("");
  const [eventCode, setEventCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!groupName.trim()) {
      toast.error("Please enter a group name.");
      return;
    }

    setLoading(true);
    const authed = await base44.auth.isAuthenticated();
    if (!authed) {
      base44.auth.redirectToLogin();
      return;
    }

    const me = await base44.auth.me();

    // Resolve event code if provided
    let eventRecord = null;
    if (eventCode.trim()) {
      const events = await base44.entities.Event.filter({ event_code: eventCode.trim().toUpperCase() });
      if (!events.length) {
        toast.error("Event code not found. Please check and try again.");
        setLoading(false);
        return;
      }
      eventRecord = events[0];
    }

    const newGroup = await base44.entities.FamilyGroup.create({
      group_name: groupName.trim(),
      event_id: eventRecord?.id || "",
      event_name: eventRecord?.name || "",
      lead_email: me.email,
      lead_name: me.full_name,
    });

    if (eventRecord) {
      const existing = await base44.entities.EventParticipant.filter({
        event_id: eventRecord.id,
        participant_email: me.email,
      });
      if (!existing.length) {
        await base44.entities.EventParticipant.create({
          event_id: eventRecord.id,
          event_name: eventRecord.name,
          participant_email: me.email,
          participant_name: me.full_name,
          order_status: "browsing",
          payment_status: "unpaid",
        });
      }
    }

    setLoading(false);
    onClose();
    navigate(`/family-group/${newGroup.id}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-lg">Create Group Order</h2>
              <p className="text-xs text-muted-foreground">Dress your whole family together</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Group Name <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                placeholder="e.g. The Johnson Family"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Event Code <span className="text-muted-foreground font-normal normal-case">(optional)</span>
            </label>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-input bg-background text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                placeholder="e.g. WED2025"
                value={eventCode}
                onChange={(e) => setEventCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Enter an event code if you're ordering for a wedding, graduation, or group event.
            </p>
          </div>

          <div className="bg-secondary/40 rounded-xl p-4 text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">How it works:</strong> After creating your group, you'll add each family member with their name, gender, and measurements. Then browse and assign outfits, and checkout together in one order.
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button className="flex-1 gap-2" onClick={handleCreate} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
            Create Group
          </Button>
        </div>
      </div>
    </div>
  );
}
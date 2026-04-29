import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, Users, Plus, Trash2, ShoppingCart, ChevronRight, Ruler, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import AddFamilyMemberModal from "../components/AddFamilyMemberModal";

export default function FamilyGroup() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [event, setEvent] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [expandedMember, setExpandedMember] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  useEffect(() => {
    const load = async () => {
      const authed = await base44.auth.isAuthenticated();
      if (!authed) { navigate("/"); return; }
      const me = await base44.auth.me();
      setUser(me);

      const groups = await base44.entities.FamilyGroup.filter({ id: groupId });
      if (!groups.length) { navigate("/"); return; }
      const g = groups[0];
      setGroup(g);

      const [mems, evts] = await Promise.all([
        base44.entities.FamilyMember.filter({ family_group_id: groupId }),
        g.event_id ? base44.entities.Event.filter({ id: g.event_id }) : Promise.resolve([]),
      ]);
      setMembers(mems);
      if (evts.length) setEvent(evts[0]);
      setLoading(false);
    };
    load();
  }, [groupId]);

  const handleAddMember = async ({ name, gender, relation, measurements }) => {
    const m = await base44.entities.FamilyMember.create({
      family_group_id: groupId,
      event_id: group.event_id,
      name,
      gender,
      relation: relation || "Other",
      measurements,
      product_id: event?.product_id || null,
      product_name: event?.product_name || null,
      price: null,
    });
    setMembers((prev) => [...prev, m]);
    setShowAdd(false);
    toast.success(`${name} added to your family group!`);
  };

  const handleRenameGroup = async () => {
    if (!nameInput.trim()) return;
    await base44.entities.FamilyGroup.update(groupId, { group_name: nameInput.trim() });
    setGroup((g) => ({ ...g, group_name: nameInput.trim() }));
    setEditingName(false);
    toast.success("Group name updated!");
  };

  const handleRemoveMember = async (memberId, memberName) => {
    await base44.entities.FamilyMember.delete(memberId);
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    toast.success(`${memberName} removed.`);
  };

  const handleCheckoutAll = async () => {
    if (!members.length) { toast.error("Add at least one family member first."); return; }
    setCheckingOut(true);

    for (const member of members) {
      await base44.entities.CartItem.create({
        user_email: user.email,
        product_id: member.product_id || event?.product_id || "",
        product_name: member.product_name || event?.product_name || `Item for ${member.name}`,
        product_image: member.product_image || "",
        price: member.price || 0,
        quantity: 1,
        measurement_snapshot: member.measurements,
        event_id: group.event_id,
        event_name: group.event_name,
        family_group_id: groupId,
        family_member_name: member.name,
      });
    }

    setCheckingOut(false);
    toast.success(`${members.length} items added to cart for checkout!`);
    navigate("/cart");
  };

  if (loading) return (
    <div className="flex items-center justify-center py-40">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  const totalPrice = members.reduce((sum, m) => sum + (m.price || 0), 0);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
        <Link to="/events" className="hover:text-foreground">Events</Link>
        <ChevronRight className="w-3 h-3" />
        {event && <Link to={`/event/${group?.event_id}`} className="hover:text-foreground">{group?.event_name}</Link>}
        <ChevronRight className="w-3 h-3" />
        <span>Family Group</span>
      </div>

      {/* Header */}
      <div className="bg-foreground rounded-2xl p-6 sm:p-8 text-background mb-8">
        <p className="text-primary text-xs tracking-[0.3em] uppercase font-medium mb-2">Family Group</p>
        {editingName ? (
          <div className="flex items-center gap-2 mt-1">
            <input
              autoFocus
              className="flex-1 h-10 rounded-lg bg-white/10 border border-white/20 px-3 text-white text-lg font-semibold focus:outline-none"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleRenameGroup(); if (e.key === "Escape") setEditingName(false); }}
            />
            <button onClick={handleRenameGroup} className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"><Check className="w-4 h-4" /></button>
            <button onClick={() => setEditingName(false)} className="p-2 rounded-lg bg-white/10 hover:bg-white/20"><X className="w-4 h-4 text-white" /></button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-3xl sm:text-4xl font-bold">{group?.group_name}</h1>
            <button
              onClick={() => { setNameInput(group?.group_name || ""); setEditingName(true); }}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              title="Rename group"
            ><Pencil className="w-3.5 h-3.5 text-white/70" /></button>
          </div>
        )}
        <div className="flex flex-wrap gap-4 mt-3 text-sm text-background/60">
          <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{members.length} member{members.length !== 1 ? "s" : ""}</span>
          <span className="text-xs bg-white/10 px-2 py-1 rounded font-medium">Event: {group?.event_name}</span>
        </div>
        {event?.product_name && (
          <p className="mt-2 text-sm text-background/70">Outfit: <span className="text-primary font-medium">{event.product_name}</span></p>
        )}
      </div>

      {/* Prompt banner */}
      <div className="bg-primary/10 border border-primary/30 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <p className="font-semibold text-sm text-foreground mb-1">👨‍👩‍👧‍👦 Ordering for your whole family?</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Add each family member — your <strong>husband, wife, kids, or anyone else</strong> — with their name and measurements.
            Everyone gets their own custom outfit, and you checkout all at once in a single order.
          </p>
        </div>
        <Button size="sm" className="flex-shrink-0 gap-1.5" onClick={() => setShowAdd(true)}>
          <Plus className="w-3.5 h-3.5" /> Add Member
        </Button>
      </div>

      {/* Members list */}
      <div className="space-y-3 mb-6">
        {members.length === 0 ? (
          <div className="py-14 text-center border-2 border-dashed border-border rounded-2xl">
            <Users className="w-12 h-12 mx-auto text-primary/40 mb-3" />
            <h3 className="font-heading text-xl font-semibold mb-2">Start with yourself, then add your family</h3>
            <p className="text-muted-foreground text-sm mb-5 max-w-xs mx-auto">
              Add each person — yourself, your spouse, your kids — with their measurements so every outfit fits perfectly.
            </p>
            <Button onClick={() => setShowAdd(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Add Your First Member
            </Button>
          </div>
        ) : (
          members.map((member, idx) => (
            <div key={member.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
                onClick={() => setExpandedMember(expandedMember === member.id ? null : member.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {member.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{member.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {member.relation || member.gender} · {member.gender} · {Object.keys(member.measurements || {}).length} measurements
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {member.price > 0 && (
                    <span className="text-sm font-bold text-primary">${member.price?.toFixed(2)}</span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemoveMember(member.id, member.name); }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Expanded measurements */}
              {expandedMember === member.id && member.measurements && Object.keys(member.measurements).length > 0 && (
                <div className="border-t border-border p-4 bg-secondary/10">
                  <div className="flex items-center gap-1.5 mb-3">
                    <Ruler className="w-3.5 h-3.5 text-primary" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Measurements (inches)</p>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {Object.entries(member.measurements).filter(([, v]) => v).map(([key, val]) => (
                      <div key={key} className="bg-card rounded-lg p-2 text-center border border-border">
                        <p className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, " ")}</p>
                        <p className="text-sm font-bold text-foreground">{val}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add member button */}
      <button
        onClick={() => setShowAdd(true)}
        className="w-full py-4 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 hover:border-primary hover:bg-primary/10 transition-all flex items-center justify-center gap-2 text-primary font-semibold text-sm mb-6"
      >
        <Plus className="w-4 h-4" />
        + Add Another Family Member (Spouse, Child, etc.)
      </button>

      {/* Checkout summary */}
      {members.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-6 sticky bottom-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-heading font-semibold text-lg">{members.length} Member{members.length !== 1 ? "s" : ""}</p>
              <p className="text-xs text-muted-foreground">Ready to checkout together</p>
            </div>
            {totalPrice > 0 && (
              <p className="text-xl font-bold text-primary">${totalPrice.toFixed(2)}</p>
            )}
          </div>
          <Button
            size="lg"
            className="w-full gap-2"
            onClick={handleCheckoutAll}
            disabled={checkingOut}
          >
            {checkingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
            Add All to Cart & Checkout
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-3">
            Each family member's measurements will be attached to their item.
          </p>
        </div>
      )}

      {showAdd && (
        <AddFamilyMemberModal
          onSave={handleAddMember}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
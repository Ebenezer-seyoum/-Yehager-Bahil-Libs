import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  User, Mail, Lock, ShoppingBag, Package, Scissors, Truck, Star,
  ChevronRight, Loader2, LogOut, RefreshCw, Phone, MapPin, Edit2, Check, X, CalendarDays
} from "lucide-react";
import { toast } from "sonner";

const STATUS_CONFIG = {
  pending:       { label: "Order Received",    color: "bg-yellow-100 text-yellow-800" },
  tailoring:     { label: "In Tailoring",      color: "bg-purple-100 text-purple-800" },
  quality_check: { label: "Quality Check",     color: "bg-blue-100 text-blue-700" },
  shipped:       { label: "Shipped",           color: "bg-green-100 text-green-800" },
  delivered:     { label: "Delivered",         color: "bg-green-200 text-green-900" },
};

export default function MyAccount() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("profile"); // profile | orders | security
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: "", phone: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    const load = async () => {
      const authed = await base44.auth.isAuthenticated();
      if (!authed) { base44.auth.redirectToLogin(); return; }
      const me = await base44.auth.me();
      setUser(me);
      setProfileForm({ full_name: me.full_name || "", phone: me.phone || "" });
      const ords = await base44.entities.Order.filter({ user_email: me.email }, "-created_date", 50);
      setOrders(ords);
      setLoading(false);
    };
    load();
  }, []);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    await base44.auth.updateMe({ phone: profileForm.phone });
    setUser((u) => ({ ...u, phone: profileForm.phone }));
    setEditingProfile(false);
    setSavingProfile(false);
    toast.success("Profile updated!");
  };

  const handlePasswordReset = async () => {
    await base44.auth.redirectToLogin({ action: "reset_password", email: user.email });
    toast.info("Redirecting to password reset…");
  };

  const handleLogout = () => {
    base44.auth.logout("/");
  };

  if (loading) return (
    <div className="flex items-center justify-center py-40">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  const TABS = [
    { key: "profile", label: "My Profile",  icon: User },
    { key: "orders",  label: "My Orders",   icon: ShoppingBag },
    { key: "status",  label: "My Status",   icon: Scissors },
    { key: "events",  label: "My Events",   icon: CalendarDays },
    { key: "security",label: "Security",    icon: Lock },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="bg-foreground text-background rounded-2xl p-6 sm:p-8 mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-heading font-bold text-xl">
                {user?.full_name?.charAt(0)?.toUpperCase() || "?"}
              </span>
            </div>
            <div>
              <p className="text-primary text-xs tracking-[0.3em] uppercase font-medium mb-0.5">My Account</p>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold">{user?.full_name}</h1>
              <p className="text-background/60 text-sm">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/catalog">
              <Button size="sm" className="gap-2">
                <ShoppingBag className="w-3.5 h-3.5" /> Shop Now
              </Button>
            </Link>
            <Button size="sm" variant="outline" className="gap-2 border-white/20 text-white hover:bg-white/10" onClick={handleLogout}>
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </Button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          {[
            { label: "Total Orders", value: orders.length },
            { label: "In Production", value: orders.filter(o => ["tailoring","quality_check"].includes(o.status)).length },
            { label: "Delivered", value: orders.filter(o => o.status === "delivered").length },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-heading font-bold">{value}</p>
              <p className="text-xs text-background/60 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/40 rounded-xl p-1 mb-6">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === key ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4 hidden sm:block" />
            {label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {tab === "profile" && (
        <div className="space-y-5">
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading font-semibold text-lg">Personal Information</h2>
              {!editingProfile && (
                <button onClick={() => setEditingProfile(true)} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
              )}
            </div>

            {editingProfile ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Full Name</label>
                  <p className="text-sm text-muted-foreground mt-1 italic">Name changes require contacting support.</p>
                  <input
                    className="mt-1 w-full h-10 rounded-lg border border-input bg-background px-3 text-sm opacity-50 cursor-not-allowed"
                    value={profileForm.full_name}
                    disabled
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Phone Number</label>
                  <input
                    className="mt-1 w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
                    placeholder="+1 (555) 000-0000"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <Button size="sm" onClick={handleSaveProfile} disabled={savingProfile} className="gap-2">
                    {savingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Save Changes
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingProfile(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  { icon: User,  label: "Full Name",  value: user?.full_name },
                  { icon: Mail,  label: "Email",      value: user?.email },
                  { icon: Phone, label: "Phone",      value: user?.phone || "Not set" },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-sm font-medium">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick links */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h2 className="font-heading font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link to="/catalog" className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-secondary/30 transition-all group">
                <ShoppingBag className="w-5 h-5 text-primary" />
                <div><p className="text-sm font-medium">Browse & Order</p><p className="text-xs text-muted-foreground">Explore new collections</p></div>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link to="/tailoring-status" className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-secondary/30 transition-all group">
                <Scissors className="w-5 h-5 text-primary" />
                <div><p className="text-sm font-medium">Track Tailoring</p><p className="text-xs text-muted-foreground">Live production updates</p></div>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link to="/events" className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-secondary/30 transition-all group">
                <User className="w-5 h-5 text-primary" />
                <div><p className="text-sm font-medium">Event Groups</p><p className="text-xs text-muted-foreground">Manage group orders</p></div>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <button onClick={() => setTab("security")} className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-secondary/30 transition-all group text-left">
                <Lock className="w-5 h-5 text-primary" />
                <div><p className="text-sm font-medium">Change Password</p><p className="text-xs text-muted-foreground">Update your credentials</p></div>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {tab === "orders" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{orders.length} order(s) total</p>
            <Link to="/catalog">
              <Button size="sm" className="gap-2">
                <ShoppingBag className="w-3.5 h-3.5" /> Place New Order
              </Button>
            </Link>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl">
              <Package className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-heading text-lg font-semibold mb-1">No orders yet</h3>
              <p className="text-muted-foreground text-sm mb-4">Browse the collection and place your first order.</p>
              <Link to="/catalog"><Button size="sm">Browse Collection</Button></Link>
            </div>
          ) : (
            orders.map((order) => {
              const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
              return (
                <div key={order.id} className="bg-card border border-border rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-mono font-bold text-sm">{order.order_number}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(order.created_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                  </div>

                  <div className="space-y-1 mb-3">
                    {order.items?.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs text-muted-foreground">
                        <span>{item.product_name}</span>
                        <span>${item.price?.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <span className="text-sm font-bold">${order.total?.toFixed(2)}</span>
                    <Link to="/tailoring-status" className="text-xs text-primary hover:underline font-medium flex items-center gap-1">
                      Track Progress <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>

                  {order.shipping_address?.city && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {order.shipping_address.city}, {order.shipping_address.country}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Status Tab */}
      {tab === "status" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Live production & delivery updates</p>
          </div>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {orders.length === 0 ? (
              <div className="text-center py-20">
                <Scissors className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-heading text-lg font-semibold mb-1">No active orders</h3>
                <p className="text-muted-foreground text-sm mb-4">Place an order to track tailoring progress here.</p>
                <Link to="/catalog"><Button size="sm">Browse Collection</Button></Link>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {orders.map((order) => {
                  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                  const steps = ["pending","tailoring","quality_check","shipped","delivered"];
                  const stepIdx = steps.indexOf(order.status);
                  return (
                    <div key={order.id} className="p-5">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                          <p className="font-mono font-bold text-sm">{order.order_number}</p>
                          <p className="text-xs text-muted-foreground">{new Date(order.created_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                      </div>
                      {/* Progress bar */}
                      <div className="flex items-center gap-1 mb-2">
                        {steps.map((s, i) => (
                          <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${ i <= stepIdx ? "bg-primary" : "bg-border" }`} />
                        ))}
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-3">
                        {["Received","Tailoring","QC","Shipped","Delivered"].map((l) => <span key={l}>{l}</span>)}
                      </div>
                      <div className="space-y-0.5">
                        {order.items?.map((item, i) => (
                          <div key={i} className="flex justify-between text-xs text-muted-foreground">
                            <span>{item.product_name}</span>
                            <span>${item.price?.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Events Tab */}
      {tab === "events" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Your event groups and participation</p>
            <Link to="/events">
              <Button size="sm" className="gap-2"><CalendarDays className="w-3.5 h-3.5" /> Browse Events</Button>
            </Link>
          </div>
          <Link to="/events" className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-secondary/30 transition-all group bg-card">
            <CalendarDays className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Event Groups</p>
              <p className="text-xs text-muted-foreground">View and manage your event participations</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link to="/create-family-group" className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-secondary/30 transition-all group bg-card">
            <User className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Create Group Order</p>
              <p className="text-xs text-muted-foreground">Order matching outfits for your family</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      )}

      {/* Security Tab */}
      {tab === "security" && (
        <div className="space-y-5">
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-heading font-semibold text-lg mb-5">Account Security</h2>

            <div className="space-y-4">
              {/* Password Reset */}
              <div className="flex items-start gap-4 p-4 rounded-xl border border-border">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Reset Password</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    We'll redirect you to a secure page where you can set a new password.
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={handlePasswordReset} className="shrink-0 gap-2">
                  <RefreshCw className="w-3.5 h-3.5" /> Reset
                </Button>
              </div>

              {/* Email */}
              <div className="flex items-start gap-4 p-4 rounded-xl border border-border">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Account Email</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your current email: <strong>{user?.email}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    To change your account email, please contact us at{" "}
                    <a href="mailto:support@yehagerbahillibs.com" className="text-primary hover:underline">
                      support@yehagerbahillibs.com
                    </a>
                    . We'll verify your identity and update it securely.
                  </p>
                </div>
              </div>

              {/* Reclaim account */}
              <div className="flex items-start gap-4 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-700">Can't Access Your Account?</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    If you've lost access to your email or account, contact us with your order number or full name.
                    We'll verify your identity and restore access promptly.
                  </p>
                  <a
                    href="mailto:support@yehagerbahillibs.com?subject=Account Recovery Request"
                    className="inline-block mt-2 text-xs font-semibold text-primary hover:underline"
                  >
                    Contact Support for Account Recovery →
                  </a>
                </div>
              </div>

              {/* Sign out */}
              <div className="flex items-start gap-4 p-4 rounded-xl border border-destructive/20">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <LogOut className="w-4 h-4 text-destructive" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Sign Out</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Sign out of your account on this device.</p>
                </div>
                <Button size="sm" variant="destructive" onClick={handleLogout} className="shrink-0">
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
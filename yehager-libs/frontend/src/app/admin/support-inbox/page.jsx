"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Mail,
  Inbox,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  Filter,
  Search,
  LayoutGrid,
  List,
  Send,
  Paperclip,
  AlertTriangle,
  RefreshCw,
  Archive,
  Check,
  Database,
  Calendar,
  X,
  ChevronRight,
  Shield,
  MessageSquare
} from "lucide-react";

// Formatter helper
const formatTimeAgo = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

const getInitials = (name) => {
  if (!name) return "??";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
};

export default function SupportInboxPage() {
  const { data: session } = useSession();
  const [tickets, setTickets] = useState([]);
  const [kpis, setKpis] = useState({
    total: 0,
    new: 0,
    unread: 0,
    open: 0,
    pending: 0,
    resolved: 0,
    complaints: 0,
    urgent: 0,
  });
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  // Filters & Tabs state
  const [activeTab, setActiveTab] = useState("all"); // all, new_unread, open, pending, payment, complaints, resolved
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [dateRange, setDateRange] = useState("all"); // all, today, week, month
  const [viewMode, setViewMode] = useState("card"); // card, table

  // Active Ticket Modal
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [replyStatus, setReplyStatus] = useState("pending_reply");
  const [replyPriority, setReplyPriority] = useState("medium");
  const [replyAssignee, setReplyAssignee] = useState("");
  const [replyAttachments, setReplyAttachments] = useState([]);
  const [newAttachmentUrl, setNewAttachmentUrl] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);
  
  // Success / Error Banner States
  const [errorBanner, setErrorBanner] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  const fileInputRef = useRef(null);

  // 1. Fetch tickets and KPIs
  const fetchData = async () => {
    setLoading(true);
    try {
      // Build query string
      let statusParam = "all";
      if (activeTab === "new_unread") statusParam = "unread";
      else if (activeTab === "open") statusParam = "open";
      else if (activeTab === "pending") statusParam = "pending";
      else if (activeTab === "resolved") statusParam = "resolved";
      else if (activeTab === "archived") statusParam = "archived";

      let categoryParam = filterCategory;
      if (activeTab === "payment") categoryParam = "payment_issue";
      if (activeTab === "complaints") categoryParam = "complaint";

      const queryParams = new URLSearchParams();
      if (statusParam !== "all") queryParams.append("status", statusParam);
      if (categoryParam !== "all") queryParams.append("category", categoryParam);
      if (filterPriority !== "all") queryParams.append("priority", filterPriority);
      if (searchQuery) queryParams.append("search", searchQuery);

      // Fetch tickets
      const resTickets = await fetch(`/api/backend/admin/support/tickets?${queryParams.toString()}`);
      const dataTickets = await resTickets.json();
      
      let fetchedTickets = dataTickets.data || [];
      
      // Filter by Assignee (client side or fallback)
      if (filterAssignee !== "all") {
        fetchedTickets = fetchedTickets.filter(t => t.assignedAdminId === filterAssignee);
      }

      // Filter by Date Range (client side)
      if (dateRange !== "all") {
        const now = new Date();
        fetchedTickets = fetchedTickets.filter(t => {
          const ticketDate = new Date(t.lastMessageAt || t.createdAt);
          if (dateRange === "today") {
            return ticketDate.toDateString() === now.toDateString();
          } else if (dateRange === "week") {
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return ticketDate >= oneWeekAgo;
          } else if (dateRange === "month") {
            const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return ticketDate >= oneMonthAgo;
          }
          return true;
        });
      }

      setTickets(fetchedTickets);

      // Fetch KPIs
      const resKPIs = await fetch(`/api/backend/admin/support/kpis`);
      const dataKPIs = await resKPIs.json();
      if (dataKPIs.data) {
        setKpis(dataKPIs.data);
      }
    } catch (err) {
      console.error("Failed to load support inbox data:", err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch admins / employees list
  const fetchAdmins = async () => {
    try {
      const res = await fetch("/api/backend/admin/users?limit=100");
      const data = await res.json();
      const userList = data.data || [];
      // Filter for admins and employees
      const filtered = userList.filter(u => u.role === "admin" || u.role === "employee");
      setAdmins(filtered);
    } catch (err) {
      console.error("Failed to fetch admin list:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, searchQuery, filterPriority, filterCategory, filterAssignee, dateRange]);

  useEffect(() => {
    fetchAdmins();
  }, []);

  // 3. Seed demo data
  const handleSeedDemo = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/backend/admin/support/seed-demo", { method: "POST" });
      const data = await res.json();
      showToast("Demo support tickets loaded successfully!", "success");
      fetchData();
    } catch (err) {
      console.error(err);
      showToast("Failed to seed demo data.", "error");
    } finally {
      setSeeding(false);
    }
  };

  // 4. Load single ticket details
  const handleOpenTicket = async (ticketId) => {
    setSelectedTicketId(ticketId);
    setTicketLoading(true);
    setErrorBanner(null);
    try {
      const res = await fetch(`/api/backend/admin/support/tickets/${ticketId}`);
      const data = await res.json();
      if (data.data) {
        setSelectedTicket(data.data);
        setReplyStatus(data.data.status);
        setReplyPriority(data.data.priority);
        setReplyAssignee(data.data.assignedAdminId || "");
        setReplyAttachments([]);
        setNewAttachmentUrl("");
      }
      // Re-trigger global fetch to update read/unread badge
      fetchData();
    } catch (err) {
      console.error("Failed to load ticket details:", err);
    } finally {
      setTicketLoading(false);
    }
  };

  // 5. Send Reply (with custom failure/retry draft state)
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyBody.trim()) return;

    setReplySubmitting(true);
    setErrorBanner(null);

    const payload = {
      messageBody: replyBody,
      status: replyStatus,
      priority: replyPriority,
      assignedAdminId: replyAssignee || null,
      internalNote: internalNote.trim() || undefined,
      attachments: replyAttachments,
    };

    try {
      const res = await fetch(`/api/backend/admin/support/tickets/${selectedTicketId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.message || "Failed to submit reply");
      }

      showToast("Reply sent successfully and customer notified!", "success");
      setReplyBody("");
      setInternalNote("");
      setReplyAttachments([]);
      
      // Reload ticket details
      handleOpenTicket(selectedTicketId);
    } catch (err) {
      console.error(err);
      setErrorBanner({
        message: err.message || "Connection timed out. Failed to deliver email to customer.",
        draftPayload: payload
      });
    } finally {
      setReplySubmitting(false);
    }
  };

  // 6. Handle status change directly
  const handleUpdateTicketStatus = async (statusVal) => {
    if (!selectedTicket) return;
    try {
      await fetch(`/api/backend/admin/support/tickets/${selectedTicket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusVal }),
      });
      showToast(`Ticket status set to ${statusVal}`, "success");
      handleOpenTicket(selectedTicket.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMockAttachment = () => {
    if (newAttachmentUrl.trim()) {
      setReplyAttachments([...replyAttachments, newAttachmentUrl.trim()]);
      setNewAttachmentUrl("");
    } else {
      // Simulate file upload
      const mockUrls = [
        "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=500&q=80",
        "https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&q=80",
        "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=500&q=80"
      ];
      const randomUrl = mockUrls[Math.floor(Math.random() * mockUrls.length)];
      setReplyAttachments([...replyAttachments, randomUrl]);
      showToast("Mock file uploaded successfully", "success");
    }
  };

  const showToast = (msg, type = "success") => {
    setSuccessToast({ msg, type });
    setTimeout(() => setSuccessToast(null), 4000);
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6">
      
      {/* SUCCESS TOAST POPUP */}
      {successToast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg transition-all duration-300 transform translate-y-0 ${
          successToast.type === "success" 
            ? "bg-emerald-600 text-white" 
            : "bg-rose-600 text-white"
        }`}>
          {successToast.type === "success" ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          <span className="text-sm font-medium">{successToast.msg}</span>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            <Inbox className="h-4 w-4" />
            System Support
          </div>
          <h1 className="mt-1 font-heading text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Support Inbox
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            Manage customer emails, support messages, complaints, order questions, payment issues, and replies from one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleSeedDemo}
            disabled={seeding}
            className="inline-flex items-center gap-1.5 rounded-lg border border-transparent bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-3 py-2 text-xs font-medium hover:bg-slate-800 dark:hover:bg-white shadow-sm disabled:opacity-50"
          >
            <Database className="h-3.5 w-3.5" />
            {seeding ? "Loading..." : "Seed Demo Tickets"}
          </button>
        </div>
      </div>

      {/* COMPACT KPI CARDS */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
        {[
          { label: "Total", value: kpis.total, color: "border-blue-500 bg-blue-50/40 dark:bg-blue-950/10 text-blue-600 dark:text-blue-400" },
          { label: "New", value: kpis.new, color: "border-sky-500 bg-sky-50/40 dark:bg-sky-950/10 text-sky-600 dark:text-sky-400" },
          { label: "Unread", value: kpis.unread, color: "border-purple-500 bg-purple-50/40 dark:bg-purple-950/10 text-purple-600 dark:text-purple-400" },
          { label: "Open", value: kpis.open, color: "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-400" },
          { label: "Pending", value: kpis.pending, color: "border-amber-500 bg-amber-50/40 dark:bg-amber-950/10 text-amber-600 dark:text-amber-400" },
          { label: "Resolved", value: kpis.resolved, color: "border-slate-400 bg-slate-50/40 dark:bg-slate-900/10 text-slate-600 dark:text-slate-400" },
          { label: "Complaints", value: kpis.complaints, color: "border-red-500 bg-red-50/40 dark:bg-red-950/10 text-red-600 dark:text-red-400" },
          { label: "Urgent", value: kpis.urgent, color: "border-rose-600 bg-rose-50/40 dark:bg-rose-950/10 text-rose-600 dark:text-rose-400 animate-pulse font-bold" }
        ].map((card, i) => (
          <div
            key={i}
            className={`rounded-xl border-l-4 p-3 shadow-sm flex flex-col justify-between h-20 transition-all ${card.color} border-y border-r border-slate-200 dark:border-slate-800 bg-white`}
          >
            <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-medium">
              {card.label}
            </span>
            <span className="text-xl font-extrabold tracking-tight">
              {card.value}
            </span>
          </div>
        ))}
      </div>

      {/* ADVANCED FILTER TABS (BLUE/WHITE HIGHLIGHT SYSTEM) */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {[
          { id: "all", label: "All Messages", icon: Mail },
          { id: "new_unread", label: "New & Unread", icon: AlertCircle, count: kpis.unread },
          { id: "open", label: "Open Tickets", icon: Clock },
          { id: "pending", label: "Pending Reply", icon: MessageSquare },
          { id: "payment", label: "Payment Issues", icon: CreditCard },
          { id: "complaints", label: "Complaints", icon: AlertTriangle, count: kpis.complaints },
          { id: "resolved", label: "Resolved & Archived", icon: CheckCircle2 }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                isActive
                  ? "bg-blue-600 text-white font-semibold shadow-md shadow-blue-500/20"
                  : "bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-850 hover:bg-slate-55 dark:hover:bg-slate-800"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${isActive ? "bg-white text-blue-600" : "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300"}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* SEARCH AND FILTERS BAR */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm md:flex-row md:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ticket #, customer, email, subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 py-2 pl-10 pr-4 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Dynamic Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Priority */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Priority:</span>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 px-2 py-1.5 text-xs focus:outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Category */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Category:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 px-2 py-1.5 text-xs focus:outline-none"
            >
              <option value="all">All Categories</option>
              <option value="general_question">General Question</option>
              <option value="order_question">Order Question</option>
              <option value="payment_issue">Payment Issue</option>
              <option value="delivery_issue">Delivery Issue</option>
              <option value="measurement_question">Measurement & Tailoring</option>
              <option value="product_question">Product Detail</option>
              <option value="return_refund">Return & Refund</option>
              <option value="complaint">Complaint</option>
              <option value="technical_issue">Technical Issue</option>
            </select>
          </div>

          {/* Assignee */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Assignee:</span>
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 px-2 py-1.5 text-xs focus:outline-none max-w-[150px]"
            >
              <option value="all">Anyone</option>
              {admins.map(admin => (
                <option key={admin.id} value={admin.id}>{admin.name || admin.email}</option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 px-2 py-1.5 text-xs focus:outline-none"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-855 pl-3">
            <button
              onClick={() => setViewMode("card")}
              className={`p-1.5 rounded ${viewMode === "card" ? "bg-slate-100 dark:bg-slate-800 text-blue-600" : "text-slate-400 hover:bg-slate-50"}`}
              title="Card View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded ${viewMode === "table" ? "bg-slate-100 dark:bg-slate-800 text-blue-600" : "text-slate-400 hover:bg-slate-50"}`}
              title="Table View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* TICKETS LISTING AREA */}
      {loading ? (
        <div className="flex h-60 items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
            <span className="text-sm font-medium text-slate-500">Loading support inbox...</span>
          </div>
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col h-72 items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center p-6">
          <Inbox className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">No support tickets found</h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1">
            There are no messages matching your selected filters. Try adjusting your search query, selecting different tabs, or seeding demo tickets.
          </p>
          <button
            onClick={handleSeedDemo}
            className="mt-4 rounded-lg bg-blue-600 text-white px-4 py-2 text-xs font-semibold hover:bg-blue-700 shadow shadow-blue-500/10"
          >
            Seed Demo Tickets
          </button>
        </div>
      ) : viewMode === "card" ? (
        /* CARD VIEW */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tickets.map((t) => {
            const hasReply = t.status === "pending_reply" || t.status === "resolved";
            return (
              <div
                key={t.id}
                onClick={() => handleOpenTicket(t.id)}
                className={`relative flex flex-col justify-between rounded-xl border p-4 shadow-sm hover:shadow-md transition-all cursor-pointer bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-500 ${
                  t.unreadByAdmin 
                    ? "border-l-4 border-l-blue-600 border-slate-200 dark:border-slate-800 font-semibold" 
                    : "border-slate-200 dark:border-slate-800"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                      {t.ticketNumber}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {t.priority === "urgent" && (
                        <span className="rounded bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 px-1.5 py-0.5 text-[9px] uppercase font-extrabold animate-pulse">
                          Urgent
                        </span>
                      )}
                      {t.priority === "high" && (
                        <span className="rounded bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 px-1.5 py-0.5 text-[9px] uppercase font-bold">
                          High
                        </span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                        t.status === "new" ? "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400" :
                        t.status === "open" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" :
                        t.status === "pending_reply" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" :
                        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                      }`}>
                        {t.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  <h3 className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-1">
                    {t.subject}
                  </h3>

                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      {getInitials(t.customerName)}
                    </div>
                    <div className="text-xs">
                      <p className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[140px]">{t.customerName}</p>
                      <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{t.customerEmail}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 pt-3 text-[10px] text-slate-400">
                  <span className="capitalize bg-slate-50 dark:bg-slate-950 rounded px-1.5 py-0.5 border border-slate-100 dark:border-slate-800 text-slate-500 font-medium">
                    {t.category.replace("_", " ")}
                  </span>
                  <span>{formatTimeAgo(t.lastMessageAt || t.updatedAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="px-4 py-3">Ticket</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => handleOpenTicket(t.id)}
                  className={`border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer ${
                    t.unreadByAdmin ? "font-bold text-slate-900 dark:text-white bg-blue-50/20" : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <td className="px-4 py-3.5 font-mono text-[10px] text-slate-400">{t.ticketNumber}</td>
                  <td className="px-4 py-3.5">
                    <div>
                      <p className="font-semibold">{t.customerName}</p>
                      <p className="text-[10px] text-slate-400">{t.customerEmail}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 max-w-[200px] truncate">{t.subject}</td>
                  <td className="px-4 py-3.5 capitalize">{t.category.replace("_", " ")}</td>
                  <td className="px-4 py-3.5">
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                      t.priority === "urgent" ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40" :
                      t.priority === "high" ? "bg-orange-100 text-orange-700 dark:bg-orange-950/40" :
                      t.priority === "medium" ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40" :
                      "bg-slate-100 text-slate-500"
                    }`}>
                      {t.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                      t.status === "new" ? "bg-sky-100 text-sky-700" :
                      t.status === "open" ? "bg-emerald-100 text-emerald-700" :
                      t.status === "pending_reply" ? "bg-amber-100 text-amber-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>
                      {t.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right text-slate-400">{formatTimeAgo(t.lastMessageAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* REPLY MODAL POPUP */}
      {selectedTicketId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="flex flex-col w-full max-w-4xl h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-6 py-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-xs text-slate-400">{selectedTicket?.ticketNumber}</span>
                <span className="h-4 w-px bg-slate-300 dark:bg-slate-800" />
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 max-w-[300px] truncate">
                  {selectedTicket?.subject}
                </h2>
                <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                  selectedTicket?.status === "new" ? "bg-sky-100 text-sky-700" :
                  selectedTicket?.status === "open" ? "bg-emerald-100 text-emerald-700" :
                  selectedTicket?.status === "pending_reply" ? "bg-amber-100 text-amber-700" :
                  "bg-slate-100 text-slate-600"
                }`}>
                  {selectedTicket?.status.replace("_", " ")}
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedTicketId(null);
                  setSelectedTicket(null);
                  setErrorBanner(null);
                }}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {ticketLoading ? (
              <div className="flex flex-1 items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
                
                {/* Left side: Chat History & Reply Editor */}
                <div className="flex flex-1 flex-col overflow-hidden border-r border-slate-200 dark:border-slate-800">
                  
                  {/* ERROR BANNER FOR FAILED SMTP EMAIL */}
                  {errorBanner && (
                    <div className="m-4 border border-rose-200 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-900/50 p-4 rounded-xl flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-rose-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 text-xs">
                        <h4 className="font-bold text-rose-800 dark:text-rose-400">Email Dispatch Failure</h4>
                        <p className="text-rose-700 dark:text-rose-300 mt-0.5">{errorBanner.message}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={handleSendReply}
                            className="bg-rose-600 text-white font-semibold rounded px-2.5 py-1 hover:bg-rose-700"
                          >
                            Retry Sending
                          </button>
                          <button
                            onClick={() => setErrorBanner(null)}
                            className="text-rose-600 dark:text-rose-400 hover:underline"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Conversation History Area */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50 dark:bg-slate-950/20">
                    {selectedTicket?.messages?.map((msg) => {
                      const isCustomer = msg.senderType === "customer";
                      const isSystem = msg.senderType === "system";

                      if (isSystem) {
                        return (
                          <div key={msg.id} className="flex justify-center my-2">
                            <span className="rounded bg-amber-50 dark:bg-amber-950/40 text-[10px] text-amber-700 dark:text-amber-400 px-3 py-1 border border-amber-200 dark:border-amber-900/40 max-w-md font-mono text-center">
                              {msg.messageBody}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div key={msg.id} className={`flex ${isCustomer ? "justify-start" : "justify-end"}`}>
                          <div className={`flex flex-col max-w-[75%] ${isCustomer ? "items-start" : "items-end"}`}>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                              <span className="font-semibold">{msg.senderName}</span>
                              <span>•</span>
                              <span>{formatTimeAgo(msg.createdAt)}</span>
                            </div>
                            <div className={`rounded-2xl px-4 py-3 text-xs shadow-sm ${
                              isCustomer
                                ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200 dark:border-slate-800"
                                : "bg-blue-600 text-white rounded-tr-none"
                            }`}>
                              <p className="whitespace-pre-wrap leading-relaxed">{msg.messageBody}</p>
                              
                              {/* Display attachments of this message */}
                              {msg.attachments && msg.attachments.length > 0 && (
                                <div className="mt-2.5 pt-2 border-t border-slate-100/10 flex flex-wrap gap-2">
                                  {msg.attachments.map((url, index) => (
                                    <a
                                      key={index}
                                      href={url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex items-center gap-1.5 bg-slate-900/10 dark:bg-white/10 px-2.5 py-1 rounded text-[10px] hover:underline"
                                    >
                                      <Paperclip className="h-3 w-3" />
                                      <span>Attachment {index + 1}</span>
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Reply Form */}
                  <form onSubmit={handleSendReply} className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                    <div className="flex flex-col gap-2">
                      {/* Text area */}
                      <textarea
                        rows="3"
                        placeholder="Write your email reply to the customer..."
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
                        required
                      />

                      {/* Internal Note field */}
                      <input
                        type="text"
                        placeholder="Add an internal system note (optional, customer will not see this)..."
                        value={internalNote}
                        onChange={(e) => setInternalNote(e.target.value)}
                        className="w-full rounded-lg border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-[11px] text-slate-800 focus:outline-none"
                      />

                      {/* Mock Attachment Upload Bar */}
                      {replyAttachments.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 py-2">
                          {replyAttachments.map((url, idx) => (
                            <div key={idx} className="flex items-center gap-1 bg-slate-100 dark:bg-slate-850 px-2 py-1 rounded text-[9px] text-slate-600 dark:text-slate-300">
                              <Paperclip className="h-3 w-3" />
                              <span className="truncate max-w-[120px]">{url}</span>
                              <button
                                type="button"
                                onClick={() => setReplyAttachments(replyAttachments.filter((_, i) => i !== idx))}
                                className="text-slate-400 hover:text-slate-600"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Toolbar */}
                      <div className="flex justify-between items-center mt-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="File URL..."
                            value={newAttachmentUrl}
                            onChange={(e) => setNewAttachmentUrl(e.target.value)}
                            className="rounded border border-slate-200 dark:border-slate-800 bg-slate-50 px-2 py-1 text-[10px] w-36 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleAddMockAttachment}
                            className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800"
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                            Add Attachment
                          </button>
                        </div>

                        <button
                          type="submit"
                          disabled={replySubmitting || !replyBody.trim()}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 text-white px-4 py-2 text-xs font-semibold hover:bg-blue-700 shadow shadow-blue-500/20 disabled:opacity-50"
                        >
                          <Send className="h-3 w-3" />
                          {replySubmitting ? "Sending..." : "Send Email Reply"}
                        </button>
                      </div>
                    </div>
                  </form>

                </div>

                {/* Right side: Ticket Metadata & Admin Actions */}
                <div className="w-full md:w-72 bg-slate-50 dark:bg-slate-900/60 p-6 space-y-6">
                  
                  {/* Customer Info Card */}
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer Details</h3>
                    <div className="mt-2.5 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold">
                        {getInitials(selectedTicket?.customerName)}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{selectedTicket?.customerName}</p>
                        <p className="text-[10px] text-slate-400 truncate">{selectedTicket?.customerEmail}</p>
                      </div>
                    </div>
                  </div>

                  <hr className="border-slate-200 dark:border-slate-800" />

                  {/* Admin Metadata & Properties */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ticket Administration</h3>
                    
                    {/* Status Select */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-500 font-medium">Ticket Status</label>
                      <select
                        value={replyStatus}
                        onChange={(e) => {
                          setReplyStatus(e.target.value);
                          handleUpdateTicketStatus(e.target.value);
                        }}
                        className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-800 focus:outline-none"
                      >
                        <option value="new">New</option>
                        <option value="open">Open / Active</option>
                        <option value="pending_reply">Pending Reply</option>
                        <option value="resolved">Resolved</option>
                        <option value="archived">Archived / Spam</option>
                      </select>
                    </div>

                    {/* Priority Select */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-500 font-medium">Ticket Priority</label>
                      <select
                        value={replyPriority}
                        onChange={(e) => setReplyPriority(e.target.value)}
                        className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-800 focus:outline-none"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>

                    {/* Assigned Employee Select */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-500 font-medium">Assign Ticket to Staff</label>
                      <select
                        value={replyAssignee}
                        onChange={(e) => setReplyAssignee(e.target.value)}
                        className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-800 focus:outline-none"
                      >
                        <option value="">Unassigned</option>
                        {admins.map(admin => (
                          <option key={admin.id} value={admin.id}>{admin.name || admin.email}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <hr className="border-slate-200 dark:border-slate-800" />

                  {/* Context Info */}
                  <div className="text-[10px] text-slate-400 space-y-2">
                    <p>
                      <span className="font-semibold">Category: </span>
                      <span className="capitalize">{selectedTicket?.category.replace("_", " ")}</span>
                    </p>
                    {selectedTicket?.orderId && (
                      <p className="truncate">
                        <span className="font-semibold">Linked Order: </span>
                        <span className="font-mono">{selectedTicket.orderId}</span>
                      </p>
                    )}
                    <p>
                      <span className="font-semibold">Opened: </span>
                      {selectedTicket?.createdAt ? new Date(selectedTicket.createdAt).toLocaleString() : ""}
                    </p>
                    <p>
                      <span className="font-semibold">Last Message: </span>
                      {selectedTicket?.lastMessageAt ? new Date(selectedTicket.lastMessageAt).toLocaleString() : ""}
                    </p>
                  </div>

                </div>

              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
SupportInboxPage.requireAuth = true;

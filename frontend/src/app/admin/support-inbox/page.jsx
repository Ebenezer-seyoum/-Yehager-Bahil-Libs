"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Mail,
  Inbox,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  Send,
  Paperclip,
  AlertTriangle,
  RefreshCw,
  Check,
  Calendar,
  X,
  MessageSquare
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DashboardModalBody, DashboardModalFrame, DashboardModalHeader } from "@/components/admin/dashboard-modal";
import { AccessRestricted } from "@/components/admin/access-restricted";
import { can } from "@/lib/permissions";
import { uploadFileToS3 } from "@/lib/uploads";

const SUPPORT_TABS = [
  { id: "all", label: "All Messages", icon: Mail },
  { id: "unread", label: "Unread", icon: AlertCircle, query: { readState: "unread" } },
  { id: "read", label: "Read", icon: CheckCircle2, query: { readState: "read" } },
];

const MESSAGE_TYPES = [
  { id: "all", label: "All Message Types" },
  { id: "payment_issue", label: "Payment Issue" },
  { id: "order_question", label: "Order Question" },
  { id: "delivery_issue", label: "Delivery Issue" },
  { id: "measurement_question", label: "Measurement Question" },
  { id: "product_question", label: "Product Question" },
  { id: "complaint", label: "Complaint" },
  { id: "return_refund", label: "Return / Refund" },
  { id: "technical_issue", label: "Technical Issue" },
  { id: "general_question", label: "General Question" },
];

const AUTO_EMAIL_SYNC_INTERVAL_MS = 60 * 1000;

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

const titleCase = (value) =>
  String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const categoryLabel = (value) => MESSAGE_TYPES.find((type) => type.id === value)?.label ?? titleCase(value);

const attachmentName = (url) => {
  const clean = String(url ?? "").split("?")[0];
  return decodeURIComponent(clean.slice(clean.lastIndexOf("/") + 1) || "Attachment");
};

const isImageAttachment = (url, type = "") =>
  String(type).startsWith("image/") || /\.(png|jpe?g|gif|webp|avif)$/i.test(String(url ?? "").split("?")[0]);

export default function SupportInboxPage() {
  const { data: session } = useSession();
  const permissions = session?.user?.permissions ?? [];
  const isAdmin = session?.user?.role === "admin";
  const canViewSupport = isAdmin || can(permissions, "support.view");
  const canReplySupport = isAdmin || can(permissions, "support.reply");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncingEmail, setSyncingEmail] = useState(false);
  const [lastEmailSyncAt, setLastEmailSyncAt] = useState(null);

  // Filters & Tabs state
  const [activeTab, setActiveTab] = useState("all"); // SUPPORT_TABS ids
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [dateRange, setDateRange] = useState("all"); // all, today, week, month

  // Active Ticket Modal
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [replySubject, setReplySubject] = useState("");
  const [replyAttachments, setReplyAttachments] = useState([]);
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [sendState, setSendState] = useState("idle");
  
  // Success / Error Banner States
  const [errorBanner, setErrorBanner] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  const fileInputRef = useRef(null);
  const selectedTicketIndex = tickets.findIndex((ticket) => ticket.id === selectedTicketId);

  // 1. Fetch tickets and KPIs
  const fetchData = async ({ quiet = false } = {}) => {
    if (!canViewSupport) return;
    if (!quiet) setLoading(true);
    try {
      const tab = SUPPORT_TABS.find((item) => item.id === activeTab);
      const tabQuery = tab?.query ?? {};
      const readStateParam = tabQuery.readState ?? "all";

      const queryParams = new URLSearchParams();
      if (readStateParam !== "all") queryParams.append("readState", readStateParam);
      if (filterCategory !== "all") queryParams.append("category", filterCategory);
      if (searchQuery) queryParams.append("search", searchQuery);

      // Fetch tickets
      const resTickets = await fetch(`/api/backend/admin/support/tickets?${queryParams.toString()}`);
      const dataTickets = await resTickets.json();
      
      let fetchedTickets = dataTickets.data || [];
      
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

      // KPIs removed for this page per configuration
    } catch (err) {
      console.error("Failed to load support inbox data:", err);
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    if (!canViewSupport) return;
    const timeoutId = window.setTimeout(() => void fetchData(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [canViewSupport, activeTab, searchQuery, filterCategory, dateRange]);

  const handleSyncEmail = async ({ silent = false } = {}) => {
    if (!canViewSupport) return;
    setSyncingEmail(true);
    try {
      const res = await fetch("/api/backend/admin/support/sync-email", { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.message || data.error || "Failed to sync support email.");
      }
      const result = data.data || {};
      setLastEmailSyncAt(new Date());
      if (!silent) {
        showToast(`Email sync complete: ${result.imported || 0} imported, ${result.skipped || 0} skipped.`, "success");
      } else if ((result.imported || 0) > 0) {
        showToast(`New support email imported: ${result.imported}.`, "success");
      }
      fetchData({ quiet: silent });
    } catch (err) {
      console.error(err);
      if (!silent) showToast(err.message || "Failed to sync support email.", "error");
    } finally {
      setSyncingEmail(false);
    }
  };

  useEffect(() => {
    if (!canViewSupport) return;
    let isActive = true;
    let isSyncing = false;

    const syncAndRefresh = async () => {
      if (!isActive || isSyncing) return;
      isSyncing = true;
      try {
        await handleSyncEmail({ silent: true });
      } finally {
        isSyncing = false;
      }
    };

    syncAndRefresh();
    const intervalId = window.setInterval(syncAndRefresh, AUTO_EMAIL_SYNC_INTERVAL_MS);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [canViewSupport, activeTab, searchQuery, filterCategory, dateRange]);

  // 4. Load single ticket details
  const handleOpenTicket = async (ticketId) => {
    const wasUnread = tickets.some((ticket) => ticket.id === ticketId && ticket.unreadByAdmin);
    setSelectedTicketId(ticketId);
    setTicketLoading(true);
    setErrorBanner(null);
    setSendState("idle");
    try {
      const res = await fetch(`/api/backend/admin/support/tickets/${ticketId}`);
      const data = await res.json();
      if (data.data) {
        setSelectedTicket(data.data);
        setReplySubject(data.data.subject || "");
        setReplyAttachments([]);
        if (wasUnread) {
          window.dispatchEvent(new CustomEvent("admin-support-read", { detail: ticketId }));
        }
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
    if (!canReplySupport) return;
    if (!replyBody.trim()) return;
    if (replyAttachments.some((attachment) => attachment.status === "uploading")) {
      showToast("Please wait for attachments to finish uploading.", "error");
      return;
    }

    setReplySubmitting(true);
    setSendState("sending");
    setErrorBanner(null);

    const payload = {
      messageBody: replyBody,
      subject: replySubject.trim(),
      attachments: replyAttachments
        .filter((attachment) => attachment.status === "ready" && attachment.url)
        .map((attachment) => attachment.url),
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
      setSendState("sent");
      setReplyBody("");
      setReplyAttachments([]);
      
      // Reload ticket details
      handleOpenTicket(selectedTicketId);
    } catch (err) {
      console.error(err);
      setSendState("failed");
      setErrorBanner({
        message: err.message || "Connection timed out. Failed to deliver email to customer.",
        draftPayload: payload
      });
    } finally {
      setReplySubmitting(false);
    }
  };

  const openAdjacentTicket = (offset) => {
    if (selectedTicketIndex < 0) return;
    const nextTicket = tickets[selectedTicketIndex + offset];
    if (nextTicket) void handleOpenTicket(nextTicket.id);
  };

  useEffect(() => {
    if (!selectedTicketId) return undefined;
    const handleInboxShortcut = (event) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
      if (event.key.toLowerCase() === "j") {
        event.preventDefault();
        openAdjacentTicket(1);
      }
      if (event.key.toLowerCase() === "k") {
        event.preventDefault();
        openAdjacentTicket(-1);
      }
    };
    window.addEventListener("keydown", handleInboxShortcut);
    return () => window.removeEventListener("keydown", handleInboxShortcut);
  }, [selectedTicketId, selectedTicketIndex, tickets]);

  const handleFileSelection = async (event) => {
    if (!canReplySupport) return;
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;

    for (const file of files) {
      const id = `${file.name}-${file.size}-${window.crypto.randomUUID()}`;
      const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
      setReplyAttachments((current) => [
        ...current,
        { id, name: file.name, type: file.type, url: previewUrl, status: "uploading" },
      ]);

      try {
        const uploadedUrl = await uploadFileToS3(file, "support/replies");
        setReplyAttachments((current) =>
          current.map((attachment) =>
            attachment.id === id
              ? { ...attachment, url: uploadedUrl, previewUrl, status: "ready" }
              : attachment,
          ),
        );
      } catch (err) {
        console.error(err);
        setReplyAttachments((current) =>
          current.map((attachment) =>
            attachment.id === id ? { ...attachment, status: "failed" } : attachment,
          ),
        );
        showToast(`Could not upload ${file.name}.`, "error");
      }
    }
  };

  const handleRemoveAttachment = (id) => {
    setReplyAttachments((current) => current.filter((attachment) => attachment.id !== id));
  };

  const showToast = (msg, type = "success") => {
    setSuccessToast({ msg, type });
    setTimeout(() => setSuccessToast(null), 3000);
  };

  if (session?.user && !canViewSupport) {
    return <AccessRestricted requiredPermission="support.view" sectionName="Support Inbox" />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-screen-2xl space-y-6 px-4 py-6 sm:px-6 xl:px-8">
      
      {/* SUCCESS TOAST POPUP */}
      {successToast && (
        <div className={`fixed right-8 top-8 z-50 flex min-h-[70px] w-[min(640px,calc(100vw-32px))] items-center rounded-md px-6 py-5 pr-16 text-xl font-bold text-white transition-all duration-300 transform translate-y-0 ${
          successToast.type === "success" 
            ? "bg-[#829276]" 
            : "bg-[#c15b5d]"
        }`}>
          <span>{successToast.type === "success" ? "Success!" : "Error!"} {successToast.msg}</span>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="absolute right-5 top-1/2 -translate-y-1/2 text-4xl font-light leading-none text-white/70 hover:text-white"
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      {/* HEADER SECTION */}
      <AdminPageHeader
        pageId="support-inbox"
        onRefresh={fetchData}
        isRefreshing={loading}
        primaryAction={
          <div className="flex items-center gap-2">
            <span className="hidden text-xs font-semibold text-slate-500 lg:inline">
              Auto sync on{lastEmailSyncAt ? ` · checked ${lastEmailSyncAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
            </span>
            <button
              type="button"
              onClick={handleSyncEmail}
              disabled={syncingEmail}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm font-medium text-blue-700 shadow-sm transition hover:bg-blue-100 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${syncingEmail ? "animate-spin" : ""}`} />
              {syncingEmail ? "Checking..." : "Check Now"}
            </button>
          </div>
        }
      />

      {/* KPI cards removed per request */}

      {/* ADVANCED FILTER TABS (BLUE/WHITE HIGHLIGHT SYSTEM) */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-2 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {SUPPORT_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "bg-white text-slate-800 border border-blue-100 hover:bg-blue-50"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-white" : "text-blue-600"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SEARCH AND FILTERS BAR */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer, email, or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Dynamic Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Message type:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs focus:outline-none"
            >
              {MESSAGE_TYPES.map((type) => (
                <option key={type.id} value={type.id}>{type.label}</option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs focus:outline-none"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>

        </div>
      </div>

      {/* TICKETS LISTING AREA */}
      {loading ? (
        <div className="flex h-60 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
            <span className="text-sm font-medium text-slate-500">Loading support inbox...</span>
          </div>
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col h-72 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white text-center p-6">
          <Inbox className="h-12 w-12 text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-700">No support messages found</h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1">
            There are no messages matching your selected filters. Try adjusting your search, read state, or message type.
          </p>
        </div>
      ) : (
        /* CARD VIEW */
        <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {tickets.map((t) => {
            return (
              <div
                key={t.id}
                onClick={() => handleOpenTicket(t.id)}
                className={`flex items-center gap-4 border-b border-slate-100 bg-white px-5 py-4 transition hover:bg-slate-50 cursor-pointer ${
                  t.unreadByAdmin
                    ? "border-l-4 border-l-emerald-500 bg-emerald-400 text-slate-950 font-semibold shadow-sm"
                    : ""
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {t.unreadByAdmin ? <span className="h-2 w-2 rounded-full bg-emerald-800" aria-label="Unread message" /> : null}
                    </div>
                  </div>

                  <h3 className="mt-2 text-sm font-bold text-slate-800 line-clamp-1">
                    {t.subject}
                  </h3>

                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                      {getInitials(t.customerName)}
                    </div>
                    <div className="text-xs">
                      <p className="font-semibold text-slate-700 truncate max-w-[140px]">{t.customerName}</p>
                      <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{t.customerEmail}</p>
                    </div>
                  </div>
                </div>

                <div className="ml-auto flex items-center gap-4 text-[10px] text-slate-400">
                  <span className="text-slate-400">{categoryLabel(t.category)}</span>
                  <span>{formatTimeAgo(t.lastMessageAt || t.updatedAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* REPLY MODAL POPUP */}
      {selectedTicketId && (
        <DashboardModalFrame
          onClose={() => {
            setSelectedTicketId(null);
            setSelectedTicket(null);
            setErrorBanner(null);
          }}
          maxWidth="max-w-6xl"
        >
          <DashboardModalHeader
            title={selectedTicket?.subject || "Support message"}
            description={selectedTicket?.customerEmail || "Email conversation"}
            icon={MessageSquare}
            onClose={() => {
              setSelectedTicketId(null);
              setSelectedTicket(null);
              setErrorBanner(null);
            }}
          />
          <DashboardModalBody className="p-0">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
              <span className="text-[11px] font-semibold text-slate-500">
                {selectedTicketIndex >= 0 ? `Message ${selectedTicketIndex + 1} of ${tickets.length}` : "Message"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openAdjacentTicket(-1)}
                  disabled={selectedTicketIndex <= 0}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Previous message"
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  onClick={() => openAdjacentTicket(1)}
                  disabled={selectedTicketIndex < 0 || selectedTicketIndex >= tickets.length - 1}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Next message"
                >
                  Next →
                </button>
              </div>
            </div>

            {ticketLoading ? (
              <div className="flex flex-1 items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
                
                {/* Left side: Chat History & Reply Editor */}
                  <div className="flex flex-1 flex-col overflow-hidden border-r border-slate-200">
                  
                  {/* ERROR BANNER FOR FAILED SMTP EMAIL */}
                  {errorBanner && (
                    <div className="m-4 border border-rose-200 bg-rose-50 p-4 rounded-xl flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-rose-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 text-xs">
                        <h4 className="font-bold text-rose-800">Email Dispatch Failure</h4>
                        <p className="text-rose-700 mt-0.5">{errorBanner.message}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={handleSendReply}
                            className="bg-rose-600 text-white font-semibold rounded px-2.5 py-1 hover:bg-rose-700"
                          >
                            Retry Sending
                          </button>
                          <button
                            onClick={() => setErrorBanner(null)}
                            className="text-rose-600 hover:underline"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Conversation History Area */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/80">
                    {selectedTicket?.messages?.map((msg) => {
                      const isCustomer = msg.senderType === "customer";
                      const isSystem = msg.senderType === "system";

                      if (isSystem) {
                        return (
                          <div key={msg.id} className="flex justify-center my-2">
                            <span className="rounded bg-amber-50 text-[10px] text-amber-700 px-3 py-1 border border-amber-200 max-w-md font-mono text-center">
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
                                ? "bg-white text-slate-800 rounded-tl-none border border-slate-200"
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
                                      className="flex items-center gap-1.5 bg-slate-900/10 px-2.5 py-1 rounded text-[10px] hover:underline"
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
                  {canReplySupport ? (
                    <form onSubmit={handleSendReply} className="border-t border-slate-200 bg-white p-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Subject</label>
                        <input
                          type="text"
                          value={replySubject}
                          onChange={(e) => setReplySubject(e.target.value)}
                          placeholder="Email subject"
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
                          required
                        />
                        {/* Text area */}
                        <textarea
                          rows="3"
                          placeholder="Write your email reply to the customer..."
                          value={replyBody}
                          onChange={(e) => setReplyBody(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
                          required
                        />

                      {/* Attachment Upload Bar */}
                      {replyAttachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 py-2">
                          {replyAttachments.map((attachment) => (
                            <div key={attachment.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600">
                              {isImageAttachment(attachment.url, attachment.type) ? (
                                <img src={attachment.url} alt={attachment.name} className="h-8 w-8 rounded-md object-cover" />
                              ) : (
                                <Paperclip className="h-4 w-4" />
                              )}
                              <span className="truncate max-w-[150px]">{attachment.name}</span>
                              <span className={`text-[10px] font-bold ${attachment.status === "ready" ? "text-emerald-600" : attachment.status === "failed" ? "text-rose-600" : "text-amber-600"}`}>
                                {attachment.status === "ready" ? "Ready" : attachment.status === "failed" ? "Failed" : "Uploading"}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveAttachment(attachment.id)}
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
                            ref={fileInputRef}
                            type="file"
                            multiple
                            onChange={handleFileSelection}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                            Add file/image
                          </button>
                          {sendState !== "idle" ? (
                            <span className={`inline-flex items-center gap-1 text-xs font-bold ${sendState === "sent" ? "text-emerald-700" : sendState === "failed" ? "text-rose-700" : "text-blue-700"}`}>
                              {sendState === "sent" ? <Check className="h-3.5 w-3.5" /> : sendState === "failed" ? <AlertTriangle className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                              {sendState === "sent" ? "Sent" : sendState === "failed" ? "Not sent" : "Sending..."}
                            </span>
                          ) : null}
                        </div>

                        <button
                          type="submit"
                          disabled={replySubmitting || !replyBody.trim() || replyAttachments.some((attachment) => attachment.status === "uploading")}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 text-white px-4 py-2 text-xs font-semibold hover:bg-blue-700 shadow shadow-blue-500/20 disabled:opacity-50"
                        >
                          <Send className="h-3 w-3" />
                          {replySubmitting ? "Sending..." : "Send Email Reply"}
                        </button>
                      </div>
                    </div>
                    </form>
                  ) : null}

                </div>

                {/* Right side: Email sender details */}
                <div className="w-full md:w-72 bg-slate-50 p-6 space-y-6">
                  
                  {/* Customer Info Card */}
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer Details</h3>
                    <div className="mt-2.5 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold">
                        {getInitials(selectedTicket?.customerName)}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-slate-800 truncate">{selectedTicket?.customerName}</p>
                        <p className="text-[10px] text-slate-400 truncate">{selectedTicket?.customerEmail}</p>
                      </div>
                    </div>
                  </div>

                  <hr className="border-slate-200" />
                  <div className="space-y-3 text-xs text-slate-500">
                    <p><span className="font-semibold text-slate-700">Subject:</span> {selectedTicket?.subject || "No subject"}</p>
                    <p><span className="font-semibold text-slate-700">Last message:</span> {selectedTicket?.lastMessageAt ? new Date(selectedTicket.lastMessageAt).toLocaleString() : "—"}</p>
                    <p><span className="font-semibold text-slate-700">Message type:</span> {categoryLabel(selectedTicket?.category)}</p>
                  </div>

                </div>

              </div>
            )}

          </DashboardModalBody>
        </DashboardModalFrame>
      )}

      </div>
    </div>
  );
}
SupportInboxPage.requireAuth = true;

import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api.js";
import { categories, nftData } from "../data/nftData.js";

const NFT_CATEGORIES = categories.filter((c) => c !== "All");

function useCountUp(target, duration = 650, decimals = 0) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    const end = Number(target) || 0;
    let rafId;
    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      setVal(end * eased);
      if (elapsed < 1) rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);

  return decimals > 0 ? val.toFixed(decimals) : Math.round(val).toString();
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB");
}

function formatDateTime(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminDashboard({
  token,
  currentUser,
  catalogCount = 24,
  onNftsChanged,
  onGoHome,
  onLogout,
  onToast,
}) {
  const [tab, setTab] = useState("users");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [nfts, setNfts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [logs, setLogs] = useState([]);

  // Users search & filter
  const [userSearch, setUserSearch] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [userActionId, setUserActionId] = useState(null);

  // Edit User modal
  const [editingUser, setEditingUser] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  // Sales search & filter
  const [salesSearch, setSalesSearch] = useState("");
  const [salesStatusFilter, setSalesStatusFilter] = useState("all");
  const [paymentActionId, setPaymentActionId] = useState(null);

  // List New NFT form
  const [nftName, setNftName] = useState("");
  const [nftCreator, setNftCreator] = useState(
    currentUser?.username ? `@${currentUser.username}` : currentUser?.name || "@admin"
  );
  const [nftCategory, setNftCategory] = useState(NFT_CATEGORIES[0]);
  const [nftPrice, setNftPrice] = useState("1.50");
  const [nftImage, setNftImage] = useState("https://picsum.photos/seed/bazar_admin/400/300");
  const [nftDesc, setNftDesc] = useState("");
  const [nftFeatured, setNftFeatured] = useState(true);
  const [nftSaving, setNftSaving] = useState(false);

  // Manage NFTs search & edit
  const [nftSearch, setNftSearch] = useState("");
  const [editingNft, setEditingNft] = useState(null);
  const [nftEditSaving, setNftEditSaving] = useState(false);

  // Collections form & edit
  const [colName, setColName] = useState("");
  const [colDesc, setColDesc] = useState("");
  const [colImage, setColImage] = useState("");
  const [colLoading, setColLoading] = useState(false);
  const [editingCol, setEditingCol] = useState(null);

  // Confirmation modal
  const [confirmState, setConfirmState] = useState(null);

  const loadData = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [statsRes, usersRes, paymentsRes, nftsRes, collectionsRes, logsRes] = await Promise.all([
        apiRequest("/admin/stats", { token }),
        apiRequest("/admin/users", { token }),
        apiRequest("/admin/payments", { token }),
        apiRequest("/admin/nfts", { token }),
        apiRequest("/collections"),
        apiRequest("/admin/logs", { token }),
      ]);
      setStats(statsRes.stats);
      setUsers(usersRes.users);
      setPayments(paymentsRes.payments);
      setNfts(nftsRes.nfts);
      setCollections(collectionsRes.collections);
      setLogs(logsRes.logs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, [token]);

  // Derived KPI values (always synchronized with live arrays)
  const totalUsersCount = users.length || stats?.totalUsers || 0;
  const blockedUsersCount = users.filter((u) => u.isBlocked).length;
  const activeNftsCount = catalogCount + nfts.filter((n) => n.isActive !== false).length;
  const completedSales = payments.filter((p) => p.status === "completed");
  const totalSalesCount = completedSales.length;
  const totalRevenueEth = completedSales.reduce((acc, p) => acc + Number(p.amount || 0), 0);

  const animUsers = useCountUp(totalUsersCount);
  const animBlocked = useCountUp(blockedUsersCount);
  const animNfts = useCountUp(activeNftsCount);
  const animSales = useCountUp(totalSalesCount);
  const animRevenue = useCountUp(totalRevenueEth, 750, 3);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return users.filter((u) => {
      if (userFilter === "active" && u.isBlocked) return false;
      if (userFilter === "blocked" && !u.isBlocked) return false;
      if (userFilter === "admin" && u.role !== "admin") return false;
      if (!q) return true;
      return (
        (u.name || "").toLowerCase().includes(q) ||
        (u.username || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.phone || "").toLowerCase().includes(q)
      );
    });
  }, [users, userSearch, userFilter]);

  // Filtered Sales
  const filteredPayments = useMemo(() => {
    const q = salesSearch.trim().toLowerCase();
    return payments.filter((p) => {
      if (salesStatusFilter !== "all" && p.status !== salesStatusFilter) return false;
      if (!q) return true;
      return (
        (p.nftName || "").toLowerCase().includes(q) ||
        (p.user?.name || "").toLowerCase().includes(q) ||
        (p.user?.email || "").toLowerCase().includes(q) ||
        (p.txHash || "").toLowerCase().includes(q)
      );
    });
  }, [payments, salesSearch, salesStatusFilter]);

  // Filtered NFTs
  const filteredDbNfts = useMemo(() => {
    const q = nftSearch.trim().toLowerCase();
    if (!q) return nfts;
    return nfts.filter(
      (n) =>
        (n.name || "").toLowerCase().includes(q) ||
        (n.creator || "").toLowerCase().includes(q) ||
        (n.category || "").toLowerCase().includes(q)
    );
  }, [nfts, nftSearch]);

  // User Actions
  const handleBlockToggle = async (u) => {
    setUserActionId(u.id);
    try {
      const action = u.isBlocked ? "unblock" : "block";
      const res = await apiRequest(`/admin/users/${u.id}/${action}`, { method: "PATCH", token });
      setUsers((prev) => prev.map((item) => (item.id === u.id ? { ...item, isBlocked: !u.isBlocked } : item)));
      onToast?.(res.message || `User ${action}ed`, "success");
      loadData(true);
    } catch (err) {
      onToast?.(err.message, "error");
    } finally {
      setUserActionId(null);
    }
  };

  const handleSaveUserEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditSaving(true);
    try {
      const res = await apiRequest(`/admin/users/${editingUser.id}`, {
        method: "PATCH",
        token,
        body: {
          name: editingUser.name.trim(),
          username: editingUser.username.trim().replace(/^@+/, ""),
          email: editingUser.email.trim(),
          phone: editingUser.phone.trim(),
          walletBalance: Number(editingUser.walletBalance),
          role: editingUser.role,
          isBlocked: Boolean(editingUser.isBlocked),
        },
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === editingUser.id ? { ...u, ...res.user } : u))
      );
      setEditingUser(null);
      onToast?.("User updated successfully", "success");
      loadData(true);
    } catch (err) {
      onToast?.(err.message, "error");
    } finally {
      setEditSaving(false);
    }
  };

  const confirmDeleteUser = (u) => {
    setConfirmState({
      title: "Delete User Account",
      message: `Permanently delete ${u.name} (${u.email}) and all their transaction records? This cannot be undone.`,
      confirmText: "Delete Permanently",
      onConfirm: async () => {
        setUserActionId(u.id);
        try {
          await apiRequest(`/admin/users/${u.id}`, { method: "DELETE", token });
          setUsers((prev) => prev.filter((item) => item.id !== u.id));
          onToast?.(`Deleted ${u.name}`, "success");
          loadData(true);
        } catch (err) {
          onToast?.(err.message, "error");
        } finally {
          setUserActionId(null);
          setConfirmState(null);
        }
      },
    });
  };

  // Payment Status Update & CSV Export
  const handlePaymentStatus = async (paymentId, nextStatus) => {
    setPaymentActionId(paymentId);
    try {
      const res = await apiRequest(`/admin/payments/${paymentId}/status`, {
        method: "PATCH",
        token,
        body: { status: nextStatus },
      });
      setPayments((prev) => prev.map((p) => (p._id === paymentId ? res.payment : p)));
      onToast?.(`Order marked ${nextStatus}`, "success");
      loadData(true);
    } catch (err) {
      onToast?.(err.message, "error");
    } finally {
      setPaymentActionId(null);
    }
  };

  const handleExportSalesCsv = () => {
    const headers = ["OrderID", "Buyer", "Email", "NFT", "Method", "ETH", "INR", "Status", "Date"];
    const rows = filteredPayments.map((p) => [
      p._id,
      `"${(p.user?.name || "Unknown").replace(/"/g, '""')}"`,
      p.user?.email || "",
      `"${(p.nftName || "").replace(/"/g, '""')}"`,
      p.method || "mock",
      p.amount,
      p.fiatAmount ?? "",
      p.status,
      p.createdAt || "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nft-bazar-sales-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onToast?.("Sales report downloaded (CSV)", "success");
  };

  // List New NFT
  const handlePickRandomImage = () => {
    const pick = nftData[Math.floor(Math.random() * nftData.length)];
    setNftImage(`https://picsum.photos/seed/bazar_${Date.now().toString().slice(-4)}/400/300`);
    if (!nftName.trim()) setNftName(pick.name.split("#")[0].trim() + " #" + Math.floor(100 + Math.random() * 899));
  };

  const handleCreateAdminNft = async (e) => {
    e.preventDefault();
    if (!nftName.trim() || !nftPrice || Number(nftPrice) <= 0) {
      onToast?.("NFT name and a positive ETH price are required.", "error");
      return;
    }
    setNftSaving(true);
    try {
      const res = await apiRequest("/admin/nfts", {
        method: "POST",
        token,
        body: {
          name: nftName.trim(),
          creator: nftCreator.trim(),
          category: nftCategory,
          price: Number(nftPrice),
          image: nftImage.trim(),
          description: nftDesc.trim(),
          featured: nftFeatured,
        },
      });
      setNfts((prev) => [res.nft, ...prev]);
      setNftName("");
      setNftDesc("");
      onToast?.(`Listed "${res.nft.name}" on marketplace!`, "success");
      onNftsChanged?.();
      loadData(true);
    } catch (err) {
      onToast?.(err.message, "error");
    } finally {
      setNftSaving(false);
    }
  };

  const handleToggleNftActive = async (nft) => {
    try {
      const res = await apiRequest(`/admin/nfts/${nft._id}`, {
        method: "PATCH",
        token,
        body: { isActive: nft.isActive === false },
      });
      setNfts((prev) => prev.map((item) => (item._id === nft._id ? res.nft : item)));
      onToast?.(res.nft.isActive ? "NFT activated" : "NFT paused", "success");
      onNftsChanged?.();
    } catch (err) {
      onToast?.(err.message, "error");
    }
  };

  const handleSaveNftEdit = async (e) => {
    e.preventDefault();
    if (!editingNft) return;
    setNftEditSaving(true);
    try {
      const res = await apiRequest(`/admin/nfts/${editingNft._id}`, {
        method: "PATCH",
        token,
        body: {
          name: editingNft.name.trim(),
          creator: editingNft.creator.trim(),
          category: editingNft.category,
          price: Number(editingNft.price),
          image: editingNft.image.trim(),
          description: editingNft.description || "",
          isActive: editingNft.isActive !== false,
          featured: Boolean(editingNft.featured),
        },
      });
      setNfts((prev) => prev.map((item) => (item._id === editingNft._id ? res.nft : item)));
      setEditingNft(null);
      onToast?.("NFT updated successfully", "success");
      onNftsChanged?.();
      loadData(true);
    } catch (err) {
      onToast?.(err.message, "error");
    } finally {
      setNftEditSaving(false);
    }
  };

  const confirmDeleteNft = (nft) => {
    setConfirmState({
      title: "Remove NFT",
      message: `Delete "${nft.name}" from the marketplace permanently?`,
      confirmText: "Delete NFT",
      onConfirm: async () => {
        try {
          await apiRequest(`/admin/nfts/${nft._id}`, { method: "DELETE", token });
          setNfts((prev) => prev.filter((item) => item._id !== nft._id));
          onToast?.(`Deleted "${nft.name}"`, "success");
          onNftsChanged?.();
          loadData(true);
        } catch (err) {
          onToast?.(err.message, "error");
        } finally {
          setConfirmState(null);
        }
      },
    });
  };

  // Collections
  const handleCreateCollection = async (e) => {
    e.preventDefault();
    if (!colName.trim() || !colImage.trim()) {
      onToast?.("Collection name and cover image URL are required.", "error");
      return;
    }
    setColLoading(true);
    try {
      const data = await apiRequest("/collections", {
        method: "POST",
        token,
        body: { name: colName.trim(), description: colDesc.trim(), coverImage: colImage.trim() },
      });
      setCollections((prev) => [data.collection, ...prev]);
      setColName("");
      setColDesc("");
      setColImage("");
      onToast?.("Collection created!", "success");
      loadData(true);
    } catch (err) {
      onToast?.(err.message, "error");
    } finally {
      setColLoading(false);
    }
  };

  const handleSaveCollectionEdit = async (e) => {
    e.preventDefault();
    if (!editingCol) return;
    try {
      const data = await apiRequest(`/collections/${editingCol._id}`, {
        method: "PATCH",
        token,
        body: {
          name: editingCol.name.trim(),
          description: editingCol.description.trim(),
          coverImage: editingCol.coverImage.trim(),
        },
      });
      setCollections((prev) => prev.map((c) => (c._id === editingCol._id ? data.collection : c)));
      setEditingCol(null);
      onToast?.("Collection updated", "success");
      loadData(true);
    } catch (err) {
      onToast?.(err.message, "error");
    }
  };

  const confirmDeleteCollection = (c) => {
    setConfirmState({
      title: "Delete Collection",
      message: `Delete collection "${c.name}"?`,
      confirmText: "Delete",
      onConfirm: async () => {
        try {
          await apiRequest(`/collections/${c._id}`, { method: "DELETE", token });
          setCollections((prev) => prev.filter((item) => item._id !== c._id));
          onToast?.("Collection deleted", "success");
          loadData(true);
        } catch (err) {
          onToast?.(err.message, "error");
        } finally {
          setConfirmState(null);
        }
      },
    });
  };

  // Category breakdown for analytics
  const categoryBreakdown = useMemo(() => {
    const counts = { Art: 0, Music: 0, Gaming: 0, Photography: 0, Collectibles: 0 };
    [...nftData, ...nfts].forEach((item) => {
      if (counts[item.category] !== undefined) counts[item.category] += 1;
    });
    const max = Math.max(1, ...Object.values(counts));
    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
      pct: Math.round((count / max) * 100),
    }));
  }, [nfts]);

  return (
    <div className="adm-shell">
      <div className="adm-ambient" aria-hidden="true">
        <span className="adm-orb adm-orb-1" />
        <span className="adm-orb adm-orb-2" />
      </div>

      {/* Dedicated Admin Top Bar */}
      <header className="adm-header">
        <div className="adm-brand" onClick={() => setTab("users")}>
          <span className="adm-live-dot" />
          <span className="adm-brand-title">
            NFT <span className="adm-gold">Bazar</span> <span className="adm-sep">·</span> Admin
          </span>
          <span className="adm-env-pill">Control Center</span>
        </div>

        <div className="adm-header-actions">
          <button
            className={`adm-top-btn ${refreshing ? "spinning" : ""}`}
            onClick={() => loadData(true)}
            title="Refresh live data"
          >
            <span className="adm-spin-icon">⟳</span> Refresh
          </button>
          <button className="adm-top-btn" onClick={onGoHome}>
            ↗ View Storefront
          </button>
          <div className="adm-admin-chip" title={currentUser?.email}>
            <span className="adm-avatar-mini">{(currentUser?.name || "A").charAt(0).toUpperCase()}</span>
            <span>{currentUser?.name || "Admin"}</span>
          </div>
          <button className="adm-logout-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="adm-main">
        {error && <div className="form-msg error" style={{ marginBottom: 20 }}>{error}</div>}

        {/* 5 Animated KPI Cards */}
        <section className="adm-kpi-grid">
          <article className="adm-kpi-card" style={{ animationDelay: "0ms" }}>
            <div className="adm-kpi-top">
              <span className="adm-kpi-label">Total users</span>
              <span className="adm-kpi-icon">👥</span>
            </div>
            <strong className="adm-kpi-value">{animUsers}</strong>
            <span className="adm-kpi-sub">{totalUsersCount - blockedUsersCount} active accounts</span>
          </article>

          <article className="adm-kpi-card" style={{ animationDelay: "60ms" }}>
            <div className="adm-kpi-top">
              <span className="adm-kpi-label">Blocked users</span>
              <span className="adm-kpi-icon">🚫</span>
            </div>
            <strong className="adm-kpi-value">{animBlocked}</strong>
            <span className="adm-kpi-sub">Restricted access</span>
          </article>

          <article className="adm-kpi-card" style={{ animationDelay: "120ms" }}>
            <div className="adm-kpi-top">
              <span className="adm-kpi-label">Active NFTs</span>
              <span className="adm-kpi-icon">💎</span>
            </div>
            <strong className="adm-kpi-value">{animNfts}</strong>
            <span className="adm-kpi-sub">{nfts.length} custom minted</span>
          </article>

          <article className="adm-kpi-card" style={{ animationDelay: "180ms" }}>
            <div className="adm-kpi-top">
              <span className="adm-kpi-label">Total sales</span>
              <span className="adm-kpi-icon">⚡</span>
            </div>
            <strong className="adm-kpi-value">{animSales}</strong>
            <span className="adm-kpi-sub">{stats?.pendingSales || 0} pending orders</span>
          </article>

          <article className="adm-kpi-card adm-kpi-highlight" style={{ animationDelay: "240ms" }}>
            <div className="adm-kpi-top">
              <span className="adm-kpi-label">Total revenue</span>
              <span className="adm-kpi-icon">💰</span>
            </div>
            <strong className="adm-kpi-value">{animRevenue} ETH</strong>
            <span className="adm-kpi-sub">
              ≈ ₹{Number(stats?.totalRevenueInr || totalRevenueEth * 21000).toLocaleString("en-IN")} INR
            </span>
          </article>
        </section>

        {/* Pill Navigation Tabs */}
        <nav className="adm-tabs" aria-label="Admin sections">
          {[
            { id: "users", label: "Users", count: users.length },
            { id: "sales", label: "Sales", count: payments.length },
            { id: "list-nft", label: "List new NFT" },
            { id: "nfts", label: "Manage NFTs", count: nfts.length },
            { id: "collections", label: "Collections", count: collections.length },
            { id: "analytics", label: "Analytics & Logs" },
          ].map((item) => (
            <button
              key={item.id}
              className={"adm-tab-btn" + (tab === item.id ? " active" : "")}
              onClick={() => setTab(item.id)}
            >
              <span>{item.label}</span>
              {item.count !== undefined && <span className="adm-tab-count">{item.count}</span>}
            </button>
          ))}
        </nav>

        {/* Loading Skeleton */}
        {loading ? (
          <div className="adm-panel">
            <div className="adm-skeleton-row" />
            <div className="adm-skeleton-row" />
            <div className="adm-skeleton-row" />
            <div className="adm-skeleton-row" />
          </div>
        ) : (
          <div key={tab} className="adm-tab-stage">
            {/* TAB 1: USERS */}
            {tab === "users" && (
              <section className="adm-panel">
                <div className="adm-toolbar">
                  <div className="adm-search-wrap">
                    <span className="adm-search-icon">⌕</span>
                    <input
                      type="text"
                      className="adm-search-input"
                      placeholder="Search users by name, username, email or phone"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                    />
                    {userSearch && (
                      <button className="adm-clear-btn" onClick={() => setUserSearch("")}>✕</button>
                    )}
                  </div>

                  <div className="adm-filter-pills">
                    {["all", "active", "blocked", "admin"].map((f) => (
                      <button
                        key={f}
                        className={"adm-chip-filter" + (userFilter === f ? " active" : "")}
                        onClick={() => setUserFilter(f)}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>

                  <span className="adm-count-label">
                    {filteredUsers.length} of {users.length} users
                  </span>
                </div>

                {filteredUsers.length === 0 ? (
                  <p className="adm-empty">No users match your search criteria.</p>
                ) : (
                  <div className="adm-table-wrap">
                    <table className="adm-table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Email / Phone</th>
                          <th>Wallet</th>
                          <th>NFTs</th>
                          <th>Status</th>
                          <th>Joined</th>
                          <th style={{ textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u, idx) => (
                          <tr
                            key={u.id}
                            className="adm-row-anim"
                            style={{ animationDelay: `${Math.min(idx * 35, 350)}ms` }}
                          >
                            <td>
                              <div className="adm-user-cell">
                                <div className="adm-user-avatar">
                                  {(u.name || "U").charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="adm-user-name">
                                    {u.name}
                                    {u.role === "admin" && <span className="adm-mini-admin">ADMIN</span>}
                                  </div>
                                  <div className="adm-user-handle">
                                    @{u.username || u.email.split("@")[0]}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="adm-email-text">{u.email}</div>
                              <div className="adm-muted-text">{u.phone || "—"}</div>
                            </td>
                            <td>
                              <div className="adm-wallet-bal">
                                {Number(u.walletBalance ?? 100).toFixed(3)} ETH
                              </div>
                              <div className="adm-muted-text">
                                {u.wallet?.provider
                                  ? `🟢 ${u.wallet.provider}`
                                  : "No external wallet"}
                              </div>
                            </td>
                            <td>
                              <div className="adm-nfts-cell">
                                <span>{u.ownedNftsCount || 0} owned</span>
                                <span className="adm-muted-text">{u.createdNftsCount || 0} created</span>
                              </div>
                            </td>
                            <td>
                              {u.isBlocked ? (
                                <span className="adm-status-pill blocked">Blocked</span>
                              ) : (
                                <span className="adm-status-pill active">Active</span>
                              )}
                            </td>
                            <td className="adm-date-cell">{formatDate(u.createdAt)}</td>
                            <td>
                              <div className="adm-actions-cell">
                                <button
                                  className="adm-act-btn edit"
                                  onClick={() =>
                                    setEditingUser({
                                      id: u.id,
                                      name: u.name || "",
                                      username: u.username || "",
                                      email: u.email || "",
                                      phone: u.phone || "",
                                      walletBalance: u.walletBalance ?? 100,
                                      role: u.role || "user",
                                      isBlocked: Boolean(u.isBlocked),
                                    })
                                  }
                                >
                                  Edit
                                </button>
                                {u.role !== "admin" && (
                                  <>
                                    <button
                                      className={"adm-act-btn " + (u.isBlocked ? "unblock" : "block")}
                                      disabled={userActionId === u.id}
                                      onClick={() => handleBlockToggle(u)}
                                    >
                                      {userActionId === u.id ? "..." : u.isBlocked ? "Unblock" : "Block"}
                                    </button>
                                    <button
                                      className="adm-act-btn delete"
                                      disabled={userActionId === u.id}
                                      onClick={() => confirmDeleteUser(u)}
                                    >
                                      Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {/* TAB 2: SALES */}
            {tab === "sales" && (
              <section className="adm-panel">
                <div className="adm-toolbar">
                  <div className="adm-search-wrap">
                    <span className="adm-search-icon">⌕</span>
                    <input
                      type="text"
                      className="adm-search-input"
                      placeholder="Search sales by NFT name, buyer, email or tx hash"
                      value={salesSearch}
                      onChange={(e) => setSalesSearch(e.target.value)}
                    />
                  </div>

                  <div className="adm-filter-pills">
                    {["all", "completed", "pending", "failed"].map((st) => (
                      <button
                        key={st}
                        className={"adm-chip-filter" + (salesStatusFilter === st ? " active" : "")}
                        onClick={() => setSalesStatusFilter(st)}
                      >
                        {st.charAt(0).toUpperCase() + st.slice(1)}
                      </button>
                    ))}
                  </div>

                  <button className="adm-top-btn" onClick={handleExportSalesCsv}>
                    ⬇ Export CSV
                  </button>
                </div>

                {filteredPayments.length === 0 ? (
                  <p className="adm-empty">No sales records found.</p>
                ) : (
                  <div className="adm-table-wrap">
                    <table className="adm-table">
                      <thead>
                        <tr>
                          <th>Transaction</th>
                          <th>Buyer</th>
                          <th>NFT Item</th>
                          <th>Method</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPayments.map((p, idx) => (
                          <tr
                            key={p._id}
                            className="adm-row-anim"
                            style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                          >
                            <td>
                              <div className="adm-mono">TXN{String(p._id).slice(-8).toUpperCase()}</div>
                              <div className="adm-muted-text">
                                {p.txHash ? `${p.txHash.slice(0, 12)}…` : "—"}
                              </div>
                            </td>
                            <td>
                              <div className="adm-user-name">{p.user?.name || "Unknown"}</div>
                              <div className="adm-muted-text">{p.user?.email || "—"}</div>
                            </td>
                            <td className="adm-user-name">{p.nftName}</td>
                            <td>
                              <span className="adm-method-pill">{p.method || "mock"}</span>
                            </td>
                            <td>
                              <div className="adm-wallet-bal">{Number(p.amount).toFixed(3)} {p.currency || "ETH"}</div>
                              {p.fiatAmount != null && (
                                <div className="adm-muted-text">₹{Number(p.fiatAmount).toFixed(2)}</div>
                              )}
                            </td>
                            <td>
                              <select
                                className={"adm-status-select " + p.status}
                                value={p.status}
                                disabled={paymentActionId === p._id}
                                onChange={(e) => handlePaymentStatus(p._id, e.target.value)}
                              >
                                <option value="completed">Completed</option>
                                <option value="pending">Pending</option>
                                <option value="failed">Failed</option>
                              </select>
                            </td>
                            <td className="adm-date-cell">{formatDateTime(p.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {/* TAB 3: LIST NEW NFT */}
            {tab === "list-nft" && (
              <section className="adm-split-grid">
                <div className="adm-panel">
                  <div className="adm-panel-head">
                    <div>
                      <h3>List New NFT</h3>
                      <p className="adm-muted-text">Mint and publish a new NFT directly to the marketplace</p>
                    </div>
                    <button type="button" className="adm-top-btn" onClick={handlePickRandomImage}>
                      🎲 Auto-Fill Art
                    </button>
                  </div>

                  <form onSubmit={handleCreateAdminNft} style={{ marginTop: 18 }}>
                    <div className="form-row-2">
                      <div className="form-group">
                        <label>NFT Title *</label>
                        <input
                          type="text"
                          placeholder="e.g. Cyber Maharaja #09"
                          value={nftName}
                          onChange={(e) => setNftName(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Creator Handle</label>
                        <input
                          type="text"
                          placeholder="@creator_name"
                          value={nftCreator}
                          onChange={(e) => setNftCreator(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-row-2">
                      <div className="form-group">
                        <label>Category</label>
                        <select
                          className="adm-select"
                          value={nftCategory}
                          onChange={(e) => setNftCategory(e.target.value)}
                        >
                          {NFT_CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Price (ETH) *</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={nftPrice}
                          onChange={(e) => setNftPrice(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Artwork Image URL</label>
                      <input
                        type="text"
                        placeholder="https://..."
                        value={nftImage}
                        onChange={(e) => setNftImage(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>Description (optional)</label>
                      <input
                        type="text"
                        placeholder="Short story or edition note..."
                        value={nftDesc}
                        onChange={(e) => setNftDesc(e.target.value)}
                      />
                    </div>

                    <label className="adm-checkbox-row">
                      <input
                        type="checkbox"
                        checked={nftFeatured}
                        onChange={(e) => setNftFeatured(e.target.checked)}
                      />
                      <span>Mark as Featured Drop</span>
                    </label>

                    <button type="submit" className="btn btn-primary auth-submit" disabled={nftSaving}>
                      {nftSaving ? "Publishing..." : "Publish NFT to Marketplace"}
                    </button>
                  </form>
                </div>

                <div className="adm-panel adm-preview-panel">
                  <h3>Live Card Preview</h3>
                  <p className="adm-muted-text" style={{ marginBottom: 18 }}>
                    How this NFT will appear on the storefront
                  </p>
                  <div className="card revealed" style={{ maxWidth: 300, margin: "0 auto" }}>
                    <img
                      src={nftImage || "https://picsum.photos/seed/bazar_preview/400/300"}
                      alt={nftName || "Preview"}
                    />
                    <div className="card-body">
                      <div className="card-top">
                        <span className="category-tag">{nftCategory}</span>
                        {nftFeatured && <span className="adm-mini-admin">FEATURED</span>}
                      </div>
                      <h4>{nftName || "Untitled Artwork #01"}</h4>
                      <p className="creator">by {nftCreator || "@admin"}</p>
                      <div className="card-footer">
                        <div>
                          <div className="price-label">Price</div>
                          <div className="price-value">{nftPrice || "0.00"} ETH</div>
                        </div>
                        <button type="button" className="buy-btn">Buy Now</button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* TAB 4: MANAGE NFTS */}
            {tab === "nfts" && (
              <section className="adm-panel">
                <div className="adm-toolbar">
                  <div className="adm-search-wrap">
                    <span className="adm-search-icon">⌕</span>
                    <input
                      type="text"
                      className="adm-search-input"
                      placeholder="Search minted NFTs by title, creator or category"
                      value={nftSearch}
                      onChange={(e) => setNftSearch(e.target.value)}
                    />
                  </div>
                  <button className="btn btn-primary" style={{ padding: "9px 18px" }} onClick={() => setTab("list-nft")}>
                    + List New NFT
                  </button>
                </div>

                {filteredDbNfts.length === 0 ? (
                  <p className="adm-empty">
                    No custom minted NFTs in the database yet. Use &ldquo;List new NFT&rdquo; to publish one.
                  </p>
                ) : (
                  <div className="adm-table-wrap">
                    <table className="adm-table">
                      <thead>
                        <tr>
                          <th>NFT</th>
                          <th>Creator</th>
                          <th>Category</th>
                          <th>Price</th>
                          <th>Status</th>
                          <th style={{ textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDbNfts.map((n, idx) => (
                          <tr
                            key={n._id}
                            className="adm-row-anim"
                            style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                          >
                            <td>
                              <div className="adm-user-cell">
                                <img src={n.image} alt={n.name} className="adm-nft-thumb" />
                                <div>
                                  <div className="adm-user-name">
                                    {n.name}
                                    {n.featured && <span className="adm-mini-admin">★</span>}
                                  </div>
                                  <div className="adm-muted-text">{formatDate(n.createdAt)}</div>
                                </div>
                              </div>
                            </td>
                            <td>{n.creator}</td>
                            <td><span className="category-tag">{n.category}</span></td>
                            <td className="adm-wallet-bal">{Number(n.price).toFixed(2)} ETH</td>
                            <td>
                              <span className={"adm-status-pill " + (n.isActive !== false ? "active" : "blocked")}>
                                {n.isActive !== false ? "Listed" : "Paused"}
                              </span>
                            </td>
                            <td>
                              <div className="adm-actions-cell">
                                <button
                                  className="adm-act-btn edit"
                                  onClick={() => setEditingNft({ ...n })}
                                >
                                  Edit
                                </button>
                                <button
                                  className={"adm-act-btn " + (n.isActive !== false ? "block" : "unblock")}
                                  onClick={() => handleToggleNftActive(n)}
                                >
                                  {n.isActive !== false ? "Pause" : "Activate"}
                                </button>
                                <button
                                  className="adm-act-btn delete"
                                  onClick={() => confirmDeleteNft(n)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {/* TAB 5: COLLECTIONS */}
            {tab === "collections" && (
              <section className="adm-split-grid">
                <div className="adm-panel">
                  <h3>Create Collection</h3>
                  <p className="adm-muted-text" style={{ marginBottom: 16 }}>
                    Organize curated NFT drops on NFT Bazar
                  </p>
                  <form onSubmit={handleCreateCollection}>
                    <div className="form-group">
                      <label>Collection Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Cyber Punks India"
                        value={colName}
                        onChange={(e) => setColName(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <input
                        type="text"
                        placeholder="What is this collection about?"
                        value={colDesc}
                        onChange={(e) => setColDesc(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Cover Image URL *</label>
                      <input
                        type="text"
                        placeholder="https://..."
                        value={colImage}
                        onChange={(e) => setColImage(e.target.value)}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary auth-submit" disabled={colLoading}>
                      {colLoading ? "Creating..." : "Create Collection"}
                    </button>
                  </form>
                </div>

                <div className="adm-panel">
                  <h3>Active Collections ({collections.length})</h3>
                  <div className="adm-collection-list">
                    {collections.length === 0 ? (
                      <p className="adm-empty">No collections created yet.</p>
                    ) : (
                      collections.map((c) => (
                        <div className="adm-collection-item" key={c._id}>
                          <img src={c.coverImage} alt={c.name} />
                          <div className="adm-collection-meta">
                            <h4>{c.name}</h4>
                            <p>{c.description || "No description"}</p>
                          </div>
                          <div className="adm-actions-cell">
                            <button className="adm-act-btn edit" onClick={() => setEditingCol({ ...c })}>
                              Edit
                            </button>
                            <button className="adm-act-btn delete" onClick={() => confirmDeleteCollection(c)}>
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* TAB 6: ANALYTICS & AUDIT LOGS */}
            {tab === "analytics" && (
              <section className="adm-split-grid">
                <div className="adm-panel">
                  <h3>Marketplace Category Distribution</h3>
                  <p className="adm-muted-text" style={{ marginBottom: 20 }}>
                    Catalog + Custom Minted NFTs across categories
                  </p>
                  <div className="adm-bars">
                    {categoryBreakdown.map((cat) => (
                      <div className="adm-bar-row" key={cat.name}>
                        <div className="adm-bar-label">
                          <span>{cat.name}</span>
                          <strong>{cat.count} NFTs</strong>
                        </div>
                        <div className="adm-bar-track">
                          <div className="adm-bar-fill" style={{ width: `${cat.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="adm-method-split">
                    <div className="adm-split-box">
                      <span>Razorpay Sales</span>
                      <strong>{stats?.salesByMethod?.razorpay ?? 0}</strong>
                    </div>
                    <div className="adm-split-box">
                      <span>Wallet / Demo Sales</span>
                      <strong>{stats?.salesByMethod?.mock ?? 0}</strong>
                    </div>
                    <div className="adm-split-box">
                      <span>Failed Orders</span>
                      <strong>{stats?.failedSales ?? 0}</strong>
                    </div>
                  </div>
                </div>

                <div className="adm-panel">
                  <h3>Admin Activity Audit Log</h3>
                  <p className="adm-muted-text" style={{ marginBottom: 16 }}>
                    Recent administrative actions tracked in MongoDB
                  </p>
                  {logs.length === 0 ? (
                    <p className="adm-empty">No admin activity logged yet.</p>
                  ) : (
                    <div className="adm-log-list">
                      {logs.map((log) => (
                        <div className="adm-log-item" key={log._id}>
                          <span className="adm-log-dot" />
                          <div className="adm-log-body">
                            <div className="adm-log-summary">{log.summary}</div>
                            <div className="adm-muted-text">
                              {log.admin?.name || "Admin"} · {log.action} · {formatDateTime(log.createdAt)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="purchase-success-overlay" onClick={(e) => e.target === e.currentTarget && setEditingUser(null)}>
          <div className="adm-modal">
            <div className="adm-modal-head">
              <h3>Edit User</h3>
              <button className="adm-modal-close" onClick={() => setEditingUser(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveUserEdit}>
              <div className="form-row-2">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Username</label>
                  <input
                    type="text"
                    value={editingUser.username}
                    onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="text"
                    value={editingUser.phone}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label>Wallet Balance (ETH)</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={editingUser.walletBalance}
                    onChange={(e) => setEditingUser({ ...editingUser, walletBalance: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select
                    className="adm-select"
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <label className="adm-checkbox-row">
                <input
                  type="checkbox"
                  checked={editingUser.isBlocked}
                  onChange={(e) => setEditingUser({ ...editingUser, isBlocked: e.target.checked })}
                />
                <span>Block this user account</span>
              </label>
              <div className="adm-modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setEditingUser(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={editSaving}>
                  {editSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit NFT Modal */}
      {editingNft && (
        <div className="purchase-success-overlay" onClick={(e) => e.target === e.currentTarget && setEditingNft(null)}>
          <div className="adm-modal">
            <div className="adm-modal-head">
              <h3>Edit NFT</h3>
              <button className="adm-modal-close" onClick={() => setEditingNft(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveNftEdit}>
              <div className="form-row-2">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={editingNft.name}
                    onChange={(e) => setEditingNft({ ...editingNft, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Creator</label>
                  <input
                    type="text"
                    value={editingNft.creator}
                    onChange={(e) => setEditingNft({ ...editingNft, creator: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    className="adm-select"
                    value={editingNft.category}
                    onChange={(e) => setEditingNft({ ...editingNft, category: e.target.value })}
                  >
                    {NFT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Price (ETH)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editingNft.price}
                    onChange={(e) => setEditingNft({ ...editingNft, price: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Image URL</label>
                <input
                  type="text"
                  value={editingNft.image}
                  onChange={(e) => setEditingNft({ ...editingNft, image: e.target.value })}
                />
              </div>
              <label className="adm-checkbox-row">
                <input
                  type="checkbox"
                  checked={Boolean(editingNft.featured)}
                  onChange={(e) => setEditingNft({ ...editingNft, featured: e.target.checked })}
                />
                <span>Featured on marketplace</span>
              </label>
              <div className="adm-modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setEditingNft(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={nftEditSaving}>
                  {nftEditSaving ? "Saving..." : "Update NFT"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Collection Modal */}
      {editingCol && (
        <div className="purchase-success-overlay" onClick={(e) => e.target === e.currentTarget && setEditingCol(null)}>
          <div className="adm-modal">
            <div className="adm-modal-head">
              <h3>Edit Collection</h3>
              <button className="adm-modal-close" onClick={() => setEditingCol(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveCollectionEdit}>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={editingCol.name}
                  onChange={(e) => setEditingCol({ ...editingCol, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={editingCol.description || ""}
                  onChange={(e) => setEditingCol({ ...editingCol, description: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Cover Image URL</label>
                <input
                  type="text"
                  value={editingCol.coverImage}
                  onChange={(e) => setEditingCol({ ...editingCol, coverImage: e.target.value })}
                />
              </div>
              <div className="adm-modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setEditingCol(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmState && (
        <div className="purchase-success-overlay" onClick={(e) => e.target === e.currentTarget && setConfirmState(null)}>
          <div className="adm-modal adm-confirm-modal">
            <h3>{confirmState.title}</h3>
            <p className="adm-muted-text" style={{ margin: "10px 0 22px", lineHeight: 1.5 }}>
              {confirmState.message}
            </p>
            <div className="adm-modal-actions">
              <button type="button" className="btn btn-outline" onClick={() => setConfirmState(null)}>
                Cancel
              </button>
              <button type="button" className="adm-danger-btn" onClick={confirmState.onConfirm}>
                {confirmState.confirmText || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

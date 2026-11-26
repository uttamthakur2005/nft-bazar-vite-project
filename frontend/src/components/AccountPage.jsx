import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api.js";

const ACCOUNT_SECTIONS = [
  { id: "profile", label: "Profile & Security", icon: "👤" },
  { id: "payment", label: "Payment", icon: "💳" },
  { id: "transactions", label: "Transaction History", icon: "▤" },
  { id: "nfts", label: "My NFTs", icon: "🖼️" },
  { id: "creations", label: "My Creations", icon: "✨" },
];

export default function AccountPage({ user, token, allNfts, onOpenPayment, onCreate, onUserUpdated, onToast }) {
  const [section, setSection] = useState("transactions");
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [profileName, setProfileName] = useState(user.name || "");
  const [profileUsername, setProfileUsername] = useState(user.username || "");
  const [profilePhone, setProfilePhone] = useState(user.phone || "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);

  useEffect(() => {
    setProfileName(user.name || "");
    setProfileUsername(user.username || "");
    setProfilePhone(user.phone || "");
  }, [user]);

  useEffect(() => {
    apiRequest("/payment/history", { token })
      .then((data) => setPayments(data.payments))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const creations = useMemo(
    () =>
      allNfts.filter(
        (nft) =>
          nft.creator === user.name ||
          (user.username && nft.creator === `@${user.username}`)
      ),
    [allNfts, user.name, user.username]
  );
  const purchases = payments.filter((payment) => payment.status === "completed");
  const totalSpent = purchases.reduce((total, payment) => total + Number(payment.amount || 0), 0);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const data = await apiRequest("/user/profile", {
        method: "PATCH",
        token,
        body: {
          name: profileName.trim(),
          username: profileUsername.trim().replace(/^@+/, ""),
          phone: profilePhone.trim(),
        },
      });
      onUserUpdated?.(data.user);
      setProfileMsg({ type: "success", text: "Profile updated successfully." });
      onToast?.("Profile updated", "success");
    } catch (err) {
      setProfileMsg({ type: "error", text: err.message });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPwMsg({ type: "error", text: "All password fields are required." });
      return;
    }
    if (newPassword.length < 6) {
      setPwMsg({ type: "error", text: "New password must be at least 6 characters." });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPwMsg({ type: "error", text: "New password and confirmation do not match." });
      return;
    }
    setPwSaving(true);
    setPwMsg(null);
    try {
      const data = await apiRequest("/auth/change-password", {
        method: "PATCH",
        token,
        body: { currentPassword, newPassword },
      });
      onUserUpdated?.(data.user, data.token);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setPwMsg({ type: "success", text: "Password changed! Other active sessions have been signed out." });
      onToast?.("Password changed successfully", "success");
    } catch (err) {
      setPwMsg({ type: "error", text: err.message });
    } finally {
      setPwSaving(false);
    }
  };

  const renderTransactions = () => (
    <>
      <div className="account-stats">
        <div className="account-stat-card">
          <span>Payments made</span>
          <strong>{purchases.length}</strong>
        </div>
        <div className="account-stat-card">
          <span>NFTs owned</span>
          <strong>{purchases.length}</strong>
        </div>
        <div className="account-stat-card">
          <span>Wallet balance</span>
          <strong>{Number(user.walletBalance ?? 100).toFixed(3)} ETH</strong>
        </div>
      </div>

      <section className="account-panel">
        <h3>Transaction History</h3>
        {loading ? (
          <p className="page-sub account-empty">Loading transactions...</p>
        ) : error ? (
          <p className="form-msg error">{error}</p>
        ) : payments.length === 0 ? (
          <p className="page-sub account-empty">You haven’t made any payments yet.</p>
        ) : (
          <div className="account-table-wrap">
            <table className="account-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Type</th>
                  <th>Item</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment._id}>
                    <td>TXN{String(payment._id).slice(-10).toUpperCase()}</td>
                    <td><span className="account-type-pill">{payment.method || "payment"}</span></td>
                    <td>{payment.nftName}</td>
                    <td className={payment.status === "completed" ? "account-amount" : ""}>
                      {payment.status === "completed" ? "−" : ""}
                      {Number(payment.amount).toFixed(4)} {payment.currency || "ETH"}
                    </td>
                    <td><span className={"status-badge " + payment.status}>{payment.status}</span></td>
                    <td>{payment.createdAt ? new Date(payment.createdAt).toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );

  const renderNftList = (items, emptyText, actionLabel, onAction) => (
    <section className="account-panel">
      <div className="account-panel-heading">
        <h3>{section === "creations" ? "My Creations" : "My NFTs"}</h3>
        {onAction && <button className="btn btn-primary" onClick={onAction}>{actionLabel}</button>}
      </div>
      {items.length === 0 ? (
        <p className="page-sub account-empty">{emptyText}</p>
      ) : (
        <div className="account-nft-list">
          {items.map((nft) => (
            <article className="account-nft-item" key={nft.id}>
              {nft.img && <img src={nft.img} alt={nft.name} />}
              <div><h4>{nft.name}</h4><p>{nft.category || "NFT"}</p></div>
              {nft.price && <strong>{nft.price} ETH</strong>}
            </article>
          ))}
        </div>
      )}
    </section>
  );

  const renderSection = () => {
    if (section === "transactions") return renderTransactions();
    if (section === "profile") {
      return (
        <div style={{ display: "grid", gap: 18 }}>
          <section className="account-panel">
            <h3>Profile Details</h3>
            <div className="info-row"><span className="label">Email</span><span className="value">{user.email}</span></div>
            <div className="info-row"><span className="label">Role</span><span className="role-pill">{user.role}</span></div>
            <div className="info-row">
              <span className="label">Total Spent</span>
              <span className="value">{totalSpent.toFixed(3)} ETH</span>
            </div>

            <form onSubmit={handleSaveProfile} style={{ marginTop: 18 }}>
              {profileMsg && <div className={"form-msg " + profileMsg.type}>{profileMsg.text}</div>}
              <div className="form-row-2">
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Username</label>
                  <input type="text" placeholder="username" value={profileUsername} onChange={(e) => setProfileUsername(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input type="tel" placeholder="+91 9876543210" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={profileSaving}>
                {profileSaving ? "Saving..." : "Update Profile"}
              </button>
            </form>
          </section>

          <section className="account-panel">
            <h3>Security &amp; Password</h3>
            <form onSubmit={handleChangePassword}>
              {pwMsg && <div className={"form-msg " + pwMsg.type}>{pwMsg.text}</div>}
              <div className="form-group">
                <label>Current Password</label>
                <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              </div>
              <div className="form-row-2">
                <div className="form-group">
                  <label>New Password</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} />
                </div>
              </div>
              <button type="submit" className="btn btn-outline" disabled={pwSaving}>
                {pwSaving ? "Updating..." : "Change Password"}
              </button>
            </form>
          </section>
        </div>
      );
    }
    if (section === "payment") {
      return (
        <section className="account-panel">
          <h3>Payment</h3>
          <p className="page-sub account-empty">
            Pay securely using Razorpay (UPI, debit or credit cards) or use the demo checkout.
          </p>
          <button className="btn btn-primary" onClick={onOpenPayment}>Open Payment</button>
        </section>
      );
    }
    if (section === "nfts") {
      const purchasedNfts = purchases.map((payment) => {
        const nft = allNfts.find((item) => String(item.id) === String(payment.nftId));
        return {
          id: payment._id,
          name: payment.nftName,
          img: nft?.img,
          price: String(payment.amount),
        };
      });
      return renderNftList(purchasedNfts, "NFTs you purchase will appear here.");
    }
    return renderNftList(creations, "NFTs you create will appear here.", "Create NFT", onCreate);
  };

  return (
    <div className="account-page">
      <aside className="account-sidebar">
        <div className="account-user">
          <div className="account-avatar">{user.name.charAt(0).toUpperCase()}</div>
          <h2>{user.name}</h2>
          <p>{user.username ? `@${user.username}` : user.email}</p>
        </div>
        <nav aria-label="Account sections">
          {ACCOUNT_SECTIONS.map((item) => (
            <button
              key={item.id}
              className={section === item.id ? "active" : ""}
              onClick={() => setSection(item.id)}
            >
              <span aria-hidden="true">{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="account-content">
        <h1 className="page-title">My Account</h1>
        <p className="page-sub">Manage your profile, security, payments and NFTs</p>
        {renderSection()}
      </main>
    </div>
  );
}

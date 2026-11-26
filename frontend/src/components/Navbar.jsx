import { useState } from "react";

export default function Navbar({
  user,
  wallet,
  goHome,
  goLogin,
  goRegister,
  goAccount,
  goPayment,
  goPurchaseHistory,
  goAdminDashboard,
  onOpenWallet,
  onLogout,
}) {
  const [open, setOpen] = useState(false);
  const isAdmin = user && user.role === "admin";

  const handleNavClick = (hash) => {
    setOpen(false);
    goHome();
    if (hash) {
      setTimeout(() => {
        const el = document.querySelector(hash);
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 0);
    }
  };

  return (
    <nav className="navbar">
      <div className="logo" onClick={goHome} style={{ cursor: "pointer" }}>NFT Bazar</div>
      <ul className={"nav-links" + (open ? " open" : "")}>
        <li><a onClick={() => handleNavClick(null)}>Home</a></li>
        <li><a onClick={() => handleNavClick("#explore")}>Explore</a></li>
        <li><a onClick={() => handleNavClick("#about")}>About</a></li>
        {user && !isAdmin && <li><a onClick={() => { setOpen(false); goPayment(); }}>Payment</a></li>}
        {user && !isAdmin && <li><a onClick={() => { setOpen(false); goPurchaseHistory(); }}>Purchase History</a></li>}
        {user && !isAdmin && <li><a onClick={() => { setOpen(false); goAccount(); }}>My Account</a></li>}
        {isAdmin && <li><a onClick={() => { setOpen(false); goAdminDashboard(); }}>Admin Dashboard</a></li>}
      </ul>

      <div className="nav-btns">
        {!user && (
          <>
            <button className="btn btn-outline" onClick={goLogin}>Login</button>
            <button className="btn btn-primary" onClick={goRegister}>Register</button>
          </>
        )}

        {user && !isAdmin && (
          <>
            <button className="wallet-chip" onClick={onOpenWallet}>
              {wallet && wallet.address
                ? "🟢 " + wallet.address.slice(0, 6) + "…" + wallet.address.slice(-4)
                : "Connect Wallet"}
            </button>
            <div className="avatar-badge" title={user.name} onClick={goAccount}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <button className="btn btn-outline" onClick={onLogout}>Logout</button>
          </>
        )}

        {isAdmin && (
          <>
            <button className="btn btn-primary" style={{ padding: "8px 16px", fontSize: 13 }} onClick={goAdminDashboard}>
              Admin Panel
            </button>
            <button className="btn btn-outline" onClick={onLogout}>Logout</button>
          </>
        )}
      </div>

      <button className="menu-toggle" onClick={() => setOpen(!open)}>☰</button>
    </nav>
  );
}

import { useCallback, useEffect, useState } from "react";
import { apiRequest, setAuthFailureHandler } from "./api.js";
import { nftData, categories } from "./data/nftData.js";

import Navbar from "./components/Navbar.jsx";
import Hero from "./components/Hero.jsx";
import NFTCard from "./components/NFTCard.jsx";
import WalletModal from "./components/WalletModal.jsx";
import LoginPage from "./components/LoginPage.jsx";
import RegisterPage from "./components/RegisterPage.jsx";
import AccountPage from "./components/AccountPage.jsx";
import PaymentPage from "./components/PaymentPage.jsx";
import PurchaseHistoryPage from "./components/PurchaseHistoryPage.jsx";
import AdminDashboard from "./components/AdminDashboard.jsx";
import CreateNFTPage from "./components/CreateNFTPage.jsx";

const PATH_TO_PAGE = {
  "/": { page: "home", adminLogin: false },
  "/login": { page: "login", adminLogin: false },
  "/admin/login": { page: "login", adminLogin: true },
  "/register": { page: "register", adminLogin: false },
  "/account": { page: "account", adminLogin: false },
  "/payment": { page: "payment", adminLogin: false },
  "/history": { page: "history", adminLogin: false },
  "/create": { page: "create", adminLogin: false },
  "/admin": { page: "admin-dashboard", adminLogin: false },
};

const PAGE_TO_PATH = {
  home: "/",
  login: "/login",
  register: "/register",
  account: "/account",
  payment: "/payment",
  history: "/history",
  create: "/create",
  "admin-dashboard": "/admin",
};

function resolveInitialRoute() {
  const cleanPath = window.location.pathname.replace(/\/+$/, "") || "/";
  return PATH_TO_PAGE[cleanPath] || { page: "home", adminLogin: false };
}

export default function App() {
  const initial = resolveInitialRoute();

  const [page, setPage] = useState(initial.page);
  const [isAdminLogin, setIsAdminLogin] = useState(initial.adminLogin);
  const [authNotice, setAuthNotice] = useState(null);
  const [intendedPage, setIntendedPage] = useState(null);

  const [activeCategory, setActiveCategory] = useState("All");
  const [likedIds, setLikedIds] = useState([]);
  const [createdNfts, setCreatedNfts] = useState([]);

  const [token, setToken] = useState(() => localStorage.getItem("nftbazar_token") || null);
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [buyTarget, setBuyTarget] = useState(null);
  const [successfulPurchase, setSuccessfulPurchase] = useState(null);
  const [successfulCreation, setSuccessfulCreation] = useState(null);
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((text, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-3), { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  const navigate = useCallback((nextPage, { adminLogin = false, replace = false } = {}) => {
    setPage(nextPage);
    setIsAdminLogin(adminLogin);
    const targetPath = nextPage === "login" && adminLogin ? "/admin/login" : (PAGE_TO_PATH[nextPage] || "/");
    if (window.location.pathname !== targetPath) {
      if (replace) {
        window.history.replaceState({}, "", targetPath);
      } else {
        window.history.pushState({}, "", targetPath);
      }
    }
    window.scrollTo(0, 0);
  }, []);

  const fetchNfts = useCallback(() => {
    apiRequest("/nft")
      .then((data) => {
        const mapped = data.nfts.map((n) => ({
          id: n._id,
          name: n.name,
          creator: n.creator,
          category: n.category,
          price: String(n.price),
          img: n.image,
        }));
        setCreatedNfts(mapped);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchNfts();
  }, [fetchNfts]);

  useEffect(() => {
    setAuthFailureHandler((reason) => {
      localStorage.removeItem("nftbazar_token");
      setToken(null);
      setUser(null);
      setWallet(null);
      setAuthNotice(reason);
      addToast(reason, "error");
      navigate("login", { adminLogin: false, replace: true });
    });
    return () => setAuthFailureHandler(null);
  }, [addToast, navigate]);

  useEffect(() => {
    const onPopState = () => {
      const r = resolveInitialRoute();
      setPage(r.page);
      setIsAdminLogin(r.adminLogin);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!token) {
      setCheckingSession(false);
      return;
    }
    apiRequest("/user/me", { token, skipAuthRedirect: true })
      .then((data) => {
        setUser(data.user);
        setWallet(data.user.wallet || null);
      })
      .catch((err) => {
        localStorage.removeItem("nftbazar_token");
        setToken(null);
        setAuthNotice(err.message || "Session expired, please log in again.");
      })
      .finally(() => setCheckingSession(false));
  }, []);

  // Route guard enforcement once session check finishes
  useEffect(() => {
    if (checkingSession) return;
    const protectedPages = ["account", "payment", "history", "create"];

    if (page === "admin-dashboard") {
      if (!user) {
        setIntendedPage("admin-dashboard");
        setAuthNotice("Please sign in as an administrator to access the Admin Dashboard.");
        navigate("login", { adminLogin: true, replace: true });
      } else if (user.role !== "admin") {
        addToast("Admin access required.", "error");
        navigate("home", { replace: true });
      }
      return;
    }

    if (protectedPages.includes(page) && !user) {
      setIntendedPage(page);
      setAuthNotice("Please log in to continue.");
      navigate("login", { adminLogin: false, replace: true });
    }
  }, [checkingSession, page, user, navigate, addToast]);

  const goHome = () => { setAuthNotice(null); navigate("home"); };
  const goLogin = () => { setAuthNotice(null); navigate("login", { adminLogin: false }); };
  const goAdminLogin = () => { setAuthNotice(null); navigate("login", { adminLogin: true }); };
  const goRegister = () => { setAuthNotice(null); navigate("register"); };
  const goAccount = () => {
    if (!user) { setIntendedPage("account"); setAuthNotice("Please log in to view your account."); navigate("login"); return; }
    navigate("account");
  };
  const goPayment = (nft = null) => {
    setBuyTarget(nft);
    if (!user) { setIntendedPage("payment"); setAuthNotice("Please log in to complete payment."); navigate("login"); return; }
    navigate("payment");
  };
  const showPurchaseHistory = () => {
    setSuccessfulPurchase(null);
    if (!user) { setIntendedPage("history"); setAuthNotice("Please log in to view purchase history."); navigate("login"); return; }
    navigate("history");
  };
  const showCreatedNftHistory = () => {
    setSuccessfulCreation(null);
    navigate("history");
  };
  const goAdminDashboard = () => {
    if (!user) { setIntendedPage("admin-dashboard"); navigate("login", { adminLogin: true }); return; }
    if (user.role !== "admin") { addToast("Admin access required.", "error"); return; }
    navigate("admin-dashboard");
  };
  const goCreate = () => {
    if (!user) { setIntendedPage("create"); setAuthNotice("Please log in to mint an NFT."); navigate("login"); return; }
    navigate("create");
  };

  const handlePaymentSuccess = (payment, nft) => {
    setSuccessfulPurchase({
      name: payment.nftName || nft.name,
      image: nft.img,
      amount: payment.amount ?? nft.price,
      currency: payment.currency || "ETH",
      fiatAmount: payment.fiatAmount,
      fiatCurrency: payment.fiatCurrency,
    });
    goHome();
  };

  const handleAuthed = (newToken, newUser) => {
    localStorage.setItem("nftbazar_token", newToken);
    setToken(newToken);
    setUser(newUser);
    setWallet(newUser.wallet || null);
    setAuthNotice(null);
    addToast(`Welcome back, ${newUser.name}!`, "success");

    if (newUser.role === "admin") {
      setIntendedPage(null);
      navigate("admin-dashboard", { replace: true });
      return;
    }

    const next = intendedPage && intendedPage !== "admin-dashboard" ? intendedPage : null;
    setIntendedPage(null);

    if (!newUser.wallet) {
      setShowWalletModal(true);
    } else if (next) {
      navigate(next, { replace: true });
    } else {
      navigate("home", { replace: true });
    }
  };

  const handleUserUpdated = (updatedUser, maybeNewToken) => {
    setUser(updatedUser);
    if (maybeNewToken) {
      localStorage.setItem("nftbazar_token", maybeNewToken);
      setToken(maybeNewToken);
    }
  };

  const handleWalletConnected = (newWallet) => {
    setWallet(newWallet);
    setShowWalletModal(false);
    addToast(`${newWallet.provider} wallet connected`, "success");
    goHome();
  };

  const handleLogout = async () => {
    const activeToken = token;
    localStorage.removeItem("nftbazar_token");
    setToken(null);
    setUser(null);
    setWallet(null);
    setIntendedPage(null);
    if (activeToken) {
      apiRequest("/auth/logout", { method: "POST", token: activeToken, skipAuthRedirect: true }).catch(() => {});
    }
    addToast("Signed out successfully", "info");
    navigate("home", { replace: true });
  };

  const handleBuy = (nft) => {
    if (!user) {
      setBuyTarget(nft);
      setIntendedPage("payment");
      setAuthNotice("Please log in to purchase this NFT.");
      navigate("login");
      return;
    }
    goPayment(nft);
  };

  const handleNftCreated = (newNft) => {
    const mappedNft = {
      id: newNft._id,
      name: newNft.name,
      creator: newNft.creator,
      category: newNft.category,
      price: String(newNft.price),
      img: newNft.image,
    };
    setCreatedNfts((prev) => [mappedNft, ...prev]);
    setSuccessfulCreation(mappedNft);
  };

  const toggleLike = (id) => {
    setLikedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const allNFTs = [...createdNfts, ...nftData];

  const filteredNFTs = activeCategory === "All"
    ? allNFTs
    : allNFTs.filter((n) => n.category === activeCategory);

  if (checkingSession) {
    return (
      <div className="session-loader">
        <div className="session-spinner" />
        <p>Verifying session...</p>
      </div>
    );
  }

  const isAdminDashboardView = page === "admin-dashboard" && user && user.role === "admin";

  return (
    <div>
      {!isAdminDashboardView && (
        <Navbar
          user={user}
          wallet={wallet}
          goHome={goHome}
          goLogin={goLogin}
          goRegister={goRegister}
          goAccount={goAccount}
          goPayment={goPayment}
          goPurchaseHistory={showPurchaseHistory}
          goAdminDashboard={goAdminDashboard}
          onOpenWallet={() => setShowWalletModal(true)}
          onLogout={handleLogout}
        />
      )}

      {page === "login" && (
        <LoginPage
          onAuthed={handleAuthed}
          goRegister={goRegister}
          isAdmin={isAdminLogin}
          authNotice={authNotice}
          onToggleAdmin={() => (isAdminLogin ? goLogin() : goAdminLogin())}
        />
      )}
      {page === "register" && <RegisterPage onAuthed={handleAuthed} goLogin={goLogin} />}
      {page === "account" && user && (
        <AccountPage
          user={user}
          token={token}
          allNfts={allNFTs}
          onOpenPayment={() => goPayment()}
          onCreate={goCreate}
          onUserUpdated={handleUserUpdated}
          onToast={addToast}
        />
      )}
      {page === "payment" && user && (
        <PaymentPage
          token={token}
          wallet={wallet}
          selectedNft={buyTarget}
          onOpenWallet={() => setShowWalletModal(true)}
          onPaymentSuccess={handlePaymentSuccess}
          onGoHome={goHome}
        />
      )}
      {page === "history" && user && (
        <PurchaseHistoryPage token={token} user={user} createdNfts={createdNfts} />
      )}
      {isAdminDashboardView && (
        <AdminDashboard
          token={token}
          currentUser={user}
          catalogCount={nftData.length}
          onNftsChanged={fetchNfts}
          onGoHome={goHome}
          onLogout={handleLogout}
          onToast={addToast}
        />
      )}
      {page === "create" && user && (
        <CreateNFTPage
          token={token}
          wallet={wallet}
          onCreated={handleNftCreated}
          onOpenWallet={() => setShowWalletModal(true)}
        />
      )}

      {page === "home" && (
        <>
          <Hero onCreateClick={goCreate} />

          <div className="filters" id="explore">
            {categories.map((cat) => (
              <button
                key={cat}
                className={"filter-btn" + (cat === activeCategory ? " active" : "")}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <h2 className="section-title">Trending NFTs</h2>

          <div className="grid">
            {filteredNFTs.length > 0 ? (
              filteredNFTs.map((nft) => (
                <NFTCard
                  key={nft.id}
                  nft={nft}
                  liked={likedIds.includes(nft.id)}
                  onToggleLike={toggleLike}
                  onBuy={handleBuy}
                />
              ))
            ) : (
              <p className="empty">There are no NFTs in this category yet.</p>
            )}
          </div>
        </>
      )}

      {showWalletModal && (
        <WalletModal
          token={token}
          onClose={() => { setShowWalletModal(false); goHome(); }}
          onConnected={handleWalletConnected}
        />
      )}

      {successfulPurchase && (
        <div className="purchase-success-overlay">
          <section
            className="purchase-success-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="purchase-success-title"
          >
            <div className="purchase-success-icon" aria-hidden="true">✓</div>
            <h2 id="purchase-success-title">Payment Successful!</h2>
            <p className="purchase-success-sub">Your payment was successful. This NFT is now yours.</p>
            <div className="purchase-success-item">
              <img src={successfulPurchase.image} alt={successfulPurchase.name} />
              <div>
                <h3>{successfulPurchase.name}</h3>
                <p>Price: {successfulPurchase.amount} {successfulPurchase.currency}</p>
                {successfulPurchase.fiatAmount != null && (
                  <p>Paid: ₹{Number(successfulPurchase.fiatAmount).toFixed(2)} {successfulPurchase.fiatCurrency}</p>
                )}
              </div>
            </div>
            <div className="purchase-success-actions">
              <button className="btn btn-outline" onClick={() => setSuccessfulPurchase(null)}>Done</button>
              <button className="btn btn-primary" onClick={showPurchaseHistory}>Show NFT</button>
            </div>
          </section>
        </div>
      )}

      {successfulCreation && (
        <div className="purchase-success-overlay">
          <section
            className="purchase-success-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="creation-success-title"
          >
            <div className="purchase-success-icon" aria-hidden="true">✓</div>
            <h2 id="creation-success-title">NFT created successfully!</h2>
            <p className="purchase-success-sub">Your NFT is now live on the marketplace.</p>
            <div className="purchase-success-item">
              <img src={successfulCreation.img} alt={successfulCreation.name} />
              <div><h3>{successfulCreation.name}</h3></div>
            </div>
            <div className="purchase-success-actions creation-success-actions">
              <button className="btn btn-primary" onClick={showCreatedNftHistory}>Show my NFT</button>
              <button className="btn btn-outline" onClick={() => setSuccessfulCreation(null)}>Close</button>
            </div>
          </section>
        </div>
      )}

      {!isAdminDashboardView && (
        <footer id="about">
          <p>© 2026 NFT Bazar — College Project | Made with React, Node.js &amp; MongoDB</p>
          {user && (
            <p style={{ marginTop: 10, display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <a onClick={goAccount} style={{ cursor: "pointer" }}>My Account</a>
              <a onClick={goPayment} style={{ cursor: "pointer" }}>Payment</a>
              <a onClick={showPurchaseHistory} style={{ cursor: "pointer" }}>Purchase History</a>
              <a onClick={() => setShowWalletModal(true)} style={{ cursor: "pointer" }}>Wallet</a>
              {user.role === "admin" && (
                <a onClick={goAdminDashboard} style={{ cursor: "pointer" }}>Admin Dashboard</a>
              )}
            </p>
          )}
        </footer>
      )}

      {toasts.length > 0 && (
        <div className="toast-stack" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={`toast-item toast-${t.type}`}>
              <span className="toast-dot" />
              <span>{t.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

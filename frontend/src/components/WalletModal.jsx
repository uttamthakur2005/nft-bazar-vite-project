import { useState } from "react";
import { apiRequest } from "../api.js";
import { WALLET_PROVIDERS } from "../data/nftData.js";

export default function WalletModal({ token, onClose, onConnected }) {
  const [connecting, setConnecting] = useState(null);
  const [status, setStatus] = useState(null);

  const connectWallet = async (provider) => {
    setConnecting(provider);
    setStatus(null);
    try {
      let address;

      if (provider === "MetaMask" && window.ethereum) {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        address = accounts[0];
      } else {
      
        address = "0x" + Array.from({ length: 40 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
      }

      const data = await apiRequest("/wallet/connect", {
        method: "POST",
        token,
        body: { address, provider },
      });

      setStatus({ type: "success", text: `${provider} connected successfully!` });
      setTimeout(() => onConnected(data.wallet), 900);
    } catch (err) {
      setStatus({ type: "error", text: err.message });
    } finally {
      setConnecting(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <div className="modal-head">
          <h3>Connect a Wallet</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {status && <div className={"modal-status " + status.type}>{status.text}</div>}

        <div className="wallet-grid">
          {WALLET_PROVIDERS.map((w) => (
            <button
              key={w.name}
              className="wallet-option"
              disabled={connecting !== null}
              onClick={() => connectWallet(w.name)}
            >
              <div className="wallet-icon" style={{ background: w.color }}>
                {connecting === w.name ? "…" : w.icon}
              </div>
              <span>{w.name}</span>
            </button>
          ))}
        </div>

        <p className="modal-info-title">What is a Wallet?</p>
        <p className="modal-info-text">
          A wallet is used to send, receive, store, and display digital assets.
          It's also a new way to log in, without needing to create new accounts
          and passwords on every website.
        </p>

        <div className="modal-actions">
          <button onClick={() => window.open("https://ethereum.org/en/wallets/find-wallet/", "_blank")}>
            Get a Wallet
          </button>
          <button onClick={() => window.open("https://ethereum.org/en/wallets/", "_blank")}>
            Learn More
          </button>
        </div>

        <p className="modal-disclaimer">
          By connecting my wallet, I agree to the Terms of Service and acknowledge the Privacy Policy.
        </p>
      </div>
    </div>
  );
}

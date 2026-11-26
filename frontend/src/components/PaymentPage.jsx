import { useState } from "react";
import { apiRequest } from "../api.js";
import RazorpayButton from "./RazorpayButton.jsx";

export default function PaymentPage({ token, wallet, selectedNft, onOpenWallet, onPaymentSuccess, onGoHome }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleMockCheckout = async () => {
    if (!selectedNft) return;
    if (!wallet || !wallet.address) {
      setMsg({ type: "error", text: "Connect a wallet before making a purchase." });
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const data = await apiRequest("/payment/checkout", {
        method: "POST",
        token,
        body: {
          nftId: String(selectedNft.id),
          nftName: selectedNft.name,
          amount: parseFloat(selectedNft.price),
          currency: "ETH",
        },
      });
      onPaymentSuccess(data.payment, selectedNft);
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleRazorpaySuccess = (payment) => onPaymentSuccess(payment, selectedNft);

  const handleRazorpayError = (message) => {
    setMsg({ type: "error", text: message });
  };

  return (
    <div className="page-wrap">
      <h2 className="page-title">Payment</h2>
      <p className="page-sub">Complete checkout for your selected NFT</p>

      {!selectedNft ? (
        <div className="info-card">
          <p className="page-sub" style={{ margin: "0 0 16px" }}>Select an NFT from the home page to start checkout.</p>
          <button className="btn btn-primary" onClick={onGoHome}>Browse NFTs</button>
        </div>
      ) : (
        <>
          {!wallet?.address && (
            <div className="form-msg error" style={{ marginBottom: 20 }}>
              Wallet not connected. <a style={{ color: "inherit", textDecoration: "underline", cursor: "pointer" }} onClick={onOpenWallet}>Connect now</a>
            </div>
          )}

          {msg && <div className={"form-msg " + msg.type} style={{ marginBottom: 20 }}>{msg.text}</div>}

          <div className="info-card">
            <div className="checkout-item selected">
              <img src={selectedNft.img} alt={selectedNft.name} />
              <div className="meta">
                <h4>{selectedNft.name}</h4>
                <p>by {selectedNft.creator}</p>
              </div>
              <div className="price">{selectedNft.price} ETH</div>
            </div>

            {wallet?.address && (
              <>
                <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 16, marginBottom: 4 }}>
                  Pay securely with Razorpay (UPI, debit/credit cards and other methods)
                </p>
                <RazorpayButton
                  nft={selectedNft}
                  token={token}
                  onSuccess={handleRazorpaySuccess}
                  onError={handleRazorpayError}
                />
              </>
            )}

            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 18, marginBottom: 4 }}>
              Or use instant demo checkout (no real payment)
            </p>
            <button className="btn btn-outline auth-submit" onClick={handleMockCheckout} disabled={loading}>
              {loading ? "Processing..." : `Mock Pay ${selectedNft.price} ETH for ${selectedNft.name}`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

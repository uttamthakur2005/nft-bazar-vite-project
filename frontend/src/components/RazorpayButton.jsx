import { useState } from "react";
import { apiRequest } from "../api.js";

let razorpayScriptPromise;
function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve(true);
  if (razorpayScriptPromise) return razorpayScriptPromise;
  razorpayScriptPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
  return razorpayScriptPromise;
}

export default function RazorpayButton({ nft, token, onSuccess, onError }) {
  const [loading, setLoading] = useState(false);

  const startPayment = async () => {
    if (loading) return;
    setLoading(true);
    let restoreColorScheme = () => {};
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Razorpay checkout could not load. Check your internet connection and try again.");

      const order = await apiRequest("/payment/razorpay/create-order", {
        method: "POST",
        token,
        body: { nftId: String(nft.id), nftName: nft.name, amount: Number(nft.price) },
      });

      const previousColorScheme = document.documentElement.style.colorScheme;
      restoreColorScheme = () => {
        document.documentElement.style.colorScheme = previousColorScheme;
      };
      document.documentElement.style.colorScheme = "light";

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "NFT Bazar",
        description: `Purchase: ${nft.name}`,
        order_id: order.orderId,
        image: "/favicon.ico",
        theme: { color: "#7c5cff" },
        prefill: {},
        notes: { nftId: String(nft.id), nftName: nft.name },
        handler: async (response) => {
          try {
            const result = await apiRequest("/payment/razorpay/verify-payment", {
              method: "POST",
              token,
              body: {
                ...response,
                nftId: String(nft.id),
                nftName: nft.name,
                amount: Number(nft.price),
              },
            });
            onSuccess(result.payment);
          } catch (err) {
            onError(`Payment was submitted, but verification failed: ${err.message}. Please contact support with payment ID ${response.razorpay_payment_id}.`);
          } finally {
            restoreColorScheme();
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            restoreColorScheme();
            setLoading(false);
          },
        },
      });
      checkout.on("payment.failed", (response) => {
        restoreColorScheme();
        setLoading(false);
        onError(response.error?.description || "Razorpay payment failed. Please try again.");
      });
      checkout.open();
    } catch (err) {
      restoreColorScheme();
      setLoading(false);
      onError(err.message || "Unable to start Razorpay checkout.");
    }
  };

  return (
    <button className="btn auth-submit" onClick={startPayment} disabled={loading} style={{ marginTop: 10 }}>
      {loading ? "Opening secure checkout…" : "Pay securely with Razorpay · UPI / Cards"}
    </button>
  );
}

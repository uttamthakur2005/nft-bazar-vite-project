const crypto = require("crypto");

const getCredentials = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env");
  }
  return { keyId, keySecret };
};

async function createOrder(amountPaise, receipt) {
  const { keyId, keySecret } = getCredentials();
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt: String(receipt).slice(0, 40) }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const description = data?.error?.description || "Razorpay could not create the order";
    throw new Error(description);
  }
  return data;
}

function verifyPaymentSignature(orderId, paymentId, signature) {
  const { keySecret } = getCredentials();
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(String(signature || ""), "hex");
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}

module.exports = { createOrder, verifyPaymentSignature };

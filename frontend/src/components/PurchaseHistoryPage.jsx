import { useEffect, useState } from "react";
import { apiRequest } from "../api.js";

export default function PurchaseHistoryPage({ token, user, createdNfts }) {
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest("/payment/history", { token })
      .then((data) => setHistory(data.payments))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const myCreations = createdNfts.filter(
    (nft) =>
      nft.creator === user.name ||
      (user.username && nft.creator === `@${user.username}`)
  );

  return (
    <div className="page-wrap">
      <h2 className="page-title">Purchase History</h2>
      <p className="page-sub">View the NFTs you have purchased</p>

      {myCreations.length > 0 && (
        <section className="info-card">
          <h3 className="history-section-title">Your Creations</h3>
          <div className="history-creations">
            {myCreations.map((nft) => (
              <article className="history-creation-item" key={nft.id}>
                <img src={nft.img} alt={nft.name} />
                <div><h4>{nft.name}</h4><p>{nft.price} ETH</p></div>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="info-card">
        {loading ? (
          <p className="page-sub" style={{ margin: 0 }}>Loading...</p>
        ) : error ? (
          <p className="form-msg error" style={{ margin: 0 }}>{error}</p>
        ) : history.length === 0 ? (
          <p className="page-sub" style={{ margin: 0 }}>You haven't made any purchases yet.</p>
        ) : (
          history.map((payment) => (
            <div className="history-item" key={payment._id}>
              <span>
                {payment.nftName}
                {payment.method === "razorpay" && (
                  <span style={{ marginLeft: 8, fontSize: 10, color: "var(--purple)" }}>Razorpay</span>
                )}
              </span>
              <span>{payment.amount} {payment.currency}</span>
              <span className={"status-badge " + payment.status}>{payment.status}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";

export default function NFTCard({ nft, liked, onToggleLike, onBuy }) {
  const cardRef = useRef(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const card = cardRef.current;
    if (!card || !("IntersectionObserver" in window)) {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(card);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={cardRef} className={"card" + (revealed ? " revealed" : "")}>
      <img src={nft.img} alt={nft.name} />
      <div className="card-body">
        <div className="card-top">
          <span className="category-tag">{nft.category}</span>
          <button
            className={"like" + (liked ? " liked" : "")}
            onClick={() => onToggleLike(nft.id)}
          >
            {liked ? "♥" : "♡"} {liked ? "Liked" : "Like"}
          </button>
        </div>
        <h4>{nft.name}</h4>
        <p className="creator">by {nft.creator}</p>
        <div className="card-footer">
          <div>
            <div className="price-label">Price</div>
            <div className="price-value">{nft.price} ETH</div>
          </div>
          <button className="buy-btn" onClick={() => onBuy(nft)}>Buy Now</button>
        </div>
      </div>
    </div>
  );
}

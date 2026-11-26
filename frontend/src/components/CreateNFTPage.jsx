import { useRef, useState } from "react";
import { apiRequest } from "../api.js";
import { categories, nftData } from "../data/nftData.js";

const NFT_CATEGORIES = categories.filter((c) => c !== "All");

export default function CreateNFTPage({ token, wallet, onCreated, onOpenWallet }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(NFT_CATEGORIES[0]);
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("");
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showImageChoice, setShowImageChoice] = useState(false);
  const imageInputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!wallet || !wallet.address) {
      setMsg({ type: "error", text: "Connect a wallet before creating an NFT." });
      return;
    }
    if (!name.trim() || !price) {
      setMsg({ type: "error", text: "Name and price are required." });
      return;
    }
    if (parseFloat(price) <= 0) {
      setMsg({ type: "error", text: "Price must be greater than 0." });
      return;
    }

    if (!image.trim()) {
      setShowImageChoice(true);
      return;
    }

    await createNft(image.trim());
  };

  const createNft = async (imageUrl) => {
    setLoading(true);
    setMsg(null);
    try {
      const data = await apiRequest("/nft", {
        method: "POST",
        token,
        body: {
          name: name.trim(),
          category,
          price: parseFloat(price),
          image: imageUrl,
        },
      });
      onCreated(data.nft);
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const useRandomImage = () => {
    const randomNft = nftData[Math.floor(Math.random() * nftData.length)];
    setImage(randomNft.img);
    setShowImageChoice(false);
    createNft(randomNft.img);
  };

  const addImage = () => {
    setShowImageChoice(false);
    requestAnimationFrame(() => imageInputRef.current?.focus());
  };

  return (
    <section className="auth-section">
      <div className="auth-card">
        <h2>Create NFT</h2>
        <p className="auth-sub">Mint a new NFT and list it on the marketplace</p>

        {!wallet?.address && (
          <div className="form-msg error">
            You need a connected wallet to create an NFT.{" "}
            <a style={{ color: "inherit", textDecoration: "underline", cursor: "pointer" }} onClick={onOpenWallet}>
              Connect now
            </a>
          </div>
        )}

        {msg && <div className={"form-msg " + msg.type}>{msg.text}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>NFT Name</label>
            <input
              type="text"
              placeholder="e.g. Cosmic Dreamer #1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--text)",
                fontSize: 14,
              }}
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
              min="0"
              placeholder="e.g. 1.5"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Image URL (optional)</label>
            <input
              ref={imageInputRef}
              type="text"
              placeholder="Add an image URL or leave blank for a random image"
              value={image}
              onChange={(e) => setImage(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? "Creating..." : "Create NFT"}
          </button>
        </form>
      </div>

      {showImageChoice && (
        <div className="purchase-success-overlay">
          <section
            className="purchase-success-card image-choice-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="image-choice-title"
          >
            <h2 id="image-choice-title">No image added</h2>
            <p className="purchase-success-sub">
              You haven’t added an image. Would you like us to choose a random image for your NFT?
            </p>
            <div className="purchase-success-actions">
              <button className="btn btn-primary" onClick={useRandomImage} disabled={loading}>
                Use Random Image
              </button>
              <button className="btn btn-outline" onClick={addImage} disabled={loading}>
                Add Image
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

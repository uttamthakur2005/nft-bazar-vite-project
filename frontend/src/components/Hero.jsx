export default function Hero({ onCreateClick }) {
  return (
    <section className="hero" id="home">
      <div className="hero-content">
        <span className="hero-eyebrow">A new world of digital ownership</span>
        <h1>Discover, Collect & Sell <span>Extraordinary NFTs</span></h1>
        <p>India's own NFT marketplace — digital art, music, and gaming NFTs all in one place, at the best price.</p>
        <div className="hero-btns">
          <button
            className="btn btn-primary"
            onClick={() => document.querySelector("#explore").scrollIntoView({ behavior: "smooth" })}
          >
            Explore NFTs
          </button>
          <button className="btn btn-outline" onClick={onCreateClick}>Create NFT</button>
        </div>
        <div className="stats">
          <div className="stat"><h3>12K+</h3><p>Artworks</p></div>
          <div className="stat"><h3>4.5K+</h3><p>Creators</p></div>
          <div className="stat"><h3>9K+</h3><p>Collectors</p></div>
        </div>
      </div>
    </section>
  );
}

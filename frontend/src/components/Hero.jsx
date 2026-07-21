function Hero() {
  return (
    <section className="hero">
      <div className="heroContent">
        <p className="eyebrow">AI-POWERED HOME DESIGN</p>

        <h1>
          Design a home built around
          <span> your life.</span>
        </h1>

        <p className="heroText">
          Describe your dream home using text or voice. ZYNORA studies your
          family, land, climate, lifestyle, and budget to create intelligent
          home-design concepts.
        </p>

        <div className="heroActions">
          <button className="primaryButton">Create Your Home</button>
          <button className="secondaryButton">Explore ZYNORA</button>
        </div>
      </div>

      <div className="heroVisual">
        <div className="designCard">
          <div className="cardTop">
            <span>Design Concept</span>
            <span className="status">AI Generated</span>
          </div>

          <div className="housePreview">⌂</div>

          <div className="designDetails">
            <p>Modern sustainable family home</p>
            <span>Climate-aware • Accessible • Personalized</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
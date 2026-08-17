function Footer() {
  return (
    <footer id="about">
      <div className="footerContainer">
        <div className="footerBrand">
          <h2>ZYNORA</h2>

          <p>
            Design Smarter. Build Better.
            <br />
            AI-powered architecture platform for the future.
          </p>
        </div>

        <div className="footerColumn">
          <h3>Products</h3>

          <a href="#">AI House Designer</a>
          <a href="#">Plan Visualizer</a>
          <a href="#">Interior Studio</a>
        </div>

        <div className="footerColumn">
          <h3>Company</h3>

          <a href="#">About</a>
          <a href="#">Roadmap</a>
          <a href="#">Contact</a>
        </div>

        <div className="footerColumn">
          <h3>Resources</h3>

          <a href="#">Documentation</a>
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
        </div>
      </div>

      <div className="footerBottom">
        © 2026 Zynora. All rights reserved.
      </div>
    </footer>
  );
}

export default Footer;
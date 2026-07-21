function Navbar() {
  return (
    <nav className="navbar">
      <div className="brand">ZYNORA</div>

      <div className="navLinks">
        <a href="#features">Features</a>
        <a href="#how-it-works">How It Works</a>
        <a href="#about">About</a>
      </div>

      <button className="navButton">Start Designing</button>
    </nav>
  );
}

export default Navbar;
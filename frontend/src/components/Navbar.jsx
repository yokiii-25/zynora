import { useEffect, useState } from "react";
import { checkBackendHealth } from "../services/api";

function Navbar() {
  const [backendStatus, setBackendStatus] = useState("Checking...");

  useEffect(() => {
    async function verifyBackend() {
      try {
        const data = await checkBackendHealth();

        if (data.status === "healthy") {
          setBackendStatus("AI System Online");
        }
      } catch (error) {
        console.error(error);
        setBackendStatus("Backend Offline");
      }
    }

    verifyBackend();
  }, []);

  return (
    <nav className="navbar">
      <div className="brand">ZYNORA</div>

      <div className="navLinks">
        <a href="#features">Features</a>
        <a href="#how-it-works">How It Works</a>
        <a href="#about">About</a>
      </div>

      <div className="navbarActions">
        <span className="systemStatus">{backendStatus}</span>
        <button className="navButton">Start Designing</button>
      </div>
    </nav>
  );
}

export default Navbar;
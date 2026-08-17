import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { checkBackendHealth } from "../../services/api";

function Navbar() {
  const navigate = useNavigate();

  const [backendStatus, setBackendStatus] = useState("Checking...");
  const [statusType, setStatusType] = useState("checking");

  useEffect(() => {
    async function verifyBackend() {
      try {
        const data = await checkBackendHealth();

        if (data.status === "healthy") {
          setBackendStatus("AI System Online");
          setStatusType("online");
        } else {
          setBackendStatus("Backend Offline");
          setStatusType("offline");
        }
      } catch (error) {
        console.error("Backend health check failed:", error);
        setBackendStatus("Backend Offline");
        setStatusType("offline");
      }
    }

    verifyBackend();
  }, []);

  return (
    <nav className="navbar">
      <Link className="brand" to="/">
        ZYNORA
      </Link>

      <div className="navLinks">
        <a href="#products">Products</a>
        <a href="#features">Features</a>
        <a href="#how-it-works">How It Works</a>
        <a href="#about">About</a>
      </div>

      <div className="navbarActions">
        <span className={`systemStatus ${statusType}`}>
          {backendStatus}
        </span>

        <button
          className="navButton"
          type="button"
          onClick={() => navigate("/create-project")}
        >
          Start Designing
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
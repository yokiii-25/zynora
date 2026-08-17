import { useNavigate } from "react-router-dom";

function Hero() {
  const navigate = useNavigate();

  return (
    <section className="heroSection">
      <div className="heroContent">
        <div className="heroLeft">
          <span className="heroBadge">
            ✨ AI Powered Architecture Platform
          </span>

          <h1>
            Design Smarter.
            <br />
            Build Better.
          </h1>

          <p>
            Zynora helps you generate intelligent floor plans, visualize homes
            in 3D, design stunning interiors, and plan construction—all from
            one AI-powered platform.
          </p>

          <div className="heroButtons">
            <button
              className="primaryBtn"
              type="button"
              onClick={() => navigate("/create-project")}
            >
              🚀 Start Designing
            </button>

            <button
              className="secondaryBtn"
              type="button"
              onClick={() => navigate("/upload-plan")}
            >
              📐 Upload Existing Plan
            </button>
          </div>

          <div className="heroStats">
            <div>
              <h3>AI</h3>
              <p>Powered Design</p>
            </div>

            <div>
              <h3>3D</h3>
              <p>Visualization</p>
            </div>

            <div>
              <h3>∞</h3>
              <p>Design Possibilities</p>
            </div>
          </div>
        </div>

        <div className="heroRight">
          <div className="heroImageCard">
            <div className="housePlaceholder">🏠</div>

            <h3>Interactive 3D Home</h3>

            <p>Preview your dream home before construction begins.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
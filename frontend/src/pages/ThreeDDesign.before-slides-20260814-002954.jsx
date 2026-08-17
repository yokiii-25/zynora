import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import ExteriorSlidesPanel from "../components/ExteriorSlides/ExteriorSlidesPanel";
import House3DViewerV2 from "../components/viewerV2/House3DViewerV2";

function readSavedJson(key) {
  const value = window.localStorage.getItem(key);
  if (!value) return null;
  try { return JSON.parse(value); } catch { return null; }
}

function getSavedDesign() {
  for (const key of ["zynoraUploadedFloorPlan", "zynoraFloorPlan", "generatedFloorPlan", "floorPlan", "design", "designData"]) {
    const value = readSavedJson(key);
    if (value) return value;
  }
  return null;
}

export default function ThreeDDesign() {
  const location = useLocation();
  const navigate = useNavigate();
  const [canvasElement, setCanvasElement] = useState(null);
  const [floorPlan, setFloorPlan] = useState(null);
  const [captureView, setCaptureView] = useState("front");
  const [resetKey, setResetKey] = useState(0);

  const routeDesign = location.state?.floorPlan ?? location.state?.design ?? location.state?.designData ?? null;
  const designData = routeDesign ?? getSavedDesign();

  function changeView(view) {
    setCaptureView(view);
    setResetKey((value) => value + 1);
  }

  return (
    <main className="threeDDesignPage">
      <div className="threeDDesignContainer">
        <header className="threeDDesignHeader">
          <div>
            <p className="threeDStatusEyebrow">ZYNORA EXTERIOR DESIGN</p>
            <h1>Exterior presentation slides</h1>
            <p className="threeDDesignDescription">Generate five coordinated architectural views from the same validated floor plan, façade style and material palette.</p>
          </div>
          <button className="threeDSecondaryButton" type="button" onClick={() => navigate("/upload-plan")}>Upload another plan</button>
        </header>

        {designData ? (
          <>
            <div aria-hidden="true" style={{ position: "fixed", left: "-10000px", top: 0, width: "1280px", height: "720px", pointerEvents: "none", opacity: 0 }}>
              <House3DViewerV2
                design={designData}
                showFurniture={false}
                captureMode
                interactive={false}
                captureView={captureView}
                resetKey={resetKey}
                onCanvasReady={setCanvasElement}
                onFloorPlanReady={setFloorPlan}
              />
            </div>

            <ExteriorSlidesPanel
              canvasElement={canvasElement}
              geometryValidation={floorPlan?.validation}
              onViewChange={changeView}
              onCaptureModeChange={() => {}}
            />
          </>
        ) : (
          <div className="threeDStatusCard">
            <h1>No floor plan found</h1>
            <p>Upload an SVG, PDF, JPG or PNG plan, or generate a plan from your project details first.</p>
            <button className="threeDPrimaryButton" type="button" onClick={() => navigate("/upload-plan")}>Upload floor plan</button>
          </div>
        )}
      </div>
    </main>
  );
}

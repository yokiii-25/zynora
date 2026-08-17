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
  for (const key of ["zynoraUploadedFloorPlan", "zynoraFloorPlan", "zynoraGeneratedFloorPlan", "generatedFloorPlan", "floorPlan", "design", "designData"]) {
    const value = readSavedJson(key);
    if (value) return value;
  }
  return null;
}

export default function ThreeDDesign() {
  const location = useLocation();
  const navigate = useNavigate();
  const [floorPlan, setFloorPlan] = useState(null);

  const routeDesign = location.state?.floorPlan ?? location.state?.design ?? location.state?.designData ?? null;
  const designData = routeDesign ?? getSavedDesign();
  const svgContent =
    location.state?.svgContent ??
    window.localStorage.getItem("zynoraUploadedSvgContent") ??
    "";
  const classification =
    location.state?.classification ??
    readSavedJson("zynoraRoomClassification");
  const hasDesignSource = Boolean(designData || svgContent);

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

        {hasDesignSource ? (
          <>
            <div aria-hidden="true" style={{ position: "fixed", left: "-10000px", top: 0, width: "1280px", height: "720px", pointerEvents: "none", opacity: 0 }}>
              <House3DViewerV2
                design={designData}
                svgContent={svgContent || undefined}
                classification={classification}
                showFurniture={false}
                captureMode
                interactive={false}
                onFloorPlanReady={setFloorPlan}
              />
            </div>

            <ExteriorSlidesPanel
              floorPlanJson={floorPlan?.floorPlanJSON}
              geometryValidation={floorPlan?.validation}
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

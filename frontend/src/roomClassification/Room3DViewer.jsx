import { useEffect, useMemo, useState } from "react";

import House3DViewerV2 from "../components/viewerV2/House3DViewerV2";
import RealisticRenderPanel from "./RealisticRenderPanel";

function readStoredJson(key) {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(key);

  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored);
  } catch (error) {
    console.error(`Invalid ${key} value:`, error);
    return null;
  }
}

export default function Room3DViewer({
  onClose,
  svgContent: svgContentProp,
  classification: classificationProp,
}) {
  const [viewMode, setViewMode] = useState("perspective");
  const [canvasElement, setCanvasElement] = useState(null);
  const [captureMode, setCaptureMode] = useState(false);
  const [exteriorMode, setExteriorMode] = useState(false);
  const [floorPlan, setFloorPlan] = useState(null);
  const [selectedFloorId, setSelectedFloorId] = useState("all");
  const [resetViewKey, setResetViewKey] = useState(0);
  const svgContent = useMemo(
    () =>
      svgContentProp ??
      (typeof window !== "undefined"
        ? window.localStorage.getItem("zynoraUploadedSvgContent")
        : ""),
    [svgContentProp],
  );
  const classification = useMemo(
    () => classificationProp ?? readStoredJson("zynoraRoomClassification"),
    [classificationProp],
  );

  useEffect(() => {
    const body = document.body;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      body.style.overflow = previousOverflow;

      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    const floors = floorPlan?.floors ?? [];

    if (
      selectedFloorId !== "all" &&
      !floors.some(
        (floor) => String(floor.floorId) === String(selectedFloorId),
      )
    ) {
      setSelectedFloorId("all");
    }
  }, [floorPlan, selectedFloorId]);

  function downloadFloorPlanJson() {
    if (!floorPlan?.floorPlanJSON) {
      return;
    }

    const blob = new Blob(
      [JSON.stringify(floorPlan.floorPlanJSON, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "zynora-floorplan-v1.json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="ZYNORA dynamic 3D floor plan"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "grid",
        placeItems: "center",
        padding: "clamp(12px, 3vw, 36px)",
        background: "rgba(12, 20, 28, 0.72)",
        backdropFilter: "blur(8px)",
      }}
    >
      <section
        style={{
          width: "min(1180px, 100%)",
          height: "min(850px, 92vh)",
          minHeight: "480px",
          display: "grid",
          gridTemplateRows: "auto minmax(0, 1fr)",
          overflow: "hidden",
          borderRadius: "22px",
          background: "#ffffff",
          boxShadow: "0 28px 90px rgba(0, 0, 0, 0.32)",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "18px",
            padding: "16px 20px",
            borderBottom: "1px solid #e5eaf0",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: "#1b8268",
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "0.14em",
              }}
            >
              ZYNORA DYNAMIC 3D
            </p>
            <h2 style={{ margin: "4px 0 0", fontSize: "20px" }}>
              Complete house 3D plan
            </h2>
            <p
              style={{ margin: "4px 0 0", color: "#647080", fontSize: "13px" }}
            >
              All visible rooms are rendered together
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
            <button
              type="button"
              onClick={downloadFloorPlanJson}
              disabled={!floorPlan?.floorPlanJSON}
              style={{
                padding: "9px 12px",
                border: "1px solid #cfe0da",
                borderRadius: "10px",
                background: "#f1f8f5",
                color: "#176a57",
                fontSize: "12px",
                fontWeight: 800,
                cursor: floorPlan?.floorPlanJSON ? "pointer" : "not-allowed",
              }}
            >
              Download FloorPlanJSON
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close 3D viewer"
              style={{
                width: "42px",
                height: "42px",
                border: "1px solid #dce3e9",
                borderRadius: "12px",
                background: "#f7f9fb",
                color: "#26313c",
                fontSize: "24px",
                lineHeight: 1,
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </div>
        </header>

        <div style={{ position: "relative", minHeight: 0 }}>
          <House3DViewerV2
            svgContent={svgContent}
            classification={classification}
            viewMode={viewMode}
            showFurniture={!exteriorMode && !captureMode}
            captureMode={exteriorMode || captureMode}
            interactive
            selectedFloorId={selectedFloorId}
            resetKey={resetViewKey}
            onCanvasReady={setCanvasElement}
            onFloorPlanReady={setFloorPlan}
          />

          <div
            style={{
              position: "absolute",
              top: "14px",
              left: "14px",
              display: "flex",
              gap: "6px",
              padding: "5px",
              border: "1px solid rgba(205, 214, 222, 0.9)",
              borderRadius: "11px",
              background: "rgba(255, 255, 255, 0.9)",
              boxShadow: "0 8px 24px rgba(25, 38, 50, 0.12)",
            }}
          >
            {[
              ["perspective", "3D view"],
              ["top", "Top view"],
            ].map(([mode, label]) => {
              const active = viewMode === mode;

              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  aria-pressed={active}
                  style={{
                    padding: "7px 10px",
                    border: 0,
                    borderRadius: "8px",
                    background: active ? "#1b8268" : "transparent",
                    color: active ? "#ffffff" : "#4b5662",
                    fontSize: "12px",
                    fontWeight: 750,
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => {
                setExteriorMode((current) => !current);
                setViewMode("perspective");
              }}
              aria-pressed={exteriorMode}
              style={{
                padding: "7px 10px",
                border: 0,
                borderRadius: "8px",
                background: exteriorMode ? "#7a4c22" : "transparent",
                color: exteriorMode ? "#ffffff" : "#4b5662",
                fontSize: "12px",
                fontWeight: 750,
                cursor: "pointer",
              }}
            >
              Interactive exterior
            </button>

            <button
              type="button"
              onClick={() => {
                setExteriorMode(true);
                setViewMode("perspective");
                setSelectedFloorId("all");
                setResetViewKey((current) => current + 1);
              }}
              style={{
                padding: "7px 10px",
                border: 0,
                borderRadius: "8px",
                background: "transparent",
                color: "#4b5662",
                fontSize: "12px",
                fontWeight: 750,
                cursor: "pointer",
              }}
            >
              Reset exterior view
            </button>

            {(floorPlan?.floors?.length ?? 0) > 1 && (
              <select
                aria-label="Visible floor"
                value={selectedFloorId}
                onChange={(event) => setSelectedFloorId(event.target.value)}
                style={{
                  padding: "7px 9px",
                  border: "1px solid #d3dde3",
                  borderRadius: "8px",
                  background: "#ffffff",
                  color: "#3c4954",
                  fontSize: "12px",
                  fontWeight: 750,
                }}
              >
                <option value="all">All floors · stacked</option>
                {floorPlan.floors.map((floor, index) => (
                  <option key={floor.floorId} value={floor.floorId}>
                    {`Floor ${index + 1} · ${floor.floorId}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          <RealisticRenderPanel
            canvasElement={canvasElement}
            viewMode={viewMode}
            onCaptureModeChange={setCaptureMode}
            geometryValidation={floorPlan?.validation}
          />

          {floorPlan?.validation && (
            <div
              role="status"
              style={{
                position: "absolute",
                left: "14px",
                bottom: "14px",
                maxWidth: "min(430px, calc(100% - 210px))",
                padding: "8px 11px",
                border: `1px solid ${
                  floorPlan.validation.valid ? "#b9dbcf" : "#e0b8b8"
                }`,
                borderRadius: "9px",
                background: floorPlan.validation.valid
                  ? "rgba(239, 249, 245, 0.92)"
                  : "rgba(255, 241, 241, 0.94)",
                color: floorPlan.validation.valid ? "#276555" : "#8b3636",
                fontSize: "11px",
                fontWeight: 750,
                pointerEvents: "none",
              }}
            >
              {floorPlan.validation.valid ? "Geometry valid" : "Geometry issue"}
              {` · ${floorPlan.validation.stats.floors ?? 1} floor(s)`}
              {` · ${floorPlan.stats?.exteriorWalls ?? 0} exterior walls`}
              {` · ${floorPlan.validation.stats.classifiedRooms}/${
                floorPlan.validation.stats.rooms
              } V5 rooms linked`}
              {!floorPlan.validation.valid && floorPlan.validation.errors[0]
                ? ` · ${floorPlan.validation.errors[0]}`
                : ""}
            </div>
          )}

          <div
            style={{
              position: "absolute",
              right: "14px",
              bottom: "14px",
              padding: "8px 11px",
              borderRadius: "9px",
              background: "rgba(255, 255, 255, 0.84)",
              color: "#4b5662",
              fontSize: "12px",
              pointerEvents: "none",
            }}
          >
            Drag to rotate · Scroll to zoom
          </div>
        </div>
      </section>
    </div>
  );
}

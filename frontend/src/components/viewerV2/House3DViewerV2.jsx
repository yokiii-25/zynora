import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import AutoCamera from "./AutoCamera";
import SceneContent from "./SceneContent";
import { normalizeFloorPlan } from "./utils/normalizeFloorPlan";
import { parseFloorPlanSvg } from "./utils/svgFloorPlanParser";

export default function House3DViewerV2({
  design,
  room,
  floorPlan: floorPlanInput,
  svgContent,
  classification,
  showFurniture = true,
  captureMode = false,
  interactive = true,
  viewMode = "perspective",
  selectedFloorId = "all",
  captureView = "hero",
  exteriorStyle = "warm-modern",
  resetKey = 0,
  onCanvasReady,
  onFloorPlanReady,
}) {
  const controlsRef = useRef(null);
  const result = useMemo(() => {
    try {
      const source = svgContent
        ? parseFloorPlanSvg(svgContent, {
            classification,
          })
        : (room ?? floorPlanInput ?? design ?? {});

      return {
        floorPlan: normalizeFloorPlan(source),
        error: "",
      };
    } catch (error) {
      return {
        floorPlan: null,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create the 3D floor plan.",
      };
    }
  }, [classification, design, floorPlanInput, room, svgContent]);
  const floorPlan = result.floorPlan;

  useEffect(() => {
    onFloorPlanReady?.(floorPlan);
  }, [floorPlan, onFloorPlanReady]);

  if (!floorPlan) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          minHeight: "360px",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          color: "#8b2d2d",
          background: "#f7f3f1",
          textAlign: "center",
        }}
      >
        <div>
          <strong>Unable to generate the 3D plan</strong>
          <p style={{ margin: "8px 0 0" }}>{result.error}</p>
        </div>
      </div>
    );
  }

  const selectedFloor = Array.isArray(floorPlan.floors)
    ? floorPlan.floors.find(
        (floor) => String(floor.floorId) === String(selectedFloorId),
      )
    : null;
  const controlsBounds = captureMode
    ? (floorPlan.captureBounds ?? floorPlan.bounds)
    : (selectedFloor?.bounds ?? floorPlan.bounds);
  const controlsBaseElevation = captureMode
    ? 0
    : Number(selectedFloor?.elevation) || 0;
  const controlsHeight = captureMode
    ? floorPlan.height
    : (selectedFloor?.height ?? floorPlan.height);
  const topView = !captureMode && viewMode === "top";
  const targetHeight = topView
    ? controlsBaseElevation
    : captureMode
      ? Math.max(floorPlan.height * 0.44, 1.15)
      : controlsBaseElevation + Math.min(controlsHeight * 0.28, 0.9);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{
        position: [10, 9, 10],
        fov: 46,
      }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
        preserveDrawingBuffer: true,
      }}
      onCreated={({ gl }) => {
        onCanvasReady?.(gl.domElement);
      }}
      style={{
        width: "100%",
        height: "100%",
        touchAction: "none",
        cursor: interactive ? "grab" : "default",
      }}
    >
      <Suspense fallback={null}>
        <SceneContent
          floorPlan={floorPlan}
          showFurniture={showFurniture}
          captureMode={captureMode}
          selectedFloorId={selectedFloorId}
        />
      </Suspense>

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enabled={interactive}
        enableRotate={interactive}
        enableZoom={interactive}
        enablePan={interactive}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.8}
        zoomSpeed={0.9}
        panSpeed={0.8}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        }}
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_PAN,
        }}
        target={[
          controlsBounds.centerX,
          targetHeight,
          controlsBounds.centerZ,
        ]}
        minPolarAngle={topView ? 0 : 0.12}
        maxPolarAngle={Math.PI / 2 - 0.025}
      />

      <AutoCamera
        floorPlan={floorPlan}
        controlsRef={controlsRef}
        viewMode={viewMode}
        captureMode={captureMode}
        selectedFloorId={selectedFloorId}
        captureView={captureView}
        exteriorStyle={exteriorStyle}
        resetKey={resetKey}
      />
    </Canvas>
  );
}

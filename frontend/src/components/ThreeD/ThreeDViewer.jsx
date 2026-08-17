import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";

import SceneContent from "./viewer/SceneContent";
import { getScene } from "../utils/normalizeScene";

function LoadingModel() {
  return (
    <mesh position={[0, 1, 0]}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial
        color="#10b981"
        transparent
        opacity={0.45}
      />
    </mesh>
  );
}

export default function ThreeDViewer({ floorPlan }) {
  const sceneData = useMemo(
    () => getScene(floorPlan),
    [floorPlan]
  );

  return (
    <div
      className="w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900"
      style={{
        height: "calc(100vh - 220px)",
        minHeight: "600px",
      }}
    >
      <Canvas
        shadows
        camera={{
          fov: 50,
          near: 0.1,
          far: 2000,
        }}
        gl={{
          antialias: true,
        }}
      >
        <color attach="background" args={["#dbeafe"]} />

        <Suspense fallback={<LoadingModel />}>
          <SceneContent sceneData={sceneData} />
          <Environment preset="apartment" />
        </Suspense>

        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          minDistance={4}
          maxDistance={100}
          maxPolarAngle={Math.PI / 2.05}
          enablePan
          enableZoom
          enableRotate
        />
      </Canvas>
    </div>
  );
}
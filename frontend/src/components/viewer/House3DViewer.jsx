import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

import SceneContent from "./SceneContent";
import { getScene } from "../../utils/normalizeScene";

export default function House3DViewer({ design }) {
  const sceneData = getScene(design);

  return (
    <Canvas
      shadows
      camera={{
        fov: 50,
        near: 0.1,
        far: 1000,
      }}
      gl={{
        antialias: true,
      }}
    >
      <Suspense fallback={null}>
        <SceneContent sceneData={sceneData} />
      </Suspense>

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={4}
        maxDistance={80}
        maxPolarAngle={Math.PI / 2.05}
      />
    </Canvas>
  );
}
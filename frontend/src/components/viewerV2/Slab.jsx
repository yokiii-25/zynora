import { Edges } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

function createShape(outline) {
  const shape = new THREE.Shape();

  if (!Array.isArray(outline) || outline.length < 3) {
    return shape;
  }

  shape.moveTo(outline[0].x, -outline[0].z);

  for (let index = 1; index < outline.length; index += 1) {
    shape.lineTo(outline[index].x, -outline[index].z);
  }

  shape.closePath();
  return shape;
}

export default function Slab({
  outline,
  elevation = -0.16,
  thickness = 0.18,
  color = "#c8c3ba",
  edgeColor = "#9f9a91",
  showEdges = true,
}) {
  const shape = useMemo(() => createShape(outline), [outline]);

  if (!Array.isArray(outline) || outline.length < 3) {
    return null;
  }

  return (
    <mesh
      position={[0, elevation, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      castShadow
      receiveShadow
    >
      <extrudeGeometry
        args={[
          shape,
          {
            depth: Math.max(thickness, 0.04),
            bevelEnabled: false,
            curveSegments: 1,
            steps: 1,
          },
        ]}
      />
      <meshStandardMaterial
        color={color}
        roughness={0.9}
        metalness={0}
        side={THREE.DoubleSide}
      />
      {showEdges && <Edges threshold={14} color={edgeColor} />}
    </mesh>
  );
}

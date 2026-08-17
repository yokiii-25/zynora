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

export default function SvgFixture({ fixture }) {
  const shape = useMemo(
    () => createShape(fixture?.outline),
    [fixture?.outline]
  );
  const height = Math.max(Number(fixture?.height) || 0.1, 0.025);
  const elevation = Math.max(Number(fixture?.elevation) || 0, 0);

  if (!Array.isArray(fixture?.outline) || fixture.outline.length < 3) {
    return null;
  }

  return (
    <mesh
      position={[0, elevation + 0.025, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      castShadow
      receiveShadow
    >
      <extrudeGeometry
        args={[
          shape,
          {
            depth: height,
            bevelEnabled: false,
            curveSegments: 1,
            steps: 1,
          },
        ]}
      />

      <meshStandardMaterial
        color={fixture.color ?? "#c9c2b5"}
        roughness={0.76}
        metalness={0}
      />

      <Edges threshold={12} color="#8f969b" />
    </mesh>
  );
}

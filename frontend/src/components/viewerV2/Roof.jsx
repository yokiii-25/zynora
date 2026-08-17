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

function Parapet({
  start,
  end,
  elevation,
  roofThickness,
  height,
  thickness,
  color,
  capColor,
}) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.hypot(dx, dz);

  if (!Number.isFinite(length) || length < 0.04) {
    return null;
  }

  const angle = -Math.atan2(dz, dx);
  const centerX = (start.x + end.x) / 2;
  const centerZ = (start.z + end.z) / 2;

  return (
    <group>
      <mesh
        position={[
          centerX,
          elevation + roofThickness + height / 2,
          centerZ,
        ]}
        rotation={[0, angle, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[length + thickness, height, thickness]} />
        <meshStandardMaterial color={color} roughness={0.82} />
      </mesh>
      <mesh
        position={[
          centerX,
          elevation + roofThickness + height + 0.025,
          centerZ,
        ]}
        rotation={[0, angle, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[length + thickness * 1.2, 0.055, thickness * 1.35]}
        />
        <meshStandardMaterial color={capColor} roughness={0.7} />
      </mesh>
    </group>
  );
}

export default function Roof({ roof, style = {} }) {
  const outline = roof?.outline ?? [];
  const elevation = Number(roof?.elevation) || 2.8;
  const thickness = Math.max(Number(roof?.thickness) || 0.22, 0.06);
  const parapetHeight = Math.max(
    Number(roof?.parapetHeight) || 0.35,
    0,
  );
  const shape = useMemo(() => createShape(outline), [outline]);

  if (!Array.isArray(outline) || outline.length < 3) {
    return null;
  }

  return (
    <group>
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
              depth: thickness,
              bevelEnabled: false,
              curveSegments: 1,
              steps: 1,
            },
          ]}
        />
        <meshStandardMaterial
          color={style.roof ?? "#ded8ce"}
          roughness={0.88}
          metalness={0}
          side={THREE.DoubleSide}
        />
        <Edges threshold={18} color={style.concrete ?? "#aaa49a"} />
      </mesh>

      {parapetHeight > 0 &&
        outline.map((start, index) => (
          <Parapet
            key={`parapet-${index}`}
            start={start}
            end={outline[(index + 1) % outline.length]}
            elevation={elevation}
            roofThickness={thickness}
            height={parapetHeight}
            thickness={0.12}
            color={style.wallSecondary ?? "#d9d3c9"}
            capColor={style.roofCap ?? "#eee9df"}
          />
        ))}
    </group>
  );
}

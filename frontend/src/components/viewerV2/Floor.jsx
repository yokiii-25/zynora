import { Edges } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

export default function Floor({
  outline,
  color = "#ddd7c9",
  selected = false,
}) {
  const shape = useMemo(() => {
    const nextShape = new THREE.Shape();

    if (!Array.isArray(outline) || outline.length < 3) {
      return nextShape;
    }

    nextShape.moveTo(outline[0].x, -outline[0].z);

    for (let index = 1; index < outline.length; index += 1) {
      nextShape.lineTo(outline[index].x, -outline[index].z);
    }

    nextShape.closePath();
    return nextShape;
  }, [outline]);

  if (!Array.isArray(outline) || outline.length < 3) {
    return null;
  }

  return (
    <mesh
      position={[0, selected ? 0.028 : 0.015, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <shapeGeometry args={[shape]} />

      <meshStandardMaterial
        color={color}
        roughness={0.94}
        metalness={0}
        side={THREE.DoubleSide}
        polygonOffset
        polygonOffsetFactor={1}
        polygonOffsetUnits={1}
      />

      <Edges
        threshold={8}
        color={selected ? "#bc8611" : "#b4a996"}
      />
    </mesh>
  );
}

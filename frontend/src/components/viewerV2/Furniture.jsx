import { useMemo } from "react";

import {
  findInteriorPoint,
  longestEdgeRotation,
} from "./utils/polygonMath";

function Box({
  position,
  size,
  color,
  roughness = 0.72,
  metalness = 0,
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
      />
    </mesh>
  );
}

function Plant({ position = [0, 0, 0] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.16, 0.42, 18]} />
        <meshStandardMaterial color="#b8784c" roughness={0.86} />
      </mesh>
      <mesh position={[0, 0.62, 0]} castShadow>
        <sphereGeometry args={[0.36, 18, 14]} />
        <meshStandardMaterial color="#5c8660" roughness={0.9} />
      </mesh>
    </group>
  );
}

function BedroomFurniture() {
  return (
    <group>
      <Box
        position={[0, 0.13, 0.15]}
        size={[1.75, 0.26, 2.2]}
        color="#9a745a"
      />
      <Box
        position={[0, 0.34, 0.15]}
        size={[1.66, 0.2, 2.08]}
        color="#e9e5dc"
        roughness={0.96}
      />
      <Box
        position={[0, 0.82, -0.98]}
        size={[1.82, 1.4, 0.12]}
        color="#8b6750"
      />
      <Box
        position={[-0.43, 0.5, -0.55]}
        size={[0.56, 0.14, 0.38]}
        color="#f5f1e8"
        roughness={0.98}
      />
      <Box
        position={[0.43, 0.5, -0.55]}
        size={[0.56, 0.14, 0.38]}
        color="#f5f1e8"
        roughness={0.98}
      />
      <Box
        position={[-1.1, 0.25, -0.72]}
        size={[0.4, 0.5, 0.46]}
        color="#ae8668"
      />
      <Box
        position={[1.1, 0.25, -0.72]}
        size={[0.4, 0.5, 0.46]}
        color="#ae8668"
      />
      <Box
        position={[1.42, 0.95, 0.2]}
        size={[0.42, 1.9, 1.25]}
        color="#b39a7b"
      />
    </group>
  );
}

function KitchenFurniture() {
  return (
    <group>
      <Box
        position={[0, 0.45, -1.12]}
        size={[2.8, 0.9, 0.58]}
        color="#d7d1c8"
      />
      <Box
        position={[-1.12, 0.45, -0.1]}
        size={[0.58, 0.9, 1.5]}
        color="#d7d1c8"
      />
      <Box
        position={[0, 0.94, -1.12]}
        size={[2.9, 0.08, 0.66]}
        color="#6f7478"
        roughness={0.4}
      />
      <Box
        position={[-1.12, 0.94, -0.1]}
        size={[0.66, 0.08, 1.55]}
        color="#6f7478"
        roughness={0.4}
      />
      <Box
        position={[0.35, 0.48, 0.48]}
        size={[1.45, 0.88, 0.68]}
        color="#aa8060"
      />
      <Box
        position={[0.35, 0.96, 0.48]}
        size={[1.58, 0.09, 0.78]}
        color="#f0ece4"
        roughness={0.45}
      />
      <mesh
        position={[0.55, 1, -1.1]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <torusGeometry args={[0.19, 0.035, 10, 24]} />
        <meshStandardMaterial
          color="#8e969b"
          metalness={0.6}
          roughness={0.32}
        />
      </mesh>
    </group>
  );
}

function LivingFurniture() {
  return (
    <group>
      <Box
        position={[0, 0.28, 0.82]}
        size={[2.45, 0.45, 0.82]}
        color="#547083"
      />
      <Box
        position={[0, 0.72, 1.12]}
        size={[2.45, 0.72, 0.24]}
        color="#607f94"
      />
      <Box
        position={[-1.12, 0.57, 0.82]}
        size={[0.24, 0.58, 0.82]}
        color="#607f94"
      />
      <Box
        position={[1.12, 0.57, 0.82]}
        size={[0.24, 0.58, 0.82]}
        color="#607f94"
      />
      <Box
        position={[0, 0.26, -0.15]}
        size={[1.35, 0.12, 0.72]}
        color="#a77b59"
      />
      <Box
        position={[0, 0.38, -1.18]}
        size={[1.9, 0.55, 0.34]}
        color="#b59b82"
      />
      <Box
        position={[0, 1.0, -1.22]}
        size={[1.42, 0.82, 0.08]}
        color="#26323a"
        roughness={0.38}
      />
      <Plant position={[1.5, 0, -0.9]} />
    </group>
  );
}

function DiningFurniture() {
  const chairPositions = [
    [-0.92, 0, 0],
    [0.92, 0, 0],
    [0, 0, -0.78],
    [0, 0, 0.78],
  ];

  return (
    <group>
      <Box
        position={[0, 0.72, 0]}
        size={[1.65, 0.12, 1.05]}
        color="#9e704c"
      />
      {[
        [-0.68, 0.36, -0.38],
        [0.68, 0.36, -0.38],
        [-0.68, 0.36, 0.38],
        [0.68, 0.36, 0.38],
      ].map((position, index) => (
        <Box
          key={index}
          position={position}
          size={[0.1, 0.72, 0.1]}
          color="#805d43"
        />
      ))}
      {chairPositions.map((position, index) => (
        <group
          key={index}
          position={position}
          rotation={[0, index < 2 ? Math.PI / 2 : 0, 0]}
        >
          <Box
            position={[0, 0.43, 0]}
            size={[0.48, 0.1, 0.48]}
            color="#6e8090"
          />
          <Box
            position={[0, 0.82, 0.2]}
            size={[0.48, 0.7, 0.1]}
            color="#6e8090"
          />
        </group>
      ))}
    </group>
  );
}

function BathroomFurniture() {
  return (
    <group>
      <Box
        position={[-0.85, 0.42, -0.58]}
        size={[0.8, 0.84, 0.5]}
        color="#d5c8b5"
      />
      <Box
        position={[-0.85, 0.88, -0.58]}
        size={[0.86, 0.08, 0.56]}
        color="#f1efea"
        roughness={0.4}
      />
      <mesh position={[0.7, 0.25, 0.45]} castShadow>
        <cylinderGeometry args={[0.33, 0.28, 0.5, 24]} />
        <meshStandardMaterial color="#f4f4f0" roughness={0.32} />
      </mesh>
      <Box
        position={[0.7, 0.62, 0.67]}
        size={[0.58, 0.62, 0.16]}
        color="#f4f4f0"
        roughness={0.32}
      />
      <Box
        position={[0.72, 0.03, -0.65]}
        size={[1.05, 0.06, 0.82]}
        color="#c6dce3"
        roughness={0.2}
      />
      <mesh position={[0.72, 1.05, -1.02]}>
        <cylinderGeometry args={[0.16, 0.16, 0.04, 20]} />
        <meshStandardMaterial
          color="#aab3b8"
          metalness={0.6}
          roughness={0.28}
        />
      </mesh>
    </group>
  );
}

function OfficeFurniture() {
  return (
    <group>
      <Box
        position={[0, 0.72, -0.5]}
        size={[1.75, 0.12, 0.75]}
        color="#9f7959"
      />
      <Box
        position={[-0.72, 0.35, -0.5]}
        size={[0.1, 0.7, 0.1]}
        color="#6d5543"
      />
      <Box
        position={[0.72, 0.35, -0.5]}
        size={[0.1, 0.7, 0.1]}
        color="#6d5543"
      />
      <Box
        position={[0, 1.08, -0.56]}
        size={[0.82, 0.54, 0.06]}
        color="#27333b"
        roughness={0.38}
      />
      <Box
        position={[0, 0.38, 0.48]}
        size={[0.62, 0.12, 0.62]}
        color="#4f6777"
      />
      <Box
        position={[0, 0.78, 0.74]}
        size={[0.62, 0.72, 0.12]}
        color="#4f6777"
      />
      <Plant position={[1.12, 0, 0.62]} />
    </group>
  );
}

function GenericFurniture() {
  return (
    <group>
      <Box
        position={[0, 0.42, 0]}
        size={[1.35, 0.12, 0.78]}
        color="#a67c5b"
      />
      <Plant position={[1, 0, -0.45]} />
    </group>
  );
}

function FurnitureForType({ roomType }) {
  const type = roomType.toLowerCase();

  if (/outdoor|balcony|terrace|patio|hallway|corridor|closet|storage|technical/.test(type)) {
    return null;
  }

  if (/bed|master|guest/.test(type)) return <BedroomFurniture />;
  if (/kitchen|pantry/.test(type)) return <KitchenFurniture />;
  if (/living|lounge|family|hall/.test(type)) return <LivingFurniture />;
  if (/dining/.test(type)) return <DiningFurniture />;
  if (/bath|toilet|wash|wc/.test(type)) return <BathroomFurniture />;
  if (/office|study|work/.test(type)) return <OfficeFurniture />;
  return <GenericFurniture />;
}

export default function Furniture({ floorPlan }) {
  const placement = useMemo(() => {
    const anchor = findInteriorPoint(floorPlan.outline);
    const smallestSpan = Math.min(floorPlan.width, floorPlan.depth);
    const scale = Math.max(
      0.28,
      Math.min(
        1.2,
        anchor.clearance / 2.05,
        smallestSpan / 4.4
      )
    );

    return {
      anchor,
      rotation: longestEdgeRotation(floorPlan.outline),
      scale,
    };
  }, [floorPlan]);

  if (
    !Array.isArray(floorPlan.outline) ||
    floorPlan.outline.length < 3 ||
    placement.scale < 0.22
  ) {
    return null;
  }

  return (
    <group
      position={[placement.anchor.x, 0.035, placement.anchor.z]}
      rotation={[0, placement.rotation, 0]}
      scale={[
        placement.scale,
        placement.scale,
        placement.scale,
      ]}
    >
      <FurnitureForType roomType={floorPlan.roomType ?? "Room"} />
    </group>
  );
}

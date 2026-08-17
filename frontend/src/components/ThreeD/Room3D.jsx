function Room3D({ room, index }) {
  const x = toNumber(
    room?.x ?? room?.position?.x,
    0
  );

  const z = toNumber(
    room?.y ??
      room?.z ??
      room?.position?.y ??
      room?.position?.z,
    0
  );

  const width = toPositiveNumber(
    room?.width ??
      room?.dimensions?.width,
    1
  );

  const depth = toPositiveNumber(
    room?.height ??
      room?.depth ??
      room?.dimensions?.height ??
      room?.dimensions?.depth,
    1
  );

  const roomType = String(
    room?.type || ""
  ).toLowerCase();

  const floorThickness = 0.12;
  const floorColor = getFloorColor(
    roomType,
    index
  );

  return (
    <group position={[x, 0, z]}>
      <mesh
        receiveShadow
        position={[
          width / 2,
          floorThickness / 2,
          depth / 2,
        ]}
      >
        <boxGeometry
          args={[
            Math.max(width - 0.08, 0.1),
            floorThickness,
            Math.max(depth - 0.08, 0.1),
          ]}
        />

        <meshStandardMaterial
          color={floorColor}
          roughness={0.82}
          metalness={0}
        />
      </mesh>
    </group>
  );
}

function getFloorColor(roomType, index) {
  const colors = {
    living: "#d6c7ad",
    dining: "#ddcbb2",
    kitchen: "#cbd5e1",
    bedroom: "#d8c5b0",
    bathroom: "#b9d8dc",
    passage: "#d1d5db",
    hallway: "#d1d5db",
    balcony: "#c7d2b8",
  };

  if (colors[roomType]) {
    return colors[roomType];
  }

  const fallbackColors = [
    "#d6c7ad",
    "#d9cbb9",
    "#d1c4b0",
    "#ddd0bd",
  ];

  return fallbackColors[
    index % fallbackColors.length
  ];
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function toPositiveNumber(
  value,
  fallback = 1
) {
  const parsed = Number(value);

  return Number.isFinite(parsed) &&
    parsed > 0
    ? parsed
    : fallback;
}

export default Room3D;
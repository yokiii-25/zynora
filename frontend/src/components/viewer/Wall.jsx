function toNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function normalizeVector(
  value,
  fallback = { x: 0, y: 0, z: 0 }
) {
  if (Array.isArray(value)) {
    return [
      toNumber(value[0], fallback.x),
      toNumber(value[1], fallback.y),
      toNumber(value[2], fallback.z),
    ];
  }

  if (value && typeof value === "object") {
    return [
      toNumber(value.x, fallback.x),
      toNumber(value.y, fallback.y),
      toNumber(value.z, fallback.z),
    ];
  }

  return [
    fallback.x,
    fallback.y,
    fallback.z,
  ];
}

function getWallSize(wall) {
  const size = wall?.size ?? wall?.dimensions ?? {};

  const width = toNumber(
    size.width ?? wall?.width,
    1
  );

  const height = toNumber(
    size.height ?? wall?.height,
    3
  );

  const depth = toNumber(
    size.depth ??
      size.thickness ??
      wall?.depth ??
      wall?.thickness,
    0.15
  );

  if (
    width <= 0 ||
    height <= 0 ||
    depth <= 0
  ) {
    return null;
  }

  return [width, height, depth];
}

export default function Wall({ wall }) {
  if (!wall || typeof wall !== "object") {
    return null;
  }

  const position = normalizeVector(
    wall.position,
    {
      x: 0,
      y: 1.5,
      z: 0,
    }
  );

  const rotation = normalizeVector(
    wall.rotation,
    {
      x: 0,
      y: 0,
      z: 0,
    }
  );

  const size = getWallSize(wall);

  if (!size) {
    console.warn(
      "Skipped wall with invalid size:",
      wall
    );

    return null;
  }

  return (
    <mesh
      position={position}
      rotation={rotation}
      castShadow
      receiveShadow
    >
      <boxGeometry args={size} />

      <meshStandardMaterial
        color={
          wall.color ??
          wall.material?.color ??
          "#eeeae3"
        }
        roughness={0.82}
        metalness={0}
      />
    </mesh>
  );
}
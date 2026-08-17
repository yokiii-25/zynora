function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getVector(value, fallback = { x: 0, y: 0, z: 0 }) {
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

  return [fallback.x, fallback.y, fallback.z];
}

export default function Window({ windowItem }) {
  if (!windowItem) return null;

  const position = getVector(windowItem.position, {
    x: 0,
    y: 1.5,
    z: 0,
  });

  const rotation = getVector(windowItem.rotation);

  const size = windowItem.size ?? {};

  const width = toNumber(size.width ?? 1.4, 1.4);
  const height = toNumber(size.height ?? 1.2, 1.2);
  const depth = toNumber(size.depth ?? 0.06, 0.06);

  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color="#AEE6FF"
          transparent
          opacity={0.45}
        />
      </mesh>
    </group>
  );
}
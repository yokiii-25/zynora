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

export default function Door({ door }) {
  if (!door) return null;

  const position = getVector(door.position, {
    x: 0,
    y: 1,
    z: 0,
  });

  const rotation = getVector(door.rotation);

  const size = door.size ?? {};

  const width = toNumber(size.width ?? 1, 1);
  const height = toNumber(size.height ?? 2.2, 2.2);
  const depth = toNumber(size.depth ?? 0.08, 0.08);

  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color="#8B5A2B" />
      </mesh>

      <mesh position={[width / 2 - 0.08, 0, depth / 2 + 0.01]}>
        <sphereGeometry args={[0.04]} />
        <meshStandardMaterial color="gold" />
      </mesh>
    </group>
  );
}
import SvgFixture from "./SvgFixture";

function StairTread({ tread }) {
  const dx = tread.end.x - tread.start.x;
  const dz = tread.end.z - tread.start.z;
  const length = Math.hypot(dx, dz);

  if (!Number.isFinite(length) || length < 0.01) {
    return null;
  }

  return (
    <mesh
      position={[
        (tread.start.x + tread.end.x) / 2,
        0.14,
        (tread.start.z + tread.end.z) / 2,
      ]}
      rotation={[0, -Math.atan2(dz, dx), 0]}
      receiveShadow
    >
      <boxGeometry args={[length, 0.035, 0.035]} />
      <meshStandardMaterial color="#aaa59d" roughness={0.88} />
    </mesh>
  );
}

export default function Stairs({ stairs }) {
  const parts = Array.isArray(stairs?.parts) ? stairs.parts : [];
  const treads = Array.isArray(stairs?.treads) ? stairs.treads : [];

  if (!parts.length && !treads.length) {
    return null;
  }

  return (
    <group>
      {parts.map((part) => (
        <SvgFixture key={part.id} fixture={part} />
      ))}

      {treads.map((tread) => (
        <StairTread key={tread.id} tread={tread} />
      ))}
    </group>
  );
}

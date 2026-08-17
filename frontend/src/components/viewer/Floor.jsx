export default function Floor({
  center = { x: 0, z: 0 },
  width = 10,
  depth = 10,
}) {
  return (
    <group position={[center.x, 0, center.z]}>
      {/* Main floor */}
      <mesh
        position={[0, -0.06, 0]}
        receiveShadow
      >
        <boxGeometry args={[width, 0.12, depth]} />

        <meshStandardMaterial
          color="#c9955f"
          roughness={0.72}
          metalness={0}
        />
      </mesh>

      {/* Thin foundation base */}
      <mesh
        position={[0, -0.17, 0]}
        receiveShadow
      >
        <boxGeometry args={[width + 0.3, 0.1, depth + 0.3]} />

        <meshStandardMaterial
          color="#8b8176"
          roughness={0.9}
          metalness={0}
        />
      </mesh>
    </group>
  );
}
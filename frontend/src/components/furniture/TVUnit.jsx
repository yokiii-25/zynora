export default function TVUnit({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Cabinet */}
      <mesh
        position={[0, 0.3, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1.8, 0.5, 0.45]} />

        <meshStandardMaterial
          color="#6d4c41"
          roughness={0.6}
        />
      </mesh>

      {/* Cabinet top */}
      <mesh
        position={[0, 0.58, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1.95, 0.08, 0.52]} />

        <meshStandardMaterial
          color="#4b312a"
          roughness={0.5}
        />
      </mesh>

      {/* TV screen */}
      <mesh
        position={[0, 1.25, -0.15]}
        castShadow
      >
        <boxGeometry args={[1.4, 0.82, 0.07]} />

        <meshStandardMaterial
          color="#111417"
          metalness={0.25}
          roughness={0.2}
        />
      </mesh>

      {/* TV stand */}
      <mesh
        position={[0, 0.8, -0.12]}
        castShadow
      >
        <boxGeometry args={[0.12, 0.42, 0.1]} />

        <meshStandardMaterial
          color="#262a2d"
          metalness={0.4}
          roughness={0.3}
        />
      </mesh>

      <mesh
        position={[0, 0.62, -0.08]}
        castShadow
      >
        <boxGeometry args={[0.5, 0.06, 0.26]} />

        <meshStandardMaterial
          color="#262a2d"
          metalness={0.4}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}
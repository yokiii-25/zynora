export default function Wardrobe({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 1, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 2, 0.55]} />
        <meshStandardMaterial color="#8a6245" roughness={0.7} />
      </mesh>

      {/* Door split */}
      <mesh position={[0, 1, 0.286]}>
        <boxGeometry args={[0.035, 1.85, 0.015]} />
        <meshStandardMaterial color="#4f3424" roughness={0.6} />
      </mesh>

      {/* Handles */}
      <mesh position={[-0.12, 1, 0.32]} castShadow>
        <boxGeometry args={[0.035, 0.28, 0.035]} />
        <meshStandardMaterial
          color="#b9a27e"
          metalness={0.7}
          roughness={0.25}
        />
      </mesh>

      <mesh position={[0.12, 1, 0.32]} castShadow>
        <boxGeometry args={[0.035, 0.28, 0.035]} />
        <meshStandardMaterial
          color="#b9a27e"
          metalness={0.7}
          roughness={0.25}
        />
      </mesh>
    </group>
  );
}
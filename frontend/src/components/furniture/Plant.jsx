export default function Plant({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Pot */}
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.28, 0.22, 0.5, 20]} />
        <meshStandardMaterial color="#9b5b3b" roughness={0.8} />
      </mesh>

      {/* Stem */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.045, 0.9, 12]} />
        <meshStandardMaterial color="#4f6f3c" roughness={0.8} />
      </mesh>

      {/* Leaves */}
      {[
        [0.16, 1.05, 0],
        [-0.16, 0.95, 0.08],
        [0.06, 1.18, -0.1],
        [-0.08, 1.28, 0.04],
      ].map((leaf, index) => (
        <mesh
          key={index}
          position={leaf}
          rotation={[0.4, index * 0.8, 0.2]}
          castShadow
        >
          <sphereGeometry args={[0.22, 16, 12]} />
          <meshStandardMaterial color="#5f824c" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}
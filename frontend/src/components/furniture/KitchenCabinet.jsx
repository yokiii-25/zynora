export default function KitchenCabinet({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 2.4,
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Cabinet body */}
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 0.9, 0.62]} />
        <meshStandardMaterial color="#d9d2c7" roughness={0.8} />
      </mesh>

      {/* Countertop */}
      <mesh position={[0, 0.94, 0]} castShadow receiveShadow>
        <boxGeometry args={[width + 0.08, 0.08, 0.68]} />
        <meshStandardMaterial
          color="#454545"
          roughness={0.35}
          metalness={0.05}
        />
      </mesh>

      {/* Cabinet divisions */}
      {[-width / 4, 0, width / 4].map((x, index) => (
        <mesh key={index} position={[x, 0.45, 0.316]}>
          <boxGeometry args={[0.025, 0.78, 0.015]} />
          <meshStandardMaterial color="#aaa39a" roughness={0.75} />
        </mesh>
      ))}

      {/* Handles */}
      {[-width / 3, 0, width / 3].map((x, index) => (
        <mesh key={index} position={[x, 0.52, 0.34]} castShadow>
          <boxGeometry args={[0.18, 0.025, 0.025]} />
          <meshStandardMaterial
            color="#6d6d6d"
            metalness={0.7}
            roughness={0.25}
          />
        </mesh>
      ))}

      {/* Sink */}
      <mesh position={[width * 0.2, 0.995, 0]}>
        <boxGeometry args={[0.55, 0.035, 0.4]} />
        <meshStandardMaterial
          color="#b9b9b9"
          metalness={0.75}
          roughness={0.25}
        />
      </mesh>
    </group>
  );
}
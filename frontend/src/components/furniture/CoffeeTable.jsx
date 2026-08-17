export default function CoffeeTable({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh
        position={[0, 0.32, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1.1, 0.08, 0.7]} />

        <meshStandardMaterial
          color="#7c5634"
          roughness={0.55}
        />
      </mesh>

      {[
        [-0.45, 0.15, -0.25],
        [0.45, 0.15, -0.25],
        [-0.45, 0.15, 0.25],
        [0.45, 0.15, 0.25],
      ].map((leg, index) => (
        <mesh
          key={index}
          position={leg}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.05, 0.3, 0.05]} />

          <meshStandardMaterial
            color="#4e342e"
            roughness={0.65}
          />
        </mesh>
      ))}
    </group>
  );
}
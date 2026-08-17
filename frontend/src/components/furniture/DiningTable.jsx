import Chair from "./Chair";

export default function DiningTable({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Table top */}
      <mesh position={[0, 0.78, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.12, 1]} />
        <meshStandardMaterial color="#8b5f3d" roughness={0.55} />
      </mesh>

      {/* Legs */}
      {[
        [-0.72, 0.39, -0.34],
        [0.72, 0.39, -0.34],
        [-0.72, 0.39, 0.34],
        [0.72, 0.39, 0.34],
      ].map((leg, index) => (
        <mesh key={index} position={leg} castShadow>
          <boxGeometry args={[0.09, 0.78, 0.09]} />
          <meshStandardMaterial color="#4f3424" roughness={0.7} />
        </mesh>
      ))}

      <Chair position={[0, 0, -0.95]} />
      <Chair position={[0, 0, 0.95]} rotation={[0, Math.PI, 0]} />

      <Chair
        position={[-1.25, 0, 0]}
        rotation={[0, -Math.PI / 2, 0]}
      />

      <Chair
        position={[1.25, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
      />
    </group>
  );
}
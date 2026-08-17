export default function Chair({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Seat */}
      <mesh position={[0, 0.48, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.48, 0.1, 0.48]} />
        <meshStandardMaterial color="#7d5235" roughness={0.65} />
      </mesh>

      {/* Back */}
      <mesh position={[0, 0.9, -0.2]} castShadow receiveShadow>
        <boxGeometry args={[0.48, 0.75, 0.08]} />
        <meshStandardMaterial color="#8a6040" roughness={0.7} />
      </mesh>

      {/* Legs */}
      {[
        [-0.19, 0.23, -0.19],
        [0.19, 0.23, -0.19],
        [-0.19, 0.23, 0.19],
        [0.19, 0.23, 0.19],
      ].map((leg, index) => (
        <mesh key={index} position={leg} castShadow>
          <boxGeometry args={[0.06, 0.46, 0.06]} />
          <meshStandardMaterial color="#4e3425" roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}
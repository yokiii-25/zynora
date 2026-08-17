export default function Bed({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Bed frame */}
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 0.28, 2.2]} />
        <meshStandardMaterial color="#6b4631" roughness={0.7} />
      </mesh>

      {/* Mattress */}
      <mesh position={[0, 0.43, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.72, 0.22, 2.08]} />
        <meshStandardMaterial color="#f1eee8" roughness={0.9} />
      </mesh>

      {/* Blanket */}
      <mesh position={[0, 0.56, 0.35]} castShadow receiveShadow>
        <boxGeometry args={[1.65, 0.08, 1.2]} />
        <meshStandardMaterial color="#8b9b87" roughness={0.85} />
      </mesh>

      {/* Headboard */}
      <mesh position={[0, 0.85, -1.03]} castShadow receiveShadow>
        <boxGeometry args={[1.9, 1.2, 0.12]} />
        <meshStandardMaterial color="#5a3a28" roughness={0.75} />
      </mesh>

      {/* Pillows */}
      <mesh position={[-0.48, 0.65, -0.65]} castShadow>
        <boxGeometry args={[0.65, 0.18, 0.42]} />
        <meshStandardMaterial color="#ffffff" roughness={0.95} />
      </mesh>

      <mesh position={[0.48, 0.65, -0.65]} castShadow>
        <boxGeometry args={[0.65, 0.18, 0.42]} />
        <meshStandardMaterial color="#ffffff" roughness={0.95} />
      </mesh>

      {/* Legs */}
      {[
        [-0.78, 0.05, -0.95],
        [0.78, 0.05, -0.95],
        [-0.78, 0.05, 0.95],
        [0.78, 0.05, 0.95],
      ].map((leg, index) => (
        <mesh key={index} position={leg} castShadow>
          <boxGeometry args={[0.09, 0.1, 0.09]} />
          <meshStandardMaterial color="#2d241e" roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}
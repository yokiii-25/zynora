export default function Sofa({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}) {
  return (
    <group position={position} rotation={rotation} castShadow receiveShadow>

      {/* Base */}
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 0.5, 0.9]} />
        <meshStandardMaterial color="#b68d5c" />
      </mesh>

      {/* Back */}
      <mesh position={[0, 0.75, -0.35]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 0.8, 0.18]} />
        <meshStandardMaterial color="#c39b69" />
      </mesh>

      {/* Left Arm */}
      <mesh position={[-1.02, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.18, 0.6, 0.9]} />
        <meshStandardMaterial color="#c39b69" />
      </mesh>

      {/* Right Arm */}
      <mesh position={[1.02, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.18, 0.6, 0.9]} />
        <meshStandardMaterial color="#c39b69" />
      </mesh>

      {/* Legs */}
      {[
        [-0.9, 0.05, -0.35],
        [0.9, 0.05, -0.35],
        [-0.9, 0.05, 0.35],
        [0.9, 0.05, 0.35],
      ].map((leg, index) => (
        <mesh key={index} position={leg} castShadow receiveShadow>
          <boxGeometry args={[0.08, 0.1, 0.08]} />
          <meshStandardMaterial color="#2b2b2b" />
        </mesh>
      ))}
    </group>
  );
}
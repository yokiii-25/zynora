export default function Lights({
  center = { x: 0, z: 0 },
  size = 10,
}) {
  const shadowSize = Math.max(size * 1.5, 15);

  return (
    <>
      {/* General scene brightness */}
      <ambientLight intensity={0.55} />

      {/* Soft sky and ground lighting */}
      <hemisphereLight
        args={["#dcecff", "#8a765f", 0.65]}
      />

      {/* Main sunlight */}
      <directionalLight
        position={[
          center.x + size,
          size * 1.5,
          center.z + size,
        ]}
        intensity={1.7}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-shadowSize}
        shadow-camera-right={shadowSize}
        shadow-camera-top={shadowSize}
        shadow-camera-bottom={-shadowSize}
        shadow-camera-near={0.1}
        shadow-camera-far={size * 6}
        shadow-bias={-0.0002}
      />

      {/* Gentle fill light from the opposite side */}
      <directionalLight
        position={[
          center.x - size,
          size,
          center.z - size,
        ]}
        intensity={0.35}
      />
    </>
  );
}
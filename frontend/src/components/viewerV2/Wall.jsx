import { Edges } from "@react-three/drei";
import { useMemo } from "react";

import Opening from "./Opening";
import { getWallSegments } from "./utils/wallMath";

export default function Wall({
  wall,
  exterior = false,
  finish,
}) {
  const segments = useMemo(
    () => getWallSegments(wall),
    [wall]
  );

  if (!segments.length) {
    return null;
  }

  return (
    <group>
      {segments.map((segment) => (
        <mesh
          key={segment.id}
          position={segment.position}
          rotation={segment.rotation}
          castShadow
          receiveShadow
        >
          <boxGeometry args={segment.size} />

          <meshStandardMaterial
            color={finish?.color ?? wall.color}
            roughness={finish?.roughness ?? 0.82}
            metalness={0}
          />

          {!exterior && (
            <Edges
              threshold={18}
              color="#bdc6d0"
            />
          )}
        </mesh>
      ))}

      {(wall.openings ?? []).map((opening) => (
        <Opening
          key={opening.id}
          wall={wall}
          opening={opening}
          exterior={exterior}
          style={finish?.style}
        />
      ))}
    </group>
  );
}

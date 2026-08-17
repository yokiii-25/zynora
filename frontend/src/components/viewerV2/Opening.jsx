import { getOpeningGroupTransform } from "./utils/wallMath";

function FramePiece({ position, size, color }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.68} />
    </mesh>
  );
}

function Door({ wall, opening, exterior, style = {} }) {
  const frameWidth = Math.min(0.075, opening.width * 0.09);
  const frameDepth = wall.thickness + 0.045;
  const frameColor = exterior
    ? (style.frame ?? "#2b3034")
    : "#785943";

  return (
    <>
      <FramePiece
        position={[
          opening.start + frameWidth / 2,
          opening.bottom + opening.height / 2,
          0,
        ]}
        size={[frameWidth, opening.height, frameDepth]}
        color={frameColor}
      />

      <FramePiece
        position={[
          opening.end - frameWidth / 2,
          opening.bottom + opening.height / 2,
          0,
        ]}
        size={[frameWidth, opening.height, frameDepth]}
        color={frameColor}
      />

      <FramePiece
        position={[
          opening.center,
          opening.top - frameWidth / 2,
          0,
        ]}
        size={[opening.width, frameWidth, frameDepth]}
        color={frameColor}
      />

      <group
        position={[opening.start + frameWidth, opening.bottom + 0.025, 0]}
        rotation={[0, exterior ? 0 : -Math.PI * 0.34, 0]}
      >
        <mesh
          position={[
            (opening.width - frameWidth * 2) / 2,
            (opening.height - frameWidth * 1.7) / 2,
            0,
          ]}
          castShadow
        >
          <boxGeometry
            args={[
              opening.width - frameWidth * 2,
              opening.height - frameWidth * 1.7,
              0.045,
            ]}
          />
          <meshStandardMaterial
            color={exterior ? (style.wood ?? "#8f6245") : "#a77a55"}
            roughness={0.72}
          />

          <mesh
            position={[
              opening.width * 0.36,
              0,
              0.038,
            ]}
          >
            <sphereGeometry args={[0.035, 14, 10]} />
            <meshStandardMaterial
              color="#c9a557"
              metalness={0.65}
              roughness={0.3}
            />
          </mesh>
        </mesh>
      </group>
    </>
  );
}

function Window({ wall, opening, exterior, style = {} }) {
  const frameWidth = Math.min(0.065, opening.width * 0.075);
  const frameDepth = wall.thickness + 0.04;
  const frameColor = exterior
    ? (style.frame ?? "#293136")
    : "#d7dde3";

  return (
    <>
      <mesh
        position={[
          opening.center,
          opening.bottom + opening.height / 2,
          0,
        ]}
        receiveShadow
      >
        <boxGeometry
          args={[
            Math.max(opening.width - frameWidth * 2, 0.05),
            Math.max(opening.height - frameWidth * 2, 0.05),
            0.018,
          ]}
        />
        <meshPhysicalMaterial
          color={style.glass ?? "#a9d4e8"}
          transparent
          opacity={exterior ? 0.48 : 0.38}
          transmission={exterior ? 0.38 : 0.25}
          roughness={0.12}
          metalness={0}
          depthWrite={false}
        />
      </mesh>

      <FramePiece
        position={[
          opening.start + frameWidth / 2,
          opening.bottom + opening.height / 2,
          0,
        ]}
        size={[frameWidth, opening.height, frameDepth]}
        color={frameColor}
      />
      <FramePiece
        position={[
          opening.end - frameWidth / 2,
          opening.bottom + opening.height / 2,
          0,
        ]}
        size={[frameWidth, opening.height, frameDepth]}
        color={frameColor}
      />
      <FramePiece
        position={[
          opening.center,
          opening.bottom + frameWidth / 2,
          0,
        ]}
        size={[opening.width, frameWidth, frameDepth]}
        color={frameColor}
      />
      <FramePiece
        position={[
          opening.center,
          opening.top - frameWidth / 2,
          0,
        ]}
        size={[opening.width, frameWidth, frameDepth]}
        color={frameColor}
      />
      <FramePiece
        position={[
          opening.center,
          opening.bottom + opening.height / 2,
          0,
        ]}
        size={[frameWidth * 0.75, opening.height, frameDepth]}
        color={frameColor}
      />
    </>
  );
}

export default function Opening({
  wall,
  opening,
  exterior = false,
  style,
}) {
  const transform = getOpeningGroupTransform(wall);

  return (
    <group
      position={transform.position}
      rotation={transform.rotation}
    >
      {opening.type === "window" ? (
        <Window
          wall={wall}
          opening={opening}
          exterior={exterior}
          style={style}
        />
      ) : (
        <Door
          wall={wall}
          opening={opening}
          exterior={exterior}
          style={style}
        />
      )}
    </group>
  );
}

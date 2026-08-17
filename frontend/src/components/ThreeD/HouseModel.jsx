import { useMemo } from "react";

const DEFAULT_WALL_HEIGHT = 3;
const DEFAULT_WALL_THICKNESS = 0.18;

function DetectedWall({ wall }) {
  const x1 = Number(wall.x1) || 0;
  const z1 = Number(wall.y1) || 0;
  const x2 = Number(wall.x2) || 0;
  const z2 = Number(wall.y2) || 0;

  const deltaX = x2 - x1;
  const deltaZ = z2 - z1;

  const length = Math.hypot(
    deltaX,
    deltaZ
  );

  if (!Number.isFinite(length) || length < 0.1) {
    return null;
  }

  const wallHeight =
    Number(wall.height) ||
    DEFAULT_WALL_HEIGHT;

  const thickness =
    Number(wall.thickness) ||
    DEFAULT_WALL_THICKNESS;

  const centerX = (x1 + x2) / 2;
  const centerZ = (z1 + z2) / 2;

  const rotationY = -Math.atan2(
    deltaZ,
    deltaX
  );

  return (
    <mesh
      castShadow
      receiveShadow
      position={[
        centerX,
        wallHeight / 2,
        centerZ,
      ]}
      rotation={[0, rotationY, 0]}
    >
      <boxGeometry
        args={[
          length,
          wallHeight,
          thickness,
        ]}
      />

      <meshStandardMaterial
        color="#f8fafc"
        roughness={0.76}
      />
    </mesh>
  );
}

function UploadedPlanModel({ floorPlan }) {
  const walls = Array.isArray(
    floorPlan?.walls
  )
    ? floorPlan.walls
    : [];

  const width =
    Number(floorPlan?.width) || 40;

  const depth =
    Number(floorPlan?.height) || 30;

  return (
    <group
      position={[
        -width / 2,
        0,
        -depth / 2,
      ]}
    >
      <mesh
        receiveShadow
        position={[
          width / 2,
          0.04,
          depth / 2,
        ]}
      >
        <boxGeometry
          args={[
            width,
            0.08,
            depth,
          ]}
        />

        <meshStandardMaterial
          color="#d8c6aa"
          roughness={0.9}
        />
      </mesh>

      {walls.map((wall, index) => (
        <DetectedWall
          key={
            wall.id ||
            `detected-wall-${index}`
          }
          wall={wall}
        />
      ))}
    </group>
  );
}

function GeneratedRoomModel({ floorPlan }) {
  const rooms = Array.isArray(
    floorPlan?.rooms
  )
    ? floorPlan.rooms
    : [];

  return (
    <group>
      {rooms.map((room, index) => {
        const x =
          Number(room?.x) || 0;

        const z =
          Number(room?.y) || 0;

        const width =
          Number(room?.width) || 1;

        const depth =
          Number(room?.height) || 1;

        return (
          <group
            key={
              room?.id ||
              `generated-room-${index}`
            }
          >
            <mesh
              receiveShadow
              position={[
                x + width / 2,
                0.05,
                z + depth / 2,
              ]}
            >
              <boxGeometry
                args={[
                  width,
                  0.1,
                  depth,
                ]}
              />

              <meshStandardMaterial
                color="#d8c6aa"
                roughness={0.82}
              />
            </mesh>

            <DetectedWall
              wall={{
                x1: x,
                y1: z,
                x2: x + width,
                y2: z,
              }}
            />

            <DetectedWall
              wall={{
                x1: x,
                y1: z + depth,
                x2: x + width,
                y2: z + depth,
              }}
            />

            <DetectedWall
              wall={{
                x1: x,
                y1: z,
                x2: x,
                y2: z + depth,
              }}
            />

            <DetectedWall
              wall={{
                x1: x + width,
                y1: z,
                x2: x + width,
                y2: z + depth,
              }}
            />
          </group>
        );
      })}
    </group>
  );
}

export default function HouseModel({
  floorPlan,
}) {
  const isUploadedPlan = useMemo(
    () =>
      floorPlan?.source ===
        "uploaded_floor_plan" &&
      Array.isArray(floorPlan?.walls),
    [floorPlan]
  );

  if (isUploadedPlan) {
    return (
      <UploadedPlanModel
        floorPlan={floorPlan}
      />
    );
  }

  return (
    <GeneratedRoomModel
      floorPlan={floorPlan}
    />
  );
}
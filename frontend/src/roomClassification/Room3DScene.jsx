import {
  useMemo,
} from "react";

import * as THREE from "three";

import {
  ContactShadows,
  Edges,
  Html,
  OrbitControls,
} from "@react-three/drei";

import {
  extractRoomGeometry,
} from "../utils/svgRoomGeometry";


const WALL_HEIGHT = 2.7;
const WALL_THICKNESS = 0.14;
const FLOOR_HEIGHT = 0.12;


function getRoomPalette(roomType = "") {
  const normalized =
    String(roomType).toLowerCase();

  if (normalized.includes("bed")) {
    return {
      floor: "#dbeafe",
      wall: "#f8fafc",
    };
  }

  if (
    normalized.includes("kitchen") ||
    normalized.includes("dining")
  ) {
    return {
      floor: "#fef3c7",
      wall: "#fffdf7",
    };
  }

  if (
    normalized.includes("bath") ||
    normalized.includes("toilet")
  ) {
    return {
      floor: "#cffafe",
      wall: "#f0fdfa",
    };
  }

  if (
    normalized.includes("living") ||
    normalized.includes("lounge")
  ) {
    return {
      floor: "#ede9fe",
      wall: "#faf8ff",
    };
  }

  if (
    normalized.includes("balcony") ||
    normalized.includes("terrace")
  ) {
    return {
      floor: "#dcfce7",
      wall: "#f0fdf4",
    };
  }

  return {
    floor: "#e2e8f0",
    wall: "#f8fafc",
  };
}


function WallSegment({
  end,
  index,
  start,
  wallColor,
}) {
  const deltaX = end.x - start.x;
  const deltaZ = end.z - start.z;
  const length =
    Math.hypot(deltaX, deltaZ);

  if (length < 0.01) {
    return null;
  }

  const centerX =
    (start.x + end.x) / 2;
  const centerZ =
    (start.z + end.z) / 2;
  const angle =
    -Math.atan2(deltaZ, deltaX);

  return (
    <mesh
      castShadow
      receiveShadow
      key={index}
      position={[
        centerX,
        FLOOR_HEIGHT + WALL_HEIGHT / 2,
        centerZ,
      ]}
      rotation={[0, angle, 0]}
    >
      <boxGeometry
        args={[
          length + WALL_THICKNESS,
          WALL_HEIGHT,
          WALL_THICKNESS,
        ]}
      />

      <meshStandardMaterial
        color={wallColor}
        metalness={0}
        roughness={0.78}
      />

      <Edges
        color="#94a3b8"
        threshold={20}
      />
    </mesh>
  );
}


function RoomShell({
  geometry,
  room,
}) {
  const palette =
    getRoomPalette(
      room?.predicted_room_type
    );

  return (
    <group>
      <mesh
        castShadow
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <extrudeGeometry
          args={[
            geometry.shape,
            {
              bevelEnabled: false,
              curveSegments: 12,
              depth: FLOOR_HEIGHT,
              steps: 1,
            },
          ]}
        />

        <meshStandardMaterial
          color={palette.floor}
          metalness={0}
          roughness={0.72}
          side={THREE.DoubleSide}
        />

        <Edges
          color="#64748b"
          threshold={12}
        />
      </mesh>


      {geometry.points.map(
        (start, index) => {
          const end =
            geometry.points[
              (index + 1) %
                geometry.points.length
            ];

          return (
            <WallSegment
              end={end}
              index={index}
              key={
                `${index}-${start.x}-${start.z}`
              }
              start={start}
              wallColor={palette.wall}
            />
          );
        }
      )}
    </group>
  );
}


function SceneError({ message }) {
  return (
    <Html center>
      <div className="room3DError">
        <strong>
          SVG geometry not found
        </strong>

        <span>
          {message}
        </span>
      </div>
    </Html>
  );
}


function Room3DScene({
  room,
  svgContent,
}) {
  const result = useMemo(() => {
    try {
      return {
        error: null,
        geometry:
          extractRoomGeometry(
            svgContent,
            room
          ),
      };
    } catch (error) {
      console.error(
        "Unable to build SVG room geometry:",
        error
      );

      return {
        error:
          error instanceof Error
            ? error.message
            : "Unknown SVG geometry error.",
        geometry: null,
      };
    }
  }, [room, svgContent]);


  return (
    <>
      <ambientLight intensity={1.15} />

      <hemisphereLight
        color="#ffffff"
        groundColor="#cbd5e1"
        intensity={0.75}
      />

      <directionalLight
        castShadow
        intensity={2.1}
        position={[7, 12, 8]}
        shadow-bias={-0.0004}
        shadow-mapSize-height={2048}
        shadow-mapSize-width={2048}
      />


      {result.geometry ? (
        <RoomShell
          geometry={result.geometry}
          room={room}
        />
      ) : (
        <SceneError
          message={result.error}
        />
      )}


      <gridHelper
        args={[
          24,
          24,
          "#cbd5e1",
          "#e2e8f0",
        ]}
        position={[0, -0.015, 0]}
      />

      <ContactShadows
        blur={2.4}
        far={10}
        opacity={0.32}
        position={[0, -0.02, 0]}
        resolution={1024}
        scale={20}
      />

      <OrbitControls
        enableDamping
        makeDefault
        maxDistance={24}
        maxPolarAngle={Math.PI / 2.05}
        minDistance={4}
        target={[0, 1.1, 0]}
      />
    </>
  );
}


export default Room3DScene;


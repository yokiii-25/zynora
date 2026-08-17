import { ContactShadows, Sky } from "@react-three/drei";
import { useMemo } from "react";

import {
  ExteriorLevelDetails,
  ExteriorSite,
} from "./ExteriorArchitecture";
import Floor from "./Floor";
import Furniture from "./Furniture";
import Roof from "./Roof";
import Slab from "./Slab";
import Stairs from "./Stairs";
import SvgFixture from "./SvgFixture";
import Wall from "./Wall";
import {
  createExteriorDesign,
  wallFinish,
} from "./utils/exteriorDesign";

function Ground({ floorPlan, showGrid = true, style }) {
  const size = Math.max(floorPlan.width, floorPlan.depth, 6) * 1.7;
  const divisions = Math.max(18, Math.min(50, Math.round(size * 2)));

  return (
    <>
      <mesh
        position={[0, -0.045, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial
          color={style?.ground ?? "#eef3f7"}
          roughness={1}
        />
      </mesh>

      {showGrid && (
        <gridHelper
          args={[size, divisions, "#bac5d0", "#d8e0e7"]}
          position={[0, -0.035, 0]}
        />
      )}
    </>
  );
}

function FloorLevel({
  floor,
  exteriorMode,
  showFurniture,
  showRoof,
  floorIndex,
  exteriorDesign,
}) {
  const visibleWalls = exteriorMode ? floor.shellWalls : floor.walls;
  const rooms = Array.isArray(floor.rooms)
    ? floor.rooms.filter(
        (room) => Array.isArray(room.outline) && room.outline.length >= 3,
      )
    : [];
  const svgFixtures = Array.isArray(floor.fixtures)
    ? floor.fixtures.filter(
        (fixture) =>
          Array.isArray(fixture.outline) && fixture.outline.length >= 3,
      )
    : [];

  return (
    <group position={[0, Number(floor.elevation) || 0, 0]}>
      {exteriorMode ? (
        <Slab
          outline={floor.slab?.outline ?? floor.exteriorOutline}
          elevation={floor.slab?.elevation}
          thickness={floor.slab?.thickness}
          color={exteriorDesign.style.concrete}
          showEdges={false}
        />
      ) : rooms.length ? (
        rooms.map((room) => (
          <Floor
            key={room.id ?? room.room_id}
            outline={room.outline}
            color={room.floorColor ?? "#ddd7c9"}
            selected={Boolean(room.selected)}
          />
        ))
      ) : (
        <Floor
          outline={floor.outline}
          color={floor.floorColor ?? "#ddd7c9"}
        />
      )}

      {visibleWalls.map((wall) => (
        <Wall
          key={wall.id}
          wall={wall}
          exterior={exteriorMode}
          finish={exteriorMode
            ? {
                ...wallFinish(wall, floor, exteriorDesign, floorIndex),
                style: exteriorDesign.style,
              }
            : undefined}
        />
      ))}

      {exteriorMode && (
        <ExteriorLevelDetails
          floor={floor}
          design={exteriorDesign}
          floorIndex={floorIndex}
        />
      )}

      {exteriorMode && showRoof ? (
        <Roof roof={floor.roof} style={exteriorDesign.style} />
      ) : (
        !exteriorMode && <Stairs stairs={floor.stairs} />
      )}

      {!exteriorMode &&
        showFurniture &&
        svgFixtures.length > 0 &&
        svgFixtures.map((fixture) => (
          <SvgFixture key={fixture.id} fixture={fixture} />
        ))}

      {!exteriorMode &&
        showFurniture &&
        svgFixtures.length === 0 &&
        (rooms.length ? (
          rooms.map((room) => (
            <Furniture
              key={`furniture-${room.id ?? room.room_id}`}
              floorPlan={room}
            />
          ))
        ) : (
          <Furniture floorPlan={floor} />
        ))}
    </group>
  );
}

export default function SceneContent({
  floorPlan,
  showFurniture = true,
  captureMode = false,
  selectedFloorId = "all",
  exteriorStyle = "warm-modern",
}) {
  const shadowSize = Math.max(floorPlan.width, floorPlan.depth, 5) * 1.45;
  const exteriorMode = Boolean(captureMode);
  const exteriorDesign = useMemo(
    () => createExteriorDesign(floorPlan, exteriorStyle),
    [exteriorStyle, floorPlan],
  );
  const floors = (
    Array.isArray(floorPlan.floors) && floorPlan.floors.length
      ? floorPlan.floors
      : [{ ...floorPlan, elevation: Number(floorPlan.elevation) || 0 }]
  ).slice().sort((left, right) => left.elevation - right.elevation);
  const visibleFloors = exteriorMode || selectedFloorId === "all"
    ? floors
    : floors.filter(
        (floor) => String(floor.floorId) === String(selectedFloorId),
      );
  const topFloor = floors[floors.length - 1];

  return (
    <>
      <color
        attach="background"
        args={[
          exteriorMode ? exteriorDesign.style.sky : "#eaf0f6",
        ]}
      />

      {exteriorMode && (
        <>
          <fog
            attach="fog"
            args={[
              exteriorDesign.style.sky,
              shadowSize * 0.85,
              shadowSize * 2.7,
            ]}
          />
          <Sky
            distance={450000}
            sunPosition={[14, 10, -12]}
            turbidity={7}
            rayleigh={1.5}
            mieCoefficient={0.006}
            mieDirectionalG={0.84}
          />
        </>
      )}

      <ambientLight intensity={exteriorMode ? 0.44 : 0.62} />
      <hemisphereLight
        args={[
          exteriorMode ? "#f8fbff" : "#f7fbff",
          exteriorMode ? "#69735f" : "#7f8992",
          exteriorMode ? 1.05 : 0.86,
        ]}
      />

      <directionalLight
        position={exteriorMode ? [12, 16, -10] : [10, 15, 8]}
        intensity={exteriorMode ? 2.15 : 1.45}
        color={exteriorMode ? "#fff3dc" : "#ffffff"}
        castShadow
        shadow-mapSize-width={exteriorMode ? 4096 : 2048}
        shadow-mapSize-height={exteriorMode ? 4096 : 2048}
        shadow-bias={-0.00025}
        shadow-normalBias={0.018}
        shadow-camera-left={-shadowSize}
        shadow-camera-right={shadowSize}
        shadow-camera-top={shadowSize}
        shadow-camera-bottom={-shadowSize}
        shadow-camera-near={0.5}
        shadow-camera-far={shadowSize * 3}
      />

      <Ground
        floorPlan={floorPlan}
        showGrid={!exteriorMode}
        style={exteriorMode ? exteriorDesign.style : undefined}
      />

      {exteriorMode && (
        <ExteriorSite floorPlan={floorPlan} design={exteriorDesign} />
      )}

      {visibleFloors.map((floor) => (
        <FloorLevel
          key={floor.floorId ?? floor.id}
          floor={floor}
          exteriorMode={exteriorMode}
          showFurniture={showFurniture}
          showRoof={floor === topFloor}
          floorIndex={floors.indexOf(floor)}
          exteriorDesign={exteriorDesign}
        />
      ))}

      <ContactShadows
        position={[0, 0.025, 0]}
        scale={shadowSize}
        opacity={exteriorMode ? 0.38 : 0.3}
        blur={exteriorMode ? 2.8 : 2.4}
        far={Math.max(floorPlan.height * 2, 6)}
        resolution={512}
        frames={1}
      />
    </>
  );
}

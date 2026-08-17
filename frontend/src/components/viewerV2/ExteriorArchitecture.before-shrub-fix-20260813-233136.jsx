import { useMemo } from "react";

import Slab from "./Slab";
import {
  edgeTouchesBuilding,
  facadeRole,
  frontWallsForFloor,
  isMainEntranceOpening,
  roomIsOutdoor,
  wallOutwardNormal,
  wallPoint,
  wallTangent,
} from "./utils/exteriorDesign";
import { getWallAngle, getWallLength } from "./utils/wallMath";

function localOutwardSign(wall, floor) {
  const tangent = wallTangent(wall);
  const localPositiveZ = { x: -tangent.z, z: tangent.x };
  const outward = wallOutwardNormal(
    wall,
    floor.exteriorOutline ?? floor.outline,
  );

  return localPositiveZ.x * outward.x + localPositiveZ.z * outward.z >= 0
    ? 1
    : -1;
}

function WallBox({
  wall,
  floor,
  distance,
  y,
  width,
  height,
  depth,
  outside = 0,
  color,
  roughness = 0.72,
  metalness = 0,
  castShadow = true,
}) {
  const sign = localOutwardSign(wall, floor);

  return (
    <group
      position={[wall.x1, 0, wall.z1]}
      rotation={[0, getWallAngle(wall), 0]}
    >
      <mesh
        position={[distance, y, sign * outside]}
        castShadow={castShadow}
        receiveShadow
      >
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={color}
          roughness={roughness}
          metalness={metalness}
        />
      </mesh>
    </group>
  );
}

function FacadeBands({ floor, design, floorIndex }) {
  return (
    <>
      {(floor.shellWalls ?? []).map((wall) => {
        const length = getWallLength(wall);
        const role = facadeRole(wall, floor, design);
        const depth = Math.max(wall.thickness + 0.08, 0.2);
        const outside = wall.thickness / 2 + 0.015;

        return (
          <group key={`bands-${floor.floorId}-${wall.id}`}>
            <WallBox
              wall={wall}
              floor={floor}
              distance={length / 2}
              y={Math.max(floor.height - 0.105, 0.2)}
              width={length + wall.thickness * 0.7}
              height={0.18}
              depth={depth}
              outside={outside}
              color={role === "front"
                ? design.style.accent
                : design.style.accentSoft}
              roughness={0.65}
            />

            {floorIndex === 0 && (
              <WallBox
                wall={wall}
                floor={floor}
                distance={length / 2}
                y={0.13}
                width={length + wall.thickness * 0.5}
                height={0.26}
                depth={depth + 0.03}
                outside={outside + 0.015}
                color={design.style.stone}
                roughness={0.9}
              />
            )}
          </group>
        );
      })}
    </>
  );
}

function WindowTrim({ wall, floor, opening, style }) {
  const outside = wall.thickness / 2 + 0.08;
  const shadeDepth = 0.42;
  const center = opening.center;

  return (
    <group>
      <WallBox
        wall={wall}
        floor={floor}
        distance={center}
        y={Math.max(opening.bottom - 0.045, 0.22)}
        width={opening.width + 0.18}
        height={0.08}
        depth={0.19}
        outside={outside}
        color={style.roofCap}
        roughness={0.72}
      />
      <WallBox
        wall={wall}
        floor={floor}
        distance={center}
        y={Math.min(opening.top + 0.13, wall.height - 0.18)}
        width={opening.width + 0.28}
        height={0.1}
        depth={shadeDepth}
        outside={wall.thickness / 2 + shadeDepth / 2}
        color={style.accent}
        roughness={0.63}
      />
    </group>
  );
}

function WallLamp({ wall, floor, distance, y, style }) {
  const outside = wall.thickness / 2 + 0.075;

  return (
    <group>
      <WallBox
        wall={wall}
        floor={floor}
        distance={distance}
        y={y}
        width={0.13}
        height={0.34}
        depth={0.12}
        outside={outside}
        color={style.accent}
        roughness={0.45}
        metalness={0.2}
      />
      <WallBox
        wall={wall}
        floor={floor}
        distance={distance}
        y={y - 0.02}
        width={0.07}
        height={0.2}
        depth={0.035}
        outside={outside + 0.078}
        color={style.light}
        roughness={0.28}
        castShadow={false}
      />
    </group>
  );
}

function EntrancePortal({ wall, floor, opening, style }) {
  const portalWidth = Math.min(0.18, Math.max(0.12, opening.width * 0.13));
  const portalHeight = Math.min(
    wall.height - 0.12,
    opening.top + 0.36,
  );
  const outside = wall.thickness / 2 + 0.11;
  const canopyDepth = 0.92;
  const canopyY = Math.min(wall.height - 0.14, opening.top + 0.28);
  const sign = localOutwardSign(wall, floor);

  return (
    <group
      position={[wall.x1, 0, wall.z1]}
      rotation={[0, getWallAngle(wall), 0]}
    >
      <mesh
        position={[
          opening.start - portalWidth / 2,
          portalHeight / 2,
          sign * outside,
        ]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[portalWidth, portalHeight, 0.18]} />
        <meshStandardMaterial color={style.accent} roughness={0.62} />
      </mesh>
      <mesh
        position={[
          opening.end + portalWidth / 2,
          portalHeight / 2,
          sign * outside,
        ]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[portalWidth, portalHeight, 0.18]} />
        <meshStandardMaterial color={style.accent} roughness={0.62} />
      </mesh>
      <mesh
        position={[
          opening.center,
          portalHeight - portalWidth / 2,
          sign * outside,
        ]}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[opening.width + portalWidth * 2, portalWidth, 0.18]}
        />
        <meshStandardMaterial color={style.accent} roughness={0.62} />
      </mesh>

      <mesh
        position={[
          opening.center,
          canopyY,
          sign * (wall.thickness / 2 + canopyDepth / 2),
        ]}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[opening.width + 0.72, 0.13, canopyDepth]}
        />
        <meshStandardMaterial color={style.roofCap} roughness={0.72} />
      </mesh>

      {[0, 1, 2].map((step) => {
        const depth = 0.3 * (step + 1);
        const height = 0.055 * (3 - step);

        return (
          <mesh
            key={`entrance-step-${step}`}
            position={[
              opening.center,
              height / 2 - 0.015,
              sign * (wall.thickness / 2 + depth / 2),
            ]}
            castShadow
            receiveShadow
          >
            <boxGeometry
              args={[opening.width + 0.56 + step * 0.14, height, depth]}
            />
            <meshStandardMaterial color={style.pavingAccent} roughness={0.84} />
          </mesh>
        );
      })}
    </group>
  );
}

function findLargestClearInterval(wall) {
  const length = getWallLength(wall);
  const margin = Math.min(0.2, length * 0.05);
  const blocked = (wall.openings ?? [])
    .map((opening) => [
      Math.max(margin, opening.start - 0.12),
      Math.min(length - margin, opening.end + 0.12),
    ])
    .sort((left, right) => left[0] - right[0]);
  const gaps = [];
  let cursor = margin;

  blocked.forEach(([start, end]) => {
    if (start > cursor) gaps.push([cursor, start]);
    cursor = Math.max(cursor, end);
  });

  if (cursor < length - margin) gaps.push([cursor, length - margin]);

  return gaps.sort(
    (left, right) => (right[1] - right[0]) - (left[1] - left[0]),
  )[0] ?? null;
}

function AccentCladding({ wall, floor, style, floorIndex }) {
  const interval = useMemo(() => findLargestClearInterval(wall), [wall]);

  if (!interval || interval[1] - interval[0] < 0.42) {
    return null;
  }

  const width = Math.min(1.24, interval[1] - interval[0] - 0.06);
  const center = (interval[0] + interval[1]) / 2;
  const height = floorIndex === 0
    ? Math.max(1.75, floor.height - 0.42)
    : Math.max(1.5, floor.height * 0.72);
  const bottom = floorIndex === 0 ? 0.18 : 0.32;
  const outside = wall.thickness / 2 + 0.035;
  const slatCount = Math.max(3, Math.floor(width / 0.12));
  const slatWidth = width / slatCount;

  return (
    <group>
      <WallBox
        wall={wall}
        floor={floor}
        distance={center}
        y={bottom + height / 2}
        width={width}
        height={height}
        depth={0.07}
        outside={outside}
        color={style.woodDark}
        roughness={0.72}
      />
      {Array.from({ length: slatCount }, (_, index) => (
        <WallBox
          key={`slat-${wall.id}-${index}`}
          wall={wall}
          floor={floor}
          distance={center - width / 2 + slatWidth * (index + 0.5)}
          y={bottom + height / 2}
          width={Math.max(slatWidth * 0.62, 0.025)}
          height={height - 0.04}
          depth={0.035}
          outside={outside + 0.055}
          color={index % 2 ? style.wood : style.woodDark}
          roughness={0.76}
        />
      ))}
    </group>
  );
}

function OpeningArchitecture({ floor, wall, design }) {
  return (
    <>
      {(wall.openings ?? []).map((opening) => {
        const mainEntrance = isMainEntranceOpening(
          floor,
          wall,
          opening,
          design,
        );

        if (opening.type === "window") {
          return (
            <WindowTrim
              key={`trim-${opening.id}`}
              wall={wall}
              floor={floor}
              opening={opening}
              style={design.style}
            />
          );
        }

        if (mainEntrance) {
          return (
            <group key={`entry-${opening.id}`}>
              <EntrancePortal
                wall={wall}
                floor={floor}
                opening={opening}
                style={design.style}
              />
              <WallLamp
                wall={wall}
                floor={floor}
                distance={Math.max(0.12, opening.start - 0.28)}
                y={Math.min(opening.top * 0.72, 1.65)}
                style={design.style}
              />
              <WallLamp
                wall={wall}
                floor={floor}
                distance={Math.min(
                  getWallLength(wall) - 0.12,
                  opening.end + 0.28,
                )}
                y={Math.min(opening.top * 0.72, 1.65)}
                style={design.style}
              />
            </group>
          );
        }

        return null;
      })}
    </>
  );
}

function RailingEdge({ start, end, style }) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.hypot(dx, dz);
  const angle = -Math.atan2(dz, dx);
  const postCount = Math.max(2, Math.ceil(length / 0.9) + 1);

  if (length < 0.2) return null;

  return (
    <group>
      <mesh
        position={[(start.x + end.x) / 2, 0.58, (start.z + end.z) / 2]}
        rotation={[0, angle, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[Math.max(length - 0.08, 0.08), 0.68, 0.025]} />
        <meshPhysicalMaterial
          color={style.glass}
          transparent
          opacity={0.28}
          transmission={0.35}
          roughness={0.12}
          depthWrite={false}
        />
      </mesh>
      <mesh
        position={[(start.x + end.x) / 2, 0.95, (start.z + end.z) / 2]}
        rotation={[0, angle, 0]}
        castShadow
      >
        <boxGeometry args={[length + 0.04, 0.055, 0.055]} />
        <meshStandardMaterial
          color={style.frame}
          metalness={0.42}
          roughness={0.38}
        />
      </mesh>
      {Array.from({ length: postCount }, (_, index) => {
        const amount = postCount === 1 ? 0.5 : index / (postCount - 1);

        return (
          <mesh
            key={`post-${index}`}
            position={[
              start.x + dx * amount,
              0.5,
              start.z + dz * amount,
            ]}
            castShadow
          >
            <boxGeometry args={[0.045, 0.96, 0.045]} />
            <meshStandardMaterial
              color={style.frame}
              metalness={0.45}
              roughness={0.36}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function OutdoorSpace({ floor, room, style, floorIndex }) {
  const outline = room.outline ?? [];

  if (!Array.isArray(outline) || outline.length < 3) return null;

  return (
    <group>
      <Slab
        outline={outline}
        elevation={floorIndex > 0 ? -0.1 : -0.035}
        thickness={floorIndex > 0 ? 0.12 : 0.055}
        color={style.pavingAccent}
        edgeColor={style.paving}
        showEdges={false}
      />
      {floorIndex > 0 && outline.map((start, index) => {
        const end = outline[(index + 1) % outline.length];

        if (edgeTouchesBuilding(start, end, floor)) return null;

        return (
          <RailingEdge
            key={`railing-${room.id ?? "outdoor"}-${index}`}
            start={start}
            end={end}
            style={style}
          />
        );
      })}
    </group>
  );
}

export function ExteriorLevelDetails({ floor, design, floorIndex }) {
  const frontWalls = frontWallsForFloor(floor, design);
  const accentWall = frontWalls.find((wall) => getWallLength(wall) > 1.1);

  return (
    <group>
      <FacadeBands floor={floor} design={design} floorIndex={floorIndex} />

      {(floor.shellWalls ?? []).map((wall) => (
        <OpeningArchitecture
          key={`opening-architecture-${floor.floorId}-${wall.id}`}
          floor={floor}
          wall={wall}
          design={design}
        />
      ))}

      {accentWall && (
        <AccentCladding
          wall={accentWall}
          floor={floor}
          style={design.style}
          floorIndex={floorIndex}
        />
      )}

      {(floor.rooms ?? [])
        .filter(roomIsOutdoor)
        .map((room) => (
          <OutdoorSpace
            key={`outdoor-${floor.floorId}-${room.id ?? room.room_id}`}
            floor={floor}
            room={room}
            style={design.style}
            floorIndex={floorIndex}
          />
        ))}
    </group>
  );
}

function Shrub({ position, scale = 1, style }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.34, 18, 12]} />
        <meshStandardMaterial color={style.shrub} roughness={0.94} />
      </mesh>
      <mesh position={[0.22, 0.22, 0.05]} castShadow receiveShadow>
        <sphereGeometry args={[0.24, 16, 10]} />
        <meshStandardMaterial color={style.grass} roughness={0.96} />
      </mesh>
    </group>
  );
}

export function ExteriorSite({ floorPlan, design }) {
  const entrance = design.mainEntrance;
  const wall = entrance?.wall;
  const opening = entrance?.opening;

  if (!wall || !opening) return null;

  const length = getWallLength(wall);
  const outward = design.frontNormal;
  const pathLength = Math.min(
    Math.max(floorPlan.depth * 0.24, 2.6),
    4.8,
  );
  const pathWidth = Math.max(opening.width + 0.65, 1.45);
  const pathCenter = {
    x: entrance.point.x + outward.x * (pathLength / 2 + 0.36),
    z: entrance.point.z + outward.z * (pathLength / 2 + 0.36),
  };
  const leftShrub = wallPoint(
    wall,
    Math.max(0.38, length * 0.16),
    wall.thickness / 2 + 0.7,
    outward,
  );
  const rightShrub = wallPoint(
    wall,
    Math.min(length - 0.38, length * 0.84),
    wall.thickness / 2 + 0.7,
    outward,
  );

  return (
    <group>
      <mesh
        position={[pathCenter.x, -0.005, pathCenter.z]}
        rotation={[0, getWallAngle(wall), 0]}
        receiveShadow
      >
        <boxGeometry args={[pathWidth, 0.055, pathLength]} />
        <meshStandardMaterial color={design.style.paving} roughness={0.9} />
      </mesh>

      {Array.from({ length: 5 }, (_, index) => {
        const amount = (index + 0.5) / 5;
        const point = {
          x: entrance.point.x + outward.x * (0.36 + pathLength * amount),
          z: entrance.point.z + outward.z * (0.36 + pathLength * amount),
        };

        return (
          <mesh
            key={`path-joint-${index}`}
            position={[point.x, 0.024, point.z]}
            rotation={[0, getWallAngle(wall), 0]}
            receiveShadow
          >
            <boxGeometry args={[pathWidth * 0.94, 0.012, 0.025]} />
            <meshStandardMaterial
              color={design.style.pavingAccent}
              roughness={0.88}
            />
          </mesh>
        );
      })}

      <Shrub
        position={[leftShrub.x, 0, leftShrub.z]}
        scale={0.86}
        style={design.style}
      />
      <Shrub
        position={[rightShrub.x, 0, rightShrub.z]}
        scale={1.02}
        style={design.style}
      />
    </group>
  );
}

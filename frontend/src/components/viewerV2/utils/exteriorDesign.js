import { pointInPolygon } from "./polygonMath.js";
import { getWallLength } from "./wallMath.js";

const EPSILON = 1e-6;

export const EXTERIOR_STYLE_PRESETS = Object.freeze({
  "warm-modern": Object.freeze({
    wall: "#e8e2d7",
    wallSecondary: "#c9c4ba",
    accent: "#2c3439",
    accentSoft: "#596166",
    wood: "#8a5c3d",
    woodDark: "#5e3b29",
    stone: "#77736b",
    frame: "#252c31",
    glass: "#8fc2d5",
    roof: "#d6d0c5",
    roofCap: "#f0ece4",
    concrete: "#b8b4ad",
    paving: "#aaa69f",
    pavingAccent: "#d8d2c7",
    grass: "#5f7d54",
    shrub: "#416a42",
    sky: "#d9edf8",
    ground: "#d9ddd5",
    light: "#ffd79a",
  }),
  "graphite-white": Object.freeze({
    wall: "#ecebe7",
    wallSecondary: "#c8c9c7",
    accent: "#20262b",
    accentSoft: "#596167",
    wood: "#9a6844",
    woodDark: "#62412d",
    stone: "#707275",
    frame: "#1d2429",
    glass: "#87b7ca",
    roof: "#d4d4d0",
    roofCap: "#f3f2ee",
    concrete: "#b4b6b6",
    paving: "#9c9fa0",
    pavingAccent: "#d7d8d5",
    grass: "#58774e",
    shrub: "#3e6841",
    sky: "#d8ecf7",
    ground: "#d7dcd5",
    light: "#ffd28b",
  }),
  sandstone: Object.freeze({
    wall: "#e4d8c6",
    wallSecondary: "#c9b89f",
    accent: "#3f4140",
    accentSoft: "#6f706c",
    wood: "#87583b",
    woodDark: "#5a3828",
    stone: "#8e7f6e",
    frame: "#292d2f",
    glass: "#8bb9c6",
    roof: "#d5c9b8",
    roofCap: "#eee5d8",
    concrete: "#b9ad9d",
    paving: "#aa9b89",
    pavingAccent: "#d5c6b3",
    grass: "#687d4d",
    shrub: "#49633b",
    sky: "#dcecf3",
    ground: "#ddd9ce",
    light: "#ffd28f",
  }),
});

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeVector(vector, fallback = { x: 0, z: -1 }) {
  const length = Math.hypot(vector?.x, vector?.z);

  if (!Number.isFinite(length) || length < EPSILON) {
    return { ...fallback };
  }

  return {
    x: vector.x / length,
    z: vector.z / length,
  };
}

function dot(left, right) {
  return left.x * right.x + left.z * right.z;
}

function stableHash(value) {
  return String(value ?? "wall")
    .split("")
    .reduce((hash, character) => {
      return (hash * 31 + character.charCodeAt(0)) >>> 0;
    }, 17);
}

export function resolveExteriorStyle(style = "warm-modern") {
  if (typeof style === "object" && style) {
    const presetName = String(style.preset ?? "warm-modern");
    const preset = EXTERIOR_STYLE_PRESETS[presetName] ??
      EXTERIOR_STYLE_PRESETS["warm-modern"];

    return {
      ...preset,
      ...style,
      preset: presetName,
    };
  }

  const presetName = String(style || "warm-modern");
  return {
    ...(EXTERIOR_STYLE_PRESETS[presetName] ??
      EXTERIOR_STYLE_PRESETS["warm-modern"]),
    preset: presetName,
  };
}

export function wallTangent(wall) {
  return normalizeVector({
    x: finite(wall?.x2) - finite(wall?.x1),
    z: finite(wall?.z2) - finite(wall?.z1),
  }, { x: 1, z: 0 });
}

export function wallPoint(wall, distance = 0, normalOffset = 0, normal) {
  const tangent = wallTangent(wall);
  const outward = normal ?? { x: -tangent.z, z: tangent.x };

  return {
    x: finite(wall?.x1) + tangent.x * distance + outward.x * normalOffset,
    z: finite(wall?.z1) + tangent.z * distance + outward.z * normalOffset,
  };
}

export function wallOutwardNormal(wall, outline = []) {
  const tangent = wallTangent(wall);
  const left = { x: -tangent.z, z: tangent.x };
  const right = { x: tangent.z, z: -tangent.x };
  const length = getWallLength(wall);
  const middle = wallPoint(wall, length / 2);
  const probe = Math.max(finite(wall?.thickness, 0.16) * 1.6, 0.24);
  const leftInside = pointInPolygon(
    {
      x: middle.x + left.x * probe,
      z: middle.z + left.z * probe,
    },
    outline,
  );
  const rightInside = pointInPolygon(
    {
      x: middle.x + right.x * probe,
      z: middle.z + right.z * probe,
    },
    outline,
  );

  if (leftInside && !rightInside) return right;
  if (rightInside && !leftInside) return left;

  if (Array.isArray(outline) && outline.length >= 3) {
    const center = outline.reduce(
      (sum, point) => ({ x: sum.x + point.x, z: sum.z + point.z }),
      { x: 0, z: 0 },
    );
    center.x /= outline.length;
    center.z /= outline.length;

    const radial = normalizeVector({
      x: middle.x - center.x,
      z: middle.z - center.z,
    });

    return dot(left, radial) >= dot(right, radial) ? left : right;
  }

  return left;
}

function entranceScore(wall, opening) {
  const label = String(
    opening?.name ?? opening?.label ?? opening?.kind ?? opening?.type ?? "",
  ).toLowerCase();
  const explicitMain = /main|front|entrance|entry/.test(label) ? 20 : 0;
  const garagePenalty = /garage|vehicle|shutter/.test(label) || opening.width > 2.25
    ? -12
    : 0;
  const windowCount = (wall.openings ?? []).filter(
    (candidate) => candidate.type === "window",
  ).length;

  return explicitMain + garagePenalty +
    getWallLength(wall) + opening.width * 5 + windowCount * 1.4;
}

export function findMainEntrance(floor) {
  const walls = Array.isArray(floor?.shellWalls) ? floor.shellWalls : [];
  let best = null;

  walls.forEach((wall, wallIndex) => {
    (wall.openings ?? [])
      .filter((opening) => opening.type === "door")
      .forEach((opening) => {
        const score = entranceScore(wall, opening);

        if (!best || score > best.score) {
          best = { wall, wallIndex, opening, score };
        }
      });
  });

  if (best) return best;

  const wall = walls
    .slice()
    .sort((left, right) => getWallLength(right) - getWallLength(left))[0];

  return wall
    ? {
        wall,
        wallIndex: walls.indexOf(wall),
        opening: null,
        score: getWallLength(wall),
      }
    : null;
}

export function createExteriorDesign(
  floorPlan,
  exteriorStyle = "warm-modern",
) {
  const floors = (
    Array.isArray(floorPlan?.floors) && floorPlan.floors.length
      ? floorPlan.floors
      : [floorPlan]
  ).filter(Boolean).slice().sort(
    (left, right) => finite(left.elevation) - finite(right.elevation),
  );
  const groundFloor = floors[0] ?? floorPlan;
  const entrance = findMainEntrance(groundFloor);
  const frontWall = entrance?.wall ?? groundFloor?.shellWalls?.[0];
  const frontNormal = frontWall
    ? wallOutwardNormal(
        frontWall,
        groundFloor.exteriorOutline ?? groundFloor.outline,
      )
    : { x: 0, z: -1 };
  const frontTangent = frontWall
    ? wallTangent(frontWall)
    : { x: 1, z: 0 };
  const entranceDistance = entrance?.opening?.center ??
    (frontWall ? getWallLength(frontWall) / 2 : 0);
  const entrancePoint = frontWall
    ? wallPoint(
        frontWall,
        entranceDistance,
        finite(frontWall.thickness, 0.16) / 2,
        frontNormal,
      )
    : {
        x: finite(floorPlan?.bounds?.centerX),
        z: finite(floorPlan?.bounds?.centerZ),
      };

  return {
    style: resolveExteriorStyle(exteriorStyle),
    floors,
    groundFloorId: String(groundFloor?.floorId ?? groundFloor?.id ?? ""),
    mainEntrance: entrance
      ? {
          floorId: String(groundFloor?.floorId ?? groundFloor?.id ?? ""),
          wallId: String(entrance.wall.id),
          openingId: entrance.opening ? String(entrance.opening.id) : null,
          wall: entrance.wall,
          opening: entrance.opening,
          point: entrancePoint,
        }
      : null,
    frontWallId: frontWall ? String(frontWall.id) : null,
    frontNormal: normalizeVector(frontNormal),
    frontTangent: normalizeVector(frontTangent, { x: 1, z: 0 }),
  };
}

export function facadeRole(wall, floor, design) {
  const normal = wallOutwardNormal(
    wall,
    floor?.exteriorOutline ?? floor?.outline,
  );
  const alignment = dot(normal, design.frontNormal);

  if (alignment > 0.58) return "front";
  if (alignment < -0.58) return "rear";
  return "side";
}

export function wallFinish(wall, floor, design, floorIndex = 0) {
  const role = facadeRole(wall, floor, design);
  const hash = stableHash(`${floor?.floorId ?? floor?.id}-${wall.id}`);
  const isEntranceWall =
    floorIndex === 0 && String(wall.id) === design.frontWallId;
  let color = design.style.wall;

  if (role === "rear") color = design.style.wallSecondary;
  if (role === "side" && hash % 7 === 0) {
    color = design.style.wallSecondary;
  }

  return {
    color,
    role,
    isEntranceWall,
    roughness: role === "front" ? 0.76 : 0.82,
  };
}

export function frontWallsForFloor(floor, design) {
  return (floor?.shellWalls ?? [])
    .filter((wall) => facadeRole(wall, floor, design) === "front")
    .sort((left, right) => getWallLength(right) - getWallLength(left));
}

export function isMainEntranceOpening(floor, wall, opening, design) {
  return Boolean(
    design.mainEntrance &&
    String(floor?.floorId ?? floor?.id ?? "") ===
      String(design.mainEntrance.floorId) &&
    String(wall?.id) === String(design.mainEntrance.wallId) &&
    String(opening?.id) === String(design.mainEntrance.openingId),
  );
}

export function roomIsOutdoor(room) {
  const value = String(
    room?.roomType ?? room?.predicted_room_type ?? room?.type ?? room?.name ?? "",
  ).toLowerCase();

  return /outdoor|balcony|terrace|patio|porch|veranda|deck/.test(value);
}

export function pointToSegmentDistance(point, start, end) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const squaredLength = dx * dx + dz * dz;

  if (squaredLength < EPSILON) {
    return Math.hypot(point.x - start.x, point.z - start.z);
  }

  const amount = Math.max(0, Math.min(1,
    ((point.x - start.x) * dx + (point.z - start.z) * dz) /
      squaredLength,
  ));

  return Math.hypot(
    point.x - (start.x + dx * amount),
    point.z - (start.z + dz * amount),
  );
}

export function edgeTouchesBuilding(start, end, floor, tolerance = 0.28) {
  const middle = {
    x: (start.x + end.x) / 2,
    z: (start.z + end.z) / 2,
  };

  return (floor?.shellWalls ?? []).some((wall) => {
    return pointToSegmentDistance(
      middle,
      { x: wall.x1, z: wall.z1 },
      { x: wall.x2, z: wall.z2 },
    ) <= Math.max(tolerance, finite(wall.thickness, 0.16));
  });
}

export function captureViewDirection(design, captureView = "hero") {
  const front = design.frontNormal;
  const tangent = design.frontTangent;
  const key = String(captureView || "hero").toLowerCase();
  const vectors = {
    front,
    hero: {
      x: front.x + tangent.x * 0.58,
      z: front.z + tangent.z * 0.58,
    },
    "front-left": {
      x: front.x - tangent.x * 0.58,
      z: front.z - tangent.z * 0.58,
    },
    "front-right": {
      x: front.x + tangent.x * 0.58,
      z: front.z + tangent.z * 0.58,
    },
    rear: { x: -front.x, z: -front.z },
    left: { x: -tangent.x, z: -tangent.z },
    right: { x: tangent.x, z: tangent.z },
    aerial: {
      x: front.x + tangent.x * 0.42,
      z: front.z + tangent.z * 0.42,
    },
  };

  return normalizeVector(vectors[key] ?? vectors.hero);
}

export function projectedBoundsSpans(bounds, direction) {
  const corners = [
    { x: bounds.minX, z: bounds.minZ },
    { x: bounds.minX, z: bounds.maxZ },
    { x: bounds.maxX, z: bounds.minZ },
    { x: bounds.maxX, z: bounds.maxZ },
  ];
  const right = { x: -direction.z, z: direction.x };
  const horizontal = corners.map((point) => dot(point, right));
  const depth = corners.map((point) => dot(point, direction));

  return {
    horizontal: Math.max(...horizontal) - Math.min(...horizontal),
    depth: Math.max(...depth) - Math.min(...depth),
  };
}

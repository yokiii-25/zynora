import {
  buildOutlineFromWalls,
  isSelfIntersecting,
  polygonContainsPolygon,
  polygonBounds,
  sanitizePolygon,
  unionPolygons,
} from "./polygonMath.js";

export const FLOOR_PLAN_SCHEMA_VERSION = "zynora.floorplan.v1";

const EPSILON = 1e-6;
const ANGLE_COSINE = Math.cos((1.5 * Math.PI) / 180);
const OUTDOOR_ROOM_PATTERN =
  /outdoor|balcony|terrace|patio|porch|deck|garden|yard|veranda|loggia/i;

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function wallLength(wall) {
  return Math.hypot(wall.x2 - wall.x1, wall.z2 - wall.z1);
}

function wallUnit(wall) {
  const length = wallLength(wall);

  if (length < EPSILON) {
    return { x: 1, z: 0 };
  }

  return {
    x: (wall.x2 - wall.x1) / length,
    z: (wall.z2 - wall.z1) / length,
  };
}

function dot(point, axis) {
  return point.x * axis.x + point.z * axis.z;
}

function pointOnWall(wall, distance) {
  const unit = wallUnit(wall);

  return {
    x: wall.x1 + unit.x * distance,
    z: wall.z1 + unit.z * distance,
  };
}

function projectPoint(point, wall) {
  const unit = wallUnit(wall);

  return (
    (point.x - wall.x1) * unit.x +
    (point.z - wall.z1) * unit.z
  );
}

function distanceToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;

  if (lengthSquared < EPSILON) {
    return Math.hypot(point.x - start.x, point.z - start.z);
  }

  const amount = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.z - start.z) * dz) /
        lengthSquared,
    ),
  );

  return Math.hypot(
    point.x - (start.x + dx * amount),
    point.z - (start.z + dz * amount),
  );
}

function normalizeExteriorFlag(wall) {
  const direct =
    wall.isExterior ??
    wall.is_exterior ??
    wall.external ??
    wall.exterior;

  if (typeof direct === "boolean") {
    return direct;
  }

  const text = String(
    wall.wallClass ??
      wall.wall_class ??
      wall.className ??
      wall.kind ??
      wall.metadata?.wall_class ??
      "",
  );

  return /(^|\s)external(\s|$)/i.test(text);
}

function openingWorldGeometry(wall, opening) {
  const length = wallLength(wall);
  const start = Math.max(0, Math.min(length, finite(opening.start)));
  const end = Math.max(
    start,
    Math.min(length, finite(opening.end, start + finite(opening.width, 0))),
  );

  return {
    ...opening,
    worldStart: pointOnWall(wall, start),
    worldEnd: pointOnWall(wall, end),
  };
}

function remapOpenings(wall, openings) {
  const length = wallLength(wall);

  if (length < EPSILON) {
    return [];
  }

  return openings
    .map((opening, index) => {
      const first = projectPoint(opening.worldStart, wall);
      const second = projectPoint(opening.worldEnd, wall);
      const start = Math.max(0, Math.min(length, Math.min(first, second)));
      const end = Math.max(0, Math.min(length, Math.max(first, second)));
      const width = end - start;

      if (width < 0.08) {
        return null;
      }

      const bottom = Math.max(0, finite(opening.bottom));
      const height = Math.max(
        0.2,
        Math.min(
          finite(opening.height, finite(opening.top) - bottom),
          Math.max(wall.height - bottom, 0.2),
        ),
      );

      return {
        ...opening,
        id: opening.id ?? `${wall.id}-opening-${index}`,
        start,
        end,
        center: (start + end) / 2,
        width,
        bottom,
        height,
        top: bottom + height,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.start - right.start);
}

function mergeDuplicateOpenings(openings) {
  const merged = [];

  openings.forEach((opening) => {
    const previous = merged[merged.length - 1];
    const sameType = previous?.type === opening.type;
    const overlaps = previous && opening.start <= previous.end + 0.06;
    const sameHeight =
      previous &&
      Math.abs(previous.bottom - opening.bottom) <= 0.08 &&
      Math.abs(previous.top - opening.top) <= 0.08;

    if (!sameType || !overlaps || !sameHeight) {
      merged.push({ ...opening });
      return;
    }

    previous.start = Math.min(previous.start, opening.start);
    previous.end = Math.max(previous.end, opening.end);
    previous.center = (previous.start + previous.end) / 2;
    previous.width = previous.end - previous.start;
  });

  return merged;
}

function wallLineOffset(wall, normal) {
  return (
    (dot({ x: wall.x1, z: wall.z1 }, normal) +
      dot({ x: wall.x2, z: wall.z2 }, normal)) /
    2
  );
}

function projectedInterval(wall, axis) {
  const first = dot({ x: wall.x1, z: wall.z1 }, axis);
  const second = dot({ x: wall.x2, z: wall.z2 }, axis);

  return [Math.min(first, second), Math.max(first, second)];
}

function intervalsGap(left, right) {
  if (left[1] < right[0]) return right[0] - left[1];
  if (right[1] < left[0]) return left[0] - right[1];
  return 0;
}

function canMergeWalls(left, right) {
  const leftUnit = wallUnit(left);
  const rightUnit = wallUnit(right);
  const alignment = Math.abs(
    leftUnit.x * rightUnit.x + leftUnit.z * rightUnit.z,
  );

  if (alignment < ANGLE_COSINE) {
    return false;
  }

  if (left.isExterior !== right.isExterior) {
    return false;
  }

  const normal = { x: -leftUnit.z, z: leftUnit.x };
  const lineDistance = Math.abs(
    wallLineOffset(left, normal) - wallLineOffset(right, normal),
  );
  const lineTolerance = Math.max(
    0.025,
    Math.min(left.thickness, right.thickness) * 0.28,
  );

  if (lineDistance > lineTolerance) {
    return false;
  }

  const gap = intervalsGap(
    projectedInterval(left, leftUnit),
    projectedInterval(right, leftUnit),
  );

  return gap <= 0.035;
}

function mergeWallPair(left, right) {
  const axis = wallUnit(left);
  const normal = { x: -axis.z, z: axis.x };
  const intervals = [
    projectedInterval(left, axis),
    projectedInterval(right, axis),
  ];
  const startDistance = Math.min(intervals[0][0], intervals[1][0]);
  const endDistance = Math.max(intervals[0][1], intervals[1][1]);
  const leftLength = wallLength(left);
  const rightLength = wallLength(right);
  const totalLength = Math.max(leftLength + rightLength, EPSILON);
  const normalOffset =
    (wallLineOffset(left, normal) * leftLength +
      wallLineOffset(right, normal) * rightLength) /
    totalLength;
  const merged = {
    ...left,
    x1: axis.x * startDistance + normal.x * normalOffset,
    z1: axis.z * startDistance + normal.z * normalOffset,
    x2: axis.x * endDistance + normal.x * normalOffset,
    z2: axis.z * endDistance + normal.z * normalOffset,
    height: Math.max(left.height, right.height),
    thickness: Math.max(left.thickness, right.thickness),
    sourceIds: [
      ...(left.sourceIds ?? [left.sourceId ?? left.id]),
      ...(right.sourceIds ?? [right.sourceId ?? right.id]),
    ],
  };
  const worldOpenings = [
    ...(left.openings ?? []).map((opening) =>
      openingWorldGeometry(left, opening),
    ),
    ...(right.openings ?? []).map((opening) =>
      openingWorldGeometry(right, opening),
    ),
  ];

  merged.openings = mergeDuplicateOpenings(
    remapOpenings(merged, worldOpenings),
  );

  return merged;
}

export function mergeDuplicateWalls(walls) {
  const merged = walls.map((wall, index) => ({
    ...wall,
    id: wall.id ?? `wall-${index}`,
    isExterior: normalizeExteriorFlag(wall),
    openings: Array.isArray(wall.openings) ? wall.openings : [],
  }));
  let changed = true;

  while (changed) {
    changed = false;

    outer: for (let left = 0; left < merged.length; left += 1) {
      for (let right = left + 1; right < merged.length; right += 1) {
        if (!canMergeWalls(merged[left], merged[right])) {
          continue;
        }

        merged[left] = mergeWallPair(merged[left], merged[right]);
        merged.splice(right, 1);
        changed = true;
        break outer;
      }
    }
  }

  return merged;
}

function snapWallEndpoints(walls) {
  if (!walls.length) {
    return [];
  }

  const typicalThickness = Math.max(
    0.08,
    walls.reduce((sum, wall) => sum + wall.thickness, 0) / walls.length,
  );
  const tolerance = Math.max(0.055, Math.min(0.3, typicalThickness * 1.7));
  const endpoints = walls.flatMap((wall, wallIndex) => [
    { wallIndex, side: "start", x: wall.x1, z: wall.z1 },
    { wallIndex, side: "end", x: wall.x2, z: wall.z2 },
  ]);
  const parent = endpoints.map((_, index) => index);

  const root = (index) => {
    let current = index;

    while (parent[current] !== current) {
      parent[current] = parent[parent[current]];
      current = parent[current];
    }

    return current;
  };
  const unite = (left, right) => {
    const leftRoot = root(left);
    const rightRoot = root(right);

    if (leftRoot !== rightRoot) {
      parent[rightRoot] = leftRoot;
    }
  };

  for (let left = 0; left < endpoints.length; left += 1) {
    for (let right = left + 1; right < endpoints.length; right += 1) {
      if (endpoints[left].wallIndex === endpoints[right].wallIndex) {
        continue;
      }

      if (
        Math.hypot(
          endpoints[left].x - endpoints[right].x,
          endpoints[left].z - endpoints[right].z,
        ) <= tolerance
      ) {
        unite(left, right);
      }
    }
  }

  const clusters = new Map();

  endpoints.forEach((endpoint, index) => {
    const key = root(index);
    const cluster = clusters.get(key) ?? [];
    cluster.push(endpoint);
    clusters.set(key, cluster);
  });

  const snapped = walls.map((wall) => ({
    ...wall,
    openings: (wall.openings ?? []).map((opening) =>
      openingWorldGeometry(wall, opening),
    ),
  }));

  clusters.forEach((cluster) => {
    if (cluster.length < 2) {
      return;
    }

    const point = cluster.reduce(
      (sum, endpoint) => ({
        x: sum.x + endpoint.x / cluster.length,
        z: sum.z + endpoint.z / cluster.length,
      }),
      { x: 0, z: 0 },
    );

    cluster.forEach((endpoint) => {
      const wall = snapped[endpoint.wallIndex];

      if (endpoint.side === "start") {
        wall.x1 = point.x;
        wall.z1 = point.z;
      } else {
        wall.x2 = point.x;
        wall.z2 = point.z;
      }
    });
  });

  return snapped
    .filter((wall) => wallLength(wall) >= 0.04)
    .map((wall) => ({
      ...wall,
      openings: mergeDuplicateOpenings(
        remapOpenings(wall, wall.openings ?? []),
      ),
    }));
}

function wallMatchesOutline(wall, outline) {
  const midpoint = {
    x: (wall.x1 + wall.x2) / 2,
    z: (wall.z1 + wall.z2) / 2,
  };
  const wallDirection = wallUnit(wall);
  const tolerance = Math.max(0.12, wall.thickness * 1.2);

  return outline.some((start, index) => {
    const end = outline[(index + 1) % outline.length];
    const edgeLength = Math.hypot(end.x - start.x, end.z - start.z);

    if (edgeLength < EPSILON) {
      return false;
    }

    const edgeDirection = {
      x: (end.x - start.x) / edgeLength,
      z: (end.z - start.z) / edgeLength,
    };
    const parallel = Math.abs(
      wallDirection.x * edgeDirection.x +
        wallDirection.z * edgeDirection.z,
    );

    return (
      parallel >= 0.97 &&
      distanceToSegment(midpoint, start, end) <= tolerance
    );
  });
}

function inferExteriorWalls(walls, outline) {
  const explicitlyExterior = walls.filter((wall) => wall.isExterior);

  if (explicitlyExterior.length >= 3) {
    return walls;
  }

  return walls.map((wall) => ({
    ...wall,
    isExterior:
      wall.isExterior ||
      (outline.length >= 3 && wallMatchesOutline(wall, outline)),
  }));
}

function graphSummary(walls, tolerance = 0.08) {
  const nodes = [];

  const nodeFor = (point) => {
    const found = nodes.findIndex(
      (node) =>
        Math.hypot(node.x - point.x, node.z - point.z) <= tolerance,
    );

    if (found >= 0) {
      return found;
    }

    nodes.push({ ...point, degree: 0, neighbors: [] });
    return nodes.length - 1;
  };

  walls.forEach((wall) => {
    const start = nodeFor({ x: wall.x1, z: wall.z1 });
    const end = nodeFor({ x: wall.x2, z: wall.z2 });
    nodes[start].degree += 1;
    nodes[end].degree += 1;
    nodes[start].neighbors.push(end);
    nodes[end].neighbors.push(start);
  });

  const visited = new Set();
  const queue = nodes.length ? [0] : [];

  while (queue.length) {
    const current = queue.shift();

    if (visited.has(current)) {
      continue;
    }

    visited.add(current);
    nodes[current].neighbors.forEach((neighbor) => {
      if (!visited.has(neighbor)) queue.push(neighbor);
    });
  }

  return {
    nodes,
    connected: nodes.length > 0 && visited.size === nodes.length,
    closed:
      walls.length >= 3 &&
      nodes.length >= 3 &&
      visited.size === nodes.length &&
      nodes.every((node) => node.degree === 2),
    openNodes: nodes.filter((node) => node.degree !== 2).length,
  };
}

function sourceWallForEdge(start, end, walls) {
  const edgeLength = Math.hypot(end.x - start.x, end.z - start.z);

  if (edgeLength < EPSILON) {
    return null;
  }

  const direction = {
    x: (end.x - start.x) / edgeLength,
    z: (end.z - start.z) / edgeLength,
  };
  const midpoint = {
    x: (start.x + end.x) / 2,
    z: (start.z + end.z) / 2,
  };
  let best = null;

  walls.forEach((wall) => {
    const wallDirection = wallUnit(wall);
    const parallel = Math.abs(
      direction.x * wallDirection.x + direction.z * wallDirection.z,
    );

    if (parallel < 0.94) {
      return;
    }

    const distance = distanceToSegment(
      midpoint,
      { x: wall.x1, z: wall.z1 },
      { x: wall.x2, z: wall.z2 },
    );

    if (!best || distance < best.distance) {
      best = { wall, distance };
    }
  });

  return best?.distance <= 0.45 ? best.wall : null;
}

function shellFromOutline(outline, sourceWalls, allWalls) {
  const fallbackHeight = Math.max(
    2.4,
    ...allWalls.map((wall) => finite(wall.height, 2.8)),
  );
  const fallbackThickness = Math.max(
    0.12,
    sourceWalls.reduce((sum, wall) => sum + wall.thickness, 0) /
      Math.max(sourceWalls.length, 1),
  );

  return outline.map((start, index) => {
    const end = outline[(index + 1) % outline.length];
    const source = sourceWallForEdge(start, end, sourceWalls);
    const shellWall = {
      ...(source ?? {}),
      id: `shell-wall-${index}`,
      sourceId: source?.sourceId ?? `outline-${index}`,
      x1: start.x,
      z1: start.z,
      x2: end.x,
      z2: end.z,
      height: source?.height ?? fallbackHeight,
      thickness: source?.thickness ?? fallbackThickness,
      color: source?.color ?? "#e8e1d6",
      isExterior: true,
      kind: "exterior",
      openings: [],
    };

    if (source) {
      const worldOpenings = (source.openings ?? []).map((opening) =>
        openingWorldGeometry(source, opening),
      );
      shellWall.openings = remapOpenings(shellWall, worldOpenings);
    }

    return shellWall;
  });
}

export function isIndoorRoom(room) {
  if (typeof room?.isOutdoor === "boolean") {
    return !room.isOutdoor;
  }

  const structuralType =
    room?.structuralRoomType ?? room?.originalRoomType;

  if (structuralType) {
    return !OUTDOOR_ROOM_PATTERN.test(String(structuralType));
  }

  const roomDescription = String(
    room?.roomType ??
      room?.roomName ??
      room?.predicted_room_type ??
      room?.type ??
      "Room",
  );

  return !OUTDOOR_ROOM_PATTERN.test(roomDescription);
}

function validIndoorRooms(rooms) {
  return (Array.isArray(rooms) ? rooms : []).filter(
    (room) =>
      isIndoorRoom(room) &&
      sanitizePolygon(room?.outline).length >= 3,
  );
}

function roomsOutsideOutline(rooms, outline) {
  return validIndoorRooms(rooms).filter(
    (room) => !polygonContainsPolygon(outline, room.outline, 0.08),
  );
}

function nearestPointOnSegment(point, start, end) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;
  const amount = lengthSquared < EPSILON
    ? 0
    : Math.max(
        0,
        Math.min(
          1,
          ((point.x - start.x) * dx + (point.z - start.z) * dz) /
            lengthSquared,
        ),
      );

  return {
    x: start.x + dx * amount,
    z: start.z + dz * amount,
  };
}

function closestPointsBetweenPolygons(left, right) {
  let closest = null;

  const consider = (first, second) => {
    const distance = Math.hypot(first.x - second.x, first.z - second.z);

    if (!closest || distance < closest.distance) {
      closest = { first, second, distance };
    }
  };

  left.forEach((point) => {
    right.forEach((start, index) => {
      consider(
        point,
        nearestPointOnSegment(
          point,
          start,
          right[(index + 1) % right.length],
        ),
      );
    });
  });

  right.forEach((point) => {
    left.forEach((start, index) => {
      consider(
        nearestPointOnSegment(
          point,
          start,
          left[(index + 1) % left.length],
        ),
        point,
      );
    });
  });

  return closest;
}

function bridgePolygon(first, second, width) {
  const dx = second.x - first.x;
  const dz = second.z - first.z;
  const length = Math.hypot(dx, dz);

  if (length < EPSILON) {
    return [];
  }

  const ux = dx / length;
  const uz = dz / length;
  const nx = -uz;
  const nz = ux;
  const halfWidth = width / 2;
  const overlap = Math.min(0.025, length * 0.2);
  const start = {
    x: first.x - ux * overlap,
    z: first.z - uz * overlap,
  };
  const end = {
    x: second.x + ux * overlap,
    z: second.z + uz * overlap,
  };

  return [
    { x: start.x + nx * halfWidth, z: start.z + nz * halfWidth },
    { x: end.x + nx * halfWidth, z: end.z + nz * halfWidth },
    { x: end.x - nx * halfWidth, z: end.z - nz * halfWidth },
    { x: start.x - nx * halfWidth, z: start.z - nz * halfWidth },
  ];
}

function connectNearbyComponents(components, maxGap, bridgeWidth) {
  let connected = components;
  let bridgesAdded = 0;

  while (connected.length > 1 && bridgesAdded < 24) {
    let nearest = null;

    for (let left = 0; left < connected.length; left += 1) {
      for (let right = left + 1; right < connected.length; right += 1) {
        const candidate = closestPointsBetweenPolygons(
          connected[left],
          connected[right],
        );

        if (!nearest || candidate.distance < nearest.distance) {
          nearest = candidate;
        }
      }
    }

    if (!nearest || nearest.distance > maxGap) {
      break;
    }

    const bridge = bridgePolygon(
      nearest.first,
      nearest.second,
      bridgeWidth,
    );

    if (bridge.length < 3) {
      break;
    }

    const next = unionPolygons([...connected, bridge]);

    if (next.length >= connected.length) {
      break;
    }

    connected = next;
    bridgesAdded += 1;
  }

  return { components: connected, bridgesAdded };
}

function repairOutlineWithRooms(outline, rooms, walls) {
  const indoorRooms = validIndoorRooms(rooms);
  const outsideBeforeRepair = roomsOutsideOutline(indoorRooms, outline);

  if (!outsideBeforeRepair.length) {
    return {
      outline,
      repaired: false,
      indoorRooms: indoorRooms.length,
      outsideBeforeRepair: 0,
      disconnectedComponents: 0,
    };
  }

  const initialComponents = unionPolygons([
    outline,
    ...indoorRooms.map((room) => room.outline),
  ]);
  const typicalThickness = (Array.isArray(walls) ? walls : []).reduce(
    (sum, wall) => sum + finite(wall.thickness, 0.16),
    0,
  ) / Math.max(walls?.length ?? 0, 1);
  const connection = connectNearbyComponents(
    initialComponents,
    Math.max(0.28, Math.min(0.65, typicalThickness * 2.4)),
    Math.max(0.04, Math.min(0.12, typicalThickness * 0.4)),
  );
  const components = connection.components;
  const repairedOutline = components.find((candidate) =>
    indoorRooms.every((room) =>
      polygonContainsPolygon(candidate, room.outline, 0.08),
    ),
  );

  return {
    outline: repairedOutline ?? outline,
    repaired: Boolean(repairedOutline),
    indoorRooms: indoorRooms.length,
    outsideBeforeRepair: outsideBeforeRepair.length,
    disconnectedComponents: Math.max(0, initialComponents.length - 1),
    bridgesAdded: connection.bridgesAdded,
  };
}

export function processWallTopology({ walls, outline, rooms = [] }) {
  const originalCount = walls.length;
  const safeOutline = sanitizePolygon(outline);
  const merged = mergeDuplicateWalls(walls);
  const snapped = snapWallEndpoints(merged);
  const classified = inferExteriorWalls(snapped, safeOutline);
  const exteriorWalls = classified.filter((wall) => wall.isExterior);
  const exteriorGraph = graphSummary(exteriorWalls);
  let exteriorOutline = exteriorGraph.closed
    ? sanitizePolygon(buildOutlineFromWalls(exteriorWalls))
    : safeOutline;

  if (exteriorOutline.length < 3) {
    exteriorOutline = sanitizePolygon(
      buildOutlineFromWalls(exteriorWalls.length ? exteriorWalls : classified),
    );
  }

  const repair = repairOutlineWithRooms(exteriorOutline, rooms, classified);
  const averageThickness = classified.reduce(
    (sum, wall) => sum + finite(wall.thickness, 0.16),
    0,
  ) / Math.max(classified.length, 1);
  const simplificationTolerance = Math.max(
    0.04,
    Math.min(0.065, averageThickness * 0.25),
  );
  const repairedOutline = sanitizePolygon(repair.outline);
  const simplifiedOutline = sanitizePolygon(
    repairedOutline,
    simplificationTolerance,
  );
  const simplificationIsSafe =
    simplifiedOutline.length >= 3 &&
    roomsOutsideOutline(validIndoorRooms(rooms), simplifiedOutline).length ===
      0;
  exteriorOutline = simplificationIsSafe
    ? simplifiedOutline
    : repairedOutline;
  const outlineChanged =
    exteriorOutline.length !== repairedOutline.length ||
    exteriorOutline.some(
      (point, index) =>
        Math.hypot(
          point.x - repairedOutline[index]?.x,
          point.z - repairedOutline[index]?.z,
        ) > 1e-5,
    );
  let shellWalls = exteriorGraph.closed && !repair.repaired && !outlineChanged
    ? exteriorWalls.map((wall) => ({ ...wall, kind: "exterior" }))
    : shellFromOutline(exteriorOutline, exteriorWalls, classified);
  const orderedThicknesses = shellWalls
    .map((wall) => finite(wall.thickness, averageThickness))
    .filter((value) => value > 0)
    .sort((left, right) => left - right);
  const shellThickness = orderedThicknesses.length
    ? orderedThicknesses[Math.floor(orderedThicknesses.length / 2)]
    : Math.max(averageThickness, 0.12);
  shellWalls = shellWalls.map((wall) => ({
    ...wall,
    thickness: shellThickness,
  }));
  const shellGraph = graphSummary(shellWalls, 0.0001);

  return {
    walls: classified,
    shellWalls,
    exteriorOutline,
    stats: {
      sourceWalls: originalCount,
      mergedWalls: classified.length,
      duplicateWallsRemoved: Math.max(0, originalCount - classified.length),
      exteriorWalls: shellWalls.length,
      exteriorShellClosed: shellGraph.closed,
      exteriorOpenNodes: shellGraph.openNodes,
      shellRepairedFromRooms: repair.repaired,
      indoorRooms: repair.indoorRooms,
      roomsOutsideOriginalShell: repair.outsideBeforeRepair,
      disconnectedShellComponents: repair.disconnectedComponents,
      shellBridgesAdded: repair.bridgesAdded ?? 0,
    },
  };
}

function openingErrors(wall) {
  const errors = [];
  const warnings = [];
  const length = wallLength(wall);
  const openings = [...(wall.openings ?? [])].sort(
    (left, right) => left.start - right.start,
  );

  openings.forEach((opening) => {
    if (
      opening.start < -0.01 ||
      opening.end > length + 0.01 ||
      opening.end <= opening.start
    ) {
      errors.push(`${opening.id} lies outside ${wall.id}.`);
    }

    if (opening.bottom < -0.01 || opening.top > wall.height + 0.01) {
      errors.push(`${opening.id} has an invalid vertical range.`);
    }
  });

  for (let index = 1; index < openings.length; index += 1) {
    if (openings[index].start < openings[index - 1].end - 0.03) {
      warnings.push(
        `${openings[index - 1].id} overlaps ${openings[index].id}.`,
      );
    }
  }

  return { errors, warnings };
}

function validateSingleFloorGeometry(plan) {
  const errors = [];
  const warnings = [];
  const outline = sanitizePolygon(plan.exteriorOutline ?? plan.outline);
  const walls = Array.isArray(plan.walls) ? plan.walls : [];
  const shellWalls = Array.isArray(plan.shellWalls) ? plan.shellWalls : [];
  const rooms = Array.isArray(plan.rooms) ? plan.rooms : [];

  if (outline.length < 3) {
    errors.push("The building exterior outline is missing or invalid.");
  } else if (isSelfIntersecting(outline)) {
    errors.push("The building exterior outline intersects itself.");
  }

  if (!walls.length) {
    errors.push("No valid walls were found.");
  }

  walls.forEach((wall) => {
    if (wallLength(wall) < 0.04) {
      errors.push(`${wall.id} is too short to render.`);
    }

    if (wall.height <= 0 || wall.thickness <= 0) {
      errors.push(`${wall.id} has invalid dimensions.`);
    }

    const openingValidation = openingErrors(wall);
    errors.push(...openingValidation.errors);
    warnings.push(...openingValidation.warnings);
  });

  const shellGraph = graphSummary(shellWalls, 0.0001);

  if (!shellGraph.closed) {
    errors.push("The exterior wall shell is not a closed loop.");
  }

  shellWalls.forEach((wall) => {
    if (wallLength(wall) < 0.04) {
      errors.push(`${wall.id} is too short to use in the exterior shell.`);
    }

    if (wall.height <= 0 || wall.thickness <= 0) {
      errors.push(`${wall.id} has invalid exterior-shell dimensions.`);
    }
  });

  const indoorRooms = validIndoorRooms(rooms);
  const outsideRooms = roomsOutsideOutline(indoorRooms, outline);

  if (outsideRooms.length) {
    errors.push(
      `${outsideRooms.length} indoor room(s) lie outside the exterior shell: ${outsideRooms
        .map((room) => room.id ?? room.room_id ?? "unknown-room")
        .join(", ")}.`,
    );
  }

  const classifiedRooms = rooms.filter(
    (room) => room.classificationMatched,
  ).length;
  const lowConfidenceRooms = rooms.filter(
    (room) =>
      room.classificationMatched && finite(room.confidence, 1) < 0.5,
  ).length;

  if (rooms.length && classifiedRooms < rooms.length) {
    warnings.push(
      `${rooms.length - classifiedRooms} room(s) have no V5 classification match.`,
    );
  }

  if (lowConfidenceRooms) {
    warnings.push(
      `${lowConfidenceRooms} room classification(s) are below 50% confidence.`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      rooms: rooms.length,
      classifiedRooms,
      lowConfidenceRooms,
      walls: walls.length,
      exteriorWalls: shellWalls.length,
      doors: walls.reduce(
        (count, wall) =>
          count +
          (wall.openings ?? []).filter((opening) => opening.type === "door")
            .length,
        0,
      ),
      windows: walls.reduce(
        (count, wall) =>
          count +
          (wall.openings ?? []).filter(
            (opening) => opening.type === "window",
          ).length,
        0,
      ),
      shellClosed: shellGraph.closed,
      indoorRooms: indoorRooms.length,
      roomsOutsideShell: outsideRooms.length,
    },
  };
}

function prefixMessages(floor, messages) {
  const floorId = String(floor.floorId ?? floor.id ?? "floor");
  return messages.map((message) => `${floorId}: ${message}`);
}

function sumStat(results, key) {
  return results.reduce(
    (total, result) => total + finite(result.stats?.[key]),
    0,
  );
}

export function validateFloorPlanGeometry(plan) {
  const suppliedFloors = Array.isArray(plan?.floors)
    ? plan.floors
    : [];

  if (!suppliedFloors.length) {
    const result = validateSingleFloorGeometry(plan ?? {});
    const declaredFloorCount = Math.max(
      1,
      Math.round(finite(plan?.floorCount ?? plan?.metadata?.floorCount, 1)),
    );

    if (declaredFloorCount !== 1) {
      result.errors.push(
        `The plan declares ${declaredFloorCount} floors but contains only 1 parsed floor.`,
      );
      result.valid = false;
    }

    return result;
  }

  const floorResults = suppliedFloors.map((floor) =>
    validateSingleFloorGeometry(floor),
  );
  const errors = floorResults.flatMap((result, index) =>
    prefixMessages(suppliedFloors[index], result.errors),
  );
  const warnings = floorResults.flatMap((result, index) =>
    prefixMessages(suppliedFloors[index], result.warnings),
  );
  const declaredFloorCount = Math.max(
    1,
    Math.round(
      finite(
        plan.floorCount ?? plan.metadata?.floorCount,
        suppliedFloors.length,
      ),
    ),
  );

  if (declaredFloorCount !== suppliedFloors.length) {
    errors.push(
      `The plan declares ${declaredFloorCount} floors but contains ${suppliedFloors.length} parsed floor(s).`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    floorResults: Object.fromEntries(
      suppliedFloors.map((floor, index) => [
        String(floor.floorId ?? floor.id ?? `floor-${index + 1}`),
        floorResults[index],
      ]),
    ),
    stats: {
      floors: suppliedFloors.length,
      rooms: sumStat(floorResults, "rooms"),
      classifiedRooms: sumStat(floorResults, "classifiedRooms"),
      lowConfidenceRooms: sumStat(floorResults, "lowConfidenceRooms"),
      walls: sumStat(floorResults, "walls"),
      exteriorWalls: sumStat(floorResults, "exteriorWalls"),
      doors: sumStat(floorResults, "doors"),
      windows: sumStat(floorResults, "windows"),
      indoorRooms: sumStat(floorResults, "indoorRooms"),
      roomsOutsideShell: sumStat(floorResults, "roomsOutsideShell"),
      shellClosed: floorResults.every((result) => result.stats.shellClosed),
    },
  };
}

function copyPoint(point) {
  return {
    x: Number(point.x.toFixed(5)),
    z: Number(point.z.toFixed(5)),
  };
}

function canonicalOpening(wall, opening) {
  return {
    id: String(opening.id),
    wallId: String(wall.id),
    type: opening.type === "window" ? "window" : "door",
    offset: Number(opening.start.toFixed(5)),
    width: Number(opening.width.toFixed(5)),
    bottom: Number(opening.bottom.toFixed(5)),
    height: Number(opening.height.toFixed(5)),
  };
}

function canonicalWall(wall) {
  return {
    id: String(wall.id),
    start: copyPoint({ x: wall.x1, z: wall.z1 }),
    end: copyPoint({ x: wall.x2, z: wall.z2 }),
    height: Number(wall.height.toFixed(5)),
    thickness: Number(wall.thickness.toFixed(5)),
    isExterior: Boolean(wall.isExterior),
    material: {
      color: wall.color ?? "#eee9e1",
    },
    openings: (wall.openings ?? []).map((opening) =>
      canonicalOpening(wall, opening),
    ),
  };
}

function canonicalRoom(room) {
  return {
    id: String(room.id ?? room.room_id),
    type: String(
      room.roomType ?? room.predicted_room_type ?? room.type ?? "Room",
    ),
    outline: (room.outline ?? []).map(copyPoint),
    area: Number(finite(room.area).toFixed(5)),
    classification: room.classificationMatched
      ? {
          modelVersion: room.modelVersion ?? "v5",
          predictedType: String(room.predicted_room_type ?? room.roomType),
          confidence: Number(finite(room.confidence).toFixed(6)),
          status: String(room.confidence_status ?? "unknown"),
        }
      : null,
  };
}

function canonicalFloor(plan, index) {
  const outline = (plan.exteriorOutline ?? plan.outline).map(copyPoint);
  const floorId = String(plan.floorId ?? plan.id ?? `floor-${index + 1}`);
  const elevation = finite(plan.elevation);
  const roof = plan.roof ?? {};
  const slab = plan.slab ?? {};

  return {
    id: floorId,
    level: Math.round(finite(plan.floorIndex ?? plan.level, index)),
    elevation: Number(elevation.toFixed(5)),
    height: Number(plan.height.toFixed(5)),
    outline,
    rooms: (plan.rooms ?? []).map(canonicalRoom),
    walls: (plan.walls ?? []).map(canonicalWall),
    exteriorWalls: (plan.shellWalls ?? []).map(canonicalWall),
    slabs: [
      {
        id: String(slab.id ?? `${floorId}-slab`),
        outline,
        elevation: Number(
          (elevation + finite(slab.elevation, -0.16)).toFixed(5),
        ),
        thickness: finite(slab.thickness, 0.18),
      },
    ],
    roof: {
      id: String(roof.id ?? `${floorId}-roof`),
      type: String(roof.type ?? "flat"),
      outline,
      elevation: Number(
        (elevation + finite(roof.elevation, plan.height)).toFixed(5),
      ),
      thickness: finite(roof.thickness, 0.22),
      parapetHeight: finite(roof.parapetHeight, 0.35),
    },
  };
}

export function createFloorPlanDocument(plan, validation) {
  const floorPlans = Array.isArray(plan.floors) && plan.floors.length
    ? plan.floors
    : [plan];
  const floors = floorPlans.map(canonicalFloor);
  const activeFloorId = String(
    plan.activeFloorId ?? plan.floorId ?? floors[0].id,
  );

  return {
    schemaVersion: FLOOR_PLAN_SCHEMA_VERSION,
    id: String(plan.id ?? "zynora-floor-plan"),
    unit: "m",
    coordinateSystem: "x-right_y-up_z-forward",
    metadata: {
      source: String(plan.sourceType ?? "svg"),
      floorCount: floors.length,
      activeFloorId,
      roomClassifier: plan.classifierVersion ?? "v5",
    },
    floors,
    validation,
  };
}

export function exteriorBounds(plan) {
  return polygonBounds(plan.exteriorOutline ?? plan.outline);
}

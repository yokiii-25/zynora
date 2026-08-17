import polygonClipping from "polygon-clipping";

const EPSILON = 1e-5;

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

export function toPoint(value) {
  if (Array.isArray(value) && value.length >= 2) {
    const x = Number(value[0]);
    const z = Number(value[1]);

    return Number.isFinite(x) && Number.isFinite(z)
      ? { x, z }
      : null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const xValue =
    value.x ??
    value.left ??
    value.lng ??
    value.longitude;

  const zValue =
    value.z ??
    value.y ??
    value.top ??
    value.lat ??
    value.latitude;

  if (!isFiniteNumber(xValue) || !isFiniteNumber(zValue)) {
    return null;
  }

  return {
    x: Number(xValue),
    z: Number(zValue),
  };
}

function distanceSquared(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

function samePoint(a, b, tolerance = EPSILON) {
  return distanceSquared(a, b) <= tolerance * tolerance;
}

export function polygonArea(points) {
  if (!Array.isArray(points) || points.length < 3) {
    return 0;
  }

  let twiceArea = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    twiceArea += current.x * next.z - next.x * current.z;
  }

  return twiceArea / 2;
}

function removeCollinearPoints(points, tolerance) {
  let result = [...points];
  let changed = true;

  while (changed && result.length > 3) {
    changed = false;
    const nextResult = [];

    for (let index = 0; index < result.length; index += 1) {
      const previous = result[(index - 1 + result.length) % result.length];
      const current = result[index];
      const next = result[(index + 1) % result.length];

      const ax = current.x - previous.x;
      const az = current.z - previous.z;
      const bx = next.x - current.x;
      const bz = next.z - current.z;
      const cross = ax * bz - az * bx;
      const scale = Math.max(
        Math.hypot(ax, az) * Math.hypot(bx, bz),
        1
      );
      const continuesForward = ax * bx + az * bz >= -tolerance;

      if (Math.abs(cross) <= tolerance * scale && continuesForward) {
        changed = true;
      } else {
        nextResult.push(current);
      }
    }

    result = nextResult;
  }

  return result;
}

function orientation(a, b, c) {
  return (
    (b.x - a.x) * (c.z - a.z) -
    (b.z - a.z) * (c.x - a.x)
  );
}

function onSegment(a, b, point) {
  return (
    point.x >= Math.min(a.x, b.x) - EPSILON &&
    point.x <= Math.max(a.x, b.x) + EPSILON &&
    point.z >= Math.min(a.z, b.z) - EPSILON &&
    point.z <= Math.max(a.z, b.z) + EPSILON
  );
}

function segmentsIntersect(a, b, c, d) {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);

  if (
    ((o1 > EPSILON && o2 < -EPSILON) ||
      (o1 < -EPSILON && o2 > EPSILON)) &&
    ((o3 > EPSILON && o4 < -EPSILON) ||
      (o3 < -EPSILON && o4 > EPSILON))
  ) {
    return true;
  }

  return (
    (Math.abs(o1) <= EPSILON && onSegment(a, b, c)) ||
    (Math.abs(o2) <= EPSILON && onSegment(a, b, d)) ||
    (Math.abs(o3) <= EPSILON && onSegment(c, d, a)) ||
    (Math.abs(o4) <= EPSILON && onSegment(c, d, b))
  );
}

export function isSelfIntersecting(points) {
  if (!Array.isArray(points) || points.length < 4) {
    return false;
  }

  for (let first = 0; first < points.length; first += 1) {
    const firstNext = (first + 1) % points.length;

    for (let second = first + 1; second < points.length; second += 1) {
      const secondNext = (second + 1) % points.length;

      if (
        first === second ||
        firstNext === second ||
        secondNext === first
      ) {
        continue;
      }

      if (
        segmentsIntersect(
          points[first],
          points[firstNext],
          points[second],
          points[secondNext]
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

export function convexHull(points) {
  const unique = [];

  [...points]
    .sort((a, b) => a.x - b.x || a.z - b.z)
    .forEach((point) => {
      if (!unique.some((candidate) => samePoint(candidate, point))) {
        unique.push(point);
      }
    });

  if (unique.length <= 3) {
    return unique;
  }

  const buildHalf = (values) => {
    const half = [];

    values.forEach((point) => {
      while (
        half.length >= 2 &&
        orientation(half[half.length - 2], half[half.length - 1], point) <= 0
      ) {
        half.pop();
      }

      half.push(point);
    });

    return half;
  };

  const lower = buildHalf(unique);
  const upper = buildHalf([...unique].reverse());

  lower.pop();
  upper.pop();

  return [...lower, ...upper];
}

export function sanitizePolygon(values, tolerance = EPSILON) {
  const points = [];

  (Array.isArray(values) ? values : []).forEach((value) => {
    const point = toPoint(value);

    if (!point) {
      return;
    }

    if (!points.length || !samePoint(points[points.length - 1], point, tolerance)) {
      points.push(point);
    }
  });

  if (points.length > 1 && samePoint(points[0], points[points.length - 1], tolerance)) {
    points.pop();
  }

  const cleaned = removeCollinearPoints(points, tolerance);

  if (cleaned.length < 3) {
    return [];
  }

  if (isSelfIntersecting(cleaned)) {
    return convexHull(cleaned);
  }

  return polygonArea(cleaned) < 0
    ? [...cleaned].reverse()
    : cleaned;
}

function closedCoordinateRing(polygon) {
  const ring = polygon.map((point) => [point.x, point.z]);

  if (ring.length) {
    ring.push([...ring[0]]);
  }

  return ring;
}

export function unionPolygons(values) {
  const polygons = (Array.isArray(values) ? values : [])
    .map((value) => sanitizePolygon(value))
    .filter((polygon) => polygon.length >= 3);

  if (!polygons.length) {
    return [];
  }

  const union = polygonClipping.union(
    ...polygons.map((polygon) => [closedCoordinateRing(polygon)]),
  );

  return union
    .map((polygon) =>
      sanitizePolygon(
        (polygon[0] ?? []).map(([x, z]) => ({ x, z })),
      ),
    )
    .filter((polygon) => polygon.length >= 3)
    .sort((left, right) =>
      Math.abs(polygonArea(right)) - Math.abs(polygonArea(left)),
    );
}

export function polygonContainsPolygon(
  container,
  candidate,
  tolerance = 0.03,
) {
  const safeContainer = sanitizePolygon(container);
  const safeCandidate = sanitizePolygon(candidate);

  if (safeContainer.length < 3 || safeCandidate.length < 3) {
    return false;
  }

  return safeCandidate.every(
    (point) =>
      pointInPolygon(point, safeContainer) ||
      distanceToPolygon(point, safeContainer) <= tolerance,
  );
}

export function polygonBounds(points) {
  if (!Array.isArray(points) || !points.length) {
    return {
      minX: -0.5,
      maxX: 0.5,
      minZ: -0.5,
      maxZ: 0.5,
      width: 1,
      depth: 1,
      centerX: 0,
      centerZ: 0,
    };
  }

  const xs = points.map((point) => point.x);
  const zs = points.map((point) => point.z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);

  return {
    minX,
    maxX,
    minZ,
    maxZ,
    width: Math.max(maxX - minX, EPSILON),
    depth: Math.max(maxZ - minZ, EPSILON),
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
  };
}

export function polygonCentroid(points) {
  const area = polygonArea(points);

  if (Math.abs(area) < EPSILON) {
    const count = Math.max(points.length, 1);
    return points.reduce(
      (sum, point) => ({
        x: sum.x + point.x / count,
        z: sum.z + point.z / count,
      }),
      { x: 0, z: 0 }
    );
  }

  let x = 0;
  let z = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const factor = current.x * next.z - next.x * current.z;
    x += (current.x + next.x) * factor;
    z += (current.z + next.z) * factor;
  }

  return {
    x: x / (6 * area),
    z: z / (6 * area),
  };
}

export function pointInPolygon(point, polygon) {
  let inside = false;

  for (
    let current = 0, previous = polygon.length - 1;
    current < polygon.length;
    previous = current, current += 1
  ) {
    const a = polygon[current];
    const b = polygon[previous];

    if (
      Math.abs(orientation(a, b, point)) <= EPSILON &&
      onSegment(a, b, point)
    ) {
      return true;
    }

    const crosses =
      (a.z > point.z) !== (b.z > point.z) &&
      point.x <
        ((b.x - a.x) * (point.z - a.z)) /
          (b.z - a.z || EPSILON) +
        a.x;

    if (crosses) {
      inside = !inside;
    }
  }

  return inside;
}

function distanceToSegment(point, a, b) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lengthSquared = dx * dx + dz * dz;

  if (lengthSquared <= EPSILON) {
    return Math.hypot(point.x - a.x, point.z - a.z);
  }

  const amount = Math.max(
    0,
    Math.min(
      1,
      ((point.x - a.x) * dx + (point.z - a.z) * dz) /
        lengthSquared
    )
  );

  const nearestX = a.x + amount * dx;
  const nearestZ = a.z + amount * dz;

  return Math.hypot(point.x - nearestX, point.z - nearestZ);
}

export function distanceToPolygon(point, polygon) {
  let distance = Infinity;

  for (let index = 0; index < polygon.length; index += 1) {
    distance = Math.min(
      distance,
      distanceToSegment(
        point,
        polygon[index],
        polygon[(index + 1) % polygon.length]
      )
    );
  }

  return distance;
}

export function findInteriorPoint(polygon) {
  const bounds = polygonBounds(polygon);
  const centroid = polygonCentroid(polygon);
  const candidates = [
    centroid,
    { x: bounds.centerX, z: bounds.centerZ },
  ];
  const divisions = 18;

  for (let row = 1; row < divisions; row += 1) {
    for (let column = 1; column < divisions; column += 1) {
      candidates.push({
        x: bounds.minX + (bounds.width * column) / divisions,
        z: bounds.minZ + (bounds.depth * row) / divisions,
      });
    }
  }

  let best = null;

  candidates.forEach((candidate) => {
    if (!pointInPolygon(candidate, polygon)) {
      return;
    }

    const clearance = distanceToPolygon(candidate, polygon);

    if (!best || clearance > best.clearance) {
      best = {
        ...candidate,
        clearance,
      };
    }
  });

  return best ?? {
    x: bounds.centerX,
    z: bounds.centerZ,
    clearance: Math.min(bounds.width, bounds.depth) / 4,
  };
}

export function longestEdgeRotation(polygon) {
  let longest = null;

  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index];
    const end = polygon[(index + 1) % polygon.length];
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.hypot(dx, dz);

    if (!longest || length > longest.length) {
      longest = {
        length,
        rotation: -Math.atan2(dz, dx),
      };
    }
  }

  return longest?.rotation ?? 0;
}

export function buildOutlineFromWalls(walls) {
  if (!Array.isArray(walls) || walls.length < 3) {
    return [];
  }

  const endpointValues = walls.flatMap((wall) => [
    { x: wall.x1, z: wall.z1 },
    { x: wall.x2, z: wall.z2 },
  ]);
  const bounds = polygonBounds(endpointValues);
  const tolerance = Math.max(bounds.width, bounds.depth, 1) * 1e-4;
  const nodes = [];

  const nodeFor = (point) => {
    const existing = nodes.findIndex((node) =>
      samePoint(node.point, point, tolerance)
    );

    if (existing >= 0) {
      return existing;
    }

    nodes.push({
      point: { ...point },
      edges: [],
    });

    return nodes.length - 1;
  };

  const edges = walls.map((wall, index) => {
    const start = nodeFor({ x: wall.x1, z: wall.z1 });
    const end = nodeFor({ x: wall.x2, z: wall.z2 });
    const edge = { index, start, end };
    nodes[start].edges.push(edge);
    nodes[end].edges.push(edge);
    return edge;
  });

  const cycleNodes = nodes.filter((node) => node.edges.length === 2);

  if (cycleNodes.length === nodes.length) {
    let current = nodes
      .map((node, index) => ({ ...node, index }))
      .sort((a, b) => a.point.z - b.point.z || a.point.x - b.point.x)[0]
      .index;
    const start = current;
    const used = new Set();
    const ordered = [];

    while (ordered.length <= edges.length) {
      ordered.push(nodes[current].point);

      const nextEdge = nodes[current].edges.find(
        (edge) => !used.has(edge.index)
      );

      if (!nextEdge) {
        break;
      }

      used.add(nextEdge.index);
      current = nextEdge.start === current
        ? nextEdge.end
        : nextEdge.start;

      if (current === start) {
        break;
      }
    }

    if (current === start && ordered.length >= 3) {
      return sanitizePolygon(ordered, tolerance);
    }
  }

  return convexHull(endpointValues);
}

const MIN_REGISTRATION_WALL_LENGTH = 0.45;
const PARALLEL_DOT = Math.cos((6 * Math.PI) / 180);
const LINE_TOLERANCE = 0.3;

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function wallPoints(wall) {
  const start = wall?.start ?? {
    x: wall?.x1,
    z: wall?.z1,
  };
  const end = wall?.end ?? {
    x: wall?.x2,
    z: wall?.z2,
  };

  if (
    !Number.isFinite(Number(start?.x)) ||
    !Number.isFinite(Number(start?.z)) ||
    !Number.isFinite(Number(end?.x)) ||
    !Number.isFinite(Number(end?.z))
  ) {
    return null;
  }

  return {
    start: { x: Number(start.x), z: Number(start.z) },
    end: { x: Number(end.x), z: Number(end.z) },
  };
}

function describeWall(wall) {
  const points = wallPoints(wall);

  if (!points) {
    return null;
  }

  const dx = points.end.x - points.start.x;
  const dz = points.end.z - points.start.z;
  const length = Math.hypot(dx, dz);

  if (length < MIN_REGISTRATION_WALL_LENGTH) {
    return null;
  }

  let unitX = dx / length;
  let unitZ = dz / length;

  if (unitX < -1e-6 || (Math.abs(unitX) <= 1e-6 && unitZ < 0)) {
    unitX *= -1;
    unitZ *= -1;
  }

  return {
    wall,
    ...points,
    length,
    unitX,
    unitZ,
    midpoint: {
      x: (points.start.x + points.end.x) / 2,
      z: (points.start.z + points.end.z) / 2,
    },
    openingSignature: (wall.openings ?? [])
      .map((opening) => String(opening.type ?? "opening").toLowerCase())
      .sort()
      .join("|"),
  };
}

function registrationWalls(floor) {
  const walls = (Array.isArray(floor?.walls) ? floor.walls : [])
    .map(describeWall)
    .filter(Boolean);
  const explicitExterior = walls.filter(
    ({ wall }) =>
      wall.isExterior === true ||
      /(^|\s)external(\s|$)/i.test(String(wall.wallClass ?? "")),
  );

  return explicitExterior.length >= 2 ? explicitExterior : walls;
}

function translatedDescriptor(descriptor, offset) {
  return {
    ...descriptor,
    start: {
      x: descriptor.start.x + offset.x,
      z: descriptor.start.z + offset.z,
    },
    end: {
      x: descriptor.end.x + offset.x,
      z: descriptor.end.z + offset.z,
    },
    midpoint: {
      x: descriptor.midpoint.x + offset.x,
      z: descriptor.midpoint.z + offset.z,
    },
  };
}

function parallelAmount(left, right) {
  return Math.abs(
    left.unitX * right.unitX + left.unitZ * right.unitZ,
  );
}

function projectedInterval(wall, origin, unitX, unitZ) {
  const values = [wall.start, wall.end].map(
    (point) =>
      (point.x - origin.x) * unitX +
      (point.z - origin.z) * unitZ,
  );

  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

function pairScore(reference, moving, offset) {
  const parallel = parallelAmount(reference, moving);

  if (parallel < PARALLEL_DOT) {
    return 0;
  }

  const translated = translatedDescriptor(moving, offset);
  const normalX = -reference.unitZ;
  const normalZ = reference.unitX;
  const lineDistance = Math.abs(
    (translated.midpoint.x - reference.start.x) * normalX +
      (translated.midpoint.z - reference.start.z) * normalZ,
  );

  if (lineDistance > LINE_TOLERANCE) {
    return 0;
  }

  const referenceInterval = projectedInterval(
    reference,
    reference.start,
    reference.unitX,
    reference.unitZ,
  );
  const movingInterval = projectedInterval(
    translated,
    reference.start,
    reference.unitX,
    reference.unitZ,
  );
  const overlap = Math.max(
    0,
    Math.min(referenceInterval.max, movingInterval.max) -
      Math.max(referenceInterval.min, movingInterval.min),
  );

  if (overlap < 0.2) {
    return 0;
  }

  const distanceWeight = 1 - lineDistance / LINE_TOLERANCE;
  const directionWeight = parallel ** 6;
  const openingWeight =
    reference.openingSignature &&
    reference.openingSignature === moving.openingSignature
      ? 1.35
      : 1;

  return overlap * distanceWeight * directionWeight * openingWeight;
}

function registrationScore(referenceWalls, movingWalls, offset) {
  const movingCoverage = movingWalls.reduce(
    (sum, moving) =>
      sum +
      Math.max(
        0,
        ...referenceWalls.map((reference) =>
          pairScore(reference, moving, offset),
        ),
      ),
    0,
  );
  const referenceCoverage = referenceWalls.reduce(
    (sum, reference) =>
      sum +
      Math.max(
        0,
        ...movingWalls.map((moving) =>
          pairScore(reference, moving, offset),
        ),
      ),
    0,
  );

  return (movingCoverage + referenceCoverage) / 2;
}

function candidateKey(offset) {
  return `${offset.x.toFixed(3)}:${offset.z.toFixed(3)}`;
}

function registrationCandidates(referenceWalls, movingWalls) {
  const values = new Map();
  const add = (x, z) => {
    if (!Number.isFinite(x) || !Number.isFinite(z)) {
      return;
    }

    const offset = { x, z };
    values.set(candidateKey(offset), offset);
  };

  add(0, 0);

  referenceWalls.forEach((reference) => {
    movingWalls.forEach((moving) => {
      if (parallelAmount(reference, moving) < PARALLEL_DOT) {
        return;
      }

      const lengthRatio = reference.length / moving.length;

      if (lengthRatio < 0.35 || lengthRatio > 2.85) {
        return;
      }

      const referencePoints = [reference.start, reference.end];
      const movingPoints = [moving.start, moving.end];

      add(
        reference.midpoint.x - moving.midpoint.x,
        reference.midpoint.z - moving.midpoint.z,
      );

      referencePoints.forEach((referencePoint) => {
        movingPoints.forEach((movingPoint) => {
          add(
            referencePoint.x - movingPoint.x,
            referencePoint.z - movingPoint.z,
          );
        });
      });

      const normalX = -reference.unitZ;
      const normalZ = reference.unitX;
      const normalDistance =
        (reference.midpoint.x - moving.midpoint.x) * normalX +
        (reference.midpoint.z - moving.midpoint.z) * normalZ;
      add(normalX * normalDistance, normalZ * normalDistance);
    });
  });

  return [...values.values()];
}

function refineOffset(referenceWalls, movingWalls, initial) {
  let best = {
    offset: initial,
    score: registrationScore(referenceWalls, movingWalls, initial),
  };

  [0.2, 0.08, 0.03, 0.01, 0.003].forEach((step) => {
    let improved = true;
    let passes = 0;

    while (improved && passes < 12) {
      improved = false;
      passes += 1;

      for (const dx of [-step, 0, step]) {
        for (const dz of [-step, 0, step]) {
          if (dx === 0 && dz === 0) {
            continue;
          }

          const offset = {
            x: best.offset.x + dx,
            z: best.offset.z + dz,
          };
          const score = registrationScore(
            referenceWalls,
            movingWalls,
            offset,
          );

          if (score > best.score + 1e-7) {
            best = { offset, score };
            improved = true;
          }
        }
      }
    }
  });

  return best;
}

export function findFloorRegistration(referenceFloor, movingFloor) {
  const referenceWalls = registrationWalls(referenceFloor);
  const movingWalls = registrationWalls(movingFloor);

  if (referenceWalls.length < 2 || movingWalls.length < 2) {
    return {
      offsetX: 0,
      offsetZ: 0,
      score: 0,
      baselineScore: 0,
      applied: false,
      confidence: 0,
    };
  }

  const baselineOffset = { x: 0, z: 0 };
  const baselineScore = registrationScore(
    referenceWalls,
    movingWalls,
    baselineOffset,
  );
  const candidates = registrationCandidates(referenceWalls, movingWalls);
  let best = candidates.reduce(
    (current, offset) => {
      const score = registrationScore(referenceWalls, movingWalls, offset);
      return score > current.score ? { offset, score } : current;
    },
    { offset: baselineOffset, score: baselineScore },
  );

  best = refineOffset(referenceWalls, movingWalls, best.offset);

  const comparableLength = Math.max(
    1,
    Math.min(
      referenceWalls.reduce((sum, wall) => sum + wall.length, 0),
      movingWalls.reduce((sum, wall) => sum + wall.length, 0),
    ),
  );
  const confidence = Math.min(1, best.score / comparableLength);
  const magnitude = Math.hypot(best.offset.x, best.offset.z);
  const improvedEnough =
    best.score >= baselineScore + Math.max(0.8, baselineScore * 0.08);
  const applied =
    magnitude >= 0.015 && improvedEnough && confidence >= 0.2;
  const offset = applied ? best.offset : baselineOffset;

  return {
    offsetX: Number(offset.x.toFixed(5)),
    offsetZ: Number(offset.z.toFixed(5)),
    score: Number(best.score.toFixed(5)),
    baselineScore: Number(baselineScore.toFixed(5)),
    applied,
    confidence: Number(confidence.toFixed(5)),
  };
}

function translatePoint(point, offset) {
  if (!point || typeof point !== "object") {
    return point;
  }

  return {
    ...point,
    x: finite(point.x) + offset.x,
    z: finite(point.z) + offset.z,
  };
}

function translateBounds(bounds, offset) {
  if (!bounds || typeof bounds !== "object") {
    return bounds;
  }

  return {
    ...bounds,
    minX: finite(bounds.minX) + offset.x,
    maxX: finite(bounds.maxX) + offset.x,
    minZ: finite(bounds.minZ) + offset.z,
    maxZ: finite(bounds.maxZ) + offset.z,
    centerX: finite(bounds.centerX) + offset.x,
    centerZ: finite(bounds.centerZ) + offset.z,
  };
}

function translateOpening(opening, offset) {
  return {
    ...opening,
    startPoint: opening.startPoint
      ? translatePoint(opening.startPoint, offset)
      : opening.startPoint,
    endPoint: opening.endPoint
      ? translatePoint(opening.endPoint, offset)
      : opening.endPoint,
  };
}

function translateWall(wall, offset) {
  if (wall.start || wall.end) {
    return {
      ...wall,
      start: translatePoint(wall.start, offset),
      end: translatePoint(wall.end, offset),
      openings: (wall.openings ?? []).map((opening) =>
        translateOpening(opening, offset),
      ),
    };
  }

  return {
    ...wall,
    x1: finite(wall.x1) + offset.x,
    z1: finite(wall.z1) + offset.z,
    x2: finite(wall.x2) + offset.x,
    z2: finite(wall.z2) + offset.z,
    openings: (wall.openings ?? []).map((opening) =>
      translateOpening(opening, offset),
    ),
  };
}

function translateOutline(values, offset) {
  return (Array.isArray(values) ? values : []).map((point) =>
    translatePoint(point, offset),
  );
}

export function translateFloorGeometry(floor, registration) {
  const offset = {
    x: finite(registration?.offsetX),
    z: finite(registration?.offsetZ),
  };

  if (Math.hypot(offset.x, offset.z) < 1e-8) {
    return {
      ...floor,
      preserveWorldOrigin: true,
      registration,
    };
  }

  return {
    ...floor,
    preserveWorldOrigin: true,
    registration,
    worldOffset: offset,
    outline: translateOutline(floor.outline, offset),
    exteriorOutline: translateOutline(floor.exteriorOutline, offset),
    walls: (floor.walls ?? []).map((wall) =>
      translateWall(wall, offset),
    ),
    rooms: (floor.rooms ?? []).map((room) => ({
      ...room,
      outline: translateOutline(room.outline, offset),
      bounds: translateBounds(room.bounds, offset),
    })),
    fixtures: (floor.fixtures ?? []).map((fixture) => ({
      ...fixture,
      outline: translateOutline(fixture.outline, offset),
    })),
    stairs: floor.stairs
      ? {
          ...floor.stairs,
          parts: (floor.stairs.parts ?? []).map((part) => ({
            ...part,
            outline: translateOutline(part.outline, offset),
          })),
          treads: (floor.stairs.treads ?? []).map((tread) => ({
            ...tread,
            start: translatePoint(tread.start, offset),
            end: translatePoint(tread.end, offset),
          })),
        }
      : floor.stairs,
    bounds: translateBounds(floor.bounds, offset),
    sceneBounds: translateBounds(floor.sceneBounds, offset),
    captureBounds: translateBounds(floor.captureBounds, offset),
  };
}

export function registerFloorStack(floors) {
  if (!Array.isArray(floors) || !floors.length) {
    return [];
  }

  const registered = [
    {
      ...floors[0],
      preserveWorldOrigin: true,
      registration: {
        offsetX: 0,
        offsetZ: 0,
        score: 0,
        baselineScore: 0,
        applied: false,
        confidence: 1,
      },
    },
  ];

  for (let index = 1; index < floors.length; index += 1) {
    const reference = registered[index - 1];
    const registration = findFloorRegistration(reference, floors[index]);
    registered.push(translateFloorGeometry(floors[index], registration));
  }

  return registered;
}

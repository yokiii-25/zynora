/**
 * Converts different point formats into a consistent { x, y, z } object.
 */
export function normalizePoint(point, fallbackY = 0) {
  if (Array.isArray(point)) {
    return {
      x: Number(point[0]) || 0,
      y: Number(point[1] ?? fallbackY) || fallbackY,
      z: Number(point[2] ?? point[1]) || 0,
    };
  }

  if (point && typeof point === "object") {
    return {
      x: Number(point.x ?? point[0]) || 0,
      y: Number(point.y ?? fallbackY) || fallbackY,
      z: Number(point.z ?? point[1] ?? point[2]) || 0,
    };
  }

  return {
    x: 0,
    y: fallbackY,
    z: 0,
  };
}

/**
 * Returns the first available position from an object.
 */
export function getPosition(item, fallbackY = 0) {
  return normalizePoint(
    item?.position ??
      item?.center ??
      item?.location ??
      item?.transform?.position,
    fallbackY
  );
}

/**
 * Returns dimensions using common backend property names.
 */
export function getDimensions(item, defaults = {}) {
  const size =
    item?.size ??
    item?.dimensions ??
    item?.dimension ??
    item?.geometry?.size ??
    {};

  return {
    width: Number(
      size.width ??
        size.x ??
        item?.width ??
        item?.length ??
        defaults.width ??
        1
    ),
    height: Number(
      size.height ??
        size.y ??
        item?.height ??
        defaults.height ??
        1
    ),
    depth: Number(
      size.depth ??
        size.z ??
        item?.depth ??
        item?.thickness ??
        defaults.depth ??
        0.15
    ),
  };
}

/**
 * Converts different rotation formats into a Three.js rotation array.
 */
export function getRotation(item) {
  const rotation =
    item?.rotation ??
    item?.transform?.rotation ??
    item?.orientation ??
    0;

  if (Array.isArray(rotation)) {
    return [
      Number(rotation[0]) || 0,
      Number(rotation[1]) || 0,
      Number(rotation[2]) || 0,
    ];
  }

  if (rotation && typeof rotation === "object") {
    return [
      Number(rotation.x) || 0,
      Number(rotation.y) || 0,
      Number(rotation.z) || 0,
    ];
  }

  return [0, Number(rotation) || 0, 0];
}

/**
 * Calculates the midpoint between two points.
 */
export function getMidpoint(start, end) {
  const pointA = normalizePoint(start);
  const pointB = normalizePoint(end);

  return {
    x: (pointA.x + pointB.x) / 2,
    y: (pointA.y + pointB.y) / 2,
    z: (pointA.z + pointB.z) / 2,
  };
}

/**
 * Calculates the horizontal distance between two points.
 */
export function getDistance(start, end) {
  const pointA = normalizePoint(start);
  const pointB = normalizePoint(end);

  return Math.hypot(
    pointB.x - pointA.x,
    pointB.z - pointA.z
  );
}

/**
 * Calculates the Y-axis rotation required to face from start to end.
 */
export function getAngle(start, end) {
  const pointA = normalizePoint(start);
  const pointB = normalizePoint(end);

  return Math.atan2(
    pointB.z - pointA.z,
    pointB.x - pointA.x
  );
}

/**
 * Extracts start and end points from a wall-like object.
 */
export function getSegment(item) {
  const start =
    item?.start ??
    item?.from ??
    item?.point1 ??
    item?.p1 ??
    item?.geometry?.start;

  const end =
    item?.end ??
    item?.to ??
    item?.point2 ??
    item?.p2 ??
    item?.geometry?.end;

  if (!start || !end) {
    return null;
  }

  return {
    start: normalizePoint(start),
    end: normalizePoint(end),
  };
}

/**
 * Builds transform data for a wall defined by start and end points.
 */
export function getWallTransform(wall) {
  const segment = getSegment(wall);

  if (!segment) {
    return null;
  }

  const dimensions = getDimensions(wall, {
    height: 2.8,
    depth: 0.15,
  });

  const length = getDistance(segment.start, segment.end);
  const midpoint = getMidpoint(segment.start, segment.end);
  const angle = getAngle(segment.start, segment.end);

  return {
    position: [
      midpoint.x,
      dimensions.height / 2,
      midpoint.z,
    ],
    rotation: [0, -angle, 0],
    size: [
      length,
      dimensions.height,
      dimensions.depth,
    ],
  };
}

/**
 * Makes sure a numeric value stays within a range.
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
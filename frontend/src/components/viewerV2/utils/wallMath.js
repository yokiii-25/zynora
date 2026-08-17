const MIN_WALL_LENGTH = 0.01;

export function getWallLength(wall) {
  if (!wall) return 0;

  return Math.hypot(
    wall.x2 - wall.x1,
    wall.z2 - wall.z1
  );
}

export function getWallCenter(wall) {
  return {
    x: (wall.x1 + wall.x2) / 2,
    y: wall.height / 2,
    z: (wall.z1 + wall.z2) / 2,
  };
}

export function getWallAngle(wall) {
  return -Math.atan2(
    wall.z2 - wall.z1,
    wall.x2 - wall.x1
  );
}

export function getWallTransform(wall) {
  const length = getWallLength(wall);

  if (!Number.isFinite(length) || length < MIN_WALL_LENGTH) {
    return null;
  }

  const center = getWallCenter(wall);
  const angle = getWallAngle(wall);

  if (
    !Number.isFinite(center.x) ||
    !Number.isFinite(center.y) ||
    !Number.isFinite(center.z) ||
    !Number.isFinite(angle)
  ) {
    return null;
  }

  return {
    position: [center.x, center.y, center.z],
    rotation: [0, angle, 0],
    size: [
      length + wall.thickness,
      wall.height,
      wall.thickness,
    ],
  };
}

function uniqueSorted(values) {
  return [...new Set(values.map((value) => Number(value.toFixed(6))))]
    .sort((a, b) => a - b);
}

function mergeIntervals(intervals) {
  const sorted = intervals
    .map(([start, end]) => [Math.min(start, end), Math.max(start, end)])
    .sort((a, b) => a[0] - b[0]);
  const merged = [];

  sorted.forEach((interval) => {
    const previous = merged[merged.length - 1];

    if (!previous || interval[0] > previous[1] + 1e-5) {
      merged.push([...interval]);
    } else {
      previous[1] = Math.max(previous[1], interval[1]);
    }
  });

  return merged;
}

function visibleIntervals(length, blocked) {
  const intervals = [];
  let cursor = 0;

  mergeIntervals(blocked).forEach(([start, end]) => {
    const clampedStart = Math.max(0, Math.min(length, start));
    const clampedEnd = Math.max(0, Math.min(length, end));

    if (clampedStart - cursor >= MIN_WALL_LENGTH) {
      intervals.push([cursor, clampedStart]);
    }

    cursor = Math.max(cursor, clampedEnd);
  });

  if (length - cursor >= MIN_WALL_LENGTH) {
    intervals.push([cursor, length]);
  }

  return intervals;
}

function segmentTransform(wall, start, end, bottom, top) {
  const wallLength = getWallLength(wall);
  const unitX = (wall.x2 - wall.x1) / wallLength;
  const unitZ = (wall.z2 - wall.z1) / wallLength;
  const extendStart = start <= 1e-5 ? wall.thickness / 2 : 0;
  const extendEnd = end >= wallLength - 1e-5 ? wall.thickness / 2 : 0;
  const extendedStart = start - extendStart;
  const extendedEnd = end + extendEnd;
  const center = (extendedStart + extendedEnd) / 2;

  return {
    position: [
      wall.x1 + unitX * center,
      (bottom + top) / 2,
      wall.z1 + unitZ * center,
    ],
    rotation: [0, getWallAngle(wall), 0],
    size: [
      extendedEnd - extendedStart,
      top - bottom,
      wall.thickness,
    ],
  };
}

export function getWallSegments(wall) {
  const wallLength = getWallLength(wall);

  if (!Number.isFinite(wallLength) || wallLength < MIN_WALL_LENGTH) {
    return [];
  }

  const openings = (Array.isArray(wall.openings) ? wall.openings : [])
    .filter((opening) =>
      Number.isFinite(opening.start) &&
      Number.isFinite(opening.end) &&
      Number.isFinite(opening.bottom) &&
      Number.isFinite(opening.top)
    )
    .map((opening) => ({
      ...opening,
      start: Math.max(0, Math.min(wallLength, opening.start)),
      end: Math.max(0, Math.min(wallLength, opening.end)),
      bottom: Math.max(0, Math.min(wall.height, opening.bottom)),
      top: Math.max(0, Math.min(wall.height, opening.top)),
    }))
    .filter((opening) =>
      opening.end - opening.start >= MIN_WALL_LENGTH &&
      opening.top - opening.bottom >= MIN_WALL_LENGTH
    );

  if (!openings.length) {
    const transform = getWallTransform(wall);
    return transform
      ? [{ id: `${wall.id}-solid`, ...transform }]
      : [];
  }

  const yCuts = uniqueSorted([
    0,
    wall.height,
    ...openings.flatMap((opening) => [opening.bottom, opening.top]),
  ]);
  const segments = [];

  for (let level = 0; level < yCuts.length - 1; level += 1) {
    const bottom = yCuts[level];
    const top = yCuts[level + 1];

    if (top - bottom < MIN_WALL_LENGTH) {
      continue;
    }

    const centerY = (bottom + top) / 2;
    const blocked = openings
      .filter(
        (opening) =>
          centerY > opening.bottom + 1e-5 &&
          centerY < opening.top - 1e-5
      )
      .map((opening) => [opening.start, opening.end]);

    visibleIntervals(wallLength, blocked).forEach(
      ([start, end], intervalIndex) => {
        segments.push({
          id: `${wall.id}-${level}-${intervalIndex}`,
          ...segmentTransform(wall, start, end, bottom, top),
        });
      }
    );
  }

  return segments;
}

export function getOpeningGroupTransform(wall) {
  return {
    position: [wall.x1, 0, wall.z1],
    rotation: [0, getWallAngle(wall), 0],
  };
}

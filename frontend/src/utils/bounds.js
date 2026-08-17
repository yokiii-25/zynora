function toNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function getVector(value) {
  if (Array.isArray(value)) {
    return {
      x: toNumber(value[0]),
      y: toNumber(value[1]),
      z: toNumber(value[2]),
    };
  }

  if (value && typeof value === "object") {
    return {
      x: toNumber(value.x),
      y: toNumber(value.y),
      z: toNumber(value.z),
    };
  }

  return {
    x: 0,
    y: 0,
    z: 0,
  };
}

function getWallSize(wall) {
  const size =
    wall?.size ??
    wall?.dimensions ??
    {};

  return {
    width: Math.abs(
      toNumber(
        size.width ??
        wall?.width,
        1
      )
    ),

    height: Math.abs(
      toNumber(
        size.height ??
        wall?.height,
        3
      )
    ),

    depth: Math.abs(
      toNumber(
        size.depth ??
        size.thickness ??
        wall?.depth ??
        wall?.thickness,
        0.15
      )
    ),
  };
}

export function calculateSceneBounds(walls = []) {
  if (!Array.isArray(walls) || walls.length === 0) {
    return {
      minX: -10,
      maxX: 10,
      minZ: -10,
      maxZ: 10,
      width: 20,
      depth: 20,
      center: {
        x: 0,
        z: 0,
      },
    };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  let validWalls = 0;

  walls.forEach((wall) => {
    if (!wall || typeof wall !== "object") {
      return;
    }

    const position = getVector(wall.position);
    const rotation = getVector(wall.rotation);
    const size = getWallSize(wall);

    if (
      !Number.isFinite(position.x) ||
      !Number.isFinite(position.z) ||
      size.width <= 0 ||
      size.depth <= 0
    ) {
      return;
    }

    const cos = Math.abs(Math.cos(rotation.y));
    const sin = Math.abs(Math.sin(rotation.y));

    const halfExtentX =
      (size.width * cos + size.depth * sin) / 2;

    const halfExtentZ =
      (size.width * sin + size.depth * cos) / 2;

    minX = Math.min(
      minX,
      position.x - halfExtentX
    );

    maxX = Math.max(
      maxX,
      position.x + halfExtentX
    );

    minZ = Math.min(
      minZ,
      position.z - halfExtentZ
    );

    maxZ = Math.max(
      maxZ,
      position.z + halfExtentZ
    );

    validWalls += 1;
  });

  if (
    validWalls === 0 ||
    !Number.isFinite(minX) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(minZ) ||
    !Number.isFinite(maxZ)
  ) {
    return {
      minX: -10,
      maxX: 10,
      minZ: -10,
      maxZ: 10,
      width: 20,
      depth: 20,
      center: {
        x: 0,
        z: 0,
      },
    };
  }

  const width = Math.max(maxX - minX, 1);
  const depth = Math.max(maxZ - minZ, 1);

  return {
    minX,
    maxX,
    minZ,
    maxZ,
    width,
    depth,

    center: {
      x: (minX + maxX) / 2,
      z: (minZ + maxZ) / 2,
    },
  };
}

export function getFloorSize(bounds, padding = 2) {
  const safePadding = Math.max(
    toNumber(padding, 2),
    0
  );

  const width = Math.max(
    toNumber(bounds?.width, 20) + safePadding * 2,
    10
  );

  const depth = Math.max(
    toNumber(bounds?.depth, 20) + safePadding * 2,
    10
  );

  return {
    width,
    depth,
  };
}

export function getCameraDistance(bounds) {
  const width = Math.max(
    toNumber(bounds?.width, 20),
    1
  );

  const depth = Math.max(
    toNumber(bounds?.depth, 20),
    1
  );

  const largestDimension = Math.max(width, depth);

  return Math.max(
    largestDimension * 1.15,
    12
  );
}
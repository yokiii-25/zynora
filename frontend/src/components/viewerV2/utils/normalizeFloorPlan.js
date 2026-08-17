import {
  buildOutlineFromWalls,
  polygonBounds,
  sanitizePolygon,
  toPoint,
} from "./polygonMath.js";
import {
  createFloorPlanDocument,
  processWallTopology,
  validateFloorPlanGeometry,
} from "./wallTopology.js";

function toNumber(value, fallback = NaN) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function hasGeometry(value) {
  if (!value || typeof value !== "object") {
    return false;
  }

  return Boolean(
    value.walls ||
      value.wall_segments ||
      value.outline ||
      value.polygon ||
      value.points ||
      value.vertices ||
      value.boundary ||
      value.corners ||
      value.svg_path ||
      value.path ||
      (value.width && (value.depth || value.height || value.length))
  );
}

function findFloorPlan(data) {
  if (!data || typeof data !== "object") {
    return {};
  }

  if (hasGeometry(data)) {
    return data;
  }

  const candidates = [
    data.selectedRoom,
    data.selected_room,
    data.room,
    data.floorPlan,
    data.floor_plan,
    data.geometry,
    data.scene,
    data.data,
    data.design,
    data.rooms?.[0],
    data.floorPlan?.rooms?.[0],
    data.floor_plan?.rooms?.[0],
    data.design?.rooms?.[0],
  ];

  return candidates.find(hasGeometry) ??
    candidates.find((candidate) => candidate && typeof candidate === "object") ??
    data;
}

function parseSvgPath(path) {
  if (typeof path !== "string") {
    return [];
  }

  const tokens = path.match(
    /[MmLlHhVvZz]|[-+]?(?:\d*\.)?\d+(?:[eE][-+]?\d+)?/g
  );

  if (!tokens?.length) {
    return [];
  }

  const points = [];
  let index = 0;
  let command = null;
  let current = { x: 0, z: 0 };
  let start = null;

  const isCommand = (token) => /^[A-Za-z]$/.test(token);
  const readNumber = () => toNumber(tokens[index++]);

  while (index < tokens.length) {
    if (isCommand(tokens[index])) {
      command = tokens[index++];
    }

    if (!command) {
      break;
    }

    if (command === "Z" || command === "z") {
      if (start) {
        current = { ...start };
      }
      command = null;
      continue;
    }

    if (command === "H" || command === "h") {
      const x = readNumber();
      current = {
        x: command === "h" ? current.x + x : x,
        z: current.z,
      };
      points.push({ ...current });
      continue;
    }

    if (command === "V" || command === "v") {
      const z = readNumber();
      current = {
        x: current.x,
        z: command === "v" ? current.z + z : z,
      };
      points.push({ ...current });
      continue;
    }

    if (["M", "m", "L", "l"].includes(command)) {
      if (index + 1 > tokens.length) {
        break;
      }

      const x = readNumber();
      const z = readNumber();

      if (!Number.isFinite(x) || !Number.isFinite(z)) {
        break;
      }

      const relative = command === "m" || command === "l";
      current = {
        x: relative ? current.x + x : x,
        z: relative ? current.z + z : z,
      };
      points.push({ ...current });

      if (!start) {
        start = { ...current };
      }

      if (command === "M") command = "L";
      if (command === "m") command = "l";
      continue;
    }

    index += 1;
  }

  return points;
}

function parsePointString(value) {
  if (typeof value !== "string") {
    return [];
  }

  if (/[MmLlHhVvZz]/.test(value)) {
    return parseSvgPath(value);
  }

  const values = value.match(
    /[-+]?(?:\d*\.)?\d+(?:[eE][-+]?\d+)?/g
  );

  if (!values || values.length < 6) {
    return [];
  }

  const points = [];

  for (let index = 0; index + 1 < values.length; index += 2) {
    points.push({
      x: Number(values[index]),
      z: Number(values[index + 1]),
    });
  }

  return points;
}

function unwrapCoordinates(value) {
  let coordinates = value;

  while (
    Array.isArray(coordinates) &&
    coordinates.length === 1 &&
    Array.isArray(coordinates[0])
  ) {
    coordinates = coordinates[0];
  }

  return coordinates;
}

function extractOutline(plan) {
  const candidates = [
    plan.outline,
    plan.polygon,
    plan.points,
    plan.vertices,
    plan.boundary,
    plan.corners,
    plan.roomPolygon,
    plan.room_polygon,
    plan.svgPoints,
    plan.svg_points,
    plan.geometry?.points,
    plan.geometry?.coordinates,
    plan.coordinates,
    plan.svg_path,
    plan.svgPath,
    plan.path,
    plan.d,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const parsed = parsePointString(candidate);
      if (parsed.length >= 3) return parsed;
      continue;
    }

    const coordinates = unwrapCoordinates(candidate);

    if (!Array.isArray(coordinates)) {
      continue;
    }

    const points = coordinates
      .map(toPoint)
      .filter(Boolean);

    if (points.length >= 3) {
      return points;
    }
  }

  return [];
}

function readWallPoint(wall, side) {
  const direct = toPoint(
    side === "start"
      ? wall.start ?? wall.from ?? wall.a ?? wall.p1
      : wall.end ?? wall.to ?? wall.b ?? wall.p2
  );

  if (direct) {
    return direct;
  }

  const suffix = side === "start" ? "1" : "2";
  const x = toNumber(wall[`x${suffix}`]);
  const z = toNumber(
    wall[`z${suffix}`] ??
      wall[`y${suffix}`]
  );

  return Number.isFinite(x) && Number.isFinite(z)
    ? { x, z }
    : null;
}

function normalizeRawWall(wall, index) {
  if (!wall || typeof wall !== "object") {
    return null;
  }

  const start = readWallPoint(wall, "start");
  const end = readWallPoint(wall, "end");

  if (!start || !end || Math.hypot(end.x - start.x, end.z - start.z) < 1e-5) {
    return null;
  }

  return {
    source: wall,
    sourceId: wall.id ?? wall.wall_id ?? wall.wallId ?? index,
    x1: start.x,
    z1: start.z,
    x2: end.x,
    z2: end.z,
  };
}

function readUnit(plan) {
  return String(
    plan.measurementUnit ??
      plan.measurement_unit ??
      plan.unit ??
      plan.units ??
      ""
  ).toLowerCase();
}

function unitScale(unit) {
  if (/^(ft|foot|feet)$/.test(unit)) return 0.3048;
  if (/^(in|inch|inches)$/.test(unit)) return 0.0254;
  if (/^(cm|centimeter|centimeters)$/.test(unit)) return 0.01;
  if (/^(mm|millimeter|millimeters)$/.test(unit)) return 0.001;
  return 1;
}

function coordinateScale(plan, bounds, unit) {
  const explicit = toNumber(
    plan.coordinateScale ??
      plan.coordinate_scale ??
      plan.worldScale ??
      plan.world_scale
  );

  if (Number.isFinite(explicit) && explicit > 0) {
    return explicit;
  }

  const largestSpan = Math.max(bounds.width, bounds.depth, 1);

  if (/pixel|pixels|px|svg/.test(unit)) {
    return 16 / largestSpan;
  }

  const conversion = unitScale(unit);

  if (conversion !== 1) {
    return conversion;
  }

  return largestSpan > 80
    ? 16 / largestSpan
    : 1;
}

function convertPlanarLength(value, context, fallback) {
  const number = toNumber(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  if (/pixel|pixels|px|svg/.test(context.unit)) {
    return number * context.scale;
  }

  const conversion = unitScale(context.unit);

  if (conversion !== 1) {
    return number * conversion;
  }

  if (context.rawLargestSpan > 80 && Math.abs(number) > 4) {
    return number * context.scale;
  }

  return number;
}

function convertVerticalLength(value, context, fallback) {
  const number = toNumber(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  const conversion = unitScale(context.unit);

  if (conversion !== 1) {
    return number * conversion;
  }

  if (/pixel|pixels|px|svg/.test(context.unit) && Math.abs(number) > 10) {
    return number * context.scale;
  }

  return number;
}

function transformPoint(point, context) {
  return {
    x: (point.x - context.rawCenterX) * context.scale,
    z: (point.z - context.rawCenterZ) * context.scale,
  };
}

function projectOntoWall(point, wall) {
  const dx = wall.x2 - wall.x1;
  const dz = wall.z2 - wall.z1;
  const length = Math.hypot(dx, dz);

  if (length < 1e-5) {
    return 0;
  }

  return (
    ((point.x - wall.x1) * dx + (point.z - wall.z1) * dz) /
    length
  );
}

function distanceToWall(point, wall) {
  const length = Math.hypot(wall.x2 - wall.x1, wall.z2 - wall.z1);
  const distance = Math.max(0, Math.min(length, projectOntoWall(point, wall)));
  const amount = length > 0 ? distance / length : 0;
  const x = wall.x1 + (wall.x2 - wall.x1) * amount;
  const z = wall.z1 + (wall.z2 - wall.z1) * amount;
  return Math.hypot(point.x - x, point.z - z);
}

function openingType(opening, fallback = "door") {
  const value = String(
    opening.type ??
      opening.kind ??
      opening.category ??
      opening.name ??
      fallback
  ).toLowerCase();

  return value.includes("window") || value.includes("glazing")
    ? "window"
    : "door";
}

function normalizeOpening(opening, index, wall, context, forcedType) {
  if (!opening || typeof opening !== "object") {
    return null;
  }

  const type = openingType(opening, forcedType);
  const wallLength = Math.hypot(wall.x2 - wall.x1, wall.z2 - wall.z1);
  const defaultWidth = type === "door" ? 0.9 : 1.35;
  const globalStart = toPoint(
    opening.startPoint ??
      opening.start_point ??
      (typeof opening.start === "object" ? opening.start : null) ??
      opening.from
  );
  const globalEnd = toPoint(
    opening.endPoint ??
      opening.end_point ??
      (typeof opening.end === "object" ? opening.end : null) ??
      opening.to
  );
  const globalCenter = toPoint(
    opening.center ??
      opening.point ??
      opening.location ??
      (typeof opening.position === "object" ? opening.position : null)
  );

  let width = convertPlanarLength(
    opening.width ??
      opening.opening_width ??
      opening.size?.width,
    context,
    defaultWidth
  );
  let center = NaN;

  if (globalStart && globalEnd) {
    const start = projectOntoWall(transformPoint(globalStart, context), wall);
    const end = projectOntoWall(transformPoint(globalEnd, context), wall);
    width = Math.abs(end - start) || width;
    center = (start + end) / 2;
  } else if (globalCenter) {
    center = projectOntoWall(transformPoint(globalCenter, context), wall);
  }

  const ratio = toNumber(
    opening.positionRatio ??
      opening.position_ratio ??
      opening.offsetRatio ??
      opening.offset_ratio
  );

  if (!Number.isFinite(center) && Number.isFinite(ratio)) {
    center = ratio * wallLength;
  }

  const rawStart = toNumber(
    opening.startOffset ??
      opening.start_offset ??
      (typeof opening.start === "number" ? opening.start : NaN)
  );
  const rawEnd = toNumber(
    opening.endOffset ??
      opening.end_offset ??
      (typeof opening.end === "number" ? opening.end : NaN)
  );

  if (!Number.isFinite(center) && Number.isFinite(rawStart)) {
    const start = convertPlanarLength(rawStart, context, 0);
    const end = Number.isFinite(rawEnd)
      ? convertPlanarLength(rawEnd, context, start + width)
      : start + width;
    width = Math.abs(end - start) || width;
    center = (start + end) / 2;
  }

  const rawOffset = toNumber(
    opening.offset ??
      opening.distance ??
      opening.positionAlongWall ??
      opening.position_along_wall ??
      (typeof opening.position === "number" ? opening.position : NaN)
  );

  if (!Number.isFinite(center) && Number.isFinite(rawOffset)) {
    center = convertPlanarLength(rawOffset, context, wallLength / 2);
  }

  width = Math.max(0.18, Math.min(width, Math.max(wallLength - 0.08, 0.18)));
  center = Number.isFinite(center) ? center : wallLength / 2;
  center = Math.max(width / 2, Math.min(wallLength - width / 2, center));

  const defaultBottom = type === "door" ? 0 : 0.9;
  const defaultHeight = type === "door" ? 2.1 : 1.15;
  const bottom = Math.max(
    0,
    convertVerticalLength(
      opening.sillHeight ??
        opening.sill_height ??
        opening.bottom ??
        opening.y,
      context,
      defaultBottom
    )
  );
  const requestedHeight = convertVerticalLength(
    opening.height ??
      opening.opening_height ??
      opening.size?.height,
    context,
    defaultHeight
  );
  const height = Math.max(
    0.2,
    Math.min(requestedHeight, Math.max(wall.height - bottom - 0.05, 0.2))
  );

  return {
    ...opening,
    id: opening.id ?? `${wall.id}-${type}-${index}`,
    type,
    start: center - width / 2,
    end: center + width / 2,
    center,
    width,
    bottom,
    top: bottom + height,
    height,
  };
}

function normalizeProvidedWalls(
  wallValues,
  context,
  defaultHeight,
  defaultThickness,
) {
  const rawWalls = (Array.isArray(wallValues) ? wallValues : [])
    .map(normalizeRawWall)
    .filter(Boolean);
  const walls = rawWalls.map((rawWall, index) => {
    const start = transformPoint(
      { x: rawWall.x1, z: rawWall.z1 },
      context,
    );
    const end = transformPoint(
      { x: rawWall.x2, z: rawWall.z2 },
      context,
    );
    const source = rawWall.source;

    return {
      ...source,
      id: source.id ?? `provided-wall-${index}`,
      sourceId: rawWall.sourceId,
      x1: start.x,
      z1: start.z,
      x2: end.x,
      z2: end.z,
      height: Math.max(
        convertVerticalLength(
          source.wall_height ?? source.height,
          context,
          defaultHeight,
        ),
        0.4,
      ),
      thickness: Math.max(
        convertPlanarLength(
          source.wall_thickness ?? source.thickness ?? source.depth,
          context,
          defaultThickness,
        ),
        0.04,
      ),
      color: source.color ?? source.material?.color ?? "#eee9e1",
      isExterior: true,
      kind: "exterior",
      openings: [],
    };
  });

  walls.forEach((wall, wallIndex) => {
    const source = rawWalls[wallIndex]?.source ?? {};
    const nested = [
      ...(Array.isArray(source.openings)
        ? source.openings.map((opening) => ({ opening }))
        : []),
      ...(Array.isArray(source.doors)
        ? source.doors.map((opening) => ({ opening, forcedType: "door" }))
        : []),
      ...(Array.isArray(source.windows)
        ? source.windows.map((opening) => ({ opening, forcedType: "window" }))
        : []),
    ];

    nested.forEach(({ opening, forcedType }, openingIndex) => {
      const normalized = normalizeOpening(
        opening,
        openingIndex,
        wall,
        context,
        forcedType,
      );

      if (normalized) wall.openings.push(normalized);
    });

    wall.openings.sort((left, right) => left.start - right.start);
  });

  return walls;
}

function extractPlanOpenings(plan) {
  return [
    ...(Array.isArray(plan.openings)
      ? plan.openings.map((opening) => ({ opening }))
      : []),
    ...(Array.isArray(plan.doors)
      ? plan.doors.map((opening) => ({ opening, forcedType: "door" }))
      : []),
    ...(Array.isArray(plan.windows)
      ? plan.windows.map((opening) => ({ opening, forcedType: "window" }))
      : []),
  ];
}

function openingWallIndex(opening, walls, context) {
  const reference =
    opening.wallId ??
    opening.wall_id ??
    opening.parentWallId ??
    opening.parent_wall_id;

  if (reference !== undefined && reference !== null) {
    const matched = walls.findIndex(
      (wall) => String(wall.sourceId) === String(reference) || String(wall.id) === String(reference)
    );
    if (matched >= 0) return matched;
  }

  const index = toNumber(opening.wallIndex ?? opening.wall_index);

  if (Number.isInteger(index) && index >= 0 && index < walls.length) {
    return index;
  }

  const point = toPoint(
    opening.center ??
      opening.point ??
      opening.location ??
      opening.startPoint ??
      opening.start_point ??
      (typeof opening.position === "object" ? opening.position : null)
  );

  if (point) {
    const transformed = transformPoint(point, context);
    let nearest = 0;
    let nearestDistance = Infinity;

    walls.forEach((wall, wallIndex) => {
      const distance = distanceToWall(transformed, wall);
      if (distance < nearestDistance) {
        nearest = wallIndex;
        nearestDistance = distance;
      }
    });

    return nearest;
  }

  return walls.length === 1 ? 0 : -1;
}

function roomTypeFrom(plan, data) {
  return String(
    plan.predicted_room_type ??
      plan.roomType ??
      plan.room_type ??
      plan.name ??
      data?.predicted_room_type ??
      data?.roomType ??
      data?.room_type ??
      plan.label ??
      plan.type ??
      "Room"
  );
}

function normalizeSingleFloorPlan(
  data,
  { preserveOrigin = false } = {},
) {
  const plan = findFloorPlan(data);
  const rawWallValues =
    plan.walls ??
    plan.wall_segments ??
    plan.wallSegments ??
    plan.segments ??
    plan.geometry?.walls ??
    [];
  const rawWalls = (Array.isArray(rawWallValues) ? rawWallValues : [])
    .map(normalizeRawWall)
    .filter(Boolean);

  let rawOutline = sanitizePolygon(extractOutline(plan));

  if (rawOutline.length < 3 && rawWalls.length >= 3) {
    rawOutline = buildOutlineFromWalls(rawWalls);
  }

  if (rawOutline.length < 3) {
    const width = Math.max(toNumber(plan.width, 6), 0.5);
    const depth = Math.max(
      toNumber(plan.depth ?? plan.length ?? plan.height, 5),
      0.5
    );

    rawOutline = [
      { x: 0, z: 0 },
      { x: width, z: 0 },
      { x: width, z: depth },
      { x: 0, z: depth },
    ];
  }

  const rawBounds = polygonBounds(rawOutline);
  const unit = readUnit(plan);
  const scale = coordinateScale(plan, rawBounds, unit);
  const context = {
    unit,
    scale,
    rawCenterX: preserveOrigin ? 0 : rawBounds.centerX,
    rawCenterZ: preserveOrigin ? 0 : rawBounds.centerZ,
    rawLargestSpan: Math.max(rawBounds.width, rawBounds.depth),
  };
  const outline = sanitizePolygon(
    rawOutline.map((point) => transformPoint(point, context))
  );
  const bounds = polygonBounds(outline);
  const defaultHeight = convertVerticalLength(
    plan.wallHeight ?? plan.wall_height,
    context,
    2.8
  );
  const defaultThickness = convertPlanarLength(
    plan.wallThickness ?? plan.wall_thickness,
    context,
    0.16
  );
  const providedExteriorWalls =
    plan.schemaVersion === "zynora.floorplan.v1"
      ? normalizeProvidedWalls(
          plan.exteriorWalls,
          context,
          defaultHeight,
          defaultThickness,
        )
      : [];

  let walls = rawWalls.map((rawWall, index) => {
    const start = transformPoint(
      { x: rawWall.x1, z: rawWall.z1 },
      context
    );
    const end = transformPoint(
      { x: rawWall.x2, z: rawWall.z2 },
      context
    );
    const source = rawWall.source;

    return {
      ...source,
      id: source.id ?? `wall-${index}`,
      sourceId: rawWall.sourceId,
      x1: start.x,
      z1: start.z,
      x2: end.x,
      z2: end.z,
      height: Math.max(
        convertVerticalLength(
          source.wall_height ?? source.height,
          context,
          defaultHeight
        ),
        0.4
      ),
      thickness: Math.max(
        convertPlanarLength(
          source.wall_thickness ?? source.thickness ?? source.depth,
          context,
          defaultThickness
        ),
        0.04
      ),
      color: source.color ?? source.material?.color ?? "#eee9e1",
      openings: [],
    };
  });

  if (!walls.length) {
    walls = outline.map((point, index) => {
      const next = outline[(index + 1) % outline.length];
      return {
        id: `wall-${index}`,
        sourceId: index,
        x1: point.x,
        z1: point.z,
        x2: next.x,
        z2: next.z,
        height: Math.max(defaultHeight, 0.4),
        thickness: Math.max(defaultThickness, 0.04),
        color: "#eee9e1",
        openings: [],
      };
    });
  }

  walls.forEach((wall, wallIndex) => {
    const source = rawWalls[wallIndex]?.source ?? {};
    const nested = [
      ...(Array.isArray(source.openings)
        ? source.openings.map((opening) => ({ opening }))
        : []),
      ...(Array.isArray(source.doors)
        ? source.doors.map((opening) => ({ opening, forcedType: "door" }))
        : []),
      ...(Array.isArray(source.windows)
        ? source.windows.map((opening) => ({ opening, forcedType: "window" }))
        : []),
    ];

    nested.forEach(({ opening, forcedType }, openingIndex) => {
      const normalized = normalizeOpening(
        opening,
        openingIndex,
        wall,
        context,
        forcedType
      );

      if (normalized) wall.openings.push(normalized);
    });
  });

  extractPlanOpenings(plan).forEach(
    ({ opening, forcedType }, openingIndex) => {
      const wallIndex = openingWallIndex(opening, walls, context);

      if (wallIndex < 0) {
        return;
      }

      const normalized = normalizeOpening(
        opening,
        openingIndex,
        walls[wallIndex],
        context,
        forcedType
      );

      if (normalized) walls[wallIndex].openings.push(normalized);
    }
  );

  walls.forEach((wall) => {
    wall.openings.sort((a, b) => a.start - b.start);
  });

  const rooms = (Array.isArray(plan.rooms) ? plan.rooms : []).map(
    (room) => {
      const roomOutline = sanitizePolygon(
        (Array.isArray(room.outline) ? room.outline : [])
          .map(toPoint)
          .filter(Boolean)
          .map((point) => transformPoint(point, context)),
      );

      return {
        ...room,
        classificationMatched:
          room.classificationMatched ?? Boolean(room.classification),
        predicted_room_type:
          room.predicted_room_type ??
          room.classification?.predictedType ??
          room.type,
        modelVersion:
          room.modelVersion ?? room.classification?.modelVersion,
        confidence:
          room.confidence ?? room.classification?.confidence,
        confidence_status:
          room.confidence_status ?? room.classification?.status,
        outline: roomOutline,
        bounds: polygonBounds(roomOutline),
      };
    },
  );
  const fixtures = (Array.isArray(plan.fixtures) ? plan.fixtures : []).map(
    (fixture) => ({
      ...fixture,
      outline: sanitizePolygon(
        (Array.isArray(fixture.outline) ? fixture.outline : [])
          .map(toPoint)
          .filter(Boolean)
          .map((point) => transformPoint(point, context)),
      ),
    }),
  );
  const stairs = plan.stairs
    ? {
        ...plan.stairs,
        parts: (plan.stairs.parts ?? []).map((part) => ({
          ...part,
          outline: sanitizePolygon(
            (Array.isArray(part.outline) ? part.outline : [])
              .map(toPoint)
              .filter(Boolean)
              .map((point) => transformPoint(point, context)),
          ),
        })),
        treads: (plan.stairs.treads ?? []).map((tread) => ({
          ...tread,
          start: transformPoint(toPoint(tread.start), context),
          end: transformPoint(toPoint(tread.end), context),
        })),
      }
    : plan.stairs;
  const roomType = roomTypeFrom(plan, data);
  const topology = processWallTopology({
    walls,
    outline,
    rooms,
  });
  walls = topology.walls;
  const useProvidedExterior =
    providedExteriorWalls.length >= 3 && outline.length >= 3;
  const exteriorOutline = useProvidedExterior
    ? outline
    : topology.exteriorOutline.length >= 3
      ? topology.exteriorOutline
      : outline;
  const shellWalls = useProvidedExterior
    ? providedExteriorWalls
    : topology.shellWalls;
  const buildingBounds = polygonBounds(exteriorOutline);
  const planHeight = Math.max(
    ...walls.map((wall) => wall.height),
    defaultHeight,
  );
  const sourceFloorElevation = toNumber(plan.elevation, 0);
  const sourceSlab = plan.slab ?? plan.slabs?.[0] ?? {};
  const sourceRoof = plan.roof ?? {};
  const sourceSlabOutline = sanitizePolygon(
    extractOutline(sourceSlab)
      .map((point) => transformPoint(point, context)),
  );
  const sourceRoofOutline = sanitizePolygon(
    extractOutline(sourceRoof)
      .map((point) => transformPoint(point, context)),
  );
  const requestedSlabElevation = toNumber(sourceSlab.elevation);
  const requestedRoofElevation = toNumber(sourceRoof.elevation);
  const slab = {
    ...sourceSlab,
    id: sourceSlab.id ??
      `${plan.floorId ?? plan.id ?? "ground-floor"}-slab`,
    outline: sourceSlabOutline.length >= 3
      ? sourceSlabOutline
      : exteriorOutline,
    elevation: Number.isFinite(requestedSlabElevation)
      ? requestedSlabElevation - (useProvidedExterior ? sourceFloorElevation : 0)
      : -0.16,
    thickness: Math.max(
      convertVerticalLength(sourceSlab.thickness, context, 0.18),
      0.04,
    ),
  };
  const roof = {
    ...sourceRoof,
    id: sourceRoof.id ??
      `${plan.floorId ?? plan.id ?? "ground-floor"}-roof`,
    type: sourceRoof.type ?? "flat",
    outline: sourceRoofOutline.length >= 3
      ? sourceRoofOutline
      : exteriorOutline,
    elevation: Number.isFinite(requestedRoofElevation)
      ? requestedRoofElevation - (useProvidedExterior ? sourceFloorElevation : 0)
      : planHeight,
    thickness: Math.max(
      convertVerticalLength(sourceRoof.thickness, context, 0.22),
      0.06,
    ),
    parapetHeight: Math.max(
      convertVerticalLength(sourceRoof.parapetHeight, context, 0.35),
      0,
    ),
  };
  const normalizedPlan = {
    ...plan,
    roomType,
    roomName: plan.name ?? roomType,
    width: buildingBounds.width,
    depth: buildingBounds.depth,
    height: planHeight,
    bounds: buildingBounds,
    sceneBounds: plan.sceneBounds ?? bounds,
    captureBounds: buildingBounds,
    outline: exteriorOutline,
    exteriorOutline,
    walls,
    rooms,
    fixtures,
    stairs,
    shellWalls,
    slab,
    roof,
    scale,
    sourceUnit: unit || "unknown",
    topology: {
      ...topology.stats,
      exteriorWalls: shellWalls.length,
      suppliedCanonicalShell: useProvidedExterior,
    },
  };
  const computedValidation = validateFloorPlanGeometry(normalizedPlan);
  const validation =
    plan.schemaVersion === "zynora.floorplan.v1" &&
    plan.canonicalValidation
      ? plan.canonicalValidation
      : computedValidation;
  const floorPlanJSON = createFloorPlanDocument(
    normalizedPlan,
    validation,
  );

  return {
    ...normalizedPlan,
    validation,
    floorPlanJSON,
    schemaVersion: floorPlanJSON.schemaVersion,
    stats: {
      ...(plan.stats ?? {}),
      ...topology.stats,
      ...validation.stats,
    },
  };
}

function aggregateBounds(floors) {
  const points = floors.flatMap(
    (floor) => floor.exteriorOutline ?? floor.outline ?? [],
  );
  return polygonBounds(points);
}

function normalizedFloorId(floor, index, usedIds) {
  const baseId = String(floor.floorId ?? floor.id ?? `Floor-${index + 1}`);
  let id = baseId;
  let suffix = 2;

  while (usedIds.has(id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }

  usedIds.add(id);
  return id;
}

function normalizeMultiFloorPlan(data) {
  const usedIds = new Set();
  let nextElevation = 0;
  const floors = data.floors.map((floor, index) => {
    const preserveOrigin = Boolean(
      data.coordinatesRegistered ||
      data.preserveWorldOrigin ||
      floor.preserveWorldOrigin ||
      data.schemaVersion === "zynora.floorplan.v1",
    );
    const normalized = normalizeSingleFloorPlan(
      {
        ...floor,
        floorCount: 1,
        schemaVersion: floor.schemaVersion ?? data.schemaVersion,
        unit: floor.unit ?? data.unit,
        coordinateSystem:
          floor.coordinateSystem ?? data.coordinateSystem,
        canonicalValidation:
          data.schemaVersion === "zynora.floorplan.v1"
            ? data.validation?.floorResults?.[
                String(floor.floorId ?? floor.id ?? `Floor-${index + 1}`)
              ]
            : undefined,
      },
      { preserveOrigin },
    );
    const requestedElevation = toNumber(floor.elevation);
    const elevation = Number.isFinite(requestedElevation)
      ? requestedElevation
      : nextElevation;
    const floorId = normalizedFloorId(normalized, index, usedIds);

    nextElevation = Math.max(nextElevation, elevation + normalized.height);

    return {
      ...normalized,
      id: floorId,
      floorId,
      floorIndex: index,
      floorCount: data.floors.length,
      elevation,
    };
  });
  const requestedActiveFloorId = String(
    data.activeFloorId ?? data.floorId ?? "",
  );
  const activeFloor = floors.find(
    (floor) =>
      String(floor.floorId) === requestedActiveFloorId ||
      String(floor.sourceFloorId ?? "") === requestedActiveFloorId,
  ) ?? floors[0];
  const bounds = aggregateBounds(floors);
  const height = Math.max(
    ...floors.map((floor) => floor.elevation + floor.height),
  );
  const normalizedPlan = {
    ...data,
    ...activeFloor,
    id: String(data.id ?? "zynora-multi-floor-plan"),
    floorId: activeFloor.floorId,
    activeFloorId: activeFloor.floorId,
    floorIndex: activeFloor.floorIndex,
    floorCount: floors.length,
    floors,
    width: bounds.width,
    depth: bounds.depth,
    height,
    bounds,
    sceneBounds: bounds,
    captureBounds: bounds,
    sourceType: data.sourceType ?? activeFloor.sourceType,
    classifierVersion:
      data.classifierVersion ?? activeFloor.classifierVersion ?? "v5",
  };
  const computedValidation = validateFloorPlanGeometry(normalizedPlan);
  const validation =
    data.schemaVersion === "zynora.floorplan.v1" && data.validation
      ? data.validation
      : computedValidation;
  const floorPlanJSON = createFloorPlanDocument(normalizedPlan, validation);

  return {
    ...normalizedPlan,
    validation,
    floorPlanJSON,
    schemaVersion: floorPlanJSON.schemaVersion,
    stats: {
      ...(data.stats ?? {}),
      ...validation.stats,
      floors: floors.length,
      totalHeight: height,
      exteriorWalls: validation.stats.exteriorWalls,
    },
  };
}

export function normalizeFloorPlan(data) {
  if (Array.isArray(data?.floors) && data.floors.length) {
    return normalizeMultiFloorPlan(data);
  }

  return normalizeSingleFloorPlan(data);
}

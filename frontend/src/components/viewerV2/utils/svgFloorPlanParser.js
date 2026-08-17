import {
  buildOutlineFromWalls,
  polygonBounds,
  sanitizePolygon,
} from "./polygonMath.js";
import { registerFloorStack } from "./floorRegistration.js";

const IDENTITY_MATRIX = {
  a: 1,
  b: 0,
  c: 0,
  d: 1,
  e: 0,
  f: 0,
};

const ROOM_COLOR_RULES = [
  [/bed|master|guest/i, "#d9c8ee"],
  [/kitchen|pantry/i, "#f1d5a8"],
  [/living|lounge|family/i, "#b9d8e8"],
  [/dining/i, "#c8dfbf"],
  [/bath|toilet|wash|wc|sauna/i, "#b9dfe0"],
  [/office|study|work/i, "#c9d2ef"],
  [/hall|entry|corridor/i, "#ddd8cf"],
  [/outdoor|balcony|terrace|patio/i, "#c9dfbd"],
  [/storage|closet|technical/i, "#d7d0c8"],
];

const STRUCTURAL_OUTDOOR_PATTERN =
  /outdoor|balcony|terrace|patio|porch|deck|garden|yard|veranda|loggia/i;

function toNumber(value, fallback = NaN) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function multiplyMatrices(left, right) {
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
    e: left.a * right.e + left.c * right.f + left.e,
    f: left.b * right.e + left.d * right.f + left.f,
  };
}

function translationMatrix(x, y) {
  return {
    ...IDENTITY_MATRIX,
    e: x,
    f: y,
  };
}

function parseTransform(transformValue) {
  if (!transformValue) {
    return IDENTITY_MATRIX;
  }

  const transformPattern = /([a-zA-Z]+)\s*\(([^)]*)\)/g;
  let result = IDENTITY_MATRIX;
  let match = transformPattern.exec(transformValue);

  while (match) {
    const operation = match[1].toLowerCase();
    const values = (match[2].match(
      /[-+]?(?:\d*\.)?\d+(?:[eE][-+]?\d+)?/g
    ) ?? []).map(Number);
    let next = IDENTITY_MATRIX;

    if (operation === "matrix" && values.length >= 6) {
      next = {
        a: values[0],
        b: values[1],
        c: values[2],
        d: values[3],
        e: values[4],
        f: values[5],
      };
    } else if (operation === "translate") {
      next = translationMatrix(values[0] ?? 0, values[1] ?? 0);
    } else if (operation === "scale") {
      next = {
        ...IDENTITY_MATRIX,
        a: values[0] ?? 1,
        d: values[1] ?? values[0] ?? 1,
      };
    } else if (operation === "rotate") {
      const radians = ((values[0] ?? 0) * Math.PI) / 180;
      const rotation = {
        ...IDENTITY_MATRIX,
        a: Math.cos(radians),
        b: Math.sin(radians),
        c: -Math.sin(radians),
        d: Math.cos(radians),
      };

      if (values.length >= 3) {
        const toCenter = translationMatrix(values[1], values[2]);
        const fromCenter = translationMatrix(-values[1], -values[2]);
        next = multiplyMatrices(
          multiplyMatrices(toCenter, rotation),
          fromCenter
        );
      } else {
        next = rotation;
      }
    } else if (operation === "skewx") {
      next = {
        ...IDENTITY_MATRIX,
        c: Math.tan(((values[0] ?? 0) * Math.PI) / 180),
      };
    } else if (operation === "skewy") {
      next = {
        ...IDENTITY_MATRIX,
        b: Math.tan(((values[0] ?? 0) * Math.PI) / 180),
      };
    }

    result = multiplyMatrices(result, next);
    match = transformPattern.exec(transformValue);
  }

  return result;
}

function elementTransform(element, svgRoot) {
  const chain = [];
  let current = element;

  while (current && current.nodeType === 1) {
    chain.unshift(current);

    if (current === svgRoot) {
      break;
    }

    current = current.parentElement;
  }

  return chain.reduce(
    (matrix, node) =>
      multiplyMatrices(
        matrix,
        parseTransform(node.getAttribute?.("transform"))
      ),
    IDENTITY_MATRIX
  );
}

function transformPoint(point, matrix) {
  return {
    x: matrix.a * point.x + matrix.c * point.y + matrix.e,
    y: matrix.b * point.x + matrix.d * point.y + matrix.f,
  };
}

function parsePointList(value) {
  const values = String(value ?? "").match(
    /[-+]?(?:\d*\.)?\d+(?:[eE][-+]?\d+)?/g
  );

  if (!values || values.length < 6) {
    return [];
  }

  const points = [];

  for (let index = 0; index + 1 < values.length; index += 2) {
    points.push({
      x: Number(values[index]),
      y: Number(values[index + 1]),
    });
  }

  return points;
}

function parseSimplePath(value) {
  const tokens = String(value ?? "").match(
    /[MmLlHhVvZz]|[-+]?(?:\d*\.)?\d+(?:[eE][-+]?\d+)?/g
  );

  if (!tokens?.length) {
    return [];
  }

  const points = [];
  let index = 0;
  let command = null;
  let current = { x: 0, y: 0 };
  let start = null;
  const isCommand = (token) => /^[A-Za-z]$/.test(token);

  while (index < tokens.length) {
    if (isCommand(tokens[index])) {
      command = tokens[index];
      index += 1;
    }

    if (!command) {
      break;
    }

    if (command === "Z" || command === "z") {
      current = start ? { ...start } : current;
      command = null;
      continue;
    }

    if (command === "H" || command === "h") {
      const valueX = toNumber(tokens[index]);
      index += 1;
      current = {
        x: command === "h" ? current.x + valueX : valueX,
        y: current.y,
      };
      points.push({ ...current });
      continue;
    }

    if (command === "V" || command === "v") {
      const valueY = toNumber(tokens[index]);
      index += 1;
      current = {
        x: current.x,
        y: command === "v" ? current.y + valueY : valueY,
      };
      points.push({ ...current });
      continue;
    }

    if (["M", "m", "L", "l"].includes(command)) {
      const valueX = toNumber(tokens[index]);
      const valueY = toNumber(tokens[index + 1]);
      index += 2;

      if (!Number.isFinite(valueX) || !Number.isFinite(valueY)) {
        break;
      }

      const relative = command === "m" || command === "l";
      current = {
        x: relative ? current.x + valueX : valueX,
        y: relative ? current.y + valueY : valueY,
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

function directBoundaryElement(group) {
  return Array.from(group?.children ?? []).find((child) => {
    const tagName = child.tagName?.toLowerCase();
    return ["polygon", "polyline", "path", "rect"].includes(tagName);
  });
}

function boundaryPoints(group, svgRoot) {
  const boundary = directBoundaryElement(group);

  if (!boundary) {
    return [];
  }

  const tagName = boundary.tagName.toLowerCase();
  let points = [];

  if (tagName === "polygon" || tagName === "polyline") {
    points = parsePointList(boundary.getAttribute("points"));
  } else if (tagName === "path") {
    points = parseSimplePath(boundary.getAttribute("d"));
  } else if (tagName === "rect") {
    const x = toNumber(boundary.getAttribute("x"), 0);
    const y = toNumber(boundary.getAttribute("y"), 0);
    const width = toNumber(boundary.getAttribute("width"), 0);
    const height = toNumber(boundary.getAttribute("height"), 0);
    points = [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height },
    ];
  }

  const matrix = elementTransform(boundary, svgRoot);
  const transformed = points.map((point) => transformPoint(point, matrix));

  if (
    transformed.length > 1 &&
    Math.hypot(
      transformed[0].x - transformed[transformed.length - 1].x,
      transformed[0].y - transformed[transformed.length - 1].y
    ) < 1e-6
  ) {
    transformed.pop();
  }

  return transformed;
}

function nestedBoundaryPoints(group, svgRoot) {
  const direct = boundaryPoints(group, svgRoot);

  if (direct.length >= 3) {
    return direct;
  }

  const boundaryGroup = Array.from(group?.children ?? []).find((child) =>
    String(child.getAttribute?.("class") ?? "")
      .split(/\s+/)
      .includes("BoundaryPolygon")
  ) ?? group?.querySelector?.("g.BoundaryPolygon");

  return boundaryGroup ? boundaryPoints(boundaryGroup, svgRoot) : [];
}

function lineBoundaryPoints(line, svgRoot) {
  if (!line) {
    return [];
  }

  const start = {
    x: toNumber(line.getAttribute("x1")),
    y: toNumber(line.getAttribute("y1")),
  };
  const end = {
    x: toNumber(line.getAttribute("x2")),
    y: toNumber(line.getAttribute("y2")),
  };

  if (
    !Number.isFinite(start.x) ||
    !Number.isFinite(start.y) ||
    !Number.isFinite(end.x) ||
    !Number.isFinite(end.y)
  ) {
    return [];
  }

  const matrix = elementTransform(line, svgRoot);
  return [
    transformPoint(start, matrix),
    transformPoint(end, matrix),
  ];
}

function polygonArea(points) {
  if (!Array.isArray(points) || points.length < 3) {
    return 0;
  }

  let twiceArea = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    twiceArea += current.x * next.y - next.x * current.y;
  }

  return twiceArea / 2;
}

function pointsBounds(points) {
  if (!points.length) {
    return {
      minX: 0,
      maxX: 1,
      minY: 0,
      maxY: 1,
      width: 1,
      depth: 1,
      centerX: 0.5,
      centerY: 0.5,
    };
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: Math.max(maxX - minX, 1e-6),
    depth: Math.max(maxY - minY, 1e-6),
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

function wallAxisFromPolygon(points) {
  if (points.length < 3) {
    return null;
  }

  const center = points.reduce(
    (sum, point) => ({
      x: sum.x + point.x / points.length,
      y: sum.y + point.y / points.length,
    }),
    { x: 0, y: 0 }
  );
  let xx = 0;
  let yy = 0;
  let xy = 0;

  points.forEach((point) => {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    xx += dx * dx;
    yy += dy * dy;
    xy += dx * dy;
  });

  const angle = 0.5 * Math.atan2(2 * xy, xx - yy);
  let axis = {
    x: Math.cos(angle),
    y: Math.sin(angle),
  };
  let normal = {
    x: -axis.y,
    y: axis.x,
  };

  const rangesFor = (mainAxis, crossAxis) => {
    const along = points.map(
      (point) =>
        (point.x - center.x) * mainAxis.x +
        (point.y - center.y) * mainAxis.y
    );
    const across = points.map(
      (point) =>
        (point.x - center.x) * crossAxis.x +
        (point.y - center.y) * crossAxis.y
    );

    return {
      minAlong: Math.min(...along),
      maxAlong: Math.max(...along),
      minAcross: Math.min(...across),
      maxAcross: Math.max(...across),
    };
  };

  let ranges = rangesFor(axis, normal);

  if (
    ranges.maxAcross - ranges.minAcross >
    ranges.maxAlong - ranges.minAlong
  ) {
    const previousAxis = axis;
    axis = normal;
    normal = {
      x: -previousAxis.x,
      y: -previousAxis.y,
    };
    ranges = rangesFor(axis, normal);
  }

  const middleAcross = (ranges.minAcross + ranges.maxAcross) / 2;
  const pointAt = (distance) => ({
    x: center.x + axis.x * distance + normal.x * middleAcross,
    y: center.y + axis.y * distance + normal.y * middleAcross,
  });

  return {
    center,
    axis,
    normal,
    start: pointAt(ranges.minAlong),
    end: pointAt(ranges.maxAlong),
    length: ranges.maxAlong - ranges.minAlong,
    thickness: ranges.maxAcross - ranges.minAcross,
  };
}

function openingFromGroup(group, wallAxis, svgRoot, index) {
  const points = boundaryPoints(group, svgRoot);

  if (points.length < 3) {
    return null;
  }

  const projections = points.map(
    (point) =>
      (point.x - wallAxis.start.x) * wallAxis.axis.x +
      (point.y - wallAxis.start.y) * wallAxis.axis.y
  );
  const min = Math.min(...projections);
  const max = Math.max(...projections);
  const startPoint = {
    x: wallAxis.start.x + wallAxis.axis.x * min,
    y: wallAxis.start.y + wallAxis.axis.y * min,
  };
  const endPoint = {
    x: wallAxis.start.x + wallAxis.axis.x * max,
    y: wallAxis.start.y + wallAxis.axis.y * max,
  };
  const className = group.getAttribute("class") ?? "";
  const type = /window/i.test(className) ? "window" : "door";

  return {
    id: `${type}-${index}`,
    type,
    startPoint,
    endPoint,
    width: Math.max(max - min, 1),
    bottom: type === "window" ? 0.9 : 0,
    height: type === "window" ? 1.15 : 2.1,
  };
}

function classRoomType(group) {
  const ignored = new Set([
    "space",
    "room",
    "floor",
    "floorplan",
  ]);
  const tokens = String(group.getAttribute("class") ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !ignored.has(token.toLowerCase()));

  return tokens.join(" ") || "Room";
}

function classFixtureType(group) {
  const ignored = new Set([
    "fixedfurniture",
    "fixedfurnitureset",
    "electricalappliance",
  ]);
  const tokens = String(group.getAttribute("class") ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !ignored.has(token.toLowerCase()));

  return tokens.join(" ") || "Fixture";
}

function fixtureAppearance(type) {
  const value = String(type).toLowerCase();

  if (/coatcloset|closet|wardrobe/.test(value)) {
    return { color: "#b7aa96", height: 2.15, elevation: 0 };
  }

  if (/wallcabinet/.test(value)) {
    return { color: "#c7b9a4", height: 0.72, elevation: 1.35 };
  }

  if (/toilet/.test(value)) {
    return { color: "#f4f5f2", height: 0.5, elevation: 0 };
  }

  if (/sink/.test(value)) {
    return { color: "#d9e4e7", height: 0.88, elevation: 0 };
  }

  if (/shower/.test(value)) {
    return { color: "#c6dce3", height: 0.08, elevation: 0 };
  }

  if (/refrigerator/.test(value)) {
    return { color: "#c8cdd1", height: 1.85, elevation: 0 };
  }

  if (/stove|appliance|housing/.test(value)) {
    return { color: "#c9ced1", height: 0.9, elevation: 0 };
  }

  if (/cabinet/.test(value)) {
    return { color: "#c6b79f", height: 0.9, elevation: 0 };
  }

  return { color: "#c9c2b5", height: 0.82, elevation: 0 };
}

function roomColor(roomType, selected) {
  if (selected) {
    return "#f1c75b";
  }

  return (
    ROOM_COLOR_RULES.find(([pattern]) => pattern.test(roomType))?.[1] ??
    "#ddd7c9"
  );
}

function roomBounds(outline) {
  const raw = pointsBounds(
    outline.map((point) => ({ x: point.x, y: point.z }))
  );

  return {
    minX: raw.minX,
    maxX: raw.maxX,
    minZ: raw.minY,
    maxZ: raw.maxY,
    width: raw.width,
    depth: raw.depth,
    centerX: raw.centerX,
    centerZ: raw.centerY,
  };
}

function classificationRooms(classification) {
  if (Array.isArray(classification)) {
    return classification;
  }

  return Array.isArray(classification?.rooms)
    ? classification.rooms
    : [];
}

function isHiddenByAttributes(element) {
  if (!element || element.nodeType !== 1) {
    return false;
  }

  const style = String(element.getAttribute("style") ?? "");
  const display = String(element.getAttribute("display") ?? "");
  const visibility = String(element.getAttribute("visibility") ?? "");

  return (
    element.hasAttribute("hidden") ||
    display.trim().toLowerCase() === "none" ||
    visibility.trim().toLowerCase() === "hidden" ||
    /(?:^|;)\s*display\s*:\s*none\b/i.test(style) ||
    /(?:^|;)\s*visibility\s*:\s*hidden\b/i.test(style)
  );
}

function isVisibleInSvg(element, svgRoot) {
  let current = element;

  while (current && current.nodeType === 1) {
    if (isHiddenByAttributes(current)) {
      return false;
    }

    if (current === svgRoot) {
      break;
    }

    current = current.parentElement;
  }

  return true;
}

function isVisibleWithinFloor(element, floorRoot) {
  let current = element;

  while (current && current.nodeType === 1 && current !== floorRoot) {
    if (isHiddenByAttributes(current)) {
      return false;
    }

    current = current.parentElement;
  }

  return true;
}

function floorContainsRoom(floor, roomId) {
  if (!floor || roomId == null || String(roomId) === "") {
    return false;
  }

  return Array.from(floor.querySelectorAll("g.Space[id]")).some(
    (room) => String(room.getAttribute("id")) === String(roomId)
  );
}

function predictionMatchesForFloor(floor, predictionMap) {
  return Array.from(floor.querySelectorAll("g.Space[id]")).reduce(
    (count, room) =>
      count + (predictionMap.has(String(room.getAttribute("id"))) ? 1 : 0),
    0
  );
}

function selectFloorRoot(svgRoot, predictionMap, selectedRoomId) {
  const floors = Array.from(svgRoot.querySelectorAll("g.Floorplan"));

  if (!floors.length) {
    return {
      root: svgRoot,
      id: "Floorplan",
      index: 0,
      total: 1,
    };
  }

  const visibleFloors = floors.filter((floor) =>
    isVisibleInSvg(floor, svgRoot)
  );
  const candidates = visibleFloors.length ? visibleFloors : floors;
  let selected = floors.find((floor) =>
    floorContainsRoom(floor, selectedRoomId)
  );

  if (!selected && predictionMap.size) {
    selected = [...floors].sort(
      (left, right) =>
        predictionMatchesForFloor(right, predictionMap) -
        predictionMatchesForFloor(left, predictionMap)
    )[0];
  }

  selected ??= candidates[0];

  return {
    root: selected,
    id:
      selected.getAttribute("id") ||
      `Floor-${floors.indexOf(selected) + 1}`,
    index: floors.indexOf(selected),
    total: floors.length,
  };
}

function extractRawFloor(
  floorRoot,
  svgRoot,
  predictionMap,
  floorId,
) {
  const visible = (element) => isVisibleWithinFloor(element, floorRoot);
  const rawRooms = Array.from(floorRoot.querySelectorAll("g.Space[id]"))
    .filter(visible)
    .map((group) => {
      const outline = boundaryPoints(group, svgRoot);

      if (outline.length < 3 || Math.abs(polygonArea(outline)) < 1e-4) {
        return null;
      }

      const id = String(group.getAttribute("id"));

      return {
        id,
        outline,
        prediction: predictionMap.get(id) ?? null,
        originalRoomType: classRoomType(group),
      };
    })
    .filter(Boolean);
  const rawWallPolygons = [];
  const rawWalls = Array.from(floorRoot.querySelectorAll("g.Wall"))
    .filter(visible)
    .map((group, wallIndex) => {
      const polygon = boundaryPoints(group, svgRoot);
      const axis = wallAxisFromPolygon(polygon);

      if (!axis || axis.length < 1e-4 || axis.thickness < 1e-4) {
        return null;
      }

      rawWallPolygons.push(...polygon);
      const openingGroups = Array.from(group.children ?? []).filter((child) => {
        const className = child.getAttribute?.("class") ?? "";
        return visible(child) && /(^|\s)(Door|Window)(\s|$)/i.test(className);
      });
      const openings = openingGroups
        .map((openingGroup, openingIndex) =>
          openingFromGroup(
            openingGroup,
            axis,
            svgRoot,
            `${wallIndex}-${openingIndex}`,
          ),
        )
        .filter(Boolean);
      const wallClass = String(group.getAttribute("class") ?? "Wall");

      return {
        id: `wall-${wallIndex}`,
        start: axis.start,
        end: axis.end,
        thickness: axis.thickness,
        wallClass,
        isExterior: /(^|\s)External(\s|$)/i.test(wallClass),
        openings,
      };
    })
    .filter(Boolean);
  const rawFixtures = Array.from(
    floorRoot.querySelectorAll("g.FixedFurniture"),
  )
    .filter(visible)
    .map((group, fixtureIndex) => {
      const outline = nestedBoundaryPoints(group, svgRoot);

      if (outline.length < 3 || Math.abs(polygonArea(outline)) < 1e-4) {
        return null;
      }

      const type = classFixtureType(group);

      return {
        id: `fixture-${fixtureIndex}`,
        type,
        outline,
        ...fixtureAppearance(type),
      };
    })
    .filter(Boolean);
  const rawStairParts = [];
  const rawStairTreads = [];

  Array.from(floorRoot.querySelectorAll("g.Stairs"))
    .filter(visible)
    .forEach((stairsGroup, stairsIndex) => {
      const parts = [
        ...Array.from(stairsGroup.querySelectorAll("g.Flight")),
        ...Array.from(stairsGroup.querySelectorAll("g.Landing")),
      ];

      parts.filter(visible).forEach((part, partIndex) => {
        const outline = boundaryPoints(part, svgRoot);

        if (outline.length >= 3 && Math.abs(polygonArea(outline)) >= 1e-4) {
          rawStairParts.push({
            id: `stairs-${stairsIndex}-part-${partIndex}`,
            outline,
            type: String(part.getAttribute("class") ?? "Stair part"),
          });
        }
      });

      Array.from(stairsGroup.querySelectorAll("g.Steps line"))
        .filter(visible)
        .forEach((line, treadIndex) => {
          const points = lineBoundaryPoints(line, svgRoot);

          if (points.length === 2) {
            rawStairTreads.push({
              id: `stairs-${stairsIndex}-tread-${treadIndex}`,
              start: points[0],
              end: points[1],
            });
          }
        });
    });
  const allRawPoints = [
    ...rawRooms.flatMap((room) => room.outline),
    ...rawWallPolygons,
    ...rawFixtures.flatMap((fixture) => fixture.outline),
    ...rawStairParts.flatMap((part) => part.outline),
  ];

  if (!rawRooms.length && !rawWalls.length) {
    return null;
  }

  return {
    floorId,
    rawRooms,
    rawWalls,
    rawFixtures,
    rawStairParts,
    rawStairTreads,
    rawBounds: pointsBounds(allRawPoints),
  };
}

function rawFloorToWorld(
  rawFloor,
  {
    scale,
    wallHeight,
    selectedRoomId,
    classification,
    floorIndex,
    floorCount,
  },
) {
  const { rawBounds } = rawFloor;
  const toWorldPoint = (point) => ({
    x: (point.x - rawBounds.centerX) * scale,
    z: (point.y - rawBounds.centerY) * scale,
  });
  const rooms = rawFloor.rawRooms.map((room) => {
    const outline = room.outline.map(toWorldPoint);
    const bounds = roomBounds(outline);
    const predictedType = String(
      room.prediction?.predicted_room_type ?? "",
    );
    const originalRoomType = String(room.originalRoomType ?? "Room");
    const confidence = Number(room.prediction?.confidence);
    const originalOutdoor = STRUCTURAL_OUTDOOR_PATTERN.test(
      originalRoomType,
    );
    const predictedOutdoor = STRUCTURAL_OUTDOOR_PATTERN.test(predictedType);
    const structuralConflict =
      Boolean(predictedType) && originalOutdoor !== predictedOutdoor;
    const predictionTrusted =
      !structuralConflict ||
      (Number.isFinite(confidence) && confidence >= 0.75);
    const roomType = String(
      predictedType && predictionTrusted
        ? predictedType
        : originalRoomType,
    );
    const selected = String(room.id) === String(selectedRoomId ?? "");

    return {
      ...room.prediction,
      id: room.id,
      room_id: room.id,
      roomType,
      roomName: roomType,
      originalRoomType,
      structuralRoomType: originalRoomType,
      isOutdoor: originalOutdoor,
      classificationConflict: structuralConflict,
      outline,
      bounds,
      width: bounds.width,
      depth: bounds.depth,
      height: wallHeight,
      selected,
      classificationMatched: Boolean(room.prediction),
      classification: room.prediction,
      modelVersion: classification?.model_version ?? "v5",
      floorColor: roomColor(roomType, selected),
      area: Math.abs(polygonArea(room.outline)) * scale * scale,
    };
  });
  const walls = rawFloor.rawWalls.map((wall) => ({
    id: wall.id,
    start: toWorldPoint(wall.start),
    end: toWorldPoint(wall.end),
    height: wallHeight,
    thickness: Math.max(0.07, Math.min(wall.thickness * scale, 0.32)),
    color: "#eee9e1",
    wallClass: wall.wallClass,
    isExterior: wall.isExterior,
    openings: wall.openings.map((opening) => ({
      ...opening,
      startPoint: toWorldPoint(opening.startPoint),
      endPoint: toWorldPoint(opening.endPoint),
      width: opening.width * scale,
    })),
  }));
  const fixtures = rawFloor.rawFixtures.map((fixture) => ({
    ...fixture,
    outline: fixture.outline.map(toWorldPoint),
  }));
  const stairs = {
    parts: rawFloor.rawStairParts.map((part) => ({
      ...part,
      outline: part.outline.map(toWorldPoint),
      color: /landing/i.test(part.type) ? "#d9d6cf" : "#eeeae3",
      height: 0.1,
    })),
    treads: rawFloor.rawStairTreads.map((tread) => ({
      ...tread,
      start: toWorldPoint(tread.start),
      end: toWorldPoint(tread.end),
    })),
  };
  const worldBounds = {
    minX: -rawBounds.width * scale * 0.5,
    maxX: rawBounds.width * scale * 0.5,
    minZ: -rawBounds.depth * scale * 0.5,
    maxZ: rawBounds.depth * scale * 0.5,
    width: rawBounds.width * scale,
    depth: rawBounds.depth * scale,
    centerX: 0,
    centerZ: 0,
  };
  const fallbackOutline = [
    { x: worldBounds.minX, z: worldBounds.minZ },
    { x: worldBounds.maxX, z: worldBounds.minZ },
    { x: worldBounds.maxX, z: worldBounds.maxZ },
    { x: worldBounds.minX, z: worldBounds.maxZ },
  ];
  const exteriorOutline = sanitizePolygon(
    buildOutlineFromWalls(
      walls
        .filter((wall) => wall.isExterior)
        .map((wall) => ({
          x1: wall.start.x,
          z1: wall.start.z,
          x2: wall.end.x,
          z2: wall.end.z,
        })),
    ),
  );
  const outline = exteriorOutline.length >= 3
    ? exteriorOutline
    : fallbackOutline;
  const buildingBounds = polygonBounds(outline);
  const matchedClassifications = rooms.filter(
    (room) => room.classificationMatched,
  ).length;

  return {
    id: rawFloor.floorId,
    floorId: rawFloor.floorId,
    sourceFloorId: rawFloor.floorId,
    floorIndex,
    floorCount,
    roomType: "Floor Plan",
    measurementUnit: "meters",
    coordinateScale: 1,
    wallHeight,
    wallThickness: 0.16,
    width: buildingBounds.width,
    depth: buildingBounds.depth,
    height: wallHeight,
    bounds: buildingBounds,
    sceneBounds: worldBounds,
    outline,
    exteriorOutline: outline,
    rooms,
    walls,
    fixtures,
    stairs,
    sourceScale: scale,
    sourceBounds: rawBounds,
    sourceType: "cubicasa-svg",
    classifierVersion: classification?.model_version ?? "v5",
    selectedRoomId,
    stats: {
      floorId: rawFloor.floorId,
      floorNumber: floorIndex + 1,
      floors: floorCount,
      rooms: rooms.length,
      classifiedRooms: matchedClassifications,
      unmatchedRooms: rooms.length - matchedClassifications,
      walls: walls.length,
      doors: walls.reduce(
        (count, wall) =>
          count + wall.openings.filter((opening) => opening.type === "door").length,
        0,
      ),
      windows: walls.reduce(
        (count, wall) =>
          count + wall.openings.filter((opening) => opening.type === "window").length,
        0,
      ),
      fixtures: fixtures.length,
      stairParts: stairs.parts.length,
      stairTreads: stairs.treads.length,
    },
  };
}

export function parseFloorPlanSvg(
  svgContent,
  {
    classification = null,
    selectedRoomId = null,
    targetSpan = 18,
    wallHeight = 2.8,
  } = {},
) {
  if (typeof DOMParser === "undefined") {
    throw new Error("SVG parsing requires a browser DOMParser.");
  }

  if (typeof svgContent !== "string" || !svgContent.trim()) {
    throw new Error("The uploaded floor-plan SVG is empty.");
  }

  const document = new DOMParser().parseFromString(
    svgContent,
    "image/svg+xml",
  );
  const parserError = document.querySelector("parsererror");

  if (parserError) {
    throw new Error("The uploaded floor-plan SVG is invalid.");
  }

  const svgRoot = document.documentElement;
  const predictionMap = new Map(
    classificationRooms(classification).map((room) => [
      String(room.room_id ?? room.id),
      room,
    ]),
  );
  const activeFloor = selectFloorRoot(
    svgRoot,
    predictionMap,
    selectedRoomId,
  );
  const floorRoots = Array.from(svgRoot.querySelectorAll("g.Floorplan"));
  const roots = floorRoots.length ? floorRoots : [svgRoot];
  const rawFloors = roots
    .map((floorRoot, index) =>
      extractRawFloor(
        floorRoot,
        svgRoot,
        predictionMap,
        floorRoot.getAttribute?.("id") || `Floor-${index + 1}`,
      ),
    )
    .filter(Boolean);

  if (!rawFloors.length) {
    throw new Error(
      "No Space or Wall geometry was found in the uploaded SVG.",
    );
  }

  const largestSpan = Math.max(
    ...rawFloors.map((floor) =>
      Math.max(floor.rawBounds.width, floor.rawBounds.depth, 1),
    ),
  );
  const scale = Math.max(0.0001, targetSpan / largestSpan);
  const floors = registerFloorStack(
    rawFloors.map((floor, index) =>
      rawFloorToWorld(floor, {
        scale,
        wallHeight,
        selectedRoomId,
        classification,
        floorIndex: index,
        floorCount: rawFloors.length,
      }),
    ),
  );
  const activeFloorId = activeFloor.id;
  const selectedFloor = floors.find(
    (floor) => String(floor.floorId) === String(activeFloorId),
  ) ?? floors[0];

  return {
    ...selectedFloor,
    id: "zynora-svg-floor-plan",
    floorId: selectedFloor.floorId,
    activeFloorId: selectedFloor.floorId,
    floorIndex: selectedFloor.floorIndex,
    floorCount: floors.length,
    floors,
    preserveWorldOrigin: true,
    coordinatesRegistered: true,
    sourceScale: scale,
    stats: {
      ...selectedFloor.stats,
      floors: floors.length,
      rooms: floors.reduce((sum, floor) => sum + floor.stats.rooms, 0),
      classifiedRooms: floors.reduce(
        (sum, floor) => sum + floor.stats.classifiedRooms,
        0,
      ),
      walls: floors.reduce((sum, floor) => sum + floor.stats.walls, 0),
      doors: floors.reduce((sum, floor) => sum + floor.stats.doors, 0),
      windows: floors.reduce((sum, floor) => sum + floor.stats.windows, 0),
      fixtures: floors.reduce((sum, floor) => sum + floor.stats.fixtures, 0),
    },
  };
}

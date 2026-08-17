import * as THREE from "three";

import {
  SVGLoader,
} from "three/examples/jsm/loaders/SVGLoader.js";


const TARGET_LONGEST_SIDE = 10;
const EPSILON = 0.000001;


function polygonArea(points) {
  if (points.length < 3) {
    return 0;
  }

  let area = 0;

  for (
    let index = 0;
    index < points.length;
    index += 1
  ) {
    const current = points[index];
    const next =
      points[(index + 1) % points.length];

    area +=
      current.x * next.y -
      next.x * current.y;
  }

  return Math.abs(area / 2);
}


function samePoint(first, second) {
  return (
    Math.abs(first.x - second.x) < EPSILON &&
    Math.abs(first.y - second.y) < EPSILON
  );
}


function removeDuplicatePoints(points) {
  const result = [];

  points.forEach((point) => {
    if (
      Number.isFinite(point.x) &&
      Number.isFinite(point.y) &&
      (
        result.length === 0 ||
        !samePoint(
          result[result.length - 1],
          point
        )
      )
    ) {
      result.push(
        new THREE.Vector2(
          Number(point.x),
          Number(point.y)
        )
      );
    }
  });

  if (
    result.length > 2 &&
    samePoint(result[0], result[result.length - 1])
  ) {
    result.pop();
  }

  return result;
}


function removeCollinearPoints(points) {
  if (points.length <= 3) {
    return points;
  }

  let result = [...points];
  let changed = true;

  while (changed && result.length > 3) {
    changed = false;

    const nextResult = [];

    for (
      let index = 0;
      index < result.length;
      index += 1
    ) {
      const previous =
        result[
          (index - 1 + result.length) %
            result.length
        ];
      const current = result[index];
      const next =
        result[(index + 1) % result.length];

      const firstX = current.x - previous.x;
      const firstY = current.y - previous.y;
      const secondX = next.x - current.x;
      const secondY = next.y - current.y;

      const cross =
        firstX * secondY -
        firstY * secondX;

      const lengthScale =
        Math.hypot(firstX, firstY) +
        Math.hypot(secondX, secondY);

      if (
        lengthScale > EPSILON &&
        Math.abs(cross) <=
          EPSILON * lengthScale
      ) {
        changed = true;
        continue;
      }

      nextResult.push(current);
    }

    result = nextResult;
  }

  return result;
}


function cleanPoints(points) {
  return removeCollinearPoints(
    removeDuplicatePoints(points)
  );
}


function getRoomIdentifiers(room) {
  return [
    room?.room_id,
    room?.svg_id,
    room?.id,
    room?.element_id,
  ]
    .filter(
      (value) =>
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
    )
    .map((value) => String(value).trim());
}


function nodeMatchesRoom(node, roomIdentifiers) {
  let current = node;

  while (current) {
    if (typeof current.getAttribute === "function") {
      const values = [
        current.getAttribute("id"),
        current.getAttribute("data-room-id"),
        current.getAttribute("data-room_id"),
      ];

      if (
        values.some(
          (value) =>
            value !== null &&
            roomIdentifiers.includes(
              String(value).trim()
            )
        )
      ) {
        return true;
      }
    }

    current = current.parentNode;
  }

  return false;
}


function pointsFromShape(shape) {
  return cleanPoints(
    shape.getPoints(32)
  );
}


function extractWithSvgLoader(
  svgContent,
  roomIdentifiers
) {
  const loader = new SVGLoader();
  const parsedSvg = loader.parse(svgContent);

  const matchingPaths = parsedSvg.paths.filter(
    (path) =>
      nodeMatchesRoom(
        path.userData?.node,
        roomIdentifiers
      )
  );

  const shapeCandidates = [];

  matchingPaths.forEach((path) => {
    const shapes =
      SVGLoader.createShapes(path);

    shapes.forEach((shape) => {
      const points = pointsFromShape(shape);

      if (points.length >= 3) {
        shapeCandidates.push({
          area: polygonArea(points),
          points,
        });
      }
    });
  });

  shapeCandidates.sort(
    (first, second) =>
      second.area - first.area
  );

  return shapeCandidates[0]?.points || null;
}


function parsePointString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const numbers =
    value.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi);

  if (!numbers || numbers.length < 6) {
    return null;
  }

  const points = [];

  for (
    let index = 0;
    index + 1 < numbers.length;
    index += 2
  ) {
    points.push(
      new THREE.Vector2(
        Number(numbers[index]),
        Number(numbers[index + 1])
      )
    );
  }

  return cleanPoints(points);
}


function extractWithDomParser(
  svgContent,
  roomIdentifiers
) {
  const documentNode =
    new DOMParser().parseFromString(
      svgContent,
      "image/svg+xml"
    );

  const target = Array.from(
    documentNode.querySelectorAll(
      "[id], [data-room-id], [data-room_id]"
    )
  ).find((element) =>
    nodeMatchesRoom(element, roomIdentifiers)
  );

  if (!target) {
    return null;
  }

  const candidates = [];

  target
    .querySelectorAll("polygon, polyline")
    .forEach((element) => {
      const points = parsePointString(
        element.getAttribute("points")
      );

      if (points?.length >= 3) {
        candidates.push({
          area: polygonArea(points),
          points,
        });
      }
    });

  target
    .querySelectorAll("rect")
    .forEach((element) => {
      const x =
        Number(element.getAttribute("x")) || 0;
      const y =
        Number(element.getAttribute("y")) || 0;
      const width =
        Number(element.getAttribute("width"));
      const height =
        Number(element.getAttribute("height"));

      if (width > 0 && height > 0) {
        const points = [
          new THREE.Vector2(x, y),
          new THREE.Vector2(x + width, y),
          new THREE.Vector2(
            x + width,
            y + height
          ),
          new THREE.Vector2(x, y + height),
        ];

        candidates.push({
          area: width * height,
          points,
        });
      }
    });

  candidates.sort(
    (first, second) =>
      second.area - first.area
  );

  return candidates[0]?.points || null;
}


function unwrapCoordinateRing(value) {
  if (typeof value === "string") {
    return parsePointString(value);
  }

  let current = value;

  while (
    Array.isArray(current) &&
    current.length > 0 &&
    Array.isArray(current[0]) &&
    Array.isArray(current[0][0])
  ) {
    current = current[0];
  }

  if (!Array.isArray(current)) {
    return null;
  }

  const points = current
    .map((point) => {
      if (
        Array.isArray(point) &&
        point.length >= 2
      ) {
        return new THREE.Vector2(
          Number(point[0]),
          Number(point[1])
        );
      }

      if (
        point &&
        typeof point === "object" &&
        point.x !== undefined &&
        point.y !== undefined
      ) {
        return new THREE.Vector2(
          Number(point.x),
          Number(point.y)
        );
      }

      return null;
    })
    .filter(Boolean);

  return cleanPoints(points);
}


function extractFromRoomData(room) {
  const candidates = [
    room?.polygon,
    room?.points,
    room?.vertices,
    room?.coordinates,
    room?.boundary,
    room?.geometry?.polygon,
    room?.geometry?.coordinates,
  ];

  for (const candidate of candidates) {
    const points = unwrapCoordinateRing(candidate);

    if (points?.length >= 3) {
      return points;
    }
  }

  return null;
}


function makeNormalizedGeometry(rawPoints) {
  const points = cleanPoints(rawPoints);

  if (points.length < 3) {
    throw new Error(
      "The selected room does not contain a valid polygon."
    );
  }

  const bounds =
    new THREE.Box2().setFromPoints(points);
  const sourceSize =
    bounds.getSize(new THREE.Vector2());
  const sourceCenter =
    bounds.getCenter(new THREE.Vector2());

  const longestSide = Math.max(
    sourceSize.x,
    sourceSize.y
  );

  if (longestSide <= EPSILON) {
    throw new Error(
      "The selected room polygon has no measurable size."
    );
  }

  const scale =
    TARGET_LONGEST_SIDE / longestSide;

  const worldPoints = points.map((point) => ({
    x: (point.x - sourceCenter.x) * scale,
    z: (point.y - sourceCenter.y) * scale,
  }));

  const shape = new THREE.Shape();

  shape.moveTo(
    worldPoints[0].x,
    -worldPoints[0].z
  );

  worldPoints.slice(1).forEach((point) => {
    shape.lineTo(point.x, -point.z);
  });

  shape.closePath();

  return {
    depth: sourceSize.y * scale,
    points: worldPoints,
    scale,
    shape,
    sourceHeight: sourceSize.y,
    sourceWidth: sourceSize.x,
    width: sourceSize.x * scale,
  };
}


export function extractRoomGeometry(
  svgContent,
  room
) {
  if (!room) {
    throw new Error("No room was selected.");
  }

  const roomIdentifiers =
    getRoomIdentifiers(room);

  if (roomIdentifiers.length === 0) {
    throw new Error(
      "The selected room has no SVG identifier."
    );
  }

  let rawPoints = null;
  let svgError = null;

  if (
    typeof svgContent === "string" &&
    svgContent.trim() !== ""
  ) {
    try {
      rawPoints = extractWithSvgLoader(
        svgContent,
        roomIdentifiers
      );
    } catch (error) {
      svgError = error;
    }

    if (!rawPoints) {
      try {
        rawPoints = extractWithDomParser(
          svgContent,
          roomIdentifiers
        );
      } catch (error) {
        svgError = svgError || error;
      }
    }
  }

  if (!rawPoints) {
    rawPoints = extractFromRoomData(room);
  }

  if (!rawPoints) {
    const reason = svgError?.message
      ? ` ${svgError.message}`
      : "";

    throw new Error(
      `Could not find polygon geometry for room "${
        room.room_id
      }" in the uploaded SVG.${reason}`
    );
  }

  return makeNormalizedGeometry(rawPoints);
}


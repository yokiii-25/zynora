const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

const ROOM_COLORS = [
  [/outdoor|garden|balcony|terrace|patio/i, "#9dbb7c"],
  [/kitchen|pantry/i, "#efc68f"],
  [/dining/i, "#e5a66a"],
  [/bed|master|guest/i, "#9cb7e4"],
  [/living|lounge|family|recreation/i, "#9fc5dc"],
  [/bath|toilet|wash|wc|sauna/i, "#a8d9df"],
  [/entry|hall|corridor/i, "#c9d2d8"],
  [/storage|closet|technical|attic/i, "#aeb7c2"],
  [/office|study|work/i, "#b7c4e2"],
];

const CONFIDENCE_COLORS = {
  high_confidence: "#198754",
  review_recommended: "#d18b00",
  low_confidence: "#c44536",
};

const FALLBACK_ROOM_COLOR = "#bfd3dd";

function roomColor(roomType) {
  const value = String(roomType ?? "");
  const rule = ROOM_COLORS.find(([pattern]) => pattern.test(value));
  return rule?.[1] ?? FALLBACK_ROOM_COLOR;
}

function confidencePercentage(room) {
  const direct = Number(room?.confidence_percentage);

  if (Number.isFinite(direct)) {
    return Math.max(0, Math.min(100, direct));
  }

  const decimal = Number(room?.confidence);

  if (Number.isFinite(decimal)) {
    return Math.max(0, Math.min(100, decimal * 100));
  }

  return 0;
}

function findSvgRoot(previewElement) {
  if (!previewElement) {
    return null;
  }

  if (previewElement.tagName?.toLowerCase() === "svg") {
    return previewElement;
  }

  return previewElement.querySelector?.("svg") ?? null;
}

function directBoundaryElement(roomGroup) {
  return Array.from(roomGroup?.children ?? []).find((child) =>
    ["polygon", "polyline", "path", "rect"].includes(
      child.tagName?.toLowerCase()
    )
  );
}

function parseNumberList(value) {
  return (
    String(value ?? "").match(
      /[-+]?(?:\d*\.)?\d+(?:[eE][-+]?\d+)?/g
    ) ?? []
  ).map(Number);
}

function boundaryPoints(boundary) {
  const tagName = boundary?.tagName?.toLowerCase();

  if (tagName === "polygon" || tagName === "polyline") {
    const values = parseNumberList(boundary.getAttribute("points"));
    const points = [];

    for (let index = 0; index + 1 < values.length; index += 2) {
      points.push({
        x: values[index],
        y: values[index + 1],
      });
    }

    return points;
  }

  if (tagName === "rect") {
    const x = Number(boundary.getAttribute("x") ?? 0);
    const y = Number(boundary.getAttribute("y") ?? 0);
    const width = Number(boundary.getAttribute("width") ?? 0);
    const height = Number(boundary.getAttribute("height") ?? 0);

    return [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height },
    ];
  }

  try {
    const box = boundary?.getBBox?.();

    if (box && box.width > 0 && box.height > 0) {
      return [
        { x: box.x, y: box.y },
        { x: box.x + box.width, y: box.y },
        { x: box.x + box.width, y: box.y + box.height },
        { x: box.x, y: box.y + box.height },
      ];
    }
  } catch {
    // A detached SVG element can throw while getBBox() is unavailable.
  }

  return [];
}

function polygonBounds(points) {
  const xValues = points.map((point) => point.x);
  const yValues = points.map((point) => point.y);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function pointInsidePolygon(point, polygon) {
  let inside = false;

  for (
    let current = 0, previous = polygon.length - 1;
    current < polygon.length;
    previous = current, current += 1
  ) {
    const first = polygon[current];
    const second = polygon[previous];
    const crosses =
      first.y > point.y !== second.y > point.y &&
      point.x <
        ((second.x - first.x) * (point.y - first.y)) /
          (second.y - first.y) +
          first.x;

    if (crosses) {
      inside = !inside;
    }
  }

  return inside;
}

function pointToSegmentDistance(point, start, end) {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;

  if (lengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const ratio = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * deltaX +
        (point.y - start.y) * deltaY) /
        lengthSquared
    )
  );

  return Math.hypot(
    point.x - (start.x + ratio * deltaX),
    point.y - (start.y + ratio * deltaY)
  );
}

function distanceToPolygonEdges(point, polygon) {
  let distance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < polygon.length; index += 1) {
    distance = Math.min(
      distance,
      pointToSegmentDistance(
        point,
        polygon[index],
        polygon[(index + 1) % polygon.length]
      )
    );
  }

  return distance;
}

function polygonCentroid(points) {
  let signedArea = 0;
  let x = 0;
  let y = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const cross = current.x * next.y - next.x * current.y;
    signedArea += cross;
    x += (current.x + next.x) * cross;
    y += (current.y + next.y) * cross;
  }

  if (Math.abs(signedArea) < 0.0001) {
    const bounds = polygonBounds(points);
    return {
      x: bounds.minX + bounds.width / 2,
      y: bounds.minY + bounds.height / 2,
    };
  }

  return {
    x: x / (3 * signedArea),
    y: y / (3 * signedArea),
  };
}

function bestInteriorPoint(points, preferredPoint) {
  const bounds = polygonBounds(points);
  const candidates = [
    preferredPoint,
    polygonCentroid(points),
    {
      x: bounds.minX + bounds.width / 2,
      y: bounds.minY + bounds.height / 2,
    },
  ].filter(Boolean);

  const columns = 24;
  const rows = 24;

  for (let column = 0; column < columns; column += 1) {
    for (let row = 0; row < rows; row += 1) {
      candidates.push({
        x: bounds.minX + (bounds.width * (column + 0.5)) / columns,
        y: bounds.minY + (bounds.height * (row + 0.5)) / rows,
      });
    }
  }

  let best = {
    point: candidates[1],
    distance: 0,
  };

  candidates.forEach((candidate) => {
    if (!pointInsidePolygon(candidate, points)) {
      return;
    }

    const distance = distanceToPolygonEdges(candidate, points);

    if (distance > best.distance) {
      best = {
        point: candidate,
        distance,
      };
    }
  });

  return {
    ...best,
    bounds,
  };
}

function isElementHidden(element, svgRoot) {
  let current = element;

  while (current) {
    const styleText = String(current.getAttribute?.("style") ?? "")
      .replace(/\s+/g, "")
      .toLowerCase();
    const displayAttribute = String(
      current.getAttribute?.("display") ?? ""
    ).toLowerCase();
    const visibilityAttribute = String(
      current.getAttribute?.("visibility") ?? ""
    ).toLowerCase();

    if (
      styleText.includes("display:none") ||
      styleText.includes("visibility:hidden") ||
      displayAttribute === "none" ||
      visibilityAttribute === "hidden"
    ) {
      return true;
    }

    if (typeof window !== "undefined" && window.getComputedStyle) {
      const computed = window.getComputedStyle(current);

      if (computed.display === "none" || computed.visibility === "hidden") {
        return true;
      }
    }

    if (current === svgRoot) {
      break;
    }

    current = current.parentElement;
  }

  return false;
}

function removeGeneratedLabel(roomGroup) {
  Array.from(roomGroup?.children ?? []).forEach((child) => {
    if (child.getAttribute?.("data-zynora-room-label") === "true") {
      child.remove();
    }
  });
}

function removeGeneratedLabelLayers(svgRoot) {
  Array.from(
    svgRoot.querySelectorAll('[data-zynora-label-layer="true"]')
  ).forEach((layer) => layer.remove());
}

function closestFloorGroup(roomGroup, svgRoot) {
  let current = roomGroup.parentElement;

  while (current && current !== svgRoot) {
    if (current.classList?.contains("Floorplan")) {
      return current;
    }

    current = current.parentElement;
  }

  return svgRoot;
}

function labelLayerForRoom(roomGroup, svgRoot, layers) {
  const floorGroup = closestFloorGroup(roomGroup, svgRoot);
  let layer = layers.get(floorGroup);

  if (!layer) {
    layer = createSvgElement("g");
    layer.setAttribute("data-zynora-label-layer", "true");
    layer.setAttribute("pointer-events", "none");
    floorGroup.appendChild(layer);
    layers.set(floorGroup, layer);
  }

  const transformChain = [];
  let current = roomGroup;

  while (current && current !== floorGroup) {
    transformChain.unshift(current.getAttribute?.("transform"));
    current = current.parentElement;
  }

  return transformChain.filter(Boolean).reduce((parent, transform) => {
    const wrapper = createSvgElement("g");
    wrapper.setAttribute("transform", transform);
    parent.appendChild(wrapper);
    return wrapper;
  }, layer);
}

function createSvgElement(tagName) {
  return document.createElementNS(SVG_NAMESPACE, tagName);
}

function addPredictionLabel(labelParent, boundary, room, selected) {
  const points = boundaryPoints(boundary);

  if (points.length < 3) {
    return;
  }

  const preferredPoint = {
    x: Number(room.centroid_x),
    y: Number(room.centroid_y),
  };
  const hasPreferredPoint =
    Number.isFinite(preferredPoint.x) && Number.isFinite(preferredPoint.y);
  const placement = bestInteriorPoint(
    points,
    hasPreferredPoint ? preferredPoint : null
  );
  const label = String(room.predicted_room_type ?? "Unknown room");
  const confidence = Math.round(confidencePercentage(room));
  const statusColor =
    CONFIDENCE_COLORS[room.confidence_status] ?? "#60717d";
  const rotateLabel =
    points.length <= 5 &&
    placement.bounds.height > placement.bounds.width * 2.35 &&
    label.length >= 7;
  const availableWidth = rotateLabel
    ? placement.bounds.height * 0.78
    : placement.distance * 1.78;
  const availableHeight = rotateLabel
    ? placement.bounds.width * 0.78
    : placement.distance * 1.78;
  const estimatedNameFactor = Math.max(5, label.length) * 0.59 + 1.1;
  const fontSize = Math.max(
    5.5,
    Math.min(
      30,
      availableWidth / estimatedNameFactor,
      availableHeight / 2.7
    )
  );
  const confidenceFontSize = Math.max(5, fontSize * 0.7);
  const paddingX = Math.min(6, fontSize * 0.42);
  const nameWidth = label.length * fontSize * 0.59;
  const confidenceWidth = `${confidence}%`.length * confidenceFontSize * 0.58;
  const boxWidth = Math.min(
    availableWidth,
    Math.max(nameWidth, confidenceWidth) + paddingX * 2
  );
  const boxHeight = Math.min(availableHeight, fontSize * 2.58);

  const labelGroup = createSvgElement("g");
  labelGroup.setAttribute("data-zynora-room-label", "true");
  labelGroup.setAttribute("data-room-id", String(room.room_id ?? ""));
  labelGroup.setAttribute("pointer-events", "none");
  labelGroup.setAttribute("aria-hidden", "true");
  labelGroup.setAttribute(
    "transform",
    `translate(${placement.point.x} ${placement.point.y})${
      rotateLabel ? " rotate(90)" : ""
    }`
  );

  const title = createSvgElement("title");
  title.textContent = `${label} — ${confidence}% confidence`;
  labelGroup.appendChild(title);

  const background = createSvgElement("rect");
  background.setAttribute("x", String(-boxWidth / 2));
  background.setAttribute("y", String(-boxHeight / 2));
  background.setAttribute("width", String(boxWidth));
  background.setAttribute("height", String(boxHeight));
  background.setAttribute("rx", String(Math.min(7, fontSize * 0.42)));
  background.setAttribute("fill", "#ffffff");
  background.setAttribute("fill-opacity", selected ? "0.94" : "0.82");
  background.setAttribute("stroke", selected ? "#116b5a" : statusColor);
  background.setAttribute("stroke-width", selected ? "2" : "1.2");
  labelGroup.appendChild(background);

  const text = createSvgElement("text");
  text.setAttribute("x", "0");
  text.setAttribute("y", String(-fontSize * 0.34));
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("dominant-baseline", "middle");
  text.setAttribute("fill", "#17232b");
  text.setAttribute("font-family", "Manrope, Arial, sans-serif");
  text.setAttribute("font-size", String(fontSize));
  text.setAttribute("font-weight", "750");

  const nameLine = createSvgElement("tspan");
  nameLine.setAttribute("x", "0");
  nameLine.textContent = label;
  text.appendChild(nameLine);

  const confidenceLine = createSvgElement("tspan");
  confidenceLine.setAttribute("x", "0");
  confidenceLine.setAttribute("dy", String(fontSize * 1.12));
  confidenceLine.setAttribute("fill", statusColor);
  confidenceLine.setAttribute("font-size", String(confidenceFontSize));
  confidenceLine.setAttribute("font-weight", "800");
  confidenceLine.textContent = `${confidence}%`;
  text.appendChild(confidenceLine);
  labelGroup.appendChild(text);

  labelParent.appendChild(labelGroup);
}

export function applyAllRoomStyles(
  previewElement,
  rooms,
  selectedRoomId = null
) {
  const svgRoot = findSvgRoot(previewElement);

  if (!svgRoot || !Array.isArray(rooms)) {
    return;
  }

  const roomById = new Map(
    rooms
      .filter((room) => room?.room_id)
      .map((room) => [String(room.room_id), room])
  );
  const labelLayers = new Map();

  removeGeneratedLabelLayers(svgRoot);

  Array.from(svgRoot.querySelectorAll("g.Space")).forEach((roomGroup) => {
    const roomId = roomGroup.getAttribute("id");
    const room = roomById.get(roomId);

    removeGeneratedLabel(roomGroup);

    if (!room) {
      return;
    }

    const boundary = directBoundaryElement(roomGroup);

    if (!boundary) {
      return;
    }

    const selected = roomId === selectedRoomId;
    const color = roomColor(room.predicted_room_type);
    const originalLabel = roomGroup.querySelector(".NameLabel");

    if (originalLabel) {
      originalLabel.style.display = "none";
      originalLabel.setAttribute("aria-hidden", "true");
    }

    boundary.style.fill = color;
    boundary.style.fillOpacity = selected ? "0.94" : "0.76";
    boundary.style.stroke = selected ? "#116b5a" : "#ffffff";
    boundary.style.strokeWidth = selected ? "3" : "1.4";
    boundary.style.vectorEffect = "non-scaling-stroke";
    boundary.style.transition = "fill-opacity 160ms ease, stroke 160ms ease";
    roomGroup.style.cursor = "pointer";
    roomGroup.setAttribute(
      "aria-label",
      `${room.predicted_room_type}, ${Math.round(
        confidencePercentage(room)
      )}% confidence`
    );
    roomGroup.setAttribute("data-predicted-room", room.predicted_room_type);

    if (!isElementHidden(roomGroup, svgRoot)) {
      addPredictionLabel(
        labelLayerForRoom(roomGroup, svgRoot, labelLayers),
        boundary,
        room,
        selected
      );
    }
  });
}

export function getRoomGroupFromEvent(event, previewElement) {
  if (!event?.target || !previewElement) {
    return null;
  }

  let current = event.target;

  while (current && current !== previewElement) {
    if (
      current.nodeType === 1 &&
      current.classList?.contains("Space") &&
      current.getAttribute("id")
    ) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
}

export function scrollToRoomCard(roomId) {
  if (!roomId || typeof document === "undefined") {
    return;
  }

  document
    .getElementById(`room-card-${roomId}`)
    ?.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
}

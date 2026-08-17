function normalizeCollection(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.flatMap((item) =>
      Array.isArray(item) ? normalizeCollection(item) : [item]
    );
  }

  if (typeof value !== "object") return [];

  if (Array.isArray(value.items)) {
    return normalizeCollection(value.items);
  }

  if (Array.isArray(value.data)) {
    return normalizeCollection(value.data);
  }

  if (Array.isArray(value.elements)) {
    return normalizeCollection(value.elements);
  }

  return Object.values(value).flatMap((item) =>
    typeof item === "object" ? normalizeCollection(item) : []
  );
}

function normalizePoint(point) {
  if (Array.isArray(point)) {
    return {
      x: Number(point[0]) || 0,
      z: Number(point[2] ?? point[1]) || 0,
    };
  }

  if (point && typeof point === "object") {
    return {
      x: Number(point.x ?? point[0]) || 0,
      z: Number(point.z ?? point.y ?? point[1]) || 0,
    };
  }

  return null;
}

function getRoomPoints(room) {
  const possiblePoints =
    room.polygon ??
    room.points ??
    room.vertices ??
    room.boundary ??
    room.coordinates ??
    room.geometry?.points ??
    room.geometry?.vertices ??
    room.geometry?.coordinates;

  if (!Array.isArray(possiblePoints)) {
    return [];
  }

  // Handle GeoJSON-style nested coordinates.
  const rawPoints = Array.isArray(possiblePoints[0]?.[0])
    ? possiblePoints[0]
    : possiblePoints;

  return rawPoints.map(normalizePoint).filter(Boolean);
}

function calculateRoomBounds(points) {
  if (!points.length) return null;

  const xValues = points.map((point) => point.x);
  const zValues = points.map((point) => point.z);

  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minZ = Math.min(...zValues);
  const maxZ = Math.max(...zValues);

  return {
    minX,
    maxX,
    minZ,
    maxZ,
    width: maxX - minX,
    depth: maxZ - minZ,
    center: {
      x: (minX + maxX) / 2,
      z: (minZ + maxZ) / 2,
    },
  };
}

function getRoomName(room, index) {
  return (
    room.name ??
    room.label ??
    room.room_name ??
    room.roomName ??
    room.room_type ??
    room.roomType ??
    room.type ??
    `Room ${index + 1}`
  );
}

export function detectRooms(sceneData) {
  const scene = sceneData?.scene ?? sceneData?.house ?? sceneData ?? {};

  const roomSource =
    scene.rooms ??
    scene.spaces ??
    scene.areas ??
    scene.zones ??
    scene.floor?.rooms ??
    scene.floor?.spaces ??
    scene.metadata?.rooms;

  const rooms = normalizeCollection(roomSource);

  return rooms
    .map((room, index) => {
      const points = getRoomPoints(room);
      const bounds = calculateRoomBounds(points);

      return {
        id: room.id ?? room.room_id ?? room.roomId ?? `room-${index}`,
        name: getRoomName(room, index),
        type:
          room.room_type ??
          room.roomType ??
          room.type ??
          room.category ??
          "unknown",
        points,
        bounds,
        original: room,
      };
    })
    .filter((room) => room.bounds);
}
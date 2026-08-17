function isObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

export function normalizeCollection(collection) {
  if (Array.isArray(collection)) {
    return collection.filter(Boolean);
  }

  if (!isObject(collection)) {
    return [];
  }

  return Object.values(collection).flatMap((value) => {
    if (Array.isArray(value)) {
      return value.filter(Boolean);
    }

    if (isObject(value)) {
      return [value];
    }

    return [];
  });
}

export function getScene(data) {
  if (!data || typeof data !== "object") {
    return {};
  }

  return (
    data.scene ??
    data.floorPlan ??
    data.floor_plan ??
    data.design ??
    data.data ??
    data
  );
}

export function getWalls(data) {
  const scene = getScene(data);

  return normalizeCollection(
    scene.walls ??
    scene.wall_data ??
    scene.wallData
  );
}

export function getDoors(data) {
  const scene = getScene(data);

  return normalizeCollection(
    scene.doors ??
    scene.door_data ??
    scene.doorData ??
    scene.openings?.doors
  );
}

export function getWindows(data) {
  const scene = getScene(data);

  return normalizeCollection(
    scene.windows ??
    scene.window_data ??
    scene.windowData ??
    scene.openings?.windows
  );
}

export function getRooms(data) {
  const scene = getScene(data);

  return normalizeCollection(
    scene.rooms ??
    scene.room_data ??
    scene.roomData
  );
}
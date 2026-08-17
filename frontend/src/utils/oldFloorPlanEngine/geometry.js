export function area(width, height) {
  return width * height;
}

export function centerRoom(room) {
  return {
    x: room.x + room.width / 2,
    y: room.y + room.height / 2,
  };
}

export function overlaps(a, b) {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}
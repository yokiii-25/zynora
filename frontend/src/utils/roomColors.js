const ROOM_COLORS = {
  "Living Room": "#F59E0B",
  Bedroom: "#3B82F6",
  Kitchen: "#10B981",
  Bathroom: "#06B6D4",
  Dining: "#F97316",
  Hallway: "#A78BFA",
  Office: "#6366F1",
  Laundry: "#14B8A6",
  Storage: "#6B7280",
  Garage: "#64748B",
  "Outdoor Area": "#84CC16",
  Sauna: "#EF4444",
  "Entry Area": "#38BDF8",
  Alcove: "#8B5CF6",
  Recreation: "#EC4899",
  "Closet Walk In": "#A855F7",
  Attic: "#78716C",
  "Car Port": "#94A3B8",
  "Den Fireplace": "#F43F5E",
  "Dressing Room": "#D946EF",
  Elevated: "#FACC15",
  "Technical Room": "#475569",
};

export function getRoomColor(roomType) {
  return ROOM_COLORS[roomType] ?? "#3B82F6";
}

export function getRoomOpacity(confidence) {
  if (confidence >= 0.95) return 0.90;
  if (confidence >= 0.85) return 0.82;
  if (confidence >= 0.70) return 0.72;
  if (confidence >= 0.50) return 0.62;
  return 0.52;
}

export { ROOM_COLORS };
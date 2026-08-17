export const ROOM_RULES = {
  living: {
    minWidth: 12,
    minHeight: 12,
    preferred: "front",
  },

  kitchen: {
    minWidth: 10,
    minHeight: 10,
    preferred: "left",
  },

  dining: {
    minWidth: 10,
    minHeight: 8,
    near: "kitchen",
  },

  bedroom: {
    minWidth: 10,
    minHeight: 10,
    preferred: "rear",
  },

  bathroom: {
    minWidth: 5,
    minHeight: 7,
    near: "bedroom",
  },

  passage: {
    width: 4,
  },
};
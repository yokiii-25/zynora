export default function generateFurniture(rooms) {
  const furniture = [];

  rooms.forEach((room) => {
    const {
      id: roomId,
      type,
      x,
      y,
      width,
      height,
    } = room;

    if (type === "bedroom") {
      furniture.push({
        id: `${roomId}-bed`,
        roomId,
        type: "bed",
        x: x + width * 0.34,
        y: y + height * 0.08,
        width: width * 0.56,
        height: height * 0.5,
      });

      furniture.push({
        id: `${roomId}-wardrobe`,
        roomId,
        type: "wardrobe",
        x: x + width * 0.05,
        y: y + height * 0.08,
        width: width * 0.1,
        height: height * 0.48,
      });
    }

    if (type === "living") {
      furniture.push({
        id: `${roomId}-sofa`,
        roomId,
        type: "sofa",
        x: x + width * 0.2,
        y: y + height * 0.12,
        width: width * 0.54,
        height: height * 0.2,
      });

      furniture.push({
        id: `${roomId}-table`,
        roomId,
        type: "coffee-table",
        x: x + width * 0.36,
        y: y + height * 0.4,
        width: width * 0.26,
        height: height * 0.14,
      });

      furniture.push({
        id: `${roomId}-tv`,
        roomId,
        type: "tv",
        x: x + width * 0.93,
        y: y + height * 0.2,
        width: width * 0.025,
        height: height * 0.4,
      });
    }

    if (type === "kitchen") {
      furniture.push({
        id: `${roomId}-counter-top`,
        roomId,
        type: "counter",
        x: x + width * 0.04,
        y: y + height * 0.04,
        width: width * 0.92,
        height: height * 0.14,
      });

      furniture.push({
        id: `${roomId}-counter-left`,
        roomId,
        type: "counter",
        x: x + width * 0.04,
        y: y + height * 0.04,
        width: width * 0.12,
        height: height * 0.52,
      });

      furniture.push({
        id: `${roomId}-dining-table`,
        roomId,
        type: "dining-table",
        x: x + width * 0.36,
        y: y + height * 0.45,
        width: width * 0.34,
        height: height * 0.22,
      });

      furniture.push({
        id: `${roomId}-sink`,
        roomId,
        type: "sink",
        x: x + width * 0.56,
        y: y + height * 0.07,
        width: width * 0.17,
        height: height * 0.08,
      });
    }

    if (type === "bathroom") {
      furniture.push({
        id: `${roomId}-bathtub`,
        roomId,
        type: "bathtub",
        x: x + width * 0.08,
        y: y + height * 0.08,
        width: width * 0.28,
        height: height * 0.58,
      });

      furniture.push({
        id: `${roomId}-toilet`,
        roomId,
        type: "toilet",
        x: x + width * 0.65,
        y: y + height * 0.5,
        width: width * 0.18,
        height: height * 0.28,
      });

      furniture.push({
        id: `${roomId}-basin`,
        roomId,
        type: "basin",
        x: x + width * 0.65,
        y: y + height * 0.08,
        width: width * 0.22,
        height: height * 0.18,
      });
    }

    if (type === "utility") {
      furniture.push({
        id: `${roomId}-washer`,
        roomId,
        type: "washer",
        x: x + width * 0.08,
        y: y + height * 0.1,
        width: width * 0.3,
        height: height * 0.38,
      });

      furniture.push({
        id: `${roomId}-storage`,
        roomId,
        type: "storage",
        x: x + width * 0.58,
        y: y + height * 0.08,
        width: width * 0.28,
        height: height * 0.55,
      });
    }
  });

  return furniture;
}
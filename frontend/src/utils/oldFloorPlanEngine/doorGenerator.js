export default function generateDoors(rooms) {
  const getRoom = (id) =>
    rooms.find((room) => room.id === id);

  const doors = [];

  const addDoor = ({
    id,
    roomId,
    side,
    offset,
    width = 3,
    swing = "left",
    type = "internal",
  }) => {
    const room = getRoom(roomId);

    if (!room) return;

    doors.push({
      id,
      roomId,
      side,
      offset,
      width,
      swing,
      type,
    });
  };

  // Main entrance
  addDoor({
    id: "main-entrance",
    roomId: "family-area",
    side: "bottom",
    offset: 0.5,
    width: 3.5,
    swing: "right",
    type: "main",
  });

  // Kitchen to living
  addDoor({
    id: "kitchen-door",
    roomId: "kitchen",
    side: "right",
    offset: 0.72,
    width: 3,
    swing: "left",
  });

  // Living to passage
  addDoor({
    id: "living-door",
    roomId: "living",
    side: "bottom",
    offset: 0.76,
    width: 3,
    swing: "left",
  });

  // Bedroom 2 to passage
  addDoor({
    id: "bedroom-2-door",
    roomId: "bedroom-2",
    side: "left",
    offset: 0.88,
    width: 3,
    swing: "right",
  });

  // Utility entrance
  addDoor({
    id: "utility-door",
    roomId: "utility",
    side: "bottom",
    offset: 0.62,
    width: 2.7,
    swing: "left",
  });

  // Bathroom to passage
  addDoor({
    id: "bathroom-door",
    roomId: "bathroom",
    side: "right",
    offset: 0.65,
    width: 2.5,
    swing: "left",
  });

  // Master bedroom to family area
  addDoor({
    id: "master-bedroom-door",
    roomId: "master-bedroom",
    side: "right",
    offset: 0.35,
    width: 3,
    swing: "right",
  });

  // Bedroom 3 to passage
  addDoor({
    id: "bedroom-3-door",
    roomId: "bedroom-3",
    side: "left",
    offset: 0.15,
    width: 3,
    swing: "right",
  });

  return doors;
}
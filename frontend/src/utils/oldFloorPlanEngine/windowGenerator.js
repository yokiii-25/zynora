export default function generateWindows(rooms) {
  const windows = [];

  const addWindow = ({
    id,
    roomId,
    side,
    offset = 0.5,
    width = 4,
  }) => {
    const room = rooms.find(
      (currentRoom) => currentRoom.id === roomId
    );

    if (!room) return;

    windows.push({
      id,
      roomId,
      side,
      offset,
      width,
    });
  };

  // Only exterior walls receive windows

  addWindow({
    id: "kitchen-top-window",
    roomId: "kitchen",
    side: "top",
    offset: 0.62,
    width: 4.5,
  });

  addWindow({
    id: "kitchen-left-window",
    roomId: "kitchen",
    side: "left",
    offset: 0.55,
    width: 3.5,
  });

  addWindow({
    id: "living-top-window",
    roomId: "living",
    side: "top",
    offset: 0.5,
    width: 5,
  });

  addWindow({
    id: "bedroom-2-top-window",
    roomId: "bedroom-2",
    side: "top",
    offset: 0.5,
    width: 4,
  });

  addWindow({
    id: "bedroom-2-right-window",
    roomId: "bedroom-2",
    side: "right",
    offset: 0.42,
    width: 4,
  });

  addWindow({
    id: "utility-left-window",
    roomId: "utility",
    side: "left",
    offset: 0.5,
    width: 2.5,
  });

  addWindow({
    id: "master-left-window",
    roomId: "master-bedroom",
    side: "left",
    offset: 0.48,
    width: 4,
  });

  addWindow({
    id: "master-bottom-window",
    roomId: "master-bedroom",
    side: "bottom",
    offset: 0.4,
    width: 5,
  });

  addWindow({
    id: "family-bottom-window",
    roomId: "family-area",
    side: "bottom",
    offset: 0.72,
    width: 4,
  });

  addWindow({
    id: "bedroom-3-right-window",
    roomId: "bedroom-3",
    side: "right",
    offset: 0.48,
    width: 4,
  });

  addWindow({
    id: "bedroom-3-bottom-window",
    roomId: "bedroom-3",
    side: "bottom",
    offset: 0.5,
    width: 4,
  });

  return windows;
}
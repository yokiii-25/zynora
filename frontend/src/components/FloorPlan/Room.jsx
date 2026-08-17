function Room({ room, scale }) {

  const x = room.x * scale;
  const y = room.y * scale;
  const width = room.width * scale;
  const height = room.height * scale;

  return (
    <g>

      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="white"
        stroke="#444"
        strokeWidth="5"
      />

      <text
        x={x + width / 2}
        y={y + height / 2}
        textAnchor="middle"
        fontSize="16"
        fontWeight="600"
      >
        {room.name}
      </text>

    </g>
  );
}

export default Room;
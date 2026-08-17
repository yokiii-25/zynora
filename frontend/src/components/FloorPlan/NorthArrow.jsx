function NorthArrow({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`}>

      <text
        x="0"
        y="-15"
        fontSize="20"
        fontWeight="bold"
      >
        N
      </text>

      <line
        x1="0"
        y1="0"
        x2="0"
        y2="-45"
        stroke="black"
        strokeWidth="3"
      />

      <polygon
        points="-8,-30 0,-50 8,-30"
        fill="black"
      />

    </g>
  );
}

export default NorthArrow;
function TitleBlock({
  x,
  y,
  project,
  floorPlan,
}) {
  return (
    <g transform={`translate(${x} ${y})`}>

      <text
        fontSize="24"
        fontWeight="700"
      >
        ZYNORA
      </text>

      <text
        y="30"
        fontSize="18"
      >
        AI FLOOR PLAN
      </text>

      <line
        x1="0"
        y1="40"
        x2="160"
        y2="40"
        stroke="#666"
      />

      <text
        y="70"
        fontSize="15"
      >
        Bedrooms:
        {project.bedrooms}
      </text>

      <text
        y="95"
        fontSize="15"
      >
        Floors:
        {project.floors}
      </text>

      <text
        y="120"
        fontSize="15"
      >
        Width:
        {floorPlan.width}
      </text>

      <text
        y="145"
        fontSize="15"
      >
        Length:
        {floorPlan.height}
      </text>

      <text
        y="190"
        fontSize="13"
      >
        AI Generated Concept Plan
      </text>

    </g>
  );
}

export default TitleBlock;
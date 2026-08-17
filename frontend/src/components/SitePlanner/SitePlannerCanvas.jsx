import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function round(value) {
  return Number(value.toFixed(2));
}

function SitePlannerCanvas({ project, design, onConfirm }) {
  const svgRef = useRef(null);

  const plotLength = Number(project.landLength) || 60;
  const plotWidth = Number(project.landWidth) || 40;
  const unit = project.measurementUnit || "ft";

  const initialBuildingLength = Math.min(
    Number(project.preferredBuildingLength) ||
      plotLength * 0.65,
    plotLength
  );

  const initialBuildingWidth = Math.min(
    Number(project.preferredBuildingWidth) ||
      plotWidth * 0.65,
    plotWidth
  );

  const getInitialBuilding = () => ({
    x: round(
      (plotLength - initialBuildingLength) / 2
    ),
    y: round(
      (plotWidth - initialBuildingWidth) / 2
    ),
    length: round(initialBuildingLength),
    width: round(initialBuildingWidth),
  });

  const [building, setBuilding] = useState(
    getInitialBuilding
  );

  const [dragOffset, setDragOffset] = useState(null);
  const [activeInput, setActiveInput] = useState(null);
  const [inputError, setInputError] = useState("");

  const [buildingInputs, setBuildingInputs] = useState({
    length: initialBuildingLength.toFixed(2),
    width: initialBuildingWidth.toFixed(2),
  });

  const [setbackInputs, setSetbackInputs] = useState({
    front: "",
    rear: "",
    left: "",
    right: "",
  });

  const measurements = useMemo(() => {
    const rear = building.y;
    const left = building.x;

    const front =
      plotWidth - building.y - building.width;

    const right =
      plotLength - building.x - building.length;

    const plotArea = plotLength * plotWidth;
    const buildingArea =
      building.length * building.width;

    const openArea = plotArea - buildingArea;

    const coverage =
      plotArea > 0
        ? (buildingArea / plotArea) * 100
        : 0;

    return {
      front: Math.max(0, front),
      rear: Math.max(0, rear),
      left: Math.max(0, left),
      right: Math.max(0, right),
      plotArea,
      buildingArea,
      openArea,
      coverage,
    };
  }, [building, plotLength, plotWidth]);

  useEffect(() => {
    setSetbackInputs((previous) => ({
      front:
        activeInput === "front"
          ? previous.front
          : measurements.front.toFixed(2),

      rear:
        activeInput === "rear"
          ? previous.rear
          : measurements.rear.toFixed(2),

      left:
        activeInput === "left"
          ? previous.left
          : measurements.left.toFixed(2),

      right:
        activeInput === "right"
          ? previous.right
          : measurements.right.toFixed(2),
    }));
  }, [measurements, activeInput]);

  function getPointerPosition(event) {
    const svg = svgRef.current;

    if (!svg) {
      return null;
    }

    const point = svg.createSVGPoint();

    point.x = event.clientX;
    point.y = event.clientY;

    const screenMatrix = svg.getScreenCTM();

    if (!screenMatrix) {
      return null;
    }

    return point.matrixTransform(
      screenMatrix.inverse()
    );
  }

  function handlePointerDown(event) {
    const pointer = getPointerPosition(event);

    if (!pointer) {
      return;
    }

    event.currentTarget.setPointerCapture(
      event.pointerId
    );

    setDragOffset({
      x: pointer.x - building.x,
      y: pointer.y - building.y,
    });

    setInputError("");
  }

  function handlePointerMove(event) {
    if (!dragOffset) {
      return;
    }

    const pointer = getPointerPosition(event);

    if (!pointer) {
      return;
    }

    const maximumX =
      plotLength - building.length;

    const maximumY =
      plotWidth - building.width;

    const nextX = clamp(
      pointer.x - dragOffset.x,
      0,
      maximumX
    );

    const nextY = clamp(
      pointer.y - dragOffset.y,
      0,
      maximumY
    );

    setBuilding((previous) => ({
      ...previous,
      x: round(nextX),
      y: round(nextY),
    }));
  }

  function stopDragging(event) {
    if (
      event.currentTarget.hasPointerCapture?.(
        event.pointerId
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId
      );
    }

    setDragOffset(null);
  }

  function handleBuildingInputChange(event) {
    const { name, value } = event.target;

    setBuildingInputs((previous) => ({
      ...previous,
      [name]: value,
    }));

    setInputError("");
  }

  function applyBuildingSize() {
    const requestedLength = Number(
      buildingInputs.length
    );

    const requestedWidth = Number(
      buildingInputs.width
    );

    if (
      !Number.isFinite(requestedLength) ||
      !Number.isFinite(requestedWidth) ||
      requestedLength <= 0 ||
      requestedWidth <= 0
    ) {
      setInputError(
        "Building length and width must be greater than zero."
      );

      return;
    }

    if (requestedLength > plotLength) {
      setInputError(
        `Building length cannot exceed ${plotLength} ${unit}.`
      );

      return;
    }

    if (requestedWidth > plotWidth) {
      setInputError(
        `Building width cannot exceed ${plotWidth} ${unit}.`
      );

      return;
    }

    setBuilding((previous) => {
      const nextX = clamp(
        previous.x,
        0,
        plotLength - requestedLength
      );

      const nextY = clamp(
        previous.y,
        0,
        plotWidth - requestedWidth
      );

      return {
        x: round(nextX),
        y: round(nextY),
        length: round(requestedLength),
        width: round(requestedWidth),
      };
    });

    setInputError("");
  }

  function handleSetbackInputChange(event) {
    const { name, value } = event.target;

    setSetbackInputs((previous) => ({
      ...previous,
      [name]: value,
    }));

    setInputError("");
  }

  function applySetback(name) {
    const requestedValue = Number(
      setbackInputs[name]
    );

    if (
      !Number.isFinite(requestedValue) ||
      requestedValue < 0
    ) {
      setInputError(
        `${capitalize(
          name
        )} setback must be zero or greater.`
      );

      return;
    }

    if (
      (name === "left" || name === "right") &&
      requestedValue >
        plotLength - building.length
    ) {
      setInputError(
        `${capitalize(
          name
        )} setback cannot exceed ${(
          plotLength - building.length
        ).toFixed(2)} ${unit}.`
      );

      return;
    }

    if (
      (name === "front" || name === "rear") &&
      requestedValue >
        plotWidth - building.width
    ) {
      setInputError(
        `${capitalize(
          name
        )} setback cannot exceed ${(
          plotWidth - building.width
        ).toFixed(2)} ${unit}.`
      );

      return;
    }

    setBuilding((previous) => {
      let nextX = previous.x;
      let nextY = previous.y;

      if (name === "left") {
        nextX = requestedValue;
      }

      if (name === "right") {
        nextX =
          plotLength -
          previous.length -
          requestedValue;
      }

      if (name === "rear") {
        nextY = requestedValue;
      }

      if (name === "front") {
        nextY =
          plotWidth -
          previous.width -
          requestedValue;
      }

      return {
        ...previous,
        x: round(nextX),
        y: round(nextY),
      };
    });

    setActiveInput(null);
    setInputError("");
  }

  function handleSetbackKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      applySetback(event.currentTarget.name);
      event.currentTarget.blur();
    }
  }

  function resetPlacement() {
    const initial = getInitialBuilding();

    setBuilding(initial);

    setBuildingInputs({
      length: initial.length.toFixed(2),
      width: initial.width.toFixed(2),
    });

    setInputError("");
    setActiveInput(null);
  }

  function centerBuilding() {
    setBuilding((previous) => ({
      ...previous,
      x: round(
        (plotLength - previous.length) / 2
      ),
      y: round(
        (plotWidth - previous.width) / 2
      ),
    }));

    setInputError("");
  }

  function confirmPlacement() {
    onConfirm({
      plot: {
        length: plotLength,
        width: plotWidth,
        unit,
      },

      building: {
        x: building.x,
        y: building.y,
        length: building.length,
        width: building.width,
      },

      setbacks: {
        front: measurements.front,
        rear: measurements.rear,
        left: measurements.left,
        right: measurements.right,
      },

      areas: {
        plotArea: measurements.plotArea,
        buildingArea: measurements.buildingArea,
        openArea: measurements.openArea,
        coverage: measurements.coverage,
      },
    });
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_370px]">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">
              Interactive Plot View
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Set the building size and drag it anywhere
              inside the plot.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={centerBuilding}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold transition hover:bg-white/10"
            >
              Center
            </button>

            <button
              type="button"
              onClick={resetPlacement}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold transition hover:bg-white/10"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-slate-100 p-4">
          <svg
            ref={svgRef}
            viewBox={`-5 -5 ${plotLength + 10} ${
              plotWidth + 15
            }`}
            className="w-full touch-none select-none"
            role="img"
            aria-label="Interactive site planner"
          >
            <rect
              x="0"
              y="0"
              width={plotLength}
              height={plotWidth}
              fill="white"
              stroke="#0f172a"
              strokeWidth="0.6"
            />

            <text
              x={plotLength / 2}
              y={-1.5}
              textAnchor="middle"
              fontSize="1.8"
              fill="#334155"
            >
              NORTH ↑
            </text>

            <SetbackGuides
              building={building}
              measurements={measurements}
              plotLength={plotLength}
              plotWidth={plotWidth}
              unit={unit}
            />

            <rect
              x={building.x}
              y={building.y}
              width={building.length}
              height={building.width}
              fill="#cbd5e1"
              stroke="#0f172a"
              strokeWidth="0.7"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={stopDragging}
              onPointerCancel={stopDragging}
              style={{
                cursor: dragOffset
                  ? "grabbing"
                  : "grab",
              }}
            />

            <text
              x={
                building.x +
                building.length / 2
              }
              y={
                building.y +
                building.width / 2 -
                1
              }
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="2"
              fontWeight="700"
              fill="#0f172a"
              pointerEvents="none"
            >
              PROPOSED BUILDING
            </text>

            <text
              x={
                building.x +
                building.length / 2
              }
              y={
                building.y +
                building.width / 2 +
                2
              }
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="1.5"
              fill="#475569"
              pointerEvents="none"
            >
              {building.length.toFixed(1)} ×{" "}
              {building.width.toFixed(1)} {unit}
            </text>

            <line
              x1="0"
              y1={plotWidth + 3}
              x2={plotLength}
              y2={plotWidth + 3}
              stroke="#0f172a"
              strokeWidth="1.2"
            />

            <text
              x={plotLength / 2}
              y={plotWidth + 7}
              textAnchor="middle"
              fontSize="2"
              fontWeight="700"
              fill="#0f172a"
            >
              ROAD
            </text>
          </svg>
        </div>
      </div>

      <aside className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
          Site Controls
        </p>

        <h2 className="mt-2 text-2xl font-semibold">
          Building Placement
        </h2>

        <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <h3 className="font-semibold text-white">
            Building dimensions
          </h3>

          <p className="mt-1 text-xs leading-5 text-slate-400">
            These dimensions stay fixed while the
            building is moved.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <NumberInput
              label="Length"
              name="length"
              value={buildingInputs.length}
              unit={unit}
              onChange={handleBuildingInputChange}
            />

            <NumberInput
              label="Width"
              name="width"
              value={buildingInputs.width}
              unit={unit}
              onChange={handleBuildingInputChange}
            />
          </div>

          <button
            type="button"
            onClick={applyBuildingSize}
            className="mt-4 w-full rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-400"
          >
            Apply Building Size
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
          <h3 className="font-semibold text-white">
            Exact setbacks
          </h3>

          <p className="mt-1 text-xs leading-5 text-slate-400">
            Edit any side. The building will move,
            while its size remains unchanged.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {["front", "rear", "left", "right"].map(
              (name) => (
                <SetbackInput
                  key={name}
                  label={capitalize(name)}
                  name={name}
                  value={setbackInputs[name]}
                  unit={unit}
                  onChange={
                    handleSetbackInputChange
                  }
                  onFocus={() =>
                    setActiveInput(name)
                  }
                  onBlur={() => applySetback(name)}
                  onKeyDown={
                    handleSetbackKeyDown
                  }
                />
              )
            )}
          </div>

          <p className="mt-3 text-xs leading-5 text-slate-500">
            Press Enter or click outside the field to
            apply a value.
          </p>
        </div>

        {inputError && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-300"
          >
            {inputError}
          </p>
        )}

        <div className="mt-6 space-y-4">
          <InfoRow
            label="Plot size"
            value={`${plotLength.toFixed(
              1
            )} × ${plotWidth.toFixed(1)} ${unit}`}
          />

          <InfoRow
            label="Building size"
            value={`${building.length.toFixed(
              1
            )} × ${building.width.toFixed(
              1
            )} ${unit}`}
          />

          <InfoRow
            label="Building area"
            value={`${measurements.buildingArea.toFixed(
              2
            )} sq ${unit}`}
          />

          <InfoRow
            label="Open area"
            value={`${measurements.openArea.toFixed(
              2
            )} sq ${unit}`}
          />

          <InfoRow
            label="Coverage"
            value={`${measurements.coverage.toFixed(
              1
            )}%`}
          />
        </div>

        <button
          type="button"
          onClick={confirmPlacement}
          className="mt-8 w-full rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400"
        >
          Confirm and Generate 2D Plan
        </button>

        <p className="mt-4 text-xs leading-5 text-slate-500">
          This output is conceptual. Construction
          dimensions and approval requirements must be
          checked by a qualified professional.
        </p>
      </aside>
    </section>
  );
}

function SetbackGuides({
  building,
  measurements,
  plotLength,
  plotWidth,
  unit,
}) {
  const centerX =
    building.x + building.length / 2;

  const centerY =
    building.y + building.width / 2;

  return (
    <g pointerEvents="none">
      <MeasurementLine
        x1={centerX}
        y1="0"
        x2={centerX}
        y2={building.y}
        label={`${measurements.rear.toFixed(
          1
        )} ${unit}`}
      />

      <MeasurementLine
        x1={centerX}
        y1={building.y + building.width}
        x2={centerX}
        y2={plotWidth}
        label={`${measurements.front.toFixed(
          1
        )} ${unit}`}
      />

      <MeasurementLine
        x1="0"
        y1={centerY}
        x2={building.x}
        y2={centerY}
        label={`${measurements.left.toFixed(
          1
        )} ${unit}`}
      />

      <MeasurementLine
        x1={building.x + building.length}
        y1={centerY}
        x2={plotLength}
        y2={centerY}
        label={`${measurements.right.toFixed(
          1
        )} ${unit}`}
      />
    </g>
  );
}

function MeasurementLine({
  x1,
  y1,
  x2,
  y2,
  label,
}) {
  const middleX =
    (Number(x1) + Number(x2)) / 2;

  const middleY =
    (Number(y1) + Number(y2)) / 2;

  const distance = Math.hypot(
    Number(x2) - Number(x1),
    Number(y2) - Number(y1)
  );

  if (distance < 0.8) {
    return null;
  }

  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#64748b"
        strokeWidth="0.25"
        strokeDasharray="0.8 0.6"
      />

      <text
        x={middleX}
        y={middleY - 0.5}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="1.15"
        fontWeight="600"
        fill="#475569"
      >
        {label}
      </text>
    </g>
  );
}

function NumberInput({
  label,
  name,
  value,
  unit,
  onChange,
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-400">
        {label}
      </span>

      <div className="mt-1 flex items-center rounded-xl border border-white/10 bg-slate-950 focus-within:border-blue-400">
        <input
          type="number"
          name={name}
          value={value}
          onChange={onChange}
          min="0.1"
          step="0.25"
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none"
        />

        <span className="pr-3 text-xs text-slate-500">
          {unit}
        </span>
      </div>
    </label>
  );
}

function SetbackInput({
  label,
  name,
  value,
  unit,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-400">
        {label}
      </span>

      <div className="mt-1 flex items-center rounded-xl border border-white/10 bg-slate-950 focus-within:border-emerald-400">
        <input
          type="number"
          name={name}
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          min="0"
          step="0.25"
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none"
        />

        <span className="pr-3 text-xs text-slate-500">
          {unit}
        </span>
      </div>
    </label>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
      <span className="text-sm text-slate-400">
        {label}
      </span>

      <strong className="text-right text-sm text-white">
        {value}
      </strong>
    </div>
  );
}

function capitalize(value) {
  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
}

export default SitePlannerCanvas;
import assert from "node:assert/strict";
import test from "node:test";

import { DOMParser } from "linkedom";

import { normalizeFloorPlan } from "../src/components/viewerV2/utils/normalizeFloorPlan.js";
import { parseFloorPlanSvg } from "../src/components/viewerV2/utils/svgFloorPlanParser.js";

globalThis.DOMParser = DOMParser;

function floorMarkup(
  id,
  roomId,
  transform = "",
  style = "",
  extension = "",
) {
  return `
    <g class="Floorplan" id="${id}" transform="${transform}" style="${style}">
      <g class="Space LivingRoom" id="${roomId}">
        <polygon points="0,0 100,0 100,80 0,80" />
      </g>
      <g class="Wall External"><polygon points="0,-5 100,-5 100,5 0,5" /></g>
      <g class="Wall External"><polygon points="95,0 105,0 105,80 95,80" /></g>
      <g class="Wall External"><polygon points="0,75 100,75 100,85 0,85" /></g>
      <g class="Wall External"><polygon points="-5,0 5,0 5,80 -5,80" /></g>
      ${extension}
    </g>
  `;
}

test("parses hidden and visible SVG floors at one scale and exports both", () => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 120">
      ${floorMarkup("Floor-1", "room-ground")}
      ${floorMarkup("Floor-2", "room-upper", "translate(300 0)", "display:none")}
    </svg>
  `;
  const parsed = parseFloorPlanSvg(svg);
  const normalized = normalizeFloorPlan(parsed);

  assert.equal(parsed.floors.length, 2);
  assert.equal(parsed.floors[1].rooms.length, 1);
  assert.equal(parsed.floors[0].sourceScale, parsed.floors[1].sourceScale);
  assert.equal(normalized.floors.length, 2);
  assert.deepEqual(
    normalized.floors.map((floor) => floor.elevation),
    [0, 2.8],
  );
  assert.equal(normalized.validation.valid, true);
  assert.equal(normalized.floorPlanJSON.metadata.floorCount, 2);
  assert.equal(normalized.floorPlanJSON.floors.length, 2);
});

test("registers storeys by shared facade walls and preserves the offset", () => {
  const groundExtension = `
    <g class="Space Outdoor" id="ground-patio">
      <polygon points="0,80 100,80 100,140 0,140" />
    </g>
  `;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 180">
      ${floorMarkup(
        "Floor-1",
        "room-ground",
        "",
        "",
        groundExtension,
      )}
      ${floorMarkup(
        "Floor-2",
        "room-upper",
        "translate(300 0)",
        "display:none",
      )}
    </svg>
  `;
  const parsed = parseFloorPlanSvg(svg);
  const normalized = normalizeFloorPlan(parsed);
  const horizontalExterior = (floor) =>
    floor.walls
      .filter((wall) => wall.isExterior)
      .filter(
        (wall) =>
          Math.abs(wall.end.z - wall.start.z) <
          Math.abs(wall.end.x - wall.start.x) * 0.1,
      )
      .sort(
        (left, right) =>
          Math.min(left.start.z, left.end.z) -
          Math.min(right.start.z, right.end.z),
      )[0];
  const parsedGround = horizontalExterior(parsed.floors[0]);
  const parsedUpper = horizontalExterior(parsed.floors[1]);
  const normalizedGround = normalized.floors[0].walls.find(
    (wall) => wall.id === parsedGround.id,
  );
  const normalizedUpper = normalized.floors[1].walls.find(
    (wall) => wall.id === parsedUpper.id,
  );

  assert.equal(parsed.floors[1].registration.applied, true);
  assert.ok(
    Math.abs(parsedGround.start.z - parsedUpper.start.z) < 0.04,
  );
  assert.ok(
    Math.abs(normalizedGround.z1 - normalizedUpper.z1) < 0.04,
  );
});

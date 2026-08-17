import assert from "node:assert/strict";
import test from "node:test";

import {
  FLOOR_PLAN_SCHEMA_VERSION,
  createFloorPlanDocument,
  processWallTopology,
  validateFloorPlanGeometry,
} from "../src/components/viewerV2/utils/wallTopology.js";

function wall(id, x1, z1, x2, z2, options = {}) {
  return {
    id,
    x1,
    z1,
    x2,
    z2,
    height: 2.8,
    thickness: 0.16,
    color: "#eee9e1",
    isExterior: true,
    openings: [],
    ...options,
  };
}

const outline = [
  { x: 0, z: 0 },
  { x: 10, z: 0 },
  { x: 10, z: 7 },
  { x: 0, z: 7 },
];

test("merges duplicate walls and preserves their openings", () => {
  const topology = processWallTopology({
    outline,
    walls: [
      wall("south", 0, 0, 10, 0, {
        openings: [
          {
            id: "front-door",
            type: "door",
            start: 4.5,
            end: 5.5,
            center: 5,
            width: 1,
            bottom: 0,
            top: 2.1,
            height: 2.1,
          },
        ],
      }),
      wall("south-copy", 0.001, 0.001, 10.001, 0.001),
      wall("east", 10, 0, 10, 7),
      wall("north", 10, 7, 0, 7),
      wall("west", 0, 7, 0, 0),
    ],
  });

  assert.equal(topology.stats.duplicateWallsRemoved, 1);
  assert.equal(topology.shellWalls.length, 4);
  assert.equal(topology.stats.exteriorShellClosed, true);
  assert.equal(
    topology.walls.flatMap((item) => item.openings).length,
    1,
  );
});

test("creates valid canonical FloorPlanJSON for a closed shell", () => {
  const topology = processWallTopology({
    outline,
    walls: [
      wall("south", 0, 0, 10, 0),
      wall("east", 10, 0, 10, 7),
      wall("north", 10, 7, 0, 7),
      wall("west", 0, 7, 0, 0),
    ],
  });
  const plan = {
    id: "test-plan",
    floorId: "ground-floor",
    floorIndex: 0,
    floorCount: 1,
    sourceType: "unit-test",
    classifierVersion: "v5",
    height: 2.8,
    outline: topology.exteriorOutline,
    exteriorOutline: topology.exteriorOutline,
    rooms: [],
    walls: topology.walls,
    shellWalls: topology.shellWalls,
    slab: { elevation: -0.16, thickness: 0.18 },
    roof: {
      type: "flat",
      elevation: 2.8,
      thickness: 0.22,
      parapetHeight: 0.35,
    },
  };
  const validation = validateFloorPlanGeometry(plan);
  const document = createFloorPlanDocument(plan, validation);

  assert.equal(validation.valid, true);
  assert.equal(validation.stats.shellClosed, true);
  assert.equal(document.schemaVersion, FLOOR_PLAN_SCHEMA_VERSION);
  assert.equal(document.unit, "m");
  assert.equal(document.floors[0].exteriorWalls.length, 4);
  assert.equal(document.floors[0].roof.type, "flat");
});

test("repairs a cropped shell from indoor rooms and excludes outdoor areas", () => {
  const indoorRoom = {
    id: "living-room",
    roomType: "Living Room",
    outline: [
      { x: 1, z: 2 },
      { x: 3, z: 2 },
      { x: 3, z: 8 },
      { x: 1, z: 8 },
    ],
    classificationMatched: false,
  };
  const outdoorRoom = {
    id: "patio",
    roomType: "Outdoor Area",
    outline: [
      { x: 1, z: 8 },
      { x: 3, z: 8 },
      { x: 3, z: 10 },
      { x: 1, z: 10 },
    ],
    classificationMatched: false,
  };
  const croppedOutline = [
    { x: 0, z: 0 },
    { x: 4, z: 0 },
    { x: 4, z: 4 },
    { x: 0, z: 4 },
  ];
  const topology = processWallTopology({
    outline: croppedOutline,
    rooms: [indoorRoom, outdoorRoom],
    walls: [
      wall("south", 0, 0, 4, 0),
      wall("east", 4, 0, 4, 4),
      wall("north", 4, 4, 0, 4),
      wall("west", 0, 4, 0, 0),
    ],
  });
  const repairedMaxZ = Math.max(
    ...topology.exteriorOutline.map((point) => point.z),
  );
  const plan = {
    id: "repaired-plan",
    floorId: "ground-floor",
    floorIndex: 0,
    floorCount: 1,
    sourceType: "unit-test",
    classifierVersion: "v5",
    height: 2.8,
    outline: topology.exteriorOutline,
    exteriorOutline: topology.exteriorOutline,
    rooms: [indoorRoom, outdoorRoom],
    walls: topology.walls,
    shellWalls: topology.shellWalls,
  };
  const validation = validateFloorPlanGeometry(plan);

  assert.equal(topology.stats.shellRepairedFromRooms, true);
  assert.equal(topology.stats.roomsOutsideOriginalShell, 1);
  assert.equal(repairedMaxZ, 8);
  assert.equal(validation.valid, true);
  assert.equal(validation.stats.indoorRooms, 1);
  assert.equal(validation.stats.roomsOutsideShell, 0);
});

test("rejects a two-floor declaration containing only one parsed floor", () => {
  const topology = processWallTopology({
    outline,
    walls: [
      wall("south", 0, 0, 10, 0),
      wall("east", 10, 0, 10, 7),
      wall("north", 10, 7, 0, 7),
      wall("west", 0, 7, 0, 0),
    ],
  });
  const floor = {
    id: "ground-floor",
    floorId: "ground-floor",
    floorIndex: 0,
    height: 2.8,
    outline: topology.exteriorOutline,
    exteriorOutline: topology.exteriorOutline,
    rooms: [],
    walls: topology.walls,
    shellWalls: topology.shellWalls,
  };
  const validation = validateFloorPlanGeometry({
    floorCount: 2,
    floors: [floor],
  });

  assert.equal(validation.valid, false);
  assert.match(validation.errors.at(-1), /declares 2 floors/);
});

test("rejects millimetre-size segments in an exterior shell", () => {
  const shellWalls = [
    wall("tiny", 0, 0, 0.002, 0),
    wall("south", 0.002, 0, 4, 0),
    wall("east", 4, 0, 4, 4),
    wall("north", 4, 4, 0, 4),
    wall("west", 0, 4, 0, 0),
  ];
  const validation = validateFloorPlanGeometry({
    id: "tiny-shell-edge",
    floorId: "ground-floor",
    floorIndex: 0,
    floorCount: 1,
    height: 2.8,
    outline: [
      { x: 0, z: 0 },
      { x: 4, z: 0 },
      { x: 4, z: 4 },
      { x: 0, z: 4 },
    ],
    exteriorOutline: [
      { x: 0, z: 0 },
      { x: 4, z: 0 },
      { x: 4, z: 4 },
      { x: 0, z: 4 },
    ],
    rooms: [],
    walls: [
      wall("source-south", 0, 0, 4, 0),
      wall("source-east", 4, 0, 4, 4),
      wall("source-north", 4, 4, 0, 4),
      wall("source-west", 0, 4, 0, 0),
    ],
    shellWalls,
  });

  assert.equal(validation.valid, false);
  assert.ok(
    validation.errors.some((message) =>
      message.includes("too short to use in the exterior shell"),
    ),
  );
});

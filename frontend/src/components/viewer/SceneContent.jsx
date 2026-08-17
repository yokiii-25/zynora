import { useMemo } from "react";

import Floor from "./Floor";
import Wall from "./Wall";
import Door from "./Door";
import Window from "./Window";
import FurnitureRenderer from "./FurnitureRenderer";
import Lights from "./Lights";
import CameraController from "./CameraController";

import { furniture } from "../../data/furnitureLayout";

import {
  getWalls,
  getDoors,
  getWindows,
} from "../../utils/normalizeScene";

import {
  calculateSceneBounds,
  getFloorSize,
  getCameraDistance,
} from "../../utils/bounds";

export default function SceneContent({ sceneData }) {
  const walls = useMemo(() => {
    return getWalls(sceneData).filter(
      (wall) =>
        wall &&
        typeof wall === "object"
    );
  }, [sceneData]);

  const doors = useMemo(() => {
    return getDoors(sceneData).filter(
      (door) =>
        door &&
        typeof door === "object"
    );
  }, [sceneData]);

  const windows = useMemo(() => {
    return getWindows(sceneData).filter(
      (windowItem) =>
        windowItem &&
        typeof windowItem === "object"
    );
  }, [sceneData]);

  const bounds = useMemo(() => {
    return calculateSceneBounds(walls);
  }, [walls]);

  const floor = useMemo(() => {
    return getFloorSize(bounds, 1.5);
  }, [bounds]);

  const cameraDistance = useMemo(() => {
    return getCameraDistance(bounds);
  }, [bounds]);

  const center = {
    x: Number.isFinite(bounds?.center?.x)
      ? bounds.center.x
      : 0,

    z: Number.isFinite(bounds?.center?.z)
      ? bounds.center.z
      : 0,
  };

  const floorWidth =
    Number.isFinite(floor?.width) &&
    floor.width > 0
      ? floor.width
      : 20;

  const floorDepth =
    Number.isFinite(floor?.depth) &&
    floor.depth > 0
      ? floor.depth
      : 20;

  const safeCameraDistance =
    Number.isFinite(cameraDistance) &&
    cameraDistance > 0
      ? cameraDistance
      : 20;

  const sceneSize = Math.max(
    floorWidth,
    floorDepth
  );

  console.log("First Wall:", walls[0]);
  console.log("First Door:", doors[0]);
  console.log("First Window:", windows[0]);

  return (
    <>
      <CameraController
        center={center}
        distance={safeCameraDistance}
      />

      <Lights
        center={center}
        size={sceneSize}
      />

      <Floor
        center={center}
        width={floorWidth}
        depth={floorDepth}
      />

      {walls.map((wall, index) => (
        <Wall
          key={
            wall.id ??
            `wall-${index}`
          }
          wall={wall}
        />
      ))}

      {doors.map((door, index) => (
        <Door
          key={
            door.id ??
            `door-${index}`
          }
          door={door}
        />
      ))}

      {windows.map((windowItem, index) => (
        <Window
          key={
            windowItem.id ??
            `window-${index}`
          }
          windowItem={windowItem}
        />
      ))}

      <FurnitureRenderer
        furniture={furniture}
        center={center}
      />
    </>
  );
}
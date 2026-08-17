import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

import {
  captureViewDirection,
  createExteriorDesign,
  projectedBoundsSpans,
} from "./utils/exteriorDesign";

export default function AutoCamera({
  floorPlan,
  controlsRef,
  viewMode = "perspective",
  captureMode = false,
  selectedFloorId = "all",
  captureView = "hero",
  exteriorStyle = "warm-modern",
  resetKey = 0,
}) {
  const { camera, size } = useThree();
  const exteriorDesign = useMemo(
    () => createExteriorDesign(floorPlan, exteriorStyle),
    [exteriorStyle, floorPlan],
  );

  useEffect(() => {
    const selectedFloor = Array.isArray(floorPlan.floors)
      ? floorPlan.floors.find(
          (floor) => String(floor.floorId) === String(selectedFloorId),
        )
      : null;
    const bounds = captureMode
      ? (floorPlan.captureBounds ?? floorPlan.bounds)
      : (selectedFloor?.bounds ?? floorPlan.bounds);
    const width = bounds.width;
    const depth = bounds.depth;
    const baseElevation = captureMode
      ? 0
      : Number(selectedFloor?.elevation) || 0;
    const height = captureMode
      ? floorPlan.height
      : (selectedFloor?.height ?? floorPlan.height);
    const aspect = Math.max(size.width / Math.max(size.height, 1), 0.5);
    camera.fov = captureMode ? 42 : 46;
    const verticalFov = THREE.MathUtils.degToRad(camera.fov);
    const topView = !captureMode && viewMode === "top";
    const captureDirection = captureViewDirection(
      exteriorDesign,
      captureView,
    );
    const projected = projectedBoundsSpans(bounds, captureDirection);
    const fitSpan = captureMode
      ? Math.max(
          projected.horizontal / aspect,
          height * 1.22,
          2,
        )
      : Math.max(
          depth,
          width / aspect,
          topView ? 0 : height * 1.5,
          2,
        );
    const framingDistance =
      fitSpan / (2 * Math.tan(verticalFov / 2));
    const distance = captureMode
      ? framingDistance * 0.94 + projected.depth * 0.34
      : framingDistance * (topView ? 1.12 : 1.3);
    const target = new THREE.Vector3(
      bounds.centerX,
      topView
        ? baseElevation
        : captureMode
          ? Math.max(height * 0.43, 1.25)
          : baseElevation + Math.min(height * 0.28, 0.9),
      bounds.centerZ,
    );
    const direction = captureMode
      ? new THREE.Vector3(captureDirection.x, 0, captureDirection.z)
      : new THREE.Vector3(1, 1.05, 1).normalize();

    if (topView) {
      camera.up.set(0, 0, -1);
      camera.position.set(
        bounds.centerX,
        baseElevation + distance + height,
        bounds.centerZ
      );
    } else {
      camera.up.set(0, 1, 0);
      if (captureMode) {
        camera.position.set(
          target.x + direction.x * distance,
          String(captureView).toLowerCase() === "aerial"
            ? target.y + Math.max(
                height * 0.78,
                framingDistance * 0.48,
              )
            : Math.max(height * 0.32, 1.65),
          target.z + direction.z * distance,
        );
      } else {
        camera.position.copy(target).addScaledVector(direction, distance);
      }
    }

    camera.near = Math.max(0.02, distance / 150);
    camera.far = Math.max(100, distance * 20);
    camera.lookAt(target);
    camera.updateProjectionMatrix();

    if (controlsRef.current) {
      controlsRef.current.target.copy(target);
      controlsRef.current.minDistance = Math.max(1, fitSpan * 0.35);
      controlsRef.current.maxDistance = Math.max(25, fitSpan * 7);
      controlsRef.current.update();
    }
  }, [
    camera,
    captureMode,
    captureView,
    controlsRef,
    exteriorDesign,
    floorPlan,
    resetKey,
    selectedFloorId,
    size.height,
    size.width,
    viewMode,
  ]);

  return null;
}

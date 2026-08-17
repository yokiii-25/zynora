import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Environment,
  OrbitControls,
  PerspectiveCamera,
} from "@react-three/drei";
import * as THREE from "three";

import Sofa from "./furniture/Sofa";
import CoffeeTable from "./furniture/CoffeeTable";
import TVUnit from "./furniture/TVUnit";
import Bed from "./furniture/Bed";
import Wardrobe from "./furniture/Wardrobe";
import DiningTable from "./furniture/DiningTable";
import KitchenCabinet from "./furniture/KitchenCabinet";
import Plant from "./furniture/Plant";

import { furniture } from "../data/furnitureLayout";

import { detectRooms } from "../utils/roomDetection";

const SCENE_URL = "/threejs_scene_10052.json";

function normalizeCollection(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (Array.isArray(item)) {
        return normalizeCollection(item);
      }

      if (item && typeof item === "object") {
        return [item];
      }

      return [];
    });
  }

  if (typeof value !== "object") {
    return [];
  }

  if (Array.isArray(value.items)) {
    return normalizeCollection(value.items);
  }

  if (Array.isArray(value.data)) {
    return normalizeCollection(value.data);
  }

  if (Array.isArray(value.elements)) {
    return normalizeCollection(value.elements);
  }

  return Object.values(value).flatMap((item) =>
    normalizeCollection(item),
  );
}

function getVector3(value) {
  return [
    Number(value?.x) || 0,
    Number(value?.y) || 0,
    Number(value?.z) || 0,
  ];
}

function Wall({ wall }) {
  const position = getVector3(wall.position);
  const rotation = getVector3(wall.rotation);

  const width = Math.max(
    Number(wall.size?.width) || 1,
    0.01,
  );

  const height = Math.max(
    Number(wall.size?.height) || 2.5,
    0.01,
  );

  const depth = Math.max(
    Number(wall.size?.depth) || 0.15,
    0.01,
  );

  const isExterior =
    wall.metadata?.wall_class
      ?.toLowerCase()
      .includes("external") ?? false;

  return (
    <mesh
      position={position}
      rotation={rotation}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[width, height, depth]} />

      <meshStandardMaterial
        color={isExterior ? "#e9e3d8" : "#f5f2ec"}
        roughness={0.82}
        metalness={0}
      />
    </mesh>
  );
}

function Door({ door }) {
  const position = getVector3(door.position);
  const rotation = getVector3(door.rotation);

  const width = Math.max(
    Number(door.size?.width) || 0.9,
    0.1,
  );

  const height = Math.max(
    Number(door.size?.height) || 2.1,
    0.1,
  );

  const depth = Math.max(
    Number(door.size?.depth) || 0.12,
    0.03,
  );

  const frameWidth = 0.1;
  const frameDepth = depth + 0.08;

  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />

        <meshStandardMaterial
          color="#7b4b2a"
          roughness={0.62}
          metalness={0}
        />
      </mesh>

      <mesh
        position={[
          0,
          0.25,
          depth / 2 + 0.008,
        ]}
        castShadow
      >
        <boxGeometry
          args={[
            Math.max(width * 0.68, 0.1),
            Math.max(height * 0.48, 0.1),
            0.025,
          ]}
        />

        <meshStandardMaterial
          color="#895636"
          roughness={0.7}
        />
      </mesh>

      <mesh
        position={[
          0,
          height / 2 + frameWidth / 2,
          0,
        ]}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[
            width + frameWidth * 2,
            frameWidth,
            frameDepth,
          ]}
        />

        <meshStandardMaterial
          color="#4f2f1b"
          roughness={0.7}
        />
      </mesh>

      <mesh
        position={[
          -width / 2 - frameWidth / 2,
          0,
          0,
        ]}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[
            frameWidth,
            height + frameWidth * 2,
            frameDepth,
          ]}
        />

        <meshStandardMaterial
          color="#4f2f1b"
          roughness={0.7}
        />
      </mesh>

      <mesh
        position={[
          width / 2 + frameWidth / 2,
          0,
          0,
        ]}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[
            frameWidth,
            height + frameWidth * 2,
            frameDepth,
          ]}
        />

        <meshStandardMaterial
          color="#4f2f1b"
          roughness={0.7}
        />
      </mesh>

      <mesh
        position={[
          width * 0.32,
          0,
          depth / 2 + 0.045,
        ]}
        castShadow
      >
        <sphereGeometry args={[0.045, 18, 18]} />

        <meshStandardMaterial
          color="#c2ae84"
          metalness={0.8}
          roughness={0.22}
        />
      </mesh>
    </group>
  );
}

function Window({ windowItem }) {
  const position = getVector3(windowItem.position);
  const rotation = getVector3(windowItem.rotation);

  const width = Math.max(
    Number(windowItem.size?.width) || 1.2,
    0.15,
  );

  const height = Math.max(
    Number(windowItem.size?.height) || 1.1,
    0.15,
  );

  const depth = Math.max(
    Number(windowItem.size?.depth) || 0.1,
    0.03,
  );

  const frameThickness = Math.min(
    0.07,
    width * 0.15,
    height * 0.15,
  );

  const glassWidth = Math.max(
    width - frameThickness * 2,
    0.05,
  );

  const glassHeight = Math.max(
    height - frameThickness * 2,
    0.05,
  );

  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow receiveShadow>
        <boxGeometry
          args={[
            glassWidth,
            glassHeight,
            Math.max(depth * 0.35, 0.015),
          ]}
        />

        <meshPhysicalMaterial
          color="#a8d5eb"
          transparent
          opacity={0.45}
          transmission={0.3}
          roughness={0.1}
          metalness={0}
          thickness={0.08}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh
        position={[0, height / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[
            width + frameThickness,
            frameThickness,
            depth + 0.05,
          ]}
        />

        <meshStandardMaterial
          color="#3d454a"
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>

      <mesh
        position={[0, -height / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[
            width + frameThickness,
            frameThickness,
            depth + 0.05,
          ]}
        />

        <meshStandardMaterial
          color="#3d454a"
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>

      <mesh
        position={[-width / 2, 0, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[
            frameThickness,
            height,
            depth + 0.05,
          ]}
        />

        <meshStandardMaterial
          color="#3d454a"
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>

      <mesh
        position={[width / 2, 0, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[
            frameThickness,
            height,
            depth + 0.05,
          ]}
        />

        <meshStandardMaterial
          color="#3d454a"
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>

      <mesh
        position={[
          0,
          0,
          depth / 2 + 0.015,
        ]}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[
            frameThickness * 0.75,
            height,
            depth + 0.04,
          ]}
        />

        <meshStandardMaterial
          color="#3d454a"
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>

      <mesh
        position={[
          0,
          0,
          depth / 2 + 0.016,
        ]}
        castShadow
        receiveShadow
      >
        <boxGeometry
          args={[
            width,
            frameThickness * 0.75,
            depth + 0.041,
          ]}
        />

        <meshStandardMaterial
          color="#3d454a"
          roughness={0.4}
          metalness={0.1}
        />
      </mesh>
    </group>
  );
}

function FurnitureRenderer({ center }) {
  const furnitureItems = normalizeCollection(furniture);

  return (
    <group position={[center.x, 0, center.z]}>
      {furnitureItems.map((item, index) => {

        const props = {
          key: item.id ?? index,
          position: item.position,
          rotation: item.rotation ?? [0,0,0],
        };

        switch(item.type){

          case "sofa":
            return <Sofa {...props}/>;

          case "coffee":
            return <CoffeeTable {...props}/>;

          case "tv":
            return <TVUnit {...props}/>;

          case "bed":
            return <Bed {...props}/>;

          case "wardrobe":
            return <Wardrobe {...props}/>;

          case "dining":
            return <DiningTable {...props}/>;

          case "kitchen":
            return (
              <KitchenCabinet
                {...props}
                width={item.width}
              />
            );

          case "plant":
            return <Plant {...props}/>;

          default:
            return null;
        }

      })}
    </group>
  );
}

function Floor({ center, width, depth }) {
  const floorWidth = Math.max(width + 0.5, 2);
  const floorDepth = Math.max(depth + 0.5, 2);

  const plankCount = Math.min(
    Math.max(
      Math.floor(floorDepth / 0.42),
      8,
    ),
    55,
  );

  return (
    <group>
      <mesh
        position={[
          center.x,
          -0.08,
          center.z,
        ]}
        receiveShadow
      >
        <boxGeometry
          args={[
            floorWidth,
            0.16,
            floorDepth,
          ]}
        />

        <meshStandardMaterial
          color="#c9a778"
          roughness={0.74}
          metalness={0}
        />
      </mesh>

      {Array.from({ length: plankCount }).map(
        (_, index) => {
          const z =
            center.z -
            floorDepth / 2 +
            ((index + 1) * floorDepth) /
              (plankCount + 1);

          return (
            <mesh
              key={`floor-line-${index}`}
              position={[
                center.x,
                0.006,
                z,
              ]}
              receiveShadow
            >
              <boxGeometry
                args={[
                  floorWidth,
                  0.009,
                  0.014,
                ]}
              />

              <meshStandardMaterial
                color="#9f7e59"
                roughness={0.85}
              />
            </mesh>
          );
        },
      )}

      <mesh
        position={[
          center.x,
          -0.2,
          center.z,
        ]}
        receiveShadow
      >
        <boxGeometry
          args={[
            floorWidth + 0.3,
            0.12,
            floorDepth + 0.3,
          ]}
        />

        <meshStandardMaterial
          color="#8c8a84"
          roughness={0.9}
          metalness={0}
        />
      </mesh>
    </group>
  );
}

function SceneContent({ sceneData }) {
  const walls = useMemo(() => {
    const allWalls = normalizeCollection(
      sceneData?.scene?.walls ??
        sceneData?.walls ??
        sceneData?.house?.walls,
    );

    return allWalls.filter((wall) => {
      const wallClass =
        wall.metadata?.wall_class
          ?.toLowerCase()
          .trim() ?? "";

      return (
        wall.position &&
        wall.size &&
        !wallClass.includes("fixedfurniture")
      );
    });
  }, [sceneData]);

  const doors = useMemo(
    () =>
      normalizeCollection(
        sceneData?.scene?.doors ??
          sceneData?.doors ??
          sceneData?.house?.doors,
      ).filter(
        (door) => door.position && door.size,
      ),
    [sceneData],
  );

  const windows = useMemo(
    () =>
      normalizeCollection(
        sceneData?.scene?.windows ??
          sceneData?.windows ??
          sceneData?.house?.windows,
      ).filter(
        (windowItem) =>
          windowItem.position &&
          windowItem.size,
      ),
    [sceneData],
  );

  const bounds = useMemo(() => {
    if (walls.length === 0) {
      return {
        center: {
          x: 0,
          z: 0,
        },
        width: 16,
        depth: 16,
      };
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    walls.forEach((wall) => {
      const x =
        Number(wall.position?.x) || 0;

      const z =
        Number(wall.position?.z) || 0;

      const width = Math.max(
        Number(wall.size?.width) || 0.1,
        0.01,
      );

      const depth = Math.max(
        Number(wall.size?.depth) || 0.1,
        0.01,
      );

      minX = Math.min(
        minX,
        x - width / 2,
      );

      maxX = Math.max(
        maxX,
        x + width / 2,
      );

      minZ = Math.min(
        minZ,
        z - depth / 2,
      );

      maxZ = Math.max(
        maxZ,
        z + depth / 2,
      );
    });

    if (
      !Number.isFinite(minX) ||
      !Number.isFinite(maxX) ||
      !Number.isFinite(minZ) ||
      !Number.isFinite(maxZ)
    ) {
      return {
        center: {
          x: 0,
          z: 0,
        },
        width: 16,
        depth: 16,
      };
    }

    return {
      center: {
        x: (minX + maxX) / 2,
        z: (minZ + maxZ) / 2,
      },
      width: Math.max(
        maxX - minX,
        4,
      ),
      depth: Math.max(
        maxZ - minZ,
        4,
      ),
    };
  }, [walls]);

  const sceneSize = Math.max(
    bounds.width,
    bounds.depth,
    8,
  );

  console.log("Zynora scene collections:", {
    walls: walls.length,
    doors: doors.length,
    windows: windows.length,
    bounds,
  });

  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={[
          bounds.center.x +
            sceneSize * 0.85,
          sceneSize * 0.75,
          bounds.center.z +
            sceneSize * 0.85,
        ]}
        fov={42}
        near={0.1}
        far={1000}
      />

      <OrbitControls
        makeDefault
        target={[
          bounds.center.x,
          0.8,
          bounds.center.z,
        ]}
        enablePan
        enableRotate
        enableZoom
        enableDamping
        dampingFactor={0.07}
        rotateSpeed={0.65}
        zoomSpeed={0.8}
        panSpeed={0.75}
        minDistance={4}
        maxDistance={sceneSize * 5}
        minPolarAngle={0.1}
        maxPolarAngle={Math.PI / 2.03}
      />

      <color
        attach="background"
        args={["#e9edf0"]}
      />

      <fog
        attach="fog"
        args={[
          "#e9edf0",
          sceneSize * 3,
          sceneSize * 8,
        ]}
      />

      <ambientLight intensity={0.7} />

      <hemisphereLight
        intensity={0.85}
        color="#fff8eb"
        groundColor="#7f8790"
      />

      <directionalLight
        position={[
          bounds.center.x + sceneSize,
          sceneSize * 1.8,
          bounds.center.z +
            sceneSize * 0.8,
        ]}
        intensity={2.1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={sceneSize * 7}
        shadow-camera-left={
          -sceneSize * 1.5
        }
        shadow-camera-right={
          sceneSize * 1.5
        }
        shadow-camera-top={
          sceneSize * 1.5
        }
        shadow-camera-bottom={
          -sceneSize * 1.5
        }
        shadow-bias={-0.00035}
        shadow-normalBias={0.03}
      />

      <pointLight
        position={[
          bounds.center.x,
          5,
          bounds.center.z,
        ]}
        intensity={0.55}
        distance={sceneSize * 3}
        decay={2}
        color="#ffd9a3"
      />

      <Floor
        center={bounds.center}
        width={bounds.width}
        depth={bounds.depth}
      />

      <group>
        {walls.map((wall, index) => (
          <Wall
            key={
              wall.id ??
              wall.wall_id ??
              `wall-${index}`
            }
            wall={wall}
          />
        ))}

        {doors.map((door, index) => (
          <Door
            key={
              door.id ??
              door.door_id ??
              `door-${index}`
            }
            door={door}
          />
        ))}

        {windows.map(
          (windowItem, index) => (
            <Window
              key={
                windowItem.id ??
                windowItem.window_id ??
                `window-${index}`
              }
              windowItem={windowItem}
            />
          ),
        )}
      </group>

      <FurnitureRenderer
        center={bounds.center}
      />

      <Environment
        preset="apartment"
        environmentIntensity={0.3}
      />
    </>
  );
}

function LoadingScene() {
  return (
    <group>
      <mesh
        position={[0, 0.6, 0]}
        rotation={[0.3, 0.5, 0]}
      >
        <boxGeometry args={[1, 1, 1]} />

        <meshStandardMaterial
          color="#7f8c8d"
          wireframe
        />
      </mesh>

      <ambientLight intensity={1} />
    </group>
  );
}

export default function House3DViewer() {
  const [sceneData, setSceneData] =
    useState(null);

  const [error, setError] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  useEffect(() => {
    let active = true;

    async function loadScene() {
      try {
        setIsLoading(true);
        setError("");

        const response = await fetch(
          `${SCENE_URL}?timestamp=${Date.now()}`,
          {
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error(
            `Could not load scene JSON. HTTP ${response.status}`,
          );
        }

        const data =
          await response.json();

        console.log(
          "Loaded Zynora scene JSON:",
          data,
        );

        if (active) {
          setSceneData(data);
        }
      } catch (loadError) {
        console.error(
          "Failed to load 3D scene:",
          loadError,
        );

        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load the 3D scene.",
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadScene();

    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <div
        style={{
          width: "100%",
          minHeight: "600px",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          borderRadius: "20px",
          background: "#f5f5f5",
          color: "#9f2f2f",
          textAlign: "center",
        }}
      >
        <div>
          <h3
            style={{
              marginBottom: "8px",
            }}
          >
            Unable to display the 3D house
          </h3>

          <p>{error}</p>

          <p
            style={{
              color: "#555",
              marginTop: "10px",
            }}
          >
            Confirm that this file exists:
            <br />

            <code>
              public/threejs_scene_10052.json
            </code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "min(78vh, 820px)",
        minHeight: "600px",
        overflow: "hidden",
        borderRadius: "22px",
        background: "#e9edf0",
        boxShadow:
          "0 20px 55px rgba(18, 28, 38, 0.14)",
      }}
    >
      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: "18px",
            left: "18px",
            zIndex: 5,
            padding: "12px 16px",
            borderRadius: "12px",
            background:
              "rgba(255,255,255,0.92)",
            color: "#222",
            boxShadow:
              "0 8px 25px rgba(0,0,0,0.08)",
          }}
        >
          Loading the Zynora 3D house...
        </div>
      )}

      {!isLoading && sceneData && (
        <div
          style={{
            position: "absolute",
            right: "16px",
            bottom: "16px",
            zIndex: 4,
            padding: "9px 12px",
            borderRadius: "10px",
            background:
              "rgba(255,255,255,0.78)",
            color: "#343434",
            fontSize: "13px",
            pointerEvents: "none",
          }}
        >
          Drag to rotate · Scroll to zoom
        </div>
      )}

      <Canvas
        shadows
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference:
            "high-performance",
        }}
        onCreated={({ gl }) => {
          gl.shadowMap.enabled = true;
          gl.shadowMap.type =
            THREE.PCFSoftShadowMap;

          gl.shadowMap.autoUpdate = true;

          gl.outputColorSpace =
            THREE.SRGBColorSpace;

          gl.toneMapping =
            THREE.ACESFilmicToneMapping;

          gl.toneMappingExposure =
            1.05;
        }}
      >
        <Suspense
          fallback={<LoadingScene />}
        >
          {sceneData && (
            <SceneContent
              sceneData={sceneData}
            />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}
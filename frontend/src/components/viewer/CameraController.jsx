import { useThree } from "@react-three/fiber";
import { useEffect } from "react";

export default function CameraController({
  center,
  distance,
}) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(
      center.x + distance,
      distance * 0.8,
      center.z + distance
    );

    camera.lookAt(center.x, 1.5, center.z);

    camera.updateProjectionMatrix();
  }, [camera, center, distance]);

  return null;
}
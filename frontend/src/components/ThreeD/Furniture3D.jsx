function Furniture3D({ item }) {
  const x =
    safeNumber(
      item?.x ??
        item?.position?.x
    );

  const z =
    safeNumber(
      item?.y ??
        item?.z ??
        item?.position?.y ??
        item?.position?.z
    );

  const width =
    positiveNumber(
      item?.width ??
        item?.dimensions?.width,
      1
    );

  const depth =
    positiveNumber(
      item?.height ??
        item?.depth ??
        item?.dimensions?.height ??
        item?.dimensions?.depth,
      1
    );

  const furnitureHeight =
    positiveNumber(
      item?.object_height ??
        item?.furniture_height,
      0.7
    );

  return (
    <mesh
      castShadow
      receiveShadow
      position={[
        x + width / 2,
        furnitureHeight / 2,
        z + depth / 2,
      ]}
    >
      <boxGeometry
        args={[
          width,
          furnitureHeight,
          depth,
        ]}
      />

      <meshStandardMaterial
        color="#8b5e3c"
        roughness={0.8}
      />
    </mesh>
  );
}

function safeNumber(value) {
  const numberValue =
    Number(value);

  return Number.isFinite(
    numberValue
  )
    ? numberValue
    : 0;
}

function positiveNumber(
  value,
  fallback
) {
  const numberValue =
    Number(value);

  return Number.isFinite(
    numberValue
  ) &&
    numberValue > 0
    ? numberValue
    : fallback;
}

export default Furniture3D;
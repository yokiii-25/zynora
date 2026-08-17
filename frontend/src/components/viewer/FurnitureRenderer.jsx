import Sofa from "../furniture/Sofa";
import CoffeeTable from "../furniture/CoffeeTable";
import TVUnit from "../furniture/TVUnit";
import Bed from "../furniture/Bed";
import Wardrobe from "../furniture/Wardrobe";
import DiningTable from "../furniture/DiningTable";
import KitchenCabinet from "../furniture/KitchenCabinet";
import Plant from "../furniture/Plant";

function normalizeVector(value, fallback = [0, 0, 0]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return [
    Number(value[0]) || 0,
    Number(value[1]) || 0,
    Number(value[2]) || 0,
  ];
}

export default function FurnitureRenderer({
  furniture = [],
  center = { x: 0, z: 0 },
}) {
  if (!Array.isArray(furniture)) {
    return null;
  }

  return (
    <group position={[center.x, 0, center.z]}>
      {furniture.map((item, index) => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const key =
          item.id ?? `${item.type ?? "furniture"}-${index}`;

        const props = {
          position: normalizeVector(item.position),
          rotation: normalizeVector(item.rotation),
        };

        switch (item.type?.toLowerCase()) {
          case "sofa":
            return <Sofa key={key} {...props} />;

          case "coffee":
          case "coffeetable":
          case "coffee_table":
            return <CoffeeTable key={key} {...props} />;

          case "tv":
          case "tvunit":
          case "tv_unit":
            return <TVUnit key={key} {...props} />;

          case "bed":
            return <Bed key={key} {...props} />;

          case "wardrobe":
            return <Wardrobe key={key} {...props} />;

          case "dining":
          case "diningtable":
          case "dining_table":
            return <DiningTable key={key} {...props} />;

          case "kitchen":
          case "kitchencabinet":
          case "kitchen_cabinet":
            return (
              <KitchenCabinet
                key={key}
                {...props}
                width={Number(item.width) || 2.4}
              />
            );

          case "plant":
            return <Plant key={key} {...props} />;

          default:
            console.warn(
              `Unknown furniture type: ${item.type}`,
              item
            );

            return null;
        }
      })}
    </group>
  );
}
from typing import Any


def generate_furniture(
    rooms: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    furniture: list[dict[str, Any]] = []

    for room in rooms:
        room_type = str(
            room.get("type", "")
        ).lower()

        x = float(room.get("x", 0))
        y = float(room.get("y", 0))
        width = float(room.get("width", 0))
        height = float(room.get("height", 0))

        if room_type == "living":
            furniture.append(
                {
                    "id": f"sofa-{room.get('id')}",
                    "type": "sofa",
                    "name": "Sofa",
                    "x": x + width * 0.12,
                    "y": y + height * 0.62,
                    "width": width * 0.45,
                    "height": height * 0.18,
                    "rotation": 0,
                    "room_id": room.get("id"),
                }
            )

            furniture.append(
                {
                    "id": f"tv-{room.get('id')}",
                    "type": "tv",
                    "name": "TV Unit",
                    "x": x + width * 0.68,
                    "y": y + height * 0.12,
                    "width": width * 0.22,
                    "height": height * 0.08,
                    "rotation": 0,
                    "room_id": room.get("id"),
                }
            )

        elif room_type == "bedroom":
            furniture.append(
                {
                    "id": f"bed-{room.get('id')}",
                    "type": "bed",
                    "name": "Bed",
                    "x": x + width * 0.2,
                    "y": y + height * 0.25,
                    "width": width * 0.55,
                    "height": height * 0.45,
                    "rotation": 0,
                    "room_id": room.get("id"),
                }
            )

        elif room_type == "dining":
            furniture.append(
                {
                    "id": f"table-{room.get('id')}",
                    "type": "dining-table",
                    "name": "Dining Table",
                    "x": x + width * 0.25,
                    "y": y + height * 0.3,
                    "width": width * 0.5,
                    "height": height * 0.35,
                    "rotation": 0,
                    "room_id": room.get("id"),
                }
            )

        elif room_type == "kitchen":
            furniture.append(
                {
                    "id": f"counter-{room.get('id')}",
                    "type": "kitchen-counter",
                    "name": "Kitchen Counter",
                    "x": x + width * 0.05,
                    "y": y + height * 0.08,
                    "width": width * 0.9,
                    "height": height * 0.16,
                    "rotation": 0,
                    "room_id": room.get("id"),
                }
            )

    return furniture
from __future__ import annotations

import re
from xml.etree import ElementTree as ET

from zynora_ai.core.models.door import Door
from zynora_ai.core.models.point import Point


class DoorParser:
    def extract_doors(
        self,
        wall_element: ET.Element,
    ) -> list[Door]:
        doors: list[Door] = []

        for element in wall_element.iter():
            if not self._has_class(element, "Door"):
                continue

            polygon_element = self._find_polygon(element)

            if polygon_element is None:
                continue

            polygon = self._parse_polygon_points(
                polygon_element.attrib.get("points", "")
            )

            if len(polygon) < 3:
                continue

            door_classes = element.attrib.get(
                "class",
                "",
            ).split()

            door_type_parts = [
                class_name
                for class_name in door_classes
                if class_name != "Door"
            ]

            door_type = (
                " ".join(door_type_parts)
                if door_type_parts
                else "Unknown"
            )

            doors.append(
                Door(
                    id=f"door-{len(doors) + 1}",
                    door_type=door_type,
                    polygon=polygon,
                )
            )

        return doors

    def _find_polygon(
        self,
        door_element: ET.Element,
    ) -> ET.Element | None:
        for child in door_element:
            if self._strip_namespace(child.tag) != "polygon":
                continue

            points = child.attrib.get("points", "").strip()

            if points:
                return child

        return None

    @staticmethod
    def _parse_polygon_points(
        points_value: str,
    ) -> list[Point]:
        numbers = re.findall(
            r"-?\d+(?:\.\d+)?",
            points_value,
        )

        coordinates = [
            float(number)
            for number in numbers
        ]

        if len(coordinates) % 2 != 0:
            coordinates = coordinates[:-1]

        return [
            Point(
                x=coordinates[index],
                y=coordinates[index + 1],
            )
            for index in range(
                0,
                len(coordinates),
                2,
            )
        ]

    @staticmethod
    def _has_class(
        element: ET.Element,
        class_name: str,
    ) -> bool:
        classes = element.attrib.get(
            "class",
            "",
        ).split()

        return class_name in classes

    @staticmethod
    def _strip_namespace(
        tag: str,
    ) -> str:
        return tag.split("}")[-1]
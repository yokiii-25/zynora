from __future__ import annotations

import re
from xml.etree import ElementTree as ET

from zynora_ai.core.models.point import Point
from zynora_ai.core.models.wall import Wall
from zynora_ai.core.parser.door_parser import DoorParser
from zynora_ai.core.parser.window_parser import WindowParser


class WallParser:
    def extract_walls(
        self,
        root: ET.Element,
    ) -> list[Wall]:
        walls: list[Wall] = []

        door_parser = DoorParser()
        window_parser = WindowParser()

        door_counter = 0
        window_counter = 0

        for element in root.iter():
            if not self._has_class(element, "Wall"):
                continue

            polygon_element = self._find_polygon(element)

            if polygon_element is None:
                continue

            polygon = self._parse_polygon_points(
                polygon_element.attrib.get("points", "")
            )

            if len(polygon) < 3:
                continue

            wall_type = (
                "External"
                if self._has_class(element, "External")
                else "Internal"
            )

            wall = Wall(
                id=f"wall-{len(walls) + 1}",
                wall_type=wall_type,
                polygon=polygon,
            )

            parsed_doors = door_parser.extract_doors(element)

            for door in parsed_doors:
                door_counter += 1
                door.id = f"door-{door_counter}"

            parsed_windows = window_parser.extract_windows(element)

            for window in parsed_windows:
                window_counter += 1
                window.id = f"window-{window_counter}"

            wall.doors.extend(parsed_doors)
            wall.windows.extend(parsed_windows)

            walls.append(wall)

        return walls

    def _find_polygon(
        self,
        wall_element: ET.Element,
    ) -> ET.Element | None:
        for child in wall_element:
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
from __future__ import annotations

import re
from pathlib import Path
from xml.etree import ElementTree as ET

from zynora_ai.core.models.floor import Floor
from zynora_ai.core.models.house import House
from zynora_ai.core.models.point import Point
from zynora_ai.core.models.room import Room
from zynora_ai.core.parser.wall_parser import WallParser


class SvgHouseParser:
    def parse(self, svg_path: str | Path) -> House:
        svg_path = Path(svg_path)

        if not svg_path.exists():
            raise FileNotFoundError(
                f"SVG file not found: {svg_path}"
            )

        tree = ET.parse(svg_path)
        root = tree.getroot()

        house = House()
        wall_parser = WallParser()

        floor_elements = [
            element
            for element in root.iter()
            if self._is_floor_element(element)
        ]

        # Some SVG files do not have an explicit Floor-* ID.
        if not floor_elements:
            floor = Floor(name="Floor-1")

            floor.rooms.extend(
                self._extract_rooms(root)
            )

            floor.walls.extend(
                wall_parser.extract_walls(root)
            )

            house.floors.append(floor)
            return house

        for index, floor_element in enumerate(
            floor_elements,
            start=1,
        ):
            floor_name = floor_element.attrib.get(
                "id",
                f"Floor-{index}",
            )

            floor = Floor(name=floor_name)

            floor.rooms.extend(
                self._extract_rooms(floor_element)
            )

            floor.walls.extend(
                wall_parser.extract_walls(floor_element)
            )

            house.floors.append(floor)

        return house

    def _extract_rooms(
        self,
        floor_element: ET.Element,
    ) -> list[Room]:
        rooms: list[Room] = []

        for element in floor_element.iter():
            if not self._has_class(element, "Space"):
                continue

            polygon_element = self._find_boundary_polygon(
                element
            )

            if polygon_element is None:
                continue

            polygon = self._parse_polygon_points(
                polygon_element.attrib.get("points", "")
            )

            if len(polygon) < 3:
                continue

            room_id = element.attrib.get(
                "id",
                f"room-{len(rooms) + 1}",
            )

            room_type = self._extract_room_name(element)

            rooms.append(
                Room(
                    id=room_id,
                    room_type=room_type,
                    polygon=polygon,
                )
            )

        return rooms

    @staticmethod
    def _is_floor_element(
        element: ET.Element,
    ) -> bool:
        element_id = element.attrib.get("id", "")

        return bool(
            re.fullmatch(r"Floor-\d+", element_id)
        )

    def _find_boundary_polygon(
        self,
        space_element: ET.Element,
    ) -> ET.Element | None:
        fallback_polygon: ET.Element | None = None

        for element in space_element.iter():
            if self._strip_namespace(element.tag) != "polygon":
                continue

            points = element.attrib.get(
                "points",
                "",
            ).strip()

            if not points:
                continue

            if self._has_class(
                element,
                "BoundaryPolygon",
            ):
                return element

            if fallback_polygon is None:
                fallback_polygon = element

        return fallback_polygon

    def _extract_room_name(
        self,
        space_element: ET.Element,
    ) -> str:
        classes = space_element.attrib.get(
            "class",
            "",
        ).split()

        ignored_classes = {
            "Space",
            "Undefined",
        }

        semantic_classes = [
            class_name
            for class_name in classes
            if class_name not in ignored_classes
        ]

        if semantic_classes:
            return " ".join(
                self._format_room_class(class_name)
                for class_name in semantic_classes
            )

        # Try CubiCasa semantic labels.
        for element in space_element.iter():
            if not (
                self._has_class(element, "NameLabel")
                or self._has_class(element, "TextLabel")
                or self._has_class(element, "Name")
            ):
                continue

            text = self._collect_text(element)

            if self._is_valid_room_name(text):
                return text

        # Final fallback: search ordinary text elements.
        for element in space_element.iter():
            if self._strip_namespace(element.tag) != "text":
                continue

            text = self._collect_text(element)

            if self._is_valid_room_name(text):
                return text

        return "Unknown"

    @staticmethod
    def _format_room_class(
        class_name: str,
    ) -> str:
        formatted = re.sub(
            r"(?<!^)(?=[A-Z])",
            " ",
            class_name,
        )

        return (
            formatted
            .replace("_", " ")
            .replace("-", " ")
            .strip()
        )

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
    def _collect_text(
        element: ET.Element,
    ) -> str:
        return " ".join(
            value.strip()
            for value in element.itertext()
            if value and value.strip()
        )

    @staticmethod
    def _is_valid_room_name(
        text: str,
    ) -> bool:
        if not text:
            return False

        lowered = text.lower()

        rejected_patterns = [
            "width:",
            "height:",
            "depth:",
            "elevation:",
        ]

        if any(
            pattern in lowered
            for pattern in rejected_patterns
        ):
            return False

        # Reject dimensions such as 11'10" x 11'8".
        if re.search(
            r"\d+\s*['\"]?\s*x\s*\d+",
            text,
        ):
            return False

        return True

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
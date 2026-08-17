from __future__ import annotations

import re
from xml.etree import ElementTree as ET

from zynora_ai.core.models.point import Point
from zynora_ai.core.models.window import Window


class WindowParser:
    def extract_windows(
        self,
        wall_element: ET.Element,
    ) -> list[Window]:
        windows: list[Window] = []

        for element in wall_element.iter():
            if not self._has_class(element, "Window"):
                continue

            polygon_element = self._find_polygon(element)

            if polygon_element is None:
                continue

            polygon = self._parse_polygon_points(
                polygon_element.attrib.get("points", "")
            )

            if len(polygon) < 3:
                continue

            classes = element.attrib.get(
                "class",
                "",
            ).split()

            window_type_parts = [
                class_name
                for class_name in classes
                if class_name != "Window"
            ]

            window_type = (
                " ".join(window_type_parts)
                if window_type_parts
                else "Unknown"
            )

            windows.append(
                Window(
                    id=f"window-{len(windows) + 1}",
                    window_type=window_type,
                    polygon=polygon,
                )
            )

        return windows

    def _find_polygon(
        self,
        window_element: ET.Element,
    ) -> ET.Element | None:
        for child in window_element:
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
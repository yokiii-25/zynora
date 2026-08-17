from __future__ import annotations

import uuid
import xml.etree.ElementTree as ET

from zynora_ai.core.geometry.affine_transform import (
    AffineTransform,
)
from zynora_ai.core.models.furniture import Furniture
from zynora_ai.core.models.point import Point


class FurnitureParser:
    def parse(self, root: ET.Element) -> list[Furniture]:
        furniture_items: list[Furniture] = []

        self._walk_element(
            element=root,
            parent_transform=AffineTransform.identity(),
            furniture_items=furniture_items,
        )

        return furniture_items

    def _walk_element(
        self,
        element: ET.Element,
        parent_transform: AffineTransform,
        furniture_items: list[Furniture],
    ) -> None:
        local_transform = self._safe_parse_transform(
            element.attrib.get("transform")
        )

        cumulative_transform = parent_transform.combine(
            local_transform
        )

        class_tokens = element.attrib.get(
            "class",
            "",
        ).strip().split()

        if (
            self._local_name(element.tag) == "g"
            and "FixedFurniture" in class_tokens
        ):
            furniture_type = self._extract_furniture_type(
                class_tokens
            )

            if furniture_type is not None:
                local_polygon = self._extract_polygon(element)

                world_polygon = (
                    cumulative_transform.apply_to_polygon(
                        local_polygon
                    )
                )

                furniture_items.append(
                    Furniture(
                        id=element.attrib.get(
                            "id",
                            str(uuid.uuid4()),
                        ),
                        furniture_type=furniture_type,
                        local_polygon=local_polygon,
                        polygon=world_polygon,
                        transform=(
                            cumulative_transform.to_svg_matrix()
                        ),
                    )
                )

                # Do not return here.
                # Some furniture groups may contain other furniture.
                # Continue walking through child elements.

        for child in element:
            self._walk_element(
                element=child,
                parent_transform=cumulative_transform,
                furniture_items=furniture_items,
            )

    @staticmethod
    def _safe_parse_transform(
        transform_text: str | None,
    ) -> AffineTransform:
        if not transform_text:
            return AffineTransform.identity()

        try:
            return AffineTransform.from_svg(transform_text)
        except ValueError:
            print(
                "Warning: unsupported SVG transform ignored: "
                f"{transform_text}"
            )

            return AffineTransform.identity()

    @staticmethod
    def _local_name(tag: str) -> str:
        if "}" in tag:
            return tag.split("}", maxsplit=1)[1]

        return tag

    @staticmethod
    def _extract_furniture_type(
        class_tokens: list[str],
    ) -> str | None:
        ignored_tokens = {
            "FixedFurniture",
            "ElectricalAppliance",
        }

        useful_tokens = [
            token
            for token in class_tokens
            if token not in ignored_tokens
        ]

        if not useful_tokens:
            return None

        return useful_tokens[-1]

    def _extract_polygon(
        self,
        furniture_group: ET.Element,
    ) -> list[Point]:
        boundary_group = None

        for child in furniture_group.iter():
            child_class_tokens = child.attrib.get(
                "class",
                "",
            ).split()

            if "BoundaryPolygon" in child_class_tokens:
                boundary_group = child
                break

        if boundary_group is None:
            return []

        for child in boundary_group.iter():
            if self._local_name(child.tag) != "polygon":
                continue

            points_text = child.attrib.get(
                "points",
                "",
            ).strip()

            if not points_text:
                continue

            return self._parse_points(points_text)

        return []

    @staticmethod
    def _parse_points(
        points_text: str,
    ) -> list[Point]:
        points: list[Point] = []

        for pair in points_text.split():
            if "," not in pair:
                continue

            x_text, y_text = pair.split(",", maxsplit=1)

            try:
                points.append(
                    Point(
                        x=float(x_text),
                        y=float(y_text),
                    )
                )
            except ValueError:
                continue

        return points
from __future__ import annotations

from dataclasses import dataclass
import re

from zynora_ai.core.models.point import Point


@dataclass(frozen=True)
class AffineTransform:
    """
    Represents an SVG 2D affine transformation matrix:

        matrix(a, b, c, d, e, f)

    Point transformation:

        x' = a*x + c*y + e
        y' = b*x + d*y + f
    """

    a: float = 1.0
    b: float = 0.0
    c: float = 0.0
    d: float = 1.0
    e: float = 0.0
    f: float = 0.0

    @classmethod
    def identity(cls) -> "AffineTransform":
        return cls()

    @classmethod
    def from_svg(
        cls,
        transform_text: str | None,
    ) -> "AffineTransform":
        if not transform_text:
            return cls.identity()

        transform_text = transform_text.strip()

        matrix_match = re.fullmatch(
            r"matrix\s*\(\s*"
            r"([-+0-9.eE]+)\s*[, ]\s*"
            r"([-+0-9.eE]+)\s*[, ]\s*"
            r"([-+0-9.eE]+)\s*[, ]\s*"
            r"([-+0-9.eE]+)\s*[, ]\s*"
            r"([-+0-9.eE]+)\s*[, ]\s*"
            r"([-+0-9.eE]+)\s*"
            r"\)",
            transform_text,
        )

        if matrix_match:
            values = [
                float(value)
                for value in matrix_match.groups()
            ]

            return cls(*values)

        translate_match = re.fullmatch(
            r"translate\s*\(\s*"
            r"([-+0-9.eE]+)"
            r"(?:\s*[, ]\s*([-+0-9.eE]+))?"
            r"\s*\)",
            transform_text,
        )

        if translate_match:
            x = float(translate_match.group(1))
            y = (
                float(translate_match.group(2))
                if translate_match.group(2)
                else 0.0
            )

            return cls(e=x, f=y)

        raise ValueError(
            f"Unsupported SVG transform: {transform_text}"
        )

    def apply_to_point(self, point: Point) -> Point:
        return Point(
            x=(self.a * point.x) + (self.c * point.y) + self.e,
            y=(self.b * point.x) + (self.d * point.y) + self.f,
        )

    def apply_to_polygon(
        self,
        polygon: list[Point],
    ) -> list[Point]:
        return [
            self.apply_to_point(point)
            for point in polygon
        ]

    def combine(
        self,
        child: "AffineTransform",
    ) -> "AffineTransform":
        """
        Combines a parent transform with a child transform.

        Result means:

            parent(child(point))
        """

        return AffineTransform(
            a=(self.a * child.a) + (self.c * child.b),
            b=(self.b * child.a) + (self.d * child.b),
            c=(self.a * child.c) + (self.c * child.d),
            d=(self.b * child.c) + (self.d * child.d),
            e=(self.a * child.e) + (self.c * child.f) + self.e,
            f=(self.b * child.e) + (self.d * child.f) + self.f,
        )

    def to_svg_matrix(self) -> str:
        return (
            f"matrix("
            f"{self.a},"
            f"{self.b},"
            f"{self.c},"
            f"{self.d},"
            f"{self.e},"
            f"{self.f}"
            f")"
        )
        
import re
from xml.etree.ElementTree import Element


class SVGGeometry:
    @staticmethod
    def parse_points(points_string: str) -> list[tuple[float, float]]:
        """
        Convert SVG polygon/polyline point data into coordinate pairs.

        Supported examples:
        "10,20 30,40 50,60"
        "10 20 30 40 50 60"
        "10,20,30,40"
        Values may also contain decimals, negative numbers,
        newlines, tabs, or scientific notation.
        """

        if not points_string:
            return []

        number_pattern = (
            r"[-+]?"
            r"(?:\d*\.\d+|\d+\.?)"
            r"(?:[eE][-+]?\d+)?"
        )

        numbers = re.findall(number_pattern, points_string)

        coordinates = [float(number) for number in numbers]

        if len(coordinates) % 2 != 0:
            print(
                "Warning: polygon contains an odd number "
                "of coordinate values."
            )
            print(f"Raw points: {points_string}")

            # Ignore the incomplete final value instead of crashing.
            coordinates = coordinates[:-1]

        points = []

        for index in range(0, len(coordinates), 2):
            x = coordinates[index]
            y = coordinates[index + 1]

            points.append((x, y))

        return points

    @staticmethod
    def extract_polygon(group: Element) -> list[list[tuple[float, float]]]:
        """
        Extract every polygon contained inside an SVG group.

        Returns:
        [
            [(x1, y1), (x2, y2), ...],
            [(x1, y1), (x2, y2), ...]
        ]
        """

        polygons = []

        for child in group.iter():
            tag = child.tag.split("}")[-1]

            if tag != "polygon":
                continue

            points_string = child.attrib.get("points", "")
            points = SVGGeometry.parse_points(points_string)

            if points:
                polygons.append(points)

        return polygons

    @staticmethod
    def extract_polyline(group: Element) -> list[list[tuple[float, float]]]:
        """
        Extract every polyline contained inside an SVG group.
        """

        polylines = []

        for child in group.iter():
            tag = child.tag.split("}")[-1]

            if tag != "polyline":
                continue

            points_string = child.attrib.get("points", "")
            points = SVGGeometry.parse_points(points_string)

            if points:
                polylines.append(points)

        return polylines

    @staticmethod
    def extract_lines(group: Element) -> list[dict]:
        """
        Extract SVG line elements.

        Returns:
        [
            {
                "start": (x1, y1),
                "end": (x2, y2)
            }
        ]
        """

        lines = []

        for child in group.iter():
            tag = child.tag.split("}")[-1]

            if tag != "line":
                continue

            try:
                x1 = float(child.attrib.get("x1", 0))
                y1 = float(child.attrib.get("y1", 0))
                x2 = float(child.attrib.get("x2", 0))
                y2 = float(child.attrib.get("y2", 0))
            except ValueError:
                continue

            lines.append({
                "start": (x1, y1),
                "end": (x2, y2)
            })

        return lines

    @staticmethod
    def extract_rectangles(group: Element) -> list[dict]:
        """
        Extract SVG rectangle elements.
        """

        rectangles = []

        for child in group.iter():
            tag = child.tag.split("}")[-1]

            if tag != "rect":
                continue

            try:
                x = float(child.attrib.get("x", 0))
                y = float(child.attrib.get("y", 0))
                width = float(child.attrib.get("width", 0))
                height = float(child.attrib.get("height", 0))
            except ValueError:
                continue

            rectangles.append({
                "x": x,
                "y": y,
                "width": width,
                "height": height
            })

        return rectangles

    @staticmethod
    def extract_geometry(group: Element) -> dict:
        """
        Extract all currently supported geometry from an SVG group.
        """

        return {
            "polygons": SVGGeometry.extract_polygon(group),
            "polylines": SVGGeometry.extract_polyline(group),
            "lines": SVGGeometry.extract_lines(group),
            "rectangles": SVGGeometry.extract_rectangles(group)
        }
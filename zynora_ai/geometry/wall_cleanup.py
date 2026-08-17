from typing import Any


class WallCleaner:
    """
    Removes wall segments that are fully contained inside another wall.
    """

    @staticmethod
    def is_contained(
        wall_a: dict[str, Any],
        wall_b: dict[str, Any],
        tolerance: float = 2.0,
    ) -> bool:

        if wall_a["orientation"] != wall_b["orientation"]:
            return False

        ax = wall_a["center"]["x"]
        ay = wall_a["center"]["y"]

        bx = wall_b["center"]["x"]
        by = wall_b["center"]["y"]

        if wall_a["orientation"] == "horizontal":

            if abs(ay - by) > tolerance:
                return False

            a_min = ax - wall_a["length"] / 2
            a_max = ax + wall_a["length"] / 2

            b_min = bx - wall_b["length"] / 2
            b_max = bx + wall_b["length"] / 2

        else:

            if abs(ax - bx) > tolerance:
                return False

            a_min = ay - wall_a["length"] / 2
            a_max = ay + wall_a["length"] / 2

            b_min = by - wall_b["length"] / 2
            b_max = by + wall_b["length"] / 2

        return (
            a_min >= b_min - tolerance
            and a_max <= b_max + tolerance
        )

    @staticmethod
    def remove_contained_walls(
        walls: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:

        keep = []

        for i, wall in enumerate(walls):

            contained = False

            for j, other in enumerate(walls):

                if i == j:
                    continue

                if other["length"] <= wall["length"]:
                    continue

                if WallCleaner.is_contained(
                    wall,
                    other,
                ):
                    contained = True
                    break

            if not contained:
                keep.append(wall)

        return keep
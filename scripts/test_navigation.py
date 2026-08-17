from __future__ import annotations

from pathlib import Path

from zynora_ai.core.graph.house_graph import HouseGraphBuilder
from zynora_ai.core.graph.navigation import HouseNavigator
from zynora_ai.core.graph.wall_room_relationships import (
    WallRoomRelationshipBuilder,
)
from zynora_ai.core.parser.svg_house_parser import SvgHouseParser

PROJECT_ROOT = Path(__file__).resolve().parents[1]


def load_svg() -> Path:
    path = PROJECT_ROOT / "outputs" / "selected_svg.txt"

    svg = Path(path.read_text().strip())

    if not svg.is_absolute():
        svg = PROJECT_ROOT / svg

    return svg.resolve()


def room_name(graph, room_id):
    return graph.room_name(room_id)


def print_rooms(graph, rooms):
    for room in rooms:
        print(f"   • {room_name(graph, room)} ({room})")


def main():
    svg = load_svg()

    house = SvgHouseParser().parse(svg)

    floor = house.floors[0]

    relationships = (
        WallRoomRelationshipBuilder().build(
            rooms=floor.rooms,
            walls=floor.walls,
            maximum_gap=20.0,
            minimum_boundary_length=5.0,
            maximum_rooms_per_wall=2,
        )
    )

    graph = HouseGraphBuilder().build(
        rooms=floor.rooms,
        walls=floor.walls,
        relationships=relationships,
    )

    navigator = HouseNavigator(graph)

    print("=" * 80)
    print("OUTDOOR ROOMS")
    print("=" * 80)

    outdoor = navigator.find_outdoor_rooms()

    print_rooms(graph, outdoor)

    print()

    print("=" * 80)
    print("ENTRANCE DOORS")
    print("=" * 80)

    for edge in navigator.entrance_edges():
        print(edge)

    print()

    start = outdoor[0]

    print("=" * 80)
    print("BREADTH FIRST SEARCH")
    print("=" * 80)

    bfs = navigator.breadth_first_search(start)

    print_rooms(graph, bfs)

    print()

    print("=" * 80)
    print("DEPTH FIRST SEARCH")
    print("=" * 80)

    dfs = navigator.depth_first_search(start)

    print_rooms(graph, dfs)

    print()

    print("=" * 80)
    print("CONNECTED COMPONENTS")
    print("=" * 80)

    components = navigator.connected_components()

    for i, component in enumerate(components, start=1):
        print(f"\nComponent {i}")

        print_rooms(graph, component)

    print()

    print("=" * 80)
    print("SHORTEST PATHS")
    print("=" * 80)

    for room in graph.room_nodes:

        if room == start:
            continue

        path = navigator.shortest_path(start, room)

        if path is None:
            continue

        print()

        print(
            f"{room_name(graph,start)}"
            f" -> "
            f"{room_name(graph,room)}"
        )

        print("Rooms:")

        for r in path.room_ids:
            print("   ", room_name(graph, r))

        print("Doors:")

        for d in path.door_ids:
            print("   ", d)

    print()

    print("=" * 80)
    print("REACHABLE ROOMS")
    print("=" * 80)

    reachable = navigator.reachable_rooms(start)

    print_rooms(graph, reachable)


if __name__ == "__main__":
    main()
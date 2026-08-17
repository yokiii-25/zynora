from __future__ import annotations

from pathlib import Path

from zynora_ai.core.graph.house_graph import (
    HouseGraph,
    HouseGraphBuilder,
)
from zynora_ai.core.graph.wall_room_relationships import (
    WallRoomRelationshipBuilder,
)
from zynora_ai.core.parser.svg_house_parser import (
    SvgHouseParser,
)


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def load_selected_svg() -> Path:
    """
    Read the SVG path stored in outputs/selected_svg.txt.
    """

    selected_file = (
        PROJECT_ROOT
        / "outputs"
        / "selected_svg.txt"
    )

    if not selected_file.exists():
        raise FileNotFoundError(
            "outputs/selected_svg.txt was not found."
        )

    svg_text = selected_file.read_text(
        encoding="utf-8",
    ).strip()

    if not svg_text:
        raise ValueError(
            "outputs/selected_svg.txt is empty."
        )

    svg_path = Path(svg_text)

    if not svg_path.is_absolute():
        svg_path = PROJECT_ROOT / svg_path

    svg_path = svg_path.resolve()

    if not svg_path.exists():
        raise FileNotFoundError(
            f"SVG file was not found: {svg_path}"
        )

    return svg_path


def room_label(
    graph: HouseGraph,
    room_id: str | None,
) -> str:
    """
    Return a readable room label.
    """

    if room_id is None:
        return "OUTSIDE"

    node = graph.get_room_node(room_id)

    if node is None:
        return f"UNKNOWN ({room_id})"

    return f"{node.room_type} ({room_id})"


def is_outdoor_room(
    graph: HouseGraph,
    room_id: str | None,
) -> bool:
    """
    Check whether a graph room represents outdoor space.
    """

    if room_id is None:
        return True

    node = graph.get_room_node(room_id)

    if node is None:
        return False

    return node.room_type.strip().lower() == "outdoor"


def edge_is_exterior(
    graph: HouseGraph,
    door_id: str,
) -> bool:
    """
    Treat a door as exterior when the edge is marked exterior,
    has only one room, or connects to an Outdoor room.
    """

    edge = graph.get_door_edge(door_id)

    if edge is None:
        return False

    return (
        edge.is_exterior
        or edge.room_b_id is None
        or is_outdoor_room(graph, edge.room_a_id)
        or is_outdoor_room(graph, edge.room_b_id)
    )


def print_room_analysis(
    graph: HouseGraph,
) -> None:
    print()
    print("=" * 78)
    print("ROOM NODES")
    print("=" * 78)

    for room_id, node in graph.room_nodes.items():
        print()
        print(f"Room type       : {node.room_type}")
        print(f"Room ID         : {room_id}")
        print(
            f"Connected rooms : "
            f"{len(node.connected_room_ids)}"
        )
        print(
            f"Connected doors : "
            f"{len(node.connected_door_ids)}"
        )
        print(
            f"Connected walls : "
            f"{len(node.connected_wall_ids)}"
        )

        exterior_door_ids = [
            door_id
            for door_id in node.connected_door_ids
            if edge_is_exterior(graph, door_id)
        ]

        print(
            f"Exterior doors  : "
            f"{len(exterior_door_ids)}"
        )

        if node.connected_room_ids:
            print("Adjacent through doors:")

            for connected_room_id in (
                node.connected_room_ids
            ):
                print(
                    "   -> "
                    + room_label(
                        graph,
                        connected_room_id,
                    )
                )
        else:
            print(
                "Adjacent through doors: None"
            )

        if node.connected_door_ids:
            print("Door connections:")

            for door_id in node.connected_door_ids:
                edge = graph.get_door_edge(
                    door_id
                )

                if edge is None:
                    continue

                other_room_id = edge.other_room(
                    room_id
                )

                exterior = edge_is_exterior(
                    graph,
                    door_id,
                )

                print(f"   -> Door ID : {door_id}")
                print(
                    f"      Wall    : "
                    f"{edge.wall_id}"
                )
                print(
                    f"      Leads to: "
                    f"{room_label(graph, other_room_id)}"
                )
                print(
                    f"      Exterior: "
                    f"{'Yes' if exterior else 'No'}"
                )
        else:
            print("Door connections: None")

        if node.connected_wall_ids:
            print("Matched walls:")

            for wall_id in node.connected_wall_ids:
                wall = graph.wall_lookup.get(
                    wall_id
                )

                wall_type = getattr(
                    wall,
                    "wall_type",
                    "UNKNOWN",
                )

                print(
                    f"   -> {wall_id} "
                    f"[{wall_type}]"
                )


def print_door_analysis(
    graph: HouseGraph,
) -> None:
    print()
    print("=" * 78)
    print("DOOR EDGES")
    print("=" * 78)

    if not graph.door_edges:
        print()
        print("No door edges were created.")
        return

    for door_id, edge in graph.door_edges.items():
        exterior = edge_is_exterior(
            graph,
            door_id,
        )

        print()
        print(f"Door ID   : {door_id}")
        print(f"Wall ID   : {edge.wall_id}")
        print(
            f"Room A    : "
            f"{room_label(graph, edge.room_a_id)}"
        )
        print(
            f"Room B    : "
            f"{room_label(graph, edge.room_b_id)}"
        )
        print(
            f"Exterior  : "
            f"{'Yes' if exterior else 'No'}"
        )


def print_adjacency_list(
    graph: HouseGraph,
) -> None:
    print()
    print("=" * 78)
    print("DOOR-BASED ADJACENCY LIST")
    print("=" * 78)

    for room_id, node in graph.room_nodes.items():
        print()
        print(
            f"{node.room_type} "
            f"({room_id})"
        )

        if not node.connected_room_ids:
            print("   -> No connected rooms")
            continue

        for neighbor_id in node.connected_room_ids:
            connecting_doors = []

            for door_id in node.connected_door_ids:
                edge = graph.get_door_edge(
                    door_id
                )

                if edge is None:
                    continue

                if edge.other_room(room_id) == neighbor_id:
                    connecting_doors.append(
                        door_id
                    )

            door_text = (
                ", ".join(connecting_doors)
                if connecting_doors
                else "unknown door"
            )

            print(
                "   -> "
                f"{room_label(graph, neighbor_id)} "
                f"through {door_text}"
            )


def print_summary(
    graph: HouseGraph,
) -> None:
    isolated_rooms = [
        node
        for node in graph.room_nodes.values()
        if not node.connected_room_ids
        and not node.connected_door_ids
    ]

    exterior_doors = [
        door_id
        for door_id in graph.door_edges
        if edge_is_exterior(
            graph,
            door_id,
        )
    ]

    internal_doors = [
        door_id
        for door_id in graph.door_edges
        if not edge_is_exterior(
            graph,
            door_id,
        )
    ]

    connected_room_pairs: set[
        tuple[str, str]
    ] = set()

    for node in graph.room_nodes.values():
        for neighbor_id in node.connected_room_ids:
            pair = tuple(
                sorted(
                    (
                        node.room_id,
                        neighbor_id,
                    )
                )
            )

            connected_room_pairs.add(pair)

    print()
    print("=" * 78)
    print("HOUSE GRAPH SUMMARY")
    print("=" * 78)
    print(
        f"Room nodes           : "
        f"{graph.room_count}"
    )
    print(
        f"Door edges           : "
        f"{graph.door_count}"
    )
    print(
        f"Internal doors       : "
        f"{len(internal_doors)}"
    )
    print(
        f"Exterior doors       : "
        f"{len(exterior_doors)}"
    )
    print(
        f"Connected room pairs : "
        f"{len(connected_room_pairs)}"
    )
    print(
        f"Isolated rooms       : "
        f"{len(isolated_rooms)}"
    )

    if exterior_doors:
        print()
        print("Possible entrance doors:")

        for door_id in exterior_doors:
            edge = graph.get_door_edge(
                door_id
            )

            if edge is None:
                continue

            print(
                f"   -> {door_id} "
                f"on {edge.wall_id}"
            )


def main() -> None:
    svg_path = load_selected_svg()

    print("=" * 78)
    print("ZYNORA HOUSE GRAPH ANALYSIS")
    print("=" * 78)
    print(f"SVG: {svg_path}")

    house = SvgHouseParser().parse(
        svg_path
    )

    relationship_builder = (
        WallRoomRelationshipBuilder()
    )

    graph_builder = HouseGraphBuilder()

    for floor in house.floors:
        relationships = (
            relationship_builder.build(
                rooms=floor.rooms,
                walls=floor.walls,
                maximum_gap=20.0,
                minimum_boundary_length=5.0,
                maximum_rooms_per_wall=2,
            )
        )

        graph = graph_builder.build(
            rooms=floor.rooms,
            walls=floor.walls,
            relationships=relationships,
        )

        print()
        print("#" * 78)
        print(f"Floor: {floor.name}")
        print(
            f"Parsed rooms: "
            f"{len(floor.rooms)}"
        )
        print(
            f"Parsed walls: "
            f"{len(floor.walls)}"
        )
        print("#" * 78)

        print_room_analysis(graph)
        print_door_analysis(graph)
        print_adjacency_list(graph)
        print_summary(graph)


if __name__ == "__main__":
    main()
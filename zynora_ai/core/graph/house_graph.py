from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from zynora_ai.core.graph.wall_room_relationships import (
    WallRoomRelationships,
)
from zynora_ai.core.models.room import Room
from zynora_ai.core.models.wall import Wall


@dataclass(slots=True)
class RoomNode:
    """
    A room represented as a node in the house graph.
    """

    room_id: str
    room_type: str

    connected_room_ids: list[str] = field(
        default_factory=list
    )

    connected_door_ids: list[str] = field(
        default_factory=list
    )

    connected_wall_ids: list[str] = field(
        default_factory=list
    )

    def add_room(
        self,
        room_id: str,
    ) -> None:
        if (
            room_id != self.room_id
            and room_id not in self.connected_room_ids
        ):
            self.connected_room_ids.append(room_id)

    def add_door(
        self,
        door_id: str,
    ) -> None:
        if door_id not in self.connected_door_ids:
            self.connected_door_ids.append(door_id)

    def add_wall(
        self,
        wall_id: str,
    ) -> None:
        if wall_id not in self.connected_wall_ids:
            self.connected_wall_ids.append(wall_id)


@dataclass(frozen=True, slots=True)
class DoorEdge:
    """
    A door represented as an edge between rooms.

    room_b_id is None when the door has only one matched room,
    such as an entrance door on an exterior wall.
    """

    door_id: str
    wall_id: str
    room_a_id: str
    room_b_id: Optional[str] = None
    is_exterior: bool = False

    def connects(
        self,
        first_room_id: str,
        second_room_id: str,
    ) -> bool:
        return {
            self.room_a_id,
            self.room_b_id,
        } == {
            first_room_id,
            second_room_id,
        }

    def other_room(
        self,
        room_id: str,
    ) -> Optional[str]:
        if room_id == self.room_a_id:
            return self.room_b_id

        if room_id == self.room_b_id:
            return self.room_a_id

        return None


@dataclass(slots=True)
class HouseGraph:
    """
    Spatial graph of rooms connected through doors.
    """

    room_nodes: dict[str, RoomNode] = field(
        default_factory=dict
    )

    door_edges: dict[str, DoorEdge] = field(
        default_factory=dict
    )

    room_lookup: dict[str, Room] = field(
        default_factory=dict
    )

    wall_lookup: dict[str, Wall] = field(
        default_factory=dict
    )

    def get_room_node(
        self,
        room_id: str,
    ) -> Optional[RoomNode]:
        return self.room_nodes.get(room_id)

    def get_door_edge(
        self,
        door_id: str,
    ) -> Optional[DoorEdge]:
        return self.door_edges.get(door_id)

    def neighbors(
        self,
        room_id: str,
    ) -> list[str]:
        node = self.get_room_node(room_id)

        if node is None:
            return []

        return list(node.connected_room_ids)

    def doors_for_room(
        self,
        room_id: str,
    ) -> list[DoorEdge]:
        node = self.get_room_node(room_id)

        if node is None:
            return []

        return [
            self.door_edges[door_id]
            for door_id in node.connected_door_ids
            if door_id in self.door_edges
        ]

    def walls_for_room(
        self,
        room_id: str,
    ) -> list[Wall]:
        node = self.get_room_node(room_id)

        if node is None:
            return []

        return [
            self.wall_lookup[wall_id]
            for wall_id in node.connected_wall_ids
            if wall_id in self.wall_lookup
        ]

    def room_name(
        self,
        room_id: str,
    ) -> str:
        node = self.get_room_node(room_id)

        if node is None:
            return "UNKNOWN"

        return node.room_type

    def exterior_doors(self) -> list[DoorEdge]:
        return [
            edge
            for edge in self.door_edges.values()
            if edge.is_exterior
        ]

    @property
    def room_count(self) -> int:
        return len(self.room_nodes)

    @property
    def door_count(self) -> int:
        return len(self.door_edges)


class HouseGraphBuilder:
    """
    Build a door-based house graph using wall-room relationships.
    """

    def build(
        self,
        rooms: list[Room],
        walls: list[Wall],
        relationships: WallRoomRelationships,
    ) -> HouseGraph:
        graph = HouseGraph()

        self._create_room_nodes(
            graph=graph,
            rooms=rooms,
        )

        self._register_walls(
            graph=graph,
            walls=walls,
            relationships=relationships,
        )

        self._create_door_edges(
            graph=graph,
            walls=walls,
            relationships=relationships,
        )

        return graph

    def _create_room_nodes(
        self,
        graph: HouseGraph,
        rooms: list[Room],
    ) -> None:
        for room in rooms:
            room_id = str(room.id)
            room_type = self._room_type_as_string(room)

            graph.room_lookup[room_id] = room

            graph.room_nodes[room_id] = RoomNode(
                room_id=room_id,
                room_type=room_type,
            )

    def _register_walls(
        self,
        graph: HouseGraph,
        walls: list[Wall],
        relationships: WallRoomRelationships,
    ) -> None:
        for wall in walls:
            wall_id = str(wall.id)
            graph.wall_lookup[wall_id] = wall

            room_ids = relationships.rooms_for_wall(
                wall_id
            )

            for room_id in room_ids:
                normalized_room_id = str(room_id)

                node = graph.room_nodes.get(
                    normalized_room_id
                )

                if node is not None:
                    node.add_wall(wall_id)

    def _create_door_edges(
        self,
        graph: HouseGraph,
        walls: list[Wall],
        relationships: WallRoomRelationships,
    ) -> None:
        generated_door_number = 1

        for wall in walls:
            wall_id = str(wall.id)

            room_ids = [
                str(room_id)
                for room_id in relationships.rooms_for_wall(
                    wall_id
                )
                if str(room_id) in graph.room_nodes
            ]

            # Remove duplicate room IDs while preserving order.
            room_ids = list(dict.fromkeys(room_ids))

            doors = getattr(
                wall,
                "doors",
                [],
            ) or []

            for door in doors:
                door_id = self._extract_door_id(
                    door=door,
                    generated_number=generated_door_number,
                )

                generated_door_number += 1

                edge = self._build_door_edge(
                    door_id=door_id,
                    wall_id=wall_id,
                    room_ids=room_ids,
                    wall=wall,
                )

                if edge is None:
                    continue

                unique_door_id = self._make_unique_door_id(
                    graph=graph,
                    door_id=edge.door_id,
                )

                if unique_door_id != edge.door_id:
                    edge = DoorEdge(
                        door_id=unique_door_id,
                        wall_id=edge.wall_id,
                        room_a_id=edge.room_a_id,
                        room_b_id=edge.room_b_id,
                        is_exterior=edge.is_exterior,
                    )

                graph.door_edges[edge.door_id] = edge

                self._connect_edge_to_rooms(
                    graph=graph,
                    edge=edge,
                )

    def _build_door_edge(
        self,
        door_id: str,
        wall_id: str,
        room_ids: list[str],
        wall: Wall,
    ) -> Optional[DoorEdge]:
        if not room_ids:
            # The wall has a door but no matched room.
            return None

        if len(room_ids) == 1:
            return DoorEdge(
                door_id=door_id,
                wall_id=wall_id,
                room_a_id=room_ids[0],
                room_b_id=None,
                is_exterior=True,
            )

        first_room_id = room_ids[0]
        second_room_id = room_ids[1]

        return DoorEdge(
            door_id=door_id,
            wall_id=wall_id,
            room_a_id=first_room_id,
            room_b_id=second_room_id,
            is_exterior=self._is_exterior_connection(
                graph_room_ids=room_ids,
                wall=wall,
            ),
        )

    def _connect_edge_to_rooms(
        self,
        graph: HouseGraph,
        edge: DoorEdge,
    ) -> None:
        first_node = graph.room_nodes.get(
            edge.room_a_id
        )

        if first_node is not None:
            first_node.add_door(edge.door_id)
            first_node.add_wall(edge.wall_id)

        if edge.room_b_id is None:
            return

        second_node = graph.room_nodes.get(
            edge.room_b_id
        )

        if second_node is not None:
            second_node.add_door(edge.door_id)
            second_node.add_wall(edge.wall_id)

        if (
            first_node is not None
            and second_node is not None
        ):
            first_node.add_room(edge.room_b_id)
            second_node.add_room(edge.room_a_id)

    @staticmethod
    def _extract_door_id(
        door: object,
        generated_number: int,
    ) -> str:
        possible_id = getattr(
            door,
            "id",
            None,
        )

        if possible_id is not None:
            return str(possible_id)

        return f"door-{generated_number}"

    @staticmethod
    def _make_unique_door_id(
        graph: HouseGraph,
        door_id: str,
    ) -> str:
        if door_id not in graph.door_edges:
            return door_id

        suffix = 2

        while (
            f"{door_id}-{suffix}"
            in graph.door_edges
        ):
            suffix += 1

        return f"{door_id}-{suffix}"

    @staticmethod
    def _room_type_as_string(
        room: Room,
    ) -> str:
        room_type = getattr(
            room,
            "room_type",
            "UNDEFINED",
        )

        enum_value = getattr(
            room_type,
            "value",
            None,
        )

        if enum_value is not None:
            return str(enum_value)

        return str(room_type)

    @staticmethod
    def _is_exterior_connection(
        graph_room_ids: list[str],
        wall: Wall,
    ) -> bool:
        wall_type = str(
            getattr(
                wall,
                "wall_type",
                "",
            )
        ).lower()

        if "external" in wall_type:
            return True

        # A connection involving an Outdoor room is also
        # considered an exterior connection.
        return False
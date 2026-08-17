from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from typing import Optional

from zynora_ai.core.graph.house_graph import (
    DoorEdge,
    HouseGraph,
)


@dataclass(frozen=True, slots=True)
class NavigationStep:
    """
    One movement step from one room to another through a door.
    """

    from_room_id: str
    to_room_id: str
    door_id: str
    wall_id: str


@dataclass(frozen=True, slots=True)
class NavigationPath:
    """
    Complete path between two rooms.
    """

    start_room_id: str
    end_room_id: str
    room_ids: list[str]
    door_ids: list[str]
    steps: list[NavigationStep]

    @property
    def room_count(self) -> int:
        return len(self.room_ids)

    @property
    def door_count(self) -> int:
        return len(self.door_ids)

    @property
    def hop_count(self) -> int:
        return len(self.steps)


class HouseNavigator:
    """
    Navigation algorithms for a HouseGraph.
    """

    def __init__(
        self,
        graph: HouseGraph,
    ) -> None:
        self.graph = graph

    def breadth_first_search(
        self,
        start_room_id: str,
    ) -> list[str]:
        """
        Return rooms in BFS visiting order.
        """

        self._validate_room(start_room_id)

        visited: set[str] = {start_room_id}
        queue: deque[str] = deque([start_room_id])
        visit_order: list[str] = []

        while queue:
            current_room_id = queue.popleft()
            visit_order.append(current_room_id)

            for neighbor_id in self.graph.neighbors(
                current_room_id
            ):
                if neighbor_id in visited:
                    continue

                visited.add(neighbor_id)
                queue.append(neighbor_id)

        return visit_order

    def depth_first_search(
        self,
        start_room_id: str,
    ) -> list[str]:
        """
        Return rooms in DFS visiting order.
        """

        self._validate_room(start_room_id)

        visited: set[str] = set()
        stack: list[str] = [start_room_id]
        visit_order: list[str] = []

        while stack:
            current_room_id = stack.pop()

            if current_room_id in visited:
                continue

            visited.add(current_room_id)
            visit_order.append(current_room_id)

            neighbors = self.graph.neighbors(
                current_room_id
            )

            for neighbor_id in reversed(neighbors):
                if neighbor_id not in visited:
                    stack.append(neighbor_id)

        return visit_order

    def reachable_rooms(
        self,
        start_room_id: str,
        include_start: bool = False,
    ) -> list[str]:
        """
        Return every room reachable from the start room.
        """

        room_ids = self.breadth_first_search(
            start_room_id
        )

        if include_start:
            return room_ids

        return [
            room_id
            for room_id in room_ids
            if room_id != start_room_id
        ]

    def is_reachable(
        self,
        start_room_id: str,
        end_room_id: str,
    ) -> bool:
        """
        Check whether one room can be reached from another.
        """

        self._validate_room(start_room_id)
        self._validate_room(end_room_id)

        if start_room_id == end_room_id:
            return True

        return end_room_id in self.reachable_rooms(
            start_room_id
        )

    def shortest_path(
        self,
        start_room_id: str,
        end_room_id: str,
    ) -> Optional[NavigationPath]:
        """
        Find the shortest door-based path using BFS.
        """

        self._validate_room(start_room_id)
        self._validate_room(end_room_id)

        if start_room_id == end_room_id:
            return NavigationPath(
                start_room_id=start_room_id,
                end_room_id=end_room_id,
                room_ids=[start_room_id],
                door_ids=[],
                steps=[],
            )

        queue: deque[str] = deque([start_room_id])

        visited: set[str] = {
            start_room_id
        }

        previous_room: dict[
            str,
            str
        ] = {}

        previous_door: dict[
            str,
            str
        ] = {}

        while queue:
            current_room_id = queue.popleft()

            for edge in self.graph.doors_for_room(
                current_room_id
            ):
                neighbor_id = edge.other_room(
                    current_room_id
                )

                if neighbor_id is None:
                    continue

                if neighbor_id in visited:
                    continue

                visited.add(neighbor_id)

                previous_room[
                    neighbor_id
                ] = current_room_id

                previous_door[
                    neighbor_id
                ] = edge.door_id

                if neighbor_id == end_room_id:
                    return self._reconstruct_path(
                        start_room_id=start_room_id,
                        end_room_id=end_room_id,
                        previous_room=previous_room,
                        previous_door=previous_door,
                    )

                queue.append(neighbor_id)

        return None

    def shortest_path_from_outdoor(
        self,
        end_room_id: str,
    ) -> Optional[NavigationPath]:
        """
        Find the shortest path from an Outdoor room
        to the requested destination.
        """

        outdoor_room_ids = self.find_outdoor_rooms()

        best_path: Optional[
            NavigationPath
        ] = None

        for outdoor_room_id in outdoor_room_ids:
            path = self.shortest_path(
                outdoor_room_id,
                end_room_id,
            )

            if path is None:
                continue

            if (
                best_path is None
                or path.hop_count < best_path.hop_count
            ):
                best_path = path

        return best_path

    def find_outdoor_rooms(
        self,
    ) -> list[str]:
        """
        Return room IDs classified as Outdoor.
        """

        return [
            room_id
            for room_id, node
            in self.graph.room_nodes.items()
            if node.room_type.strip().lower()
            == "outdoor"
        ]

    def entrance_edges(
        self,
    ) -> list[DoorEdge]:
        """
        Return doors that connect to Outdoor or outside.
        """

        entrance_edges: list[
            DoorEdge
        ] = []

        for edge in self.graph.door_edges.values():
            if edge.room_b_id is None:
                entrance_edges.append(edge)
                continue

            first_is_outdoor = (
                self._is_outdoor_room(
                    edge.room_a_id
                )
            )

            second_is_outdoor = (
                self._is_outdoor_room(
                    edge.room_b_id
                )
            )

            if (
                first_is_outdoor
                or second_is_outdoor
            ):
                entrance_edges.append(edge)

        return entrance_edges

    def connected_components(
        self,
    ) -> list[list[str]]:
        """
        Return all connected room groups.
        """

        remaining_rooms = set(
            self.graph.room_nodes.keys()
        )

        components: list[
            list[str]
        ] = []

        while remaining_rooms:
            start_room_id = next(
                iter(remaining_rooms)
            )

            component = (
                self.breadth_first_search(
                    start_room_id
                )
            )

            components.append(component)

            remaining_rooms.difference_update(
                component
            )

        return components

    def _reconstruct_path(
        self,
        start_room_id: str,
        end_room_id: str,
        previous_room: dict[str, str],
        previous_door: dict[str, str],
    ) -> NavigationPath:
        room_ids: list[str] = [
            end_room_id
        ]

        door_ids: list[str] = []

        current_room_id = end_room_id

        while current_room_id != start_room_id:
            door_id = previous_door[
                current_room_id
            ]

            parent_room_id = previous_room[
                current_room_id
            ]

            door_ids.append(door_id)
            room_ids.append(parent_room_id)

            current_room_id = parent_room_id

        room_ids.reverse()
        door_ids.reverse()

        steps: list[
            NavigationStep
        ] = []

        for index, door_id in enumerate(
            door_ids
        ):
            edge = self.graph.get_door_edge(
                door_id
            )

            if edge is None:
                continue

            steps.append(
                NavigationStep(
                    from_room_id=room_ids[index],
                    to_room_id=room_ids[index + 1],
                    door_id=door_id,
                    wall_id=edge.wall_id,
                )
            )

        return NavigationPath(
            start_room_id=start_room_id,
            end_room_id=end_room_id,
            room_ids=room_ids,
            door_ids=door_ids,
            steps=steps,
        )

    def _is_outdoor_room(
        self,
        room_id: str,
    ) -> bool:
        node = self.graph.get_room_node(
            room_id
        )

        if node is None:
            return False

        return (
            node.room_type
            .strip()
            .lower()
            == "outdoor"
        )

    def _validate_room(
        self,
        room_id: str,
    ) -> None:
        if room_id not in self.graph.room_nodes:
            raise ValueError(
                f"Room ID was not found in graph: "
                f"{room_id}"
            )
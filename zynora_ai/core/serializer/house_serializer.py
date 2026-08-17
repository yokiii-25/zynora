from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path

from zynora_ai.core.models.house import House


class HouseSerializer:
    @staticmethod
    def to_dict(house: House) -> dict:
        return asdict(house)

    @staticmethod
    def save_json(
        house: House,
        output_path: str | Path,
    ) -> None:
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        output_path.write_text(
            json.dumps(
                HouseSerializer.to_dict(house),
                indent=2,
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )
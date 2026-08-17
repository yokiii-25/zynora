from __future__ import annotations

import json
from pathlib import Path
import sys


BACKEND_DIRECTORY = Path(__file__).resolve().parents[1]

if str(BACKEND_DIRECTORY) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIRECTORY))

from services.local_render_service import (  # noqa: E402
    get_local_renderer_status,
)


def main() -> int:
    status = get_local_renderer_status()
    print(json.dumps(status, indent=2))

    if not status["installed"]:
        print(
            "Local renderer packages are missing: "
            + ", ".join(status["missing_packages"]),
            file=sys.stderr,
        )
        return 1

    if not status["cuda_available"]:
        print(
            "PyTorch cannot access the NVIDIA GPU.",
            file=sys.stderr,
        )
        return 2

    print(
        "Local renderer environment is ready on "
        f"{status['device_name']}."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

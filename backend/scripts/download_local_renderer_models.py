from __future__ import annotations

import json
from pathlib import Path
import sys


BACKEND_DIRECTORY = Path(__file__).resolve().parents[1]

if str(BACKEND_DIRECTORY) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIRECTORY))

from services.local_render_service import (  # noqa: E402
    MODEL_CACHE_DIRECTORY,
    preload_local_renderer,
)


def main() -> int:
    print(
        "Downloading and validating the ZYNORA local models. "
        "An interrupted download can be resumed by rerunning this script."
    )
    print(f"Model cache: {MODEL_CACHE_DIRECTORY}")

    try:
        status = preload_local_renderer()
    except Exception as error:
        print(
            f"Local model preparation failed: {error}",
            file=sys.stderr,
        )
        return 1

    print(json.dumps(status, indent=2))
    print("Local renderer models are downloaded and validated.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

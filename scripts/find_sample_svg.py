from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]

SEARCH_DIRS = [
    PROJECT_ROOT / "datasets" / "raw",
    PROJECT_ROOT / "datasets" / "train",
    PROJECT_ROOT / "datasets" / "val",
    PROJECT_ROOT / "datasets" / "test",
]


def main() -> None:
    svg_files: list[Path] = []

    for directory in SEARCH_DIRS:
        if not directory.exists():
            continue

        svg_files.extend(directory.rglob("*.svg"))

    print("=" * 60)
    print("ZYNORA SVG FINDER")
    print("=" * 60)
    print(f"SVG files found: {len(svg_files)}")

    if not svg_files:
        print("No SVG files were found.")
        return

    print("\nFirst 20 SVG files:")

    for path in svg_files[:20]:
        print(path.relative_to(PROJECT_ROOT))

    selected = svg_files[0]

    output_file = PROJECT_ROOT / "outputs" / "selected_svg.txt"
    output_file.parent.mkdir(parents=True, exist_ok=True)
    output_file.write_text(str(selected), encoding="utf-8")

    print(f"\nSelected sample: {selected}")
    print(f"Saved path to: {output_file}")


if __name__ == "__main__":
    main()
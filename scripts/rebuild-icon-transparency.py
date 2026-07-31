from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image


KEY = (255, 0, 255, 255)


def alpha_components(image: Image.Image) -> list[set[tuple[int, int]]]:
    alpha = image.getchannel("A")
    width, height = image.size
    visible = {(x, y) for y in range(height) for x in range(width) if alpha.getpixel((x, y)) > 8}
    components: list[set[tuple[int, int]]] = []

    while visible:
        start = visible.pop()
        component = {start}
        queue = deque([start])
        while queue:
            x, y = queue.popleft()
            for next_y in range(max(0, y - 1), min(height, y + 2)):
                for next_x in range(max(0, x - 1), min(width, x + 2)):
                    point = (next_x, next_y)
                    if point in visible:
                        visible.remove(point)
                        component.add(point)
                        queue.append(point)
        components.append(component)

    return components


def remove_atlas_fragments(image: Image.Image) -> Image.Image:
    result = image.convert("RGBA")
    components = alpha_components(result)
    if not components:
        raise ValueError("Icon contains no visible subject")

    width, height = result.size
    largest = max(components, key=len)
    largest_area = len(largest)
    main_left = min(x for x, _ in largest)
    main_top = min(y for _, y in largest)
    main_right = max(x for x, _ in largest)
    main_bottom = max(y for _, y in largest)
    pixels = result.load()
    for component in components:
        if component is largest:
            continue
        left = min(x for x, _ in component)
        top = min(y for _, y in component)
        right = max(x for x, _ in component)
        bottom = max(y for _, y in component)
        touches_edge = any(
            x <= 1 or y <= 1 or x >= width - 2 or y >= height - 2 for x, y in component
        )
        separated_from_subject = (
            right < main_left - 4
            or left > main_right + 4
            or bottom < main_top - 4
            or top > main_bottom + 4
        )
        if len(component) < largest_area * 0.25 and (touches_edge or separated_from_subject):
            for x, y in component:
                pixels[x, y] = (0, 0, 0, 0)
    return result


def normalize(image: Image.Image, size: int = 128, padding: int = 8) -> Image.Image:
    bounds = image.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError("Icon contains no visible subject after cleanup")
    subject = image.crop(bounds)
    usable = size - padding * 2
    scale = min(usable / subject.width, usable / subject.height)
    subject = subject.resize(
        (max(1, round(subject.width * scale)), max(1, round(subject.height * scale))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (size, size))
    canvas.alpha_composite(subject, ((size - subject.width) // 2, (size - subject.height) // 2))
    return canvas


def composite_on_key(image: Image.Image) -> Image.Image:
    source = Image.new("RGBA", image.size, KEY)
    source.alpha_composite(image)
    return source.convert("RGB")


def cut_key(source: Image.Image, matte: Image.Image) -> Image.Image:
    keyed = source.convert("RGB")
    alpha = matte.getchannel("A")
    result = Image.new("RGBA", source.size)
    keyed_pixels = keyed.load()
    alpha_pixels = alpha.load()
    result_pixels = result.load()
    width, height = source.size
    for y in range(height):
        for x in range(width):
            opacity = alpha_pixels[x, y]
            if opacity == 0:
                continue
            fraction = opacity / 255
            red, green, blue = keyed_pixels[x, y]
            # Reverse the known magenta composite to preserve the original antialiased edge.
            subject_red = round((red - 255 * (1 - fraction)) / fraction)
            subject_green = round(green / fraction)
            subject_blue = round((blue - 255 * (1 - fraction)) / fraction)
            result_pixels[x, y] = (
                max(0, min(255, subject_red)),
                max(0, min(255, subject_green)),
                max(0, min(255, subject_blue)),
                opacity,
            )
    return result


def rebuild(source_path: Path, keyed_path: Path, destination_path: Path) -> None:
    with Image.open(source_path) as source:
        cleaned = normalize(remove_atlas_fragments(source))
    keyed_path.parent.mkdir(parents=True, exist_ok=True)
    destination_path.parent.mkdir(parents=True, exist_ok=True)
    keyed = composite_on_key(cleaned)
    keyed.save(keyed_path, optimize=True)
    cut_key(keyed, cleaned).save(destination_path, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Rebuild atlas-derived icons as individual chroma-key cutouts."
    )
    parser.add_argument("candidate_root", type=Path)
    parser.add_argument("individual_source_root", type=Path)
    args = parser.parse_args()

    rebuilt = 0
    for group in ("resources", "machines"):
        candidate_directory = args.candidate_root / group
        for source_path in sorted(candidate_directory.glob("*.png")):
            rebuild(
                source_path,
                args.individual_source_root / group / source_path.name,
                source_path,
            )
            rebuilt += 1
    print(f"Rebuilt {rebuilt} individual icon cutouts.")


if __name__ == "__main__":
    main()

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image


def is_background(pixel: tuple[int, int, int, int]) -> bool:
    red, green, blue, _ = pixel
    return min(red, green, blue) >= 225 and max(red, green, blue) - min(red, green, blue) <= 10


def remove_edge_background(image: Image.Image) -> Image.Image:
    result = image.convert("RGBA")
    width, height = result.size
    pixels = result.load()
    queue: deque[tuple[int, int]] = deque()
    visited: set[tuple[int, int]] = set()

    for x in range(width):
        queue.extend(((x, 0), (x, height - 1)))
    for y in range(height):
        queue.extend(((0, y), (width - 1, y)))

    while queue:
        x, y = queue.popleft()
        if x < 0 or y < 0 or x >= width or y >= height or (x, y) in visited:
            continue
        visited.add((x, y))
        if not is_background(pixels[x, y]):
            continue
        pixels[x, y] = (255, 255, 255, 0)
        queue.extend(((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)))

    return result


def normalize_icon(image: Image.Image, size: int, padding: int) -> Image.Image:
    bounds = image.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError("Atlas cell contains no visible subject")
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


def main() -> None:
    parser = argparse.ArgumentParser(description="Split a generated icon atlas into transparent game-icon candidates.")
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--columns", type=int, required=True)
    parser.add_argument("--rows", type=int, required=True)
    parser.add_argument("--ids", required=True, help="Comma-separated output ids in row-major order")
    parser.add_argument("--size", type=int, default=128)
    parser.add_argument("--padding", type=int, default=8)
    parser.add_argument("--cell-inset", type=int, default=8)
    args = parser.parse_args()

    ids = [value.strip() for value in args.ids.split(",") if value.strip()]
    if len(ids) != args.columns * args.rows:
        raise ValueError(f"Expected {args.columns * args.rows} ids, received {len(ids)}")

    with Image.open(args.source) as source:
        atlas = source.convert("RGBA")
        cell_width = atlas.width / args.columns
        cell_height = atlas.height / args.rows
        args.destination.mkdir(parents=True, exist_ok=True)
        for index, icon_id in enumerate(ids):
            column = index % args.columns
            row = index // args.columns
            left = round(column * cell_width) + args.cell_inset
            top = round(row * cell_height) + args.cell_inset
            right = round((column + 1) * cell_width) - args.cell_inset
            bottom = round((row + 1) * cell_height) - args.cell_inset
            cell = atlas.crop((left, top, right, bottom))
            icon = normalize_icon(remove_edge_background(cell), args.size, args.padding)
            icon.save(args.destination / f"{icon_id}.png", optimize=True)


if __name__ == "__main__":
    main()

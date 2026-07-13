from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def crop_icon(source: Path, destination: Path, size: int, padding: int) -> None:
    with Image.open(source).convert("RGBA") as image:
        bounds = image.getchannel("A").getbbox()
        if bounds is None:
            raise ValueError(f"{source} contains no visible pixels")

        subject = image.crop(bounds)
        usable = size - padding * 2
        scale = min(usable / subject.width, usable / subject.height)
        resized = subject.resize(
            (max(1, round(subject.width * scale)), max(1, round(subject.height * scale))),
            Image.Resampling.LANCZOS,
        )
        canvas = Image.new("RGBA", (size, size))
        canvas.alpha_composite(resized, ((size - resized.width) // 2, (size - resized.height) // 2))

        if any(canvas.getpixel(point)[3] != 0 for point in ((0, 0), (size - 1, 0), (0, size - 1), (size - 1, size - 1))):
            raise ValueError(f"{source} touches a canvas corner")

        destination.parent.mkdir(parents=True, exist_ok=True)
        canvas.save(destination, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Crop a generated alpha image into a padded square game icon.")
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--size", type=int, default=128)
    parser.add_argument("--padding", type=int, default=8)
    args = parser.parse_args()
    crop_icon(args.source, args.destination, args.size, args.padding)


if __name__ == "__main__":
    main()

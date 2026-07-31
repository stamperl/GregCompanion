from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageOps


MATERIALS = {
    "iron": ("#161b20", "#e2e6e8"),
    "copper": ("#30130b", "#f2a162"),
    "tin": ("#252c31", "#ecf4f7"),
    "bronze": ("#351708", "#d88a3c"),
    "nickel": ("#20282a", "#d9e0d8"),
    "cupronickel": ("#291b18", "#d49a7a"),
    "invar": ("#222724", "#b8c1b4"),
    "aluminium": ("#26313a", "#f3f8fb"),
    "gold": ("#3b2400", "#ffd863"),
    "steel": ("#0c131a", "#8998a3"),
    "redAlloy": ("#300508", "#da4c43"),
    "lead": ("#17182c", "#858ba8"),
    "batteryAlloy": ("#241c25", "#b18a9b"),
}

FORMS = {
    "ingot": "{prefix}Ingot",
    "dust": "{prefix}Dust",
    "plate": "{prefix}Plate",
    "rod": "{prefix}Rod",
    "bolt": "{prefix}Bolt",
    "ring": "{prefix}Ring",
    "screw": "{prefix}Screw",
    "gear": "{prefix}Gear",
    "wire": "{prefix}Wire",
    "fineWire": "fine{title}Wire",
    "foil": "{prefix}Foil",
}

OVERRIDES = {
    ("bronze", "dust"): "bronzeBlend",
}


def tint(source: Image.Image, shadow: str, highlight: str) -> Image.Image:
    alpha = source.getchannel("A")
    grayscale = ImageOps.grayscale(source)
    colored = ImageOps.colorize(grayscale, black=shadow, white=highlight).convert("RGBA")
    colored.putalpha(alpha)
    return colored


def resource_id(material: str, form: str) -> str:
    override = OVERRIDES.get((material, form))
    if override:
        return override
    return FORMS[form].format(prefix=material, title=material[0].upper() + material[1:])


def main() -> None:
    parser = argparse.ArgumentParser(description="Tint neutral material-form icons into complete material families.")
    parser.add_argument("base_directory", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument(
        "--forms",
        nargs="+",
        choices=tuple(FORMS),
        default=tuple(FORMS),
        help="Only regenerate the selected material forms.",
    )
    args = parser.parse_args()
    args.destination.mkdir(parents=True, exist_ok=True)

    for material, (shadow, highlight) in MATERIALS.items():
        for form in args.forms:
            source_path = args.base_directory / f"{form}.png"
            with Image.open(source_path).convert("RGBA") as source:
                output = tint(source, shadow, highlight)
                output.save(args.destination / f"{resource_id(material, form)}.png", optimize=True)


if __name__ == "__main__":
    main()

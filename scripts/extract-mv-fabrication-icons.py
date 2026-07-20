from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
REVIEW = ROOT / "public" / "icon-reviews" / "mv-fabrication-v1"
RESOURCE_OUT = ROOT / "public" / "game-icons" / "resources"
MACHINE_OUT = ROOT / "public" / "game-icons" / "machines"

SHEETS = [
    (
        REVIEW / "resources-a-alpha.png",
        4,
        4,
        RESOURCE_OUT,
        [
            "goldOre",
            "resonantQuartz",
            "voidQuartz",
            "crushedGoldOre",
            "goldDust",
            "resonantQuartzDust",
            "voidQuartzDust",
            "phaseDust",
            "goldIngot",
            "goldPlate",
            "chargedResonantQuartz",
            "phaseCrystal",
            "silicon",
            "hardenedDieBlank",
            "signalImprintDie",
            "computationImprintDie",
        ],
    ),
    (
        REVIEW / "resources-b-alpha.png",
        5,
        2,
        RESOURCE_OUT,
        [
            "structuralImprintDie",
            "siliconImprintDie",
            "printedSignalCircuit",
            "printedComputationCircuit",
            "printedStructuralCircuit",
            "printedSilicon",
            "signalProcessor",
            "computationProcessor",
            "structuralProcessor",
            "blankRecipeCard",
        ],
    ),
    (
        REVIEW / "machines-alpha.png",
        5,
        2,
        MACHINE_OUT,
        [
            "crystalEnergizer",
            "circuitImprinter",
            "recipeEncoder",
            "jobInterface",
            "autoFabricator",
            "fluidStorageLink",
            "planningController",
            "memoryModule",
            "dispatchModule",
        ],
    ),
]


def extract_icon(cell: Image.Image) -> Image.Image:
    alpha = cell.getchannel("A")
    bounds = alpha.getbbox()
    if bounds is None:
        raise ValueError("Generated sheet cell has no visible subject")
    subject = cell.crop(bounds)
    max_size = 112
    subject.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
    icon = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
    icon.alpha_composite(subject, ((128 - subject.width) // 2, (128 - subject.height) // 2))
    return icon


for sheet_path, columns, rows, destination, ids in SHEETS:
    sheet = Image.open(sheet_path).convert("RGBA")
    cell_width = sheet.width / columns
    cell_height = sheet.height / rows
    destination.mkdir(parents=True, exist_ok=True)
    for index, icon_id in enumerate(ids):
        column = index % columns
        row = index // columns
        box = (
            round(column * cell_width),
            round(row * cell_height),
            round((column + 1) * cell_width),
            round((row + 1) * cell_height),
        )
        extract_icon(sheet.crop(box)).save(destination / f"{icon_id}.png", optimize=True)

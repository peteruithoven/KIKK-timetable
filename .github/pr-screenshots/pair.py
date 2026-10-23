# Temporary: puts each light and dark screenshot side by side, as JPEG. Removed before merging.
import sys
from pathlib import Path

from PIL import Image

src, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
GAP = 24

for light in sorted(src.glob("*-light.png")):
    name = light.name.removesuffix("-light.png")
    dark = src / f"{name}-dark.png"
    images = [Image.open(light).convert("RGB")]
    if dark.exists():
        images.append(Image.open(dark).convert("RGB"))
    width = sum(image.width for image in images) + GAP * (len(images) - 1)
    height = max(image.height for image in images)
    canvas = Image.new("RGB", (width, height), (128, 128, 128))
    x = 0
    for image in images:
        canvas.paste(image, (x, 0))
        x += image.width + GAP
    canvas.save(out / f"{name}.jpg", quality=85)
    print(out / f"{name}.jpg")

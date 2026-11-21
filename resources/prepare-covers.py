from pathlib import Path
from PIL import Image, ImageOps

resources = Path(__file__).resolve().parent
output = resources.parent / "client/public/posters"
output.mkdir(parents=True, exist_ok=True)
covers = {
    "reves-marseille": "reves-marseille-full.jpg",
    "reves-rennes": "reves-rennes-full.jpg",
    "machine": "machine-media.jpg",
    "respighi": "respighi.jpg",
    "explity": "explity.jpg",
    "skrillex": "skrillex-alt.jpg",
    "berlioz": "berlioz.jpg",
    "polar": "polar.png",
    "shadow": "shadow-full.webp",
    "smokey": "dj-smokey.png",
    "sonar": "sonar.png",
    "cello": "bach-weilerstein.jpg",
    "soenda": "soenda-indoor.png",
    "reich": "reich-currie.jpg",
    "venjent": "venjent-live.jpg",
    "magnificat": "magnificat.png",
    "igloofest": "igloofest-programme.jpg",
    "witcher": "witcher-orchestra.jpg",
    "nier": "nier-yorha.jpg",
    "garden": "garden-wall.jpg",
    "blib": "worthikids-bigtop.jpg",
    "thrones": "game-of-thrones.jpg",
    "shoegazer": "shoegazer-singapore.jpg",
    "crystallize": "shoegazer-crystallize.png",
}

for key, source in covers.items():
    with Image.open(resources / "originals" / source) as original:
        image = ImageOps.exif_transpose(original).convert("RGB")
        image.thumbnail((1920, 1920), Image.Resampling.LANCZOS)
        image.save(output / (key + "-full.avif"), quality=85, subsampling="4:4:4", speed=7,
                   icc_profile=original.info.get("icc_profile", b""))

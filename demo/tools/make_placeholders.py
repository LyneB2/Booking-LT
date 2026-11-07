"""Make labelled placeholder photos for the demo dataset.

Usage (from the repository root):  python3 demo/tools/make_placeholders.py
Reads demo/dataset/media.json and writes one WebP per entry whose source is
"crop-placeholder" (a crop of the manifest's placeholderSource photo, with a small
DEMO tag) or "placeholder" (a drawn scene). If the source photo is missing, crop
entries fall back to drawn scenes. Output is deterministic. Requires Pillow.
Entries marked "ai-generated" or "licensed" are real replacements and are skipped.
"""
import json, hashlib, pathlib, sys
from PIL import Image, ImageDraw, ImageEnhance, ImageFont, ImageOps

ROOT = pathlib.Path(__file__).resolve().parents[2]
W, H = 1600, 1067
MAX_SIDE = 1600
GRADES = {  # per-channel multipliers, brightness, saturation
    "none": ((1, 1, 1), 1.0, 1.0),
    "warm": ((1.06, 1.0, 0.92), 1.0, 1.06),
    "cool": ((0.94, 1.0, 1.06), 1.0, 0.96),
    "dusk": ((1.12, 0.88, 0.78), 0.78, 0.9),
}
PALETTES = {  # sky top, sky bottom, sea, sand/ground
    "beach": ((126, 194, 212), (214, 236, 238), (31, 132, 146), (226, 205, 160)),
    "pool": ((150, 205, 214), (225, 240, 236), (64, 190, 205), (120, 170, 110)),
    "garden": ((170, 215, 205), (230, 242, 232), (90, 150, 105), (70, 120, 80)),
    "sunset": ((52, 72, 112), (238, 150, 104), (60, 92, 120), (40, 52, 60)),
    "building": ((160, 205, 225), (235, 243, 246), (236, 236, 230), (110, 160, 110)),
    "night": ((20, 28, 44), (52, 60, 84), (40, 70, 60), (25, 35, 30)),
}

def kind(subject):
    s = subject.lower()
    for k, words in [("sunset", ["sunset", "sunrise", "golden"]), ("night", ["night"]),
                     ("pool", ["pool"]), ("garden", ["garden", "path", "courtyard", "co-working", "tree"]),
                     ("beach", ["beach", "aerial", "bay", "kite", "view", "lounger"])]:
        if any(w in s for w in words):
            return k
    return "building"

def font(size, weight="Medium"):
    for p in [f"/usr/share/fonts/opentype/inter/Inter-{weight}.otf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]:
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            pass
    return ImageFont.load_default()

def demo_tag(img):
    """Small, unobtrusive DEMO label in the bottom-left corner."""
    d = ImageDraw.Draw(img, "RGBA")
    size = max(11, round(img.width * 0.026))
    f = font(size, "SemiBold")
    pad, margin = round(size * 0.45), round(size * 0.7)
    l, t, r, b = d.textbbox((0, 0), "DEMO", font=f)
    box = [margin, img.height - margin - (b - t) - 2 * pad, margin + (r - l) + 2 * pad, img.height - margin]
    d.rounded_rectangle(box, radius=pad, fill=(0, 0, 0, 150))
    d.text((box[0] + pad - l, box[1] + pad - t), "DEMO", font=f, fill=(255, 255, 255, 235))

def crop(entry, src, out):
    c = entry["crop"]
    box = tuple(round(v) for v in (src.width * c["x"] / 100, src.height * c["y"] / 100,
                                   src.width * (c["x"] + c["w"]) / 100, src.height * (c["y"] + c["h"]) / 100))
    img = src.crop(box)
    if entry.get("flip"):
        img = ImageOps.mirror(img)
    mult, bright, sat = GRADES[entry.get("grade", "none")]
    if mult != (1, 1, 1):
        img = Image.merge("RGB", [ch.point(lambda v, k=k: min(255, round(v * k))) for ch, k in zip(img.split(), mult)])
    img = ImageEnhance.Brightness(img).enhance(bright)
    img = ImageEnhance.Color(img).enhance(sat)
    if max(img.size) > MAX_SIDE:  # never upscale; only shrink very large crops
        img.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
    demo_tag(img)
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, "WEBP", quality=82, method=6)  # Pillow writes no EXIF/GPS unless asked

def draw(entry, out):
    top, bottom, sea, ground = PALETTES[kind(entry["subject"])]
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)
    horizon, shore = int(H * 0.46), int(H * 0.68)
    for y in range(horizon):  # sky gradient
        t = y / horizon
        d.line([(0, y), (W, y)], fill=tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    d.rectangle([0, horizon, W, shore], fill=sea)
    d.rectangle([0, shore, W, H], fill=ground)
    seed = int(hashlib.sha1(entry["key"].encode()).hexdigest(), 16)
    for i in range(7):  # simple palm silhouettes, deterministic per photo
        x = (seed >> (i * 7)) % W
        h = 180 + (seed >> (i * 5)) % 160
        d.line([(x, shore + 40), (x + 30, shore + 40 - h)], fill=(40, 70, 50), width=10)
        for dx, dy in [(-90, 20), (90, 25), (-60, -30), (70, -25)]:
            d.line([(x + 30, shore + 40 - h), (x + 30 + dx, shore + 40 - h + dy)], fill=(40, 90, 55), width=8)
    # label band
    d.rectangle([0, H - 190, W, H], fill=(17, 24, 24))
    d.text((48, H - 165), "DEMO PHOTO · PLACEHOLDER", font=font(34, "SemiBold"), fill=(255, 214, 102))
    d.text((48, H - 112), entry["subject"], font=font(48, "Medium"), fill=(255, 255, 255))
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, "WEBP", quality=72, method=6)

def main():
    manifest = json.loads((ROOT / "demo/dataset/manifest.json").read_text(encoding="utf-8"))
    media = json.loads((ROOT / "demo/dataset/media.json").read_text(encoding="utf-8"))["media"]
    src_info = manifest.get("placeholderSource") or {}
    src_path = ROOT / src_info.get("path", "")
    src = Image.open(src_path).convert("RGB") if src_info and src_path.is_file() else None
    cropped = drawn = 0
    for m in media:
        if m["source"] == "crop-placeholder" and src is not None:
            crop(m, src, ROOT / m["file"]); cropped += 1
        elif m["source"] in ("crop-placeholder", "placeholder"):
            draw(m, ROOT / m["file"]); drawn += 1
    if drawn and any(m["source"] == "crop-placeholder" for m in media) and src is None:
        print(f"note: source photo not found at {src_info.get('path')}; drew scenes instead")
    print(f"wrote {cropped} cropped and {drawn} drawn placeholder images")

if __name__ == "__main__":
    sys.exit(main())

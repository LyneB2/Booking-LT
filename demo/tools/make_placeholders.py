"""Draw labelled placeholder photos for the demo dataset.

Usage (from the repository root):  python3 demo/tools/make_placeholders.py
Reads demo/dataset/media.json and writes one WebP per entry whose source is
"placeholder". Output is deterministic. Requires Pillow.
Replace a placeholder with an AI-generated image by saving it at the same path
and setting its "source" to "ai-generated" in media.json; this script then skips it.
"""
import json, hashlib, pathlib, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parents[2]
W, H = 1600, 1067
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
    media = json.loads((ROOT / "demo/dataset/media.json").read_text(encoding="utf-8"))["media"]
    made = 0
    for m in media:
        if m["source"] != "placeholder":
            continue
        draw(m, ROOT / m["file"])
        made += 1
    print(f"wrote {made} placeholder images")

if __name__ == "__main__":
    sys.exit(main())

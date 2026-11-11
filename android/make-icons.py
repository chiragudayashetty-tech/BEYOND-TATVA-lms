"""Makes every Android icon from android/store/logo-source.png (the logo on its dark background).
Run from the repo root: python3 android/make-icons.py"""
from PIL import Image, ImageDraw, ImageFilter

src = Image.open("android/store/logo-source.png").convert("RGB")
res = "android/app/src/main/res"
CX, CY, MARK = 630, 622, 530  # centre and width of the mark inside the source picture

def crop(mark_share, size):
    """A square cut around the mark, where the mark fills `mark_share` of the width."""
    half = MARK / mark_share / 2
    return src.crop((round(CX - half), round(CY - half), round(CX + half), round(CY + half))).resize((size, size), Image.LANCZOS)

for name, px in {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}.items():
    # Old phones: a round icon.
    big = crop(0.66, px * 4).convert("RGBA")
    mask = Image.new("L", big.size, 0)
    ImageDraw.Draw(mask).ellipse((0, 0, big.width - 1, big.height - 1), fill=255)
    big.putalpha(mask)
    big.resize((px, px), Image.LANCZOS).save(f"{res}/mipmap-{name}/ic_launcher.png")
    # Android 8+: the phone cuts its own shape, so the mark stays inside the middle 61% (safe zone).
    crop(0.56, px * 108 // 48).save(f"{res}/mipmap-{name}/ic_launcher_foreground.png")

# Splash: the mark with soft edges, so it melts into the dark splash colour.
splash = crop(0.6, 512).convert("RGBA")
fade = Image.new("L", (512, 512), 0)
ImageDraw.Draw(fade).ellipse((40, 40, 472, 472), fill=255)
splash.putalpha(fade.filter(ImageFilter.GaussianBlur(36)))
splash.save(f"{res}/drawable-nodpi/splash.png")

# Notification icon: Android uses only the shape, drawn in white. The mark is the bright part of the picture.
bright = crop(0.9, 96).convert("L").point(lambda v: 255 if v > 110 else 0)
ring = Image.new("L", (96, 96), 0)
ImageDraw.Draw(ring).ellipse((1, 1, 94, 94), fill=255)  # drop the glow in the corners
bright = Image.composite(bright, ring.point(lambda v: 0), ring)
note = Image.new("RGBA", (96, 96), (255, 255, 255, 0))
note.putalpha(bright)
note.save(f"{res}/drawable-nodpi/ic_notification.png")

# Play Console store listing icon (512 x 512, no transparency).
crop(0.62, 512).save("android/store/play-icon-512.png")
print("dark colour near the mark:", "#%02X%02X%02X" % src.getpixel((CX, 250)))

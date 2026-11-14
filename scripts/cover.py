"""把 raw/photos/<shop-id>/ 的照片轉成網站用的圖片。

用法：python scripts/cover.py <shop-id> <封面照片檔名>
輸出：
  assets/img/shops/<shop-id>/cover.jpg   ← 首頁卡片封面（指定的照片裁成 16:10、寬 1200px）
  assets/img/shops/<shop-id>/01.jpg …    ← 店家頁照片區（該店「全部」照片，不裁切、長邊 1200px；封面那張排第一）
需要 Pillow：pip install pillow
"""
import re
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
W, H = 1200, 750  # 16:10
EXTS = {".jpg", ".jpeg", ".png", ".webp", ".heic"}


def load(path: Path) -> Image.Image:
    return ImageOps.exif_transpose(Image.open(path)).convert("RGB")  # 修正手機照片旋轉


def save(img: Image.Image, out: Path) -> None:
    img.save(out, "JPEG", quality=82, optimize=True, progressive=True)
    print(f"✅ {out.relative_to(ROOT).as_posix()}（{out.stat().st_size // 1024} KB）")


def main() -> None:
    # Windows 繁中主控台預設 cp950，無法輸出 emoji，改用 UTF-8
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    shop_id, cover_name = sys.argv[1], Path(sys.argv[2]).name
    if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", shop_id):
        sys.exit(f"shop-id 格式錯誤：{shop_id}（只能用小寫英文、數字與 -）")

    src_dir = ROOT / "raw" / "photos" / shop_id
    photos = sorted(p for p in src_dir.glob("*") if p.suffix.lower() in EXTS)
    cover_src = src_dir / cover_name
    if cover_src not in photos:
        sys.exit(f"在 {src_dir.relative_to(ROOT).as_posix()} 找不到封面照片：{cover_name}")

    out_dir = ROOT / "assets" / "img" / "shops" / shop_id
    out_dir.mkdir(parents=True, exist_ok=True)
    for old in out_dir.glob("[0-9][0-9].jpg"):  # 清掉舊的照片區圖片，避免殘留
        old.unlink()

    save(ImageOps.fit(load(cover_src), (W, H), Image.LANCZOS, centering=(0.5, 0.5)), out_dir / "cover.jpg")
    ordered = [cover_src] + [p for p in photos if p != cover_src]
    for i, p in enumerate(ordered, 1):
        img = load(p)
        img.thumbnail((W, W), Image.LANCZOS)
        save(img, out_dir / f"{i:02d}.jpg")


if __name__ == "__main__":
    main()

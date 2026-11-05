#!/usr/bin/env python3
"""Original ShelfTrack app icons. Not product photography."""
import struct
import zlib
from pathlib import Path


def chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


def write_png(path: Path, size: int, pad: int) -> None:
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        for x in range(size):
            inset = pad <= x < size - pad and pad <= y < size - pad
            # Rounded-rect approximation.
            dx = max(pad - x, 0, x - (size - 1 - pad))
            dy = max(pad - y, 0, y - (size - 1 - pad))
            inside = inset or (dx * dx + dy * dy) ** 0.5 < pad * 0.15
            if not inside:
                raw.extend((11, 12, 15, 0))
                continue
            # Gold field with a dark monogram disc.
            cx, cy = size / 2, size / 2
            if (x - cx) ** 2 + (y - cy) ** 2 < (size * 0.22) ** 2:
                raw.extend((20, 14, 8, 255))
            else:
                mix = (x + y) / (size * 2)
                r = int(230 * (1 - 0.18 * mix))
                g = int(177 * (1 - 0.22 * mix))
                b = int(90 * (1 - 0.1 * mix))
                raw.extend((r, g, b, 255))
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b"")
    path.write_bytes(png)


def main() -> None:
    root = Path(__file__).resolve().parents[1] / "public" / "icons"
    root.mkdir(parents=True, exist_ok=True)
    write_png(root / "icon-192.png", 192, 18)
    write_png(root / "icon-512.png", 512, 48)
    write_png(root / "icon-maskable-512.png", 512, 78)


if __name__ == "__main__":
    main()

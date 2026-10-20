"""Track the dirt trail in the aerial part of the background film.

Writes assets/motion/film/trail.json: for every sampled film time, the trail's left and
right edge (in 1920x1080 frame pixels) per horizontal band, or -1 where it is not visible.
connectors.js uses it to end each journey card's link on the trail.

Usage: python tools/trail-track.py
"""
import json
import pathlib
import subprocess

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent
FILM = ROOT / 'assets/motion/film/film-1080.mp4'
OUT = ROOT / 'assets/motion/film/trail.json'
START, END, FPS = 8.0, 17.75, 4
W, H, SCALE = 480, 270, 4  # analysed size; SCALE maps back to 1920x1080
BANDS = 27  # 40 frame pixels each

raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(START), '-to', str(END), '-i', str(FILM),
                      '-vf', f'fps={FPS},scale={W}:{H}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                     capture_output=True, check=True).stdout
frames = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3).astype(int)


def runs(row):
    """Contiguous [start, end) runs of True in a 1-D mask."""
    edges = np.flatnonzero(np.diff(np.concatenate([[0], row.astype(int), [0]])))
    return list(zip(edges[::2], edges[1::2]))


def track(frame):
    r, g, b = frame[..., 0], frame[..., 1], frame[..., 2]
    # Sunlit dirt is the only warm brown in the shot: red over green over blue.
    mask = (r - g > 18) & (g - b > 8) & (r > 60)
    band = H // BANDS
    found = []
    for i in range(BANDS):
        cover = mask[i * band:(i + 1) * band].mean(0) > .4
        # Ignore specks and wide blobs (the ground-level shot, sunlit grass).
        candidates = [(a, z) for a, z in runs(cover) if 3 <= z - a <= 70]
        found.append(max(candidates, key=lambda run: run[1] - run[0]) if candidates else None)
    # Keep only bands that continue a neighbour: the trail is one connected path.
    edges = []
    for i, run in enumerate(found):
        near = [found[j] for j in (i - 1, i + 1) if 0 <= j < BANDS and found[j]]
        ok = run and any(abs((run[0] + run[1]) - (n[0] + n[1])) / 2 < 25 for n in near)
        edges += [int(run[0] * SCALE), int(run[1] * SCALE)] if ok else [-1, -1]
    # Ground-level and transition frames only yield fragments; drop them entirely.
    return edges if edges.count(-1) <= BANDS // 4 * 2 else [-1] * BANDS * 2


data = {'start': START, 'step': 1 / FPS, 'band': 1080 // BANDS, 'frames': [track(f) for f in frames]}
OUT.write_text(json.dumps(data, separators=(',', ':')))
print(f'{len(frames)} frames -> {OUT.relative_to(ROOT)} ({OUT.stat().st_size} bytes)')

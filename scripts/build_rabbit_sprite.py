from __future__ import annotations

import argparse
import shutil
import subprocess
import tempfile
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image


COLS = 20
ROWS = 15


def run(command: list[str]) -> None:
    subprocess.run(command, check=True)


def edge_connected_black_mask(rgb: np.ndarray, threshold: int) -> np.ndarray:
    candidate = np.max(rgb, axis=2) <= threshold
    height, width = candidate.shape
    visited = np.zeros((height, width), dtype=bool)
    queue: deque[tuple[int, int]] = deque()

    def push(x: int, y: int) -> None:
        if candidate[y, x] and not visited[y, x]:
            visited[y, x] = True
            queue.append((x, y))

    for x in range(width):
        push(x, 0)
        push(x, height - 1)

    for y in range(height):
        push(0, y)
        push(width - 1, y)

    while queue:
        x, y = queue.popleft()
        if x > 0:
            push(x - 1, y)
        if x < width - 1:
            push(x + 1, y)
        if y > 0:
            push(x, y - 1)
        if y < height - 1:
            push(x, y + 1)

    return visited


def make_frame_rgba(path: Path, threshold: int) -> Image.Image:
    image = Image.open(path).convert('RGBA')
    rgba = np.asarray(image)
    source_alpha = rgba[:, :, 3]

    if np.any(source_alpha < 255):
        return image

    rgb = rgba[:, :, :3]
    alpha = np.full(rgb.shape[:2], 255, dtype=np.uint8)
    alpha[edge_connected_black_mask(rgb, threshold)] = 0

    rgba = np.dstack((rgb, alpha))
    return Image.fromarray(rgba, 'RGBA')


def extract_source_frames(
    source: Path,
    output_dir: Path,
    source_start_frame: int,
    source_end_frame: int,
    args: argparse.Namespace,
) -> None:
    frame_width, frame_height = args.frame_size
    frame_pattern = output_dir / 'frame_%04d.png'

    run(
        [
            'ffmpeg',
            '-y',
            '-i',
            str(source),
            '-an',
            '-vf',
            (
                f'select=between(n\\,{source_start_frame}\\,{source_end_frame}),'
                f'crop={args.crop_width}:{args.crop_height}:{args.crop_x}:{args.crop_y},'
                f'scale={frame_width}:{frame_height}:flags=lanczos'
            ),
            '-vsync',
            '0',
            str(frame_pattern),
            '-loglevel',
            'error',
        ]
    )


def build_sprite(args: argparse.Namespace) -> None:
    source = Path(args.source)
    output = Path(args.output)
    frame_width, frame_height = args.frame_size

    with tempfile.TemporaryDirectory(prefix='rabbit-frames-') as temp_dir:
        temp_path = Path(temp_dir)
        frame_pattern = temp_path / 'frame_%04d.png'

        run(
            [
                'ffmpeg',
                '-y',
                '-i',
                str(source),
                '-an',
                '-vf',
                (
                    f'fps={args.fps},'
                    f'crop={args.crop_width}:{args.crop_height}:{args.crop_x}:{args.crop_y},'
                    f'scale={frame_width}:{frame_height}:flags=lanczos'
                ),
                str(frame_pattern),
                '-loglevel',
                'error',
            ]
        )

        frame_paths = sorted(temp_path.glob('frame_*.png'))
        if not frame_paths:
            raise RuntimeError('No frames were extracted from the source video.')

        if len(frame_paths) > COLS * ROWS:
            raise RuntimeError(f'Extracted {len(frame_paths)} frames, but the {COLS}x{ROWS} sprite only has {COLS * ROWS} slots.')

        sprite = Image.new('RGBA', (frame_width * COLS, frame_height * ROWS), (0, 0, 0, 0))

        for index, frame_path in enumerate(frame_paths):
            frame = make_frame_rgba(frame_path, args.threshold)
            x = (index % COLS) * frame_width
            y = (index // COLS) * frame_height
            sprite.paste(frame, (x, y))

        if args.bottom_left_source:
            bottom_left_dir = temp_path / 'bottom_left_override'
            bottom_left_dir.mkdir()
            extract_source_frames(
                Path(args.bottom_left_source),
                bottom_left_dir,
                args.bottom_left_source_start_frame,
                args.bottom_left_source_end_frame,
                args,
            )

            bottom_left_paths = sorted(bottom_left_dir.glob('frame_*.png'))
            for offset, frame_path in enumerate(bottom_left_paths):
                output_index = args.bottom_left_output_start_frame + offset
                if output_index >= COLS * ROWS:
                    raise RuntimeError(f'Bottom-left override frame {output_index} does not fit in the {COLS}x{ROWS} sprite.')

                frame = make_frame_rgba(frame_path, args.threshold)
                x = (output_index % COLS) * frame_width
                y = (output_index // COLS) * frame_height
                sprite.paste(frame, (x, y))

        output.parent.mkdir(parents=True, exist_ok=True)
        sprite.save(output, optimize=True)

        if args.keep_frames:
            keep_path = Path(args.keep_frames)
            if keep_path.exists():
                shutil.rmtree(keep_path)
            shutil.copytree(temp_path, keep_path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', default='/Users/kana/Daily/04_2.mov')
    parser.add_argument('--output', default='public/rabbit-eye-sprite.png')
    parser.add_argument('--fps', type=int, default=30)
    parser.add_argument('--crop-x', type=int, default=300)
    parser.add_argument('--crop-y', type=int, default=0)
    parser.add_argument('--crop-width', type=int, default=1160)
    parser.add_argument('--crop-height', type=int, default=1080)
    parser.add_argument('--frame-size', type=int, nargs=2, default=(464, 432))
    parser.add_argument('--threshold', type=int, default=12)
    parser.add_argument('--bottom-left-source', default='/Users/kana/Daily/04_3.mov')
    parser.add_argument('--bottom-left-source-start-frame', type=int, default=30)
    parser.add_argument('--bottom-left-source-end-frame', type=int, default=72)
    parser.add_argument('--bottom-left-output-start-frame', type=int, default=30)
    parser.add_argument('--keep-frames')
    args = parser.parse_args()
    build_sprite(args)


if __name__ == '__main__':
    main()

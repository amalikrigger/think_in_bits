"""Builds the narration track and subtitles for demo-video.ts, then muxes the final MP4.

Each narration clip is placed at the moment its caption appeared on screen, so speech
stays in step with the video. Usage: python3 -I tools/demo-mux.py screenshots/demo/
"""

import json
import subprocess
import sys
import wave
from array import array
from pathlib import Path

RATE = 22050

out = Path(sys.argv[1])
clips = json.loads((out / "clips.json").read_text())
video = out / "video.mp4"
duration = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(video)]).decode())

track = array("h", bytes(2 * int((duration + 1) * RATE)))
for clip in clips:
    wav = Path(clip["file"]).with_suffix(".wav")
    subprocess.run(["afconvert", "-f", "WAVE", "-d", f"LEI16@{RATE}", "-c", "1", clip["file"], str(wav)], check=True)
    with wave.open(str(wav)) as w:
        samples = array("h", w.readframes(w.getnframes()))
    start = int(clip["at"] / 1000 * RATE)
    end = min(len(track), start + len(samples))
    track[start:end] = samples[: end - start]

with wave.open(str(out / "narration.wav"), "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(RATE)
    w.writeframes(track.tobytes())


def stamp(ms: float) -> str:
    ms = int(ms)
    return f"{ms // 3600000:02}:{ms // 60000 % 60:02}:{ms // 1000 % 60:02},{ms % 1000:03}"


srt = []
for i, clip in enumerate(clips, 1):
    srt.append(f"{i}\n{stamp(clip['at'])} --> {stamp(clip['at'] + clip['ms'])}\n{clip['text']}\n")
(out / "captions.srt").write_text("\n".join(srt))

final = out / "bitblitz-walkthrough.mp4"
subprocess.run(
    ["ffmpeg", "-y", "-loglevel", "error", "-i", str(video), "-i", str(out / "narration.wav"), "-i", str(out / "captions.srt"),
     "-map", "0:v", "-map", "1:a", "-map", "2:s", "-c:v", "copy", "-c:a", "aac", "-b:a", "128k", "-c:s", "mov_text",
     "-metadata:s:s:0", "language=eng", "-t", f"{duration:.3f}", "-movflags", "+faststart", str(final)],
    check=True,
)
print(f"{final} ({duration:.1f} s, {len(clips)} narration clips)")

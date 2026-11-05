"""Keeps one Piper voice loaded for the narrated walkthrough (see narrator.ts).

Loading a voice takes about two seconds, and the walkthrough speaks while game clocks run,
so the voice is loaded once and each line is synthesized on request.
Protocol, one JSON object per line: stdin {"text": ..., "file": ...} → stdout {"file": ...}.
Usage: <python with piper-tts installed> -I piper-speak.py <voice.onnx>
"""

import json
import sys
import wave

from piper import PiperVoice

voice = PiperVoice.load(sys.argv[1])
print(json.dumps({"ready": True}), flush=True)
for line in sys.stdin:
    request = json.loads(line)
    with wave.open(request["file"], "wb") as out:
        voice.synthesize_wav(request["text"], out)
    print(json.dumps({"file": request["file"]}), flush=True)

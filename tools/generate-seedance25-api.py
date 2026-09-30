"""Three authorized rover takes, direct REST only. Re-run resumes recorded jobs."""
import json
import time
import urllib.request
import urllib.error
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/redesign/seedance25-api-2026-09-30'
OUT.mkdir(parents=True, exist_ok=True)
KEY = next(line.split('=', 1)[1] for line in (ROOT / '.env').read_text().splitlines() if line.startswith('HF_API_KEY='))
BASE = 'https://api.higgsfield.ai'

def request(url, data=None, method=None, headers=None):
    hdr = headers if headers is not None else {'Authorization': 'Key ' + KEY, 'User-Agent': 'Mozilla/5.0'}
    if isinstance(data, dict):
        data = json.dumps(data).encode()
        hdr = {**hdr, 'Content-Type': 'application/json'}
    req = urllib.request.Request(url, data=data, method=method, headers=hdr)
    with urllib.request.urlopen(req, timeout=120) as res:
        raw = res.read()
    return json.loads(raw)

def save(path, value):
    path.write_text(json.dumps(value, indent=2), encoding='utf-8')

refs_file = OUT / 'references.json'
if refs_file.exists():
    refs = json.loads(refs_file.read_text())
else:
    refs = []
files = ['01_paper-rover-opening.png', '02_white-frame-front-rover.png',
         '03_camera-orbit-right-inbetween.png', '04_rear-view-greenery-ground.png',
         '05_more-greenery-trees-begin.png', '06_camera-rises-trees-spread.png',
         'Create-a-farther-zoomed-out-version-of-t-065.png',
         '08_aerial-rover-starts-downtrail.png', '10_aerial-rover-lowertrail.png']
for name in files[len(refs):]:
    slot = request(BASE + '/files/generate-upload-url', {'content_type': 'image/png'})
    file = ROOT / 'assets/redesign/rover-forest-transition/storyboard-frames' / name
    req = urllib.request.Request(slot['upload_url'], data=file.read_bytes(), method='PUT', headers=slot.get('upload_headers', {}))
    with urllib.request.urlopen(req, timeout=120) as res:
        res.read()
    refs.append({'file': name, 'public_url': slot['public_url']})
    save(refs_file, refs)
    print('Uploaded reference', len(refs), flush=True)

master = (ROOT / 'assets/redesign/rover-forest-transition/ROVER_TRANSITION_MASTER_PROMPT.md').read_text(encoding='utf-8')
prompt = master.split('```text\n', 1)[1].split('```', 1)[0]
mapping = '''REFERENCE INDEX: @Image1 is the opening on green/white paper; @Image2 front view; @Image3 right-side orbit; @Image4 rear with greenery; @Image5 saplings; @Image6 rising camera; @Image7 extra farther forest view between beats6 and7 (also represents identical frame07); @Image8 clean overhead composition; @Image9 lower-trail position only. These show the SAME rover at successive moments. Never combine their rover bodies in one shot. Omit all UI even if a reference contains markings. In locked phase retain Image8 exact framing and use Image9 only for route progress, never its crop.\n'''
variants = [
    ('01-continuous-orbit', 'DIRECTION A: precise, deliberate right-side orbit, clear white takeover, coherent gradual greenery growth. Emphasize continuous parallax and unbroken identity during crane-up. Lock overhead by12s and let the single rover drive down for7s.'),
    ('02-controlled-crane', 'DIRECTION B: slower, restrained orbital speed with a smooth accelerating crane-up from6s to11s. No spin or whip move. Maintain the original rover centered until overhead resolves; the lower trail stays empty. Carefully taper camera velocity to exactly zero at12s.'),
    ('03-timeline-priority', 'DIRECTION C: strongest stability for website scroll scrubbing: finish camera travel by10s, settle overhead10–12s, then absolutely frozen environment12–20s. Prioritize mechanically correct forward motion, nose leading down each bend; constant body scale. Do not use camera movement to simulate rover progress.')
]
jobs = []
for name, direction in variants:
    path = OUT / (name + '.job.json')
    body = {'prompt': mapping + prompt + '\n' + direction + '\nOUTPUT: silent native20-second16:9 footage; crisp1080p detail, high bitrate. No captions, labels, logos, grids, menus or graphical UI.',
            'duration': 20, 'resolution': '1080p', 'aspect_ratio': '16:9',
            'bitrate_mode': 'high', 'generate_audio': False,
            'image_urls': [ref['public_url'] for ref in refs]}
    save(OUT / (name + '.input.json'), body)
    (OUT / (name + '.prompt.md')).write_text(body['prompt'], encoding='utf-8')
if '--prepare-only' in sys.argv:
    print('Three video briefs prepared; no submissions.', flush=True)
    raise SystemExit(0)
for name, direction in variants:
    path = OUT / (name + '.job.json')
    body = json.loads((OUT / (name + '.input.json')).read_text())
    if (OUT / (name + '.submission-uncertain.txt')).exists():
        raise SystemExit('Resolve uncertain submission before retrying: ' + name)
    if path.exists():
        job = json.loads(path.read_text())
    else:
        try:
            job = request(BASE + '/bytedance/seedance-2.5/reference-to-video', body)
        except urllib.error.HTTPError as err:
            message = err.read().decode()
            save(OUT / (name + '.rejection.json'), {'http_status': err.code, 'error': message})
            print('Submission rejected', name, err.code, message[:700], flush=True)
            raise SystemExit(1)
        except Exception:
            (OUT / (name + '.submission-uncertain.txt')).write_text('Submission outcome uncertain. Do not resubmit without resolving provider history.')
            raise
        save(path, job)
        print('Submitted', name, job.get('request_id'), job.get('status'), flush=True)
    jobs.append((name, job))

while jobs:
    pending = []
    for name, job in jobs:
        result = request(job.get('status_url') or BASE + '/requests/' + job['request_id'] + '/status')
        status = result['status']
        print(name, status, flush=True)
        if status == 'completed':
            media = result['video']['url']
            with urllib.request.urlopen(media, timeout=120) as res:
                (OUT / (name + '.mp4')).write_bytes(res.read())
            save(OUT / (name + '.result.json'), {'request_id': job['request_id'], 'status': status, 'local_file': name + '.mp4'})
        elif status in ('failed', 'nsfw', 'canceled'):
            save(OUT / (name + '.result.json'), result)
        else:
            pending.append((name, job))
    jobs = pending
    if jobs:
        time.sleep(20)
print('All submitted video jobs reached terminal status.', flush=True)

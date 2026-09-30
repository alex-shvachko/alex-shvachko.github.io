"""Authorized 20-image storyboard batch, direct Higgsfield HTTPS only."""
import concurrent.futures
import json
from pathlib import Path
import time
import threading
import requests

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/redesign/full-story-api-2026-09-30'
OUT.mkdir(parents=True, exist_ok=True)
KEY = next(line.split('=', 1)[1].strip().strip('"').strip("'") for line in (ROOT / '.env').read_text().splitlines() if line.startswith('HF_API_KEY='))
AUTH = {'Authorization': 'Key ' + KEY, 'User-Agent': 'Mozilla/5.0'}
STOP = threading.Event()
MODEL = 'xai/grok-imagine-image-2.0'
REFS = [Path(f'C:/Users/shvac/AppData/Local/Temp/miro-story-ref-{n}.png') for n in range(3)] + [ROOT / 'assets/redesign/rover-forest-transition/storyboard-frames/08_aerial-rover-starts-downtrail.png']
COMMON = """Create one polished 16:9 desktop website SCREEN DESIGN CONCEPT, edge-to-edge screenshot with no browser chrome, not a collage of multiple screens. This is one ordered moment in Alex Shvachko's continuous scroll portfolio. Preserve reference art direction: forest-green #073d2b, ivory #f6f3e9, cobalt #0055ff, tiny hot-pink graphic bursts, dark navy ink, condensed oversized expressive headings and small monospace navigation. Precise readable short English labels, generous hierarchy and margins, exquisite sharp details, coherent high-end agency finish. Sample employment and education labels must say SAMPLE; do not invent real degrees, employers, awards or metrics. The interface is an explanatory still concept; UI belongs to the separate website layer, never to the generated background video. Rover is always the same white four-wheel rugged robot with a white roof, black sensors and two blue eye rings. Whenever a rover is visible show EXACTLY ONE rover, no second robot, no reflections suggesting another rover. Forest lighting is diffuse natural light, no sun disk or bright corner flare. Do not add captions describing the prompt, watermarks, illegible paragraphs, extra unrelated screens or generic SaaS dashboards. Render the requested single stage, not the whole story at once. """
SCENES = [
('01-home-opening', [0], "Opening viewport. Closely match the green opening reference: left two-thirds typography 'I build playful intelligence.' with playful in cobalt italic condensed type, subline 'AI, automation & creative technology', prominent blue 'EXPLORE MY WORK' button and tiny pink burst. Right tilted ivory paper frame holding one white rover, five delicate connected labels AI / ML, Web & Apps, Automation, Creative AI, Robotics. Add restrained top navigation Alex Shvachko / Journey / Work / Contact. Elegant breathing room."),
('02-home-hover-explore', [0], "Second home moment with the same exact layout and rover. Explore My Work button appears actively hovered with small right arrow, thin underline Journey navigation; curved category label connections draw attention to rover on right. Maintain deep green, tilted paper and cobalt expressive headline, no wholesale redesign. A slim bottom scroll indicator says 'SCROLL TO EXPLORE'."),
('03-home-scroll-start', [0], "Beginning of scrolling from the same home: ivory rover paper frame on right grows outward, now occupying 65 percent of viewport; left headline slides partially upward while remaining legible. One rover larger in the growing paper frame. Small blue UI reading 'THE JOURNEY' at top-left marks the transition; no full-screen white yet. Single continuous composition, not a split screen."),
('04-white-takeover', [0], "White takeover moment: ivory paper now fills almost the whole viewport, only thin deep-green edge remains. One rover sits slightly right of center in clean white space, camera three-quarter toward its right side. Sparse first tiny moss sprouts beneath tires; UI has faded to only small dark top navigation. No forest prematurely filling screen, no second rover."),
('05-rear-moss-growth', [0,3], "Transition middle: now view one consistent white-roof rover FROM BEHIND moving forward into growing moss, ferns and young saplings on ivory ground. Camera is a little elevated and orbiting continuously toward front. Green plants occupy lower70percent, upper background softly ivory. A restrained website overlay at right reads 'Learning by building.' with ample clear space, no timeline cards yet."),
('06-rising-forest', [3,0], "Transition late: forest now surrounds one rover, elevated oblique camera revealing its white roof and front blue eyes while camera pulls upward. Realistic moss rocks young trees; last narrow ivory clearing disappears behind it. Thin trail starts emerging toward upper-left of composition. Tiny 'JOURNEY' navigation and small right-side text 'From curiosity to craft.' integrate with the forest, no cuts implied."),
('07-experience-arrival', [3,0], "Locked overhead forest arrival. Reproduce aerial reference geometry: narrow winding trail on LEFT around42percentx, pond with fallen log on right. One tiny white rover enters near TOP of trail and faces downward. Website UI uses rightmost45percent with ivory editorial panel 'Experience' and first SAMPLE role, 'AI technologist', short skill tags Python / Automation / Prototyping. Trail is the progress meter, no separate generic progress bar. No sun glare."),
('08-first-role-skills', [3,0], "Same locked overhead forest composition, exact trail and pond positions, only one small rover slightly farther DOWN trail than previous screen. Right ivory UI shows '01 / SAMPLE EXPERIENCE', heading 'Building useful AI', one concise sentence 'Small tools. Clear outcomes.', crisp tags 'Python', 'LLMs', 'Automation'. Three understated expandable skill rows. Blue active marker links visually to the rover position without drawing across entire forest."),
('09-second-role-data', [3,0], "Same fixed aerial forest camera and same trail pond, single rover at upper-middle bend traveling down. Experience UI right shows '02 / SAMPLE EXPERIENCE', heading 'Connecting data to decisions', sample Data Engineer role, neatly aligned tags SQL / Pipelines / Machine Learning, small visual pipeline illustration inside one ivory card. Forest remains dominant on left. Pink tiny accent and cobalt active category. No invented results."),
('10-education-milestone', [3,0], "Same locked aerial forest view. Single rover now at middle-lower bend descending along winding trail. Right UI shows '03 / SAMPLE EDUCATION', large 'Learn. Test. Build.', an ivory education record with 'Sample course / Data engineering' and placeholder dates 'YEAR — YEAR', three simple learning topics, one subtle blue circular active marker. Readable short text, calm editorial layout."),
('11-skills-summary', [3,0], "Forest journey final milestone: SAME aerial trail left and pond right, single rover near lower trail clearly facing downward. Right ivory panel heading 'A toolkit for curious problems', compact grouped tags AI / Software / Data / Creative; each group three useful short skill labels. No proficiency percentages. Small 'NEXT: CREATIVE WORK' blue button and tiny pink burst. Keep forest visible with no corner sun or added robot."),
('12-forest-to-clouds', [3,1,2], "Elegant boundary transition from forest journey into creative portfolio. Lower-left forest and winding trail dissolve into soft cloud layer; no extra rover, one tiny rover at lower trail edge only. Upper and right open into celestial blue-grey cloud sky with warm diffuse golden edges and a subtle classical Renaissance hand silhouette. Short centered 'Ideas become worlds.' ivory condensed heading. UI chrome restrained; no gallery grid until next stage. Show a single coherent transition scene."),
('13-creative-portfolio-hero', [1,2,0], "Creative portfolio arrival, follow reference celestial composition: classical Renaissance figures reaching toward one another across luminous clouds on opposing left/right sides, abundant sky breathing room in center. Heading 'CREATIVE WORK' and subheading 'Ideas / Code / AI / Worlds'. Lower third is ivory angular framed gallery interface with cobalt active All tab, categories AI & Generative / Software / 3D & Environments / Data / Interactive. No rover in this gallery stage, no invented full-length biographies."),
('14-creative-gallery-grid', [2,1], "Creative gallery browsing screen strongly matching ivory framed gallery reference. Upper25percent celestial Renaissance cloud art with condensed 'Build what's next.'; lower75percent 3-column2-row sharply structured ivory angular outlined project cards with tiny mono category numbers and cobalt circular arrows. Showcase sample artwork: floating ancient autumn tree island, cinematic character portrait, neon cyberpunk street, data visualization, whimsical interactive robot artwork (only one robot artwork thumbnail), medical pipeline diagram. Each card clearly marked SAMPLE PROJECT. No actual metrics."),
('15-creative-category-filter', [2,1], "Same creative gallery design, now category AI & Generative selected as cobalt pill. Four large refined project cards in2x2 grid, cream angular outlines with dark navy offset edges. Artworks include cinematic character portrait, surreal botanical architecture, an abstract generative sculpture, dreamlike floating orchard cloud world. Short SAMPLE PROJECT labels, category tags and blue arrow. Clouds/classical sculpture header preserved. Lots of balanced whitespace, no rover."),
('16-project-detail', [2,1], "Project-detail website viewport consistent with cream angular blue-pink system. Small 'BACK TO WORK' arrow top-left; left60percent one stunning floating autumn tree island among clouds artwork, right40percent cream editorial project narrative 'Worlds from ideas', 'SAMPLE PROJECT', short Scope / Process / Tools sections with concise labels, blue 'VIEW EXPERIMENT' CTA. Header tiny Alex Shvachko and Work active. No invented achievement metrics. This is one project focus page, not gallery."),
('17-about-personal-artifacts', [2,0], "About section after creative portfolio: warm ivory background and dark navy condensed 'A few things I keep coming back to.' Personal artifacts organized like a curated studio table, not generic biography: notebook sketch of a forest path, small printed floating-tree artwork, blue sticky note 'Learn / Build / Repeat', camera photograph and a tiny white rover model (exactly one rover). Right concise 'ABOUT ALEX' paragraph 'Curiosity connects the work.' with small 'SAMPLE LAYOUT' label. Pink tape and cobalt fine details, meaningful generous whitespace."),
('18-contact-transition', [2,0], "Late-page transition toward contact. Celestial cloud image recedes into upper third, rest ivory canvas with angular dark ink edge. Enormous condensed heading 'What could we build together?' on left and one subtle pink burst. Right simple conversation starters 'AI tools', 'Creative systems', 'Useful experiments' as clean outlined chips; blue 'START A CONVERSATION' button. No form clutter or invented availability. Minimal persistent header and tiny next-section arrow."),
('19-final-contact-page', [2,0], "Final contact viewport following Miro reference's white angular interface and Build what's next art direction. Top40percent celestial Renaissance reaching figures amid clouds framed with clean edges, bottom ivory page large condensed 'Build what's next.' to left. Right one generous cobalt button 'SAY HELLO' with arrow, text 'alex.shvachko.wrk@gmail.com', small GitHub / LinkedIn links. Pink accent burst, tiny monospace 'IDEAS → VISUALS → IMPACT'. No fake form, no metrics, no rover, calm legible closing."),
('20-final-quiet-footer', [2,0], "Last scroll screen, quiet closing after full journey. Predominantly ivory canvas, top narrow celestial cloud strip consistent with preceding page. Large dark navy condensed 'Keep exploring.' anchored left with a single cobalt 'BACK TO TOP' button; email alex.shvachko.wrk@gmail.com centered right alongside GitHub / LinkedIn links. Fine bottom rule, small Alex Shvachko wordmark, tiny pink burst and mono 'EXPLORE / LEARN / BUILD / REPEAT'. No giant dashboard grid, no rover, no generic bio. Clear final page and generous whitespace."),
]

def save(path, value):
    path.write_text(json.dumps(value, indent=2), encoding='utf-8')

def upload(path):
    response = requests.post('https://api.higgsfield.ai/files/generate-upload-url', headers=AUTH, json={'content_type':'image/png'}, timeout=60)
    response.raise_for_status()
    data=response.json()
    response=requests.put(data['upload_url'], headers=data.get('upload_headers', {}), data=path.read_bytes(), timeout=120)
    response.raise_for_status()
    return data['public_url']

def execute(scene, urls):
    name, refs, brief=scene
    recordpath=OUT/(name+'.json')
    prompt=COMMON+'\n\nSPECIFIC FRAME: '+brief
    payload={'prompt':prompt,'quality':'medium','resolution':'2k','aspect_ratio':'16:9','image_urls':[urls[n] for n in refs]}
    if recordpath.exists():
        record=json.loads(recordpath.read_text())
    else:
        if STOP.is_set():
            return {'name':name,'state':'not_submitted_after_credit_rejection','prompt':prompt}
        record={'name':name,'model':MODEL,'reference_files':[str(REFS[n].name) for n in refs], 'prompt':prompt,'settings':{'quality':'medium','resolution':'2k','aspect_ratio':'16:9'},'state':'submitting'}
        save(recordpath,record)
        try:
            response=requests.post('https://api.higgsfield.ai/'+MODEL,headers=AUTH,json=payload,timeout=120)
            if not response.ok:
                record.update(state='rejected',http_status=response.status_code,error=response.text[:600])
                save(recordpath,record)
                if 'not_enough_credits' in response.text:
                    STOP.set()
                print(name,'rejected',response.status_code,flush=True)
                return record
            data=response.json()
            record.update(state='submitted',job=data)
            save(recordpath,record)
            print(name,'submitted',flush=True)
        except requests.RequestException as error:
            record.update(state='uncertain',error=type(error).__name__)
            save(recordpath,record)
            print(name,'uncertain POST; do not resubmit',flush=True)
            return record
    if 'job' not in record or record['state']=='completed':
        if 'not_enough_credits' in record.get('error',''):
            STOP.set()
        return record
    job=record['job']
    for attempt in range(100):
        response=requests.get(job['status_url'],headers=AUTH,timeout=60)
        response.raise_for_status()
        status=response.json()
        state=status.get('status','unknown')
        record.update(state=state)
        save(recordpath,record)
        if state=='completed':
            images=status.get('images',[])
            if not images and job.get('response_url'):
                result=requests.get(job['response_url'],headers=AUTH,timeout=60)
                result.raise_for_status()
                status=result.json()
                images=status.get('images',[])
            if not images:
                record['result']=status
                save(recordpath,record)
                print(name,'completed response missing images',flush=True)
                return record
            entry=images[0]
            url=entry.get('url') if isinstance(entry,dict) else entry
            download=requests.get(url,timeout=120)
            download.raise_for_status()
            suffix='.jpg' if 'jpeg' in download.headers.get('content-type','') else '.png'
            output=OUT/(name+suffix)
            output.write_bytes(download.content)
            record.update(state='completed',file=output.name,bytes=len(download.content))
            save(recordpath,record)
            print(name,'downloaded',len(download.content),flush=True)
            return record
        if state in ('failed','nsfw','canceled','cancelled'):
            record['result']=status
            save(recordpath,record)
            print(name,state,flush=True)
            return record
        time.sleep(min(10+attempt*2,30))
    return record

if __name__=='__main__':
    # Reference public URLs are local tooling data; no signed storage URLs are saved.
    cache=OUT/'reference-public-urls.local.json'
    if cache.exists():
        urls=json.loads(cache.read_text())
    else:
        urls=[upload(path) for path in REFS]
        save(cache,urls)
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        results=list(pool.map(lambda scene:execute(scene,urls),SCENES))
    save(OUT/'manifest.json',{'model':MODEL,'count_requested':20,'count_downloaded':sum('file' in item for item in results),'images':results})
    print('Batch finished:',sum('file' in item for item in results),'images downloaded',flush=True)

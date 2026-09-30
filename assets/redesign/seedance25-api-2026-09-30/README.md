# Three Seedance 2.5 video takes — direct API

Requested: three native 20-second versions of the existing paper-to-forest rover story. Settings: 1080p (documented maximum), high bitrate, 16:9, audio disabled. No generation connector/MCP was used.

Model: `bytedance/seedance-2.5/reference-to-video`.
Source: https://open.higgsfield.ai/models/bytedance/seedance-2.5/reference-to-video/api-reference
Machine-readable schema: https://dash.higgsfield.ai/models/bytedance/seedance-2.5/reference-to-video/llms.txt

Nine unique reference frames were uploaded through the authenticated signed-upload API. Frame06.5 and07 are identical and supplied once. The sun-glow frame09 was excluded. `references.json` records public image URLs and source names; it contains no API credential or signed upload URLs.

## Actual outcome

On September 30, the first generation POST was explicitly rejected with HTTP403 and `not_enough_credits`. No request ID or video job was created. The remaining two jobs were not submitted. There are zero generated videos in this folder.

All three detailed prompts and exact request bodies are saved for resumption after API credits are available. They preserve one rover, a continuous camera move, clean imagery without UI, no corner sun, and a fixed overhead phase where the rover travels forward down the left trail.

Run from the repository root:

```powershell
python tools/generate-seedance25-api.py --prepare-only
# Once API funding is restored and the three generations are still authorized:
python tools/generate-seedance25-api.py
```

The script records each accepted request before polling and resumes those IDs on a later run. An ambiguous submission creates a marker and prevents automatic resubmission. Successful output still requires visual inspection for duplicates, reverse travel and camera/background drift before website replacement.

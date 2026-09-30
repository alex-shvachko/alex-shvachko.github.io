# Portfolio project instructions

Keep this portfolio deployable as a static GitHub Pages site. Follow the parent workspace AGENTS.md. Use local media-generation tooling during development; do not expose provider credentials or require provider APIs in the public website.

## Higgsfield API — checked September 30, 2026

- Local `.env` contains `HF_API_KEY`, the complete copied credential. It is ignored by Git. Never print it, commit it, copy it into browser assets, or include it in request manifests. `.env.example` has an empty placeholder.
- Official references: [quick start](https://open.higgsfield.ai/quick-start), [documentation index](https://docs.higgsfield.ai/docs/llms.txt), [model catalog](https://open.higgsfield.ai/explore), [Python SDK](https://github.com/higgsfield-ai/higgsfield-client).
- REST base URL: `https://api.higgsfield.ai`. Send `Authorization: Key <complete credential>` and `Content-Type: application/json` from local tooling only. Keep the key intact; do not add another Key prefix to its stored value.
- Before generation, read the selected model's API reference and schema. Verify reference roles, supported duration/resolution and operation path. Do not silently replace Seedance 2.0 Mini with a different model.
- Submit JSON to the documented model path. Save the returned request ID and status/cancel URLs. Poll the status URL with backoff, then download the completed media. Handle failed, nsfw and canceled terminal states. Do not blindly repeat a generation POST after an uncertain timeout.
- Upload local reference files using the documented signed-upload flow. Authenticate the upload-URL request only; PUT bytes with the returned storage headers, without the API key. Use the public reference URL after upload succeeds; never log signed URLs.
- Saving credentials does not verify account access or authorize an extra paid generation. For this setup request, no generation was submitted.

### Local PowerShell credential loading

Run from the repository root. This reads only the named setting and does not print it:

```powershell
$credentialLine = Get-Content -LiteralPath .env | Where-Object { $_ -match '^HF_API_KEY=' } | Select-Object -First 1
$env:HF_API_KEY = $credentialLine.Substring('HF_API_KEY='.Length)
$requestHeaders = @{ Authorization = "Key $env:HF_API_KEY" }
# For an existing job only; replace with its recorded status_url:
# Invoke-RestMethod -Uri $statusUrl -Headers $requestHeaders
```

For the official Python SDK, its documented credential environment is `HF_KEY` (complete key:secret). Set it from `HF_API_KEY` in the local process if using that SDK. Environment files are not loaded automatically by PowerShell or by the static site.

Before committing, run `git check-ignore .env` and verify `.env` is absent from `git ls-files`. Commit only the instructions, ignore rules and empty example.

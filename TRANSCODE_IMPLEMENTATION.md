# Video transcoding implementation guide

This document describes how to add **adaptive bitrate (ABR)** playback—e.g. 1080p / 720p / 360p—on top of the current ReelTime admin flow. Today, uploads go **directly to Cloudflare R2** and `video_url` points at a **single** progressive file. Transcoding is **not** implemented in this repo yet; this is the blueprint.

## Goals

- Multiple renditions so slow networks can play lower bitrates without stalling.
- **HLS** (recommended) or DASH: a **manifest** (`.m3u8` / `.mpd`) plus segments; the player switches quality automatically.
- **Heavy work** runs outside Next.js (long CPU time, ffmpeg, large disk I/O).

## End-to-end flow (admin → transcode → viewer app)

Three separate systems: **this repo** (Next.js admin dashboard), **transcode service** (FastAPI + ffmpeg), and **viewer / consumer project** (your streaming app). Shared infrastructure: **R2** (files) and **Supabase** (metadata)—both projects read/write metadata as you design; the player loads video bytes from **public R2 (or CDN in front of R2)**.

```mermaid
sequenceDiagram
  autonumber
  participant AU as Admin user
  participant AD as Admin dashboard Next.js
  participant R2 as Cloudflare R2
  participant TC as FastAPI transcode service
  participant W as ffmpeg worker
  participant DB as Supabase
  participant VU as End user
  participant VA as Viewer streaming app

  rect rgb(240, 248, 255)
    note over AU, R2: Phase 1 — Upload (no transcode yet)
    AU->>AD: Select video + metadata, start upload
    AD->>AD: Create movie row / presigned multipart URLs
    AU->>R2: PUT video parts (direct — large file never hits Next body limit)
    AU->>AD: POST /api/movies/multipart-complete
    AD->>R2: S3 CompleteMultipartUpload
    AD->>DB: Save video_url, thumbnail, status
  end

  rect rgb(255, 248, 240)
    note over AD, W: Phase 2 — Transcode (async)
    AD->>TC: POST /jobs (movie_id, source_key, output_prefix) + service secret
    TC-->>AD: 202 Accepted + job_id
    TC->>W: Queue / run job
    W->>R2: GetObject (source MP4)
    W->>W: ffmpeg → HLS ladder (1080 / 720 / 360 …)
    W->>R2: PutObject master.m3u8 + variants + segments
    W->>DB: Set hls_manifest_url, encoding_status = ready
  end

  rect rgb(245, 255, 245)
    note over VU, R2: Phase 3 — Playback (consumer app)
    VU->>VA: Open movie / episode page
    VA->>DB: Fetch catalog + playback fields (Supabase or viewer API)
    DB-->>VA: title, thumbnail, hls_manifest_url, …
    alt HLS ready
      VA->>R2: GET master.m3u8 (manifest)
      R2-->>VA: playlist
      loop Adaptive playback
        VA->>R2: GET segments (.m4s / .ts)
        R2-->>VA: media chunks (player picks quality)
      end
    else Fallback: single file only
      VA->>R2: GET progressive video_url (MP4)
    end
  end
```

### Three projects on one diagram (deployment view)

```mermaid
flowchart LR
  subgraph repo_admin["Project: Admin dashboard"]
    A[Next.js UI + API routes]
  end

  subgraph repo_transcode["Project: Transcode service"]
    B[FastAPI]
    C[Worker + ffmpeg]
    B --> C
  end

  subgraph repo_viewer["Project: Viewer / streaming app"]
    D[Web or mobile client]
    E[Optional: viewer BFF API]
    D --- E
  end

  subgraph shared["Shared infrastructure"]
    R2[(R2 bucket)]
    DB[(Supabase)]
  end

  A <-->|metadata + complete upload| DB
  A -->|enqueue job JSON| B
  A <-->|S3 API| R2
  C <-->|read source / write HLS| R2
  C -->|update encoding fields| DB
  D <-->|catalog + manifest URL| DB
  D -->|HLS segments| R2
  E -.->|optional| DB
```

## Architecture overview

```mermaid
sequenceDiagram
  participant Browser
  participant AdminNext as Admin (Next.js)
  participant R2 as Cloudflare R2
  participant Transcode as Transcode API (FastAPI)
  participant DB as Supabase

  Browser->>AdminNext: Multipart upload (presigned / existing flow)
  Browser->>R2: PUT parts (direct)
  Browser->>AdminNext: POST /api/movies/multipart-complete
  AdminNext->>R2: Complete multipart
  AdminNext->>DB: Set video_url, thumbnail, status
  AdminNext->>Transcode: POST /jobs (JSON: keys, movieId) + secret
  Note over Transcode: Download from R2, ffmpeg, upload HLS
  Transcode->>R2: Write manifest + segments
  Transcode->>DB: Update manifest URL + encoding_status
```

### System diagram (components & data flow)

```mermaid
flowchart TB
  subgraph clients["Clients"]
    AdminUI[Admin browser]
    Viewer[Viewer app / player]
  end

  subgraph admin["Admin stack"]
    Next[Next.js API + UI]
  end

  subgraph transcode["Transcode stack"]
    FastAPI[FastAPI]
    Worker[Background worker + ffmpeg]
    FastAPI --> Worker
  end

  R2[("Cloudflare R2\n(source + HLS output)")]
  DB[("Supabase\nmetadata + encoding status")]

  AdminUI -->|"multipart PUT (direct)"| R2
  AdminUI --> Next
  Next -->|"CompleteMultipart + DB update"| R2
  Next --> DB
  Next -->|"POST job JSON + secret\n(no video body)"| FastAPI
  Worker -->|"GetObject source"| R2
  Worker -->|"PutObject manifest + segments"| R2
  Worker -->|"Update rows / webhook"| DB
  Viewer -->|"GET .m3u8 + segments\n(usually via public URL / CDN)"| R2
  Viewer -.->|"optional: fetch playback URL"| DB
```

### Encoding state (optional model for UI)

```mermaid
stateDiagram-v2
  [*] --> pending: Upload finalized / job enqueued
  pending --> processing: Worker starts ffmpeg
  processing --> ready: HLS uploaded + DB updated
  processing --> failed: Error / timeout / invalid source
  failed --> pending: Admin retries job
  ready --> processing: Re-transcode / replace source
```

### What you should **not** do

- Do **not** stream the full video file **through** FastAPI from the browser. That duplicates bandwidth, hits body limits, and slows uploads.
- Do **not** run ffmpeg inside the `multipart-complete` request on Vercel/serverless: timeouts and memory will break first.

### What you **should** do

1. Keep the current pattern: browser → R2 for bytes; Next.js completes multipart and updates Supabase.
2. After the object exists in R2, the **server** (Next.js API route or the same handler after a successful complete) sends a **small JSON job** to the FastAPI service.
3. FastAPI (or a worker it triggers) reads the source from R2, transcodes, writes outputs back to R2, then updates Supabase (or calls a webhook your admin exposes).

## Separate project: FastAPI transcode service

Put ffmpeg and job logic in a **dedicated** Python service (FastAPI is a good fit):

- Own repository **or** a second package in a monorepo—your choice. What matters is a **separate deployable** (container/VM) with enough CPU, RAM, and ephemeral disk for ffmpeg.
- Expose a minimal HTTP API: e.g. `POST /transcode/jobs` that returns `202 Accepted` with a `job_id`, and optionally `GET /transcode/jobs/{id}` for status.

### Suggested job payload (server → FastAPI)

Send this from Next.js **after** upload is finalized (never from the browser with a shared secret):

```json
{
  "job_id": "uuid-generated-by-admin-or-worker",
  "kind": "single_movie",
  "movie_id": "uuid",
  "source_bucket": "your-r2-bucket",
  "source_key": "movies/<movie_id>/video.mp4",
  "output_key_prefix": "movies/<movie_id>/hls/",
  "webhook_url": "https://admin.example.com/api/internal/transcode-callback",
  "supabase_update": false
}
```

For **series**, include `episode_number` (or episode id) and keys under the same `movies/<movie_id>/` prefix (aligned with `validateKeyBelongsToMovie` in this repo: keys must start with `movies/{movieId}/`).

### Authentication

- Use a **shared secret** (e.g. `Authorization: Bearer <TRANSCODE_SERVICE_TOKEN>`) or mTLS between admin and transcode service.
- Rotate keys; never expose the transcode token to the browser.

### Worker behavior (inside FastAPI or a subprocess queue)

1. **Download** or stream the source object from R2 using S3-compatible credentials (same account as this admin app’s R2 config).
2. Run **ffmpeg** (and optionally **ffmpeg**’s HLS muxer or **shaka-packager**) to produce:
   - `master.m3u8` referencing variant playlists
   - Per-rendition playlists and segments (`.m4s` / `.ts` depending on your choice)
3. **Upload** all outputs under `output_key_prefix` with correct `Content-Type` for playlists and segments.
4. **Finalize state** in Supabase:
   - e.g. `hls_manifest_url` = public URL to `.../master.m3u8`
   - `encoding_status` = `ready` | `failed`
   - Optionally keep `video_url` as the original MP4 for fallback until the client app only uses HLS.

Exact columns depend on a migration you add to Supabase; this admin app currently stores `video_url` and `thumbnail_url` on `movies` (and `video_url` per row in `series_episodes`).

## Database fields (recommended)

Add (names illustrative—pick what matches your naming):

| Column | Purpose |
|--------|---------|
| `encoding_status` | `pending` / `processing` / `ready` / `failed` |
| `encoding_error` | Short message for admin UI |
| `hls_manifest_url` or `playback_url` | URL passed to the video player |
| `source_video_key` | Optional; R2 key of mezzanine if you want re-runs |

For episodes, mirror the same on `series_episodes` or a side table keyed by episode id.

## Hooking into this admin app (checklist)

1. **Env**: `TRANSCODE_SERVICE_URL`, `TRANSCODE_SERVICE_SECRET`.
2. **After success** in `app/api/movies/multipart-complete/route.ts` (and `series-multipart-complete` for each episode or one batch job): fire-and-forget or await a short `fetch` to FastAPI that only **enqueues** the job (prefer async so user-facing latency stays low).
3. **Admin UI**: show `encoding_status` on movie detail / list; poll or use Supabase realtime if you want live updates.
4. **Consumer app / player**: use **HLS** (e.g. hls.js, or native Safari) with `hls_manifest_url` when `encoding_status === 'ready'`.

## Deployment and operations

- **CPU**: transcoding is CPU-bound; size instances for peak **concurrent** jobs, not average traffic.
- **Disk**: ffmpeg needs scratch space roughly on the order of input + largest intermediate; use a large ephemeral volume or stream carefully.
- **Timeouts**: HTTP request to “start job” should return quickly; actual work runs in a background task, Celery/RQ, or a queue consumer.
- **Idempotency**: same `job_id` or deterministic output prefix should not corrupt existing objects; consider deleting old `hls/` prefix before re-run or use versioned paths.
- **Retries**: network blips to R2 are normal; retry with backoff; mark `failed` only after limits.

## Cost reminders (short)

- **Encoding**: billed as compute (your VM) or as vendor “minutes encoded.”
- **Storage**: multiple renditions + segments **increase** total bytes vs one MP4.
- **Egress**: viewers pull segments through your CDN/R2; ABR improves experience but total delivered data for a full watch is still “about one movie”; the win is fewer stalls and abandons.

## ffmpeg direction (not a copy-paste recipe)

- Define a **ladder** (e.g. 1080p / 720p / 480p / 360p) with target bitrates appropriate for your content.
- Output **HLS** with aligned segment boundaries across renditions if you want smooth switching (ffmpeg `-hls_time`, `-master_pl_name`, or multi-pass workflows).
- Test playback on **Chrome** (hls.js) and **Safari** (native HLS).

For production tuning, refer to current ffmpeg documentation and your target devices; parameters vary by codec (H.264 vs HEVC vs AV1) and licensing constraints.

## Summary

| Component | Responsibility |
|-----------|----------------|
| **This admin (Next.js)** | Auth, presigned/multipart upload, complete upload, update DB, **POST transcode job** (metadata only). |
| **R2** | Source object + transcoded output objects. |
| **FastAPI service** | ffmpeg, upload results, update DB or webhook. |
| **Supabase** | Metadata, encoding status, manifest URL for the player. |
| **Viewer app** | HLS-capable player using manifest URL when ready. |

This keeps uploads fast and cheap on the wire, and isolates transcoding cost and failure modes in a service you can scale independently.

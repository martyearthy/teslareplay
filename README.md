# Tesla Replay

[**Use the hosted version →**](https://martyearthy.github.io/teslareplay/)

A modern web-based tool for viewing Tesla Dashcam footage with integrated telemetry visualization. This application parses MP4 files directly in your browser, extracts the embedded SEI (Supplemental Enhancement Information) metadata, and overlays driving data in real-time.

Original code from Tesla: https://github.com/teslamotors/dashcam

## Features

- **Local Video Playback**: Uses the browser's native `VideoDecoder` API to play MP4 files frame-by-frame.
- **Privacy-First**: All processing happens locally in your browser. No video or telemetry data is uploaded to any server.
- **TeslaCam Folder Support**:
  - Drop your entire `TeslaCam/` folder (or choose it in the UI) instead of picking single files.
  - Automatically groups per-camera clips into a single “clip group” by timestamp.
  - Tags clip groups by folder (e.g. `RecentClips`, `SentryClips`, `SavedClips`) and Sentry event folder when present.
- **Sentry Collections (Event Folder Playback)**:
  - Sentry events are stored as folders containing multiple 1‑minute segments before/after an event timestamp.
  - Tesla Replay can treat each Sentry event folder as a single **collection item** with “virtual playlist” playback.
  - A red event marker shows where the `event.json.timestamp` falls within the collection timeline.
- **Clip Browser + Previews**:
  - Sidebar clip list with **lazy** thumbnail generation and a **mini route preview** (from SEI GPS) when available.
  - Designed to scale to large folders without eagerly loading every MP4 into memory at once.
- **Multi‑Camera Playback (2×2 grid)**:
  - Plays up to 4 cameras in sync (Front/Back/Left/Right) using WebCodecs decoding per camera.
  - Layout presets + per-tile focus mode for quick inspection.
- **Telemetry Visualization**:
  - **Speed**: Current vehicle speed in MPH.
  - **Gear Indicator**: Park, Reverse, Neutral, Drive.
  - **Turn Signals**: Visual left/right indicators.
  - **Steering**: Real-time steering wheel rotation.
  - **Autopilot Status**: Indicators for Manual, TACC, Autosteer, and FSD.
  - **Pedals**: Visual feedback for accelerator position and brake application.
  - **Sensors**: Collapsible view for GPS coordinates (Lat/Lon), Heading, and G-force (XYZ acceleration).
- **Interactive Map**:
  - **Route Plotting**: Automatically draws the vehicle's full path on a map using extracted GPS data.
  - **Real-time Tracking**: Shows the car's current position and heading as the video plays.
  - **Draggable Window**: The map runs in its own floating window that can be positioned anywhere on the screen.

https://x.com/MartyEarthy/highlights

## For Users

### Quick Start (Recommended)
The easiest workflow is to give Tesla Replay the **entire `TeslaCam/` folder** from your USB stick.

1. **Launch the app**
   - Use the hosted version: [**martyearthy.github.io/teslareplay**](https://martyearthy.github.io/teslareplay/)
   - Or run locally (see “Running Locally” below).

2. **Load your TeslaCam folder (best experience)**
   - **Drag & drop** the `TeslaCam/` folder onto the app, **or**
   - Click the drop zone and choose **Choose Folder**, **or**
   - Use the sidebar “Clips” panel and click **Folder**.

3. **Browse clips**
   - The left sidebar shows **clip groups** (a single timestamp with multiple camera angles).
   - Each row will progressively fill in:
     - a **thumbnail** preview
     - a **minimap route preview** (from SEI GPS, when present)
     - badges like `RecentClips` / `SentryClips` / `SavedClips` (depending on folder structure)

4. **Play**
   - Click a clip row to load it.
   - Use **Autoplay** (toggle in the control bar, default ON) to automatically start playback whenever you:
     - select a different clip group
     - switch camera angles
     - load a single MP4
   - Use **Play/Pause** or `Spacebar` to toggle playback.
   - Use the scrubber or `Left/Right Arrow` keys to jump through frames.

### Multi‑Camera Playback (2×2)
Tesla Replay includes a synced **multi-camera** mode which is ideal for reviewing a moment across all angles.

- **Enable/disable**: Use the **Multi** toggle in the control bar (default ON).
- **What you see**: A 2×2 grid that shows up to 4 camera feeds simultaneously.
- **Layout presets**:
  - **F/B/L/R** = Front, Back, Left Repeater, Right Repeater
  - **F/B/R/L** = Front, Back, Right Repeater, Left Repeater
  - Use the dropdown and the two quick-switch icon buttons next to it to swap instantly.
- **Master camera**:
  - In Multi mode, the **Camera dropdown selects the “master camera”**.
  - The master camera drives:
    - the scrubber timeline
    - the dashboard telemetry
    - the map route and current position marker
- **Focus mode per tile**:
  - Click any tile to **enlarge** it.
  - Click again or press **Esc** to return to the 2×2 grid.

### Sentry Collections (One Item per Event Folder)
Tesla stores Sentry mode footage as a folder per event, with multiple clips before and after the “trigger moment”.

Tesla Replay groups each Sentry event folder into a single **Sentry Collection** list item:

- **What is a “collection”?**
  - A collection is a virtual timeline over multiple 1‑minute camera segments.
  - Playback advances through segments automatically; you may notice a small hitch at segment boundaries (expected).

- **Event marker**
  - If `event.json` is present, Tesla Replay uses `event.json.timestamp` to compute an **event position** within the collection.
  - The clip list shows a **red dot** on a small timeline bar to indicate where the event occurs.

- **Event details popout**
  - If the Sentry folder contains `event.json`, a small info button appears on the collection row.
  - Clicking it shows the JSON fields in a readable panel (reason/city/street/lat/lon/etc).
  - Close with the ✕, click outside, or press `Esc`.

- **Thumbnails**
  - If `event.png` exists, Tesla Replay uses it as the collection’s thumbnail (fast + consistent).

### TeslaCam Folder Structure Notes
Tesla Replay expects the common Tesla USB structure:

- `TeslaCam/RecentClips/*.mp4`
- `TeslaCam/SentryClips/<event-id>/*.mp4`
- `TeslaCam/SavedClips/...` (supported if present)

Within each folder, Tesla typically writes per-camera files named like:

- `YYYY-MM-DD_HH-MM-SS-front.mp4`
- `YYYY-MM-DD_HH-MM-SS-back.mp4`
- `YYYY-MM-DD_HH-MM-SS-left_repeater.mp4`
- `YYYY-MM-DD_HH-MM-SS-right_repeater.mp4`

Tesla Replay groups these into a single **clip group** by the shared timestamp (`YYYY-MM-DD_HH-MM-SS`) plus the parent folder tag (and Sentry “event folder” when present).

> Note: Some Sentry event folders include `event.mp4` and `event.json`. Tesla Replay currently focuses on the per-camera feeds; `event.mp4` is ignored.

### Camera Angle Switching
Use the **Camera** dropdown in the control bar to switch between angles for the currently selected clip group.

- If **Autoplay** is ON (default), switching cameras will immediately start playing the newly loaded camera file.
- If a clip group is missing an angle, it will only show the available cameras.

### Clips Panel Modes (Controls/Settings Panel)
The “Clips” panel is intended to be both a clip browser and a control/settings surface. You can choose how it behaves:

- **Floating**: Panel floats in the upper-left over the video area (good for large screens).
- **Docked**: Panel docks to the left edge and **does not occlude video playback**.
- **Collapsed**: Panel shrinks to a small, unobtrusive button you can expand later.

These modes are toggled from the panel header (Dock/Float and Collapse/Expand) and are remembered across reloads.

### Dashboard + Map
- The **Dashboard** window shows speed, gear, turn signals, steering wheel angle, Autopilot state, and pedal/brake indicators.
- The **Map** window shows the driven route when GPS is present in SEI and tracks your current position during playback.
- Both the Dashboard and Map windows are draggable by the top handle (`:::`).

### Requirements / Compatibility
- **Browser**: modern Safari/Chrome/Edge with WebCodecs `VideoDecoder` support.
- **Videos**: Tesla dashcam MP4 files.
- **SEI data**: full telemetry requires Tesla firmware **2025.44.25+** and **HW3+**. If the car is parked, SEI may be missing even in supported firmware.

### Troubleshooting
- **Nothing loads when I click the page**: If you opened `index.html` directly from disk, your browser may block fetching `dashcam.proto`.
  - Run via a local web server (see below) or use the hosted version.
- **Clip list appears but no minimap**: Not all clips contain GPS/SEI; some may be parked clips or older firmware.
- **Folder selection doesn’t show subfolders**: Folder picking uses `webkitdirectory` (widely supported in Chromium; Safari support can vary by version). Drag & drop of the folder is often the most reliable.
- **Sentry collection playback seems “stuck”**:
  - Try toggling Multi off/on once (forces a reload of the current segment).
  - If you served locally and see console errors about missing `.map` files, those are usually harmless source-map 404s (see “Public release notes” below).
- **Reset UI state**
  - Tesla Replay persists UI state in `localStorage`. If your layout gets into a strange state, clear site data for the origin or remove the keys listed in “UI State Persistence”.

### Requirements
- A modern web browser (Chrome, Edge, Safari, Firefox) with support for the `VideoDecoder` API.
- MP4 files generated by a Tesla vehicle (HW3 or newer, firmware 2025.44.25+ for full SEI data support).

## For Developers

### High-Level Architecture
Tesla Replay is intentionally “no build step”: **vanilla HTML/CSS/JS** with Web APIs.

There are three major subsystems:

1. **Playback + telemetry (single MP4)**
   - Parses an MP4 into frames with timestamps and attached SEI
   - Decodes frames using **WebCodecs** and draws them to `<canvas>`
   - Updates dashboard + map in lockstep with the currently displayed frame

2. **TeslaCam folder ingest + clip browser (Phase 1)**
   - Accepts a folder of MP4s
   - Indexes them into timestamp-based **clip groups** with multiple cameras
   - Renders a sidebar list with **lazy previews** (thumbnail + mini route)
   - Loads a selected group + camera into the existing single-MP4 playback pipeline

3. **Multi-camera playback (Step 6)**
   - Loads multiple camera MP4s for a clip group simultaneously
   - Runs per-camera WebCodecs decode pipelines and synchronizes them by timestamp
   - Keeps dashboard + map tied to a “master camera” timeline
   - Supports layout presets and a per-tile focus mode
4. **Sentry collections (Option A)**
   - Collapses each `SentryClips/<eventId>/` folder into a single UI item
   - Implements a “virtual playlist” timeline that maps a global ms offset → segment → local frame index
   - Displays an event marker derived from `event.json.timestamp` when available

### Repository Layout (Key Files)
- **`index.html`**
  - App shell + DOM structure (canvas, controls, floating panels)
  - UI hooks for folder and file selection (`#folderInput`, `#fileInput`)
  - Clip browser container (`#clipBrowser`) and list (`#clipList`)
  - Autoplay toggle (`#autoplayToggle`) and camera selector (`#cameraSelect`)
  - Multi-cam UI (`#multiCamGrid`, `#multiCamToggle`, `#multiLayoutSelect`, layout quick switch buttons)

- **`style.css`**
  - Dark UI styling and glassmorphism
  - Clip browser sidebar styles (list rows, badges, thumbnail + minimap tiles)
  - Multi-cam grid + focus-mode styling
  - Docked/collapsed panel layouts

- **`script.js`** (core runtime)
  - **Initialization**
    - Leaflet map setup
    - Protobuf initialization via `DashcamHelpers.initProtobuf()`
  - **Folder ingest + indexing**
    - Builds a list of `clipGroups` from many MP4 files
    - Handles folder drag/drop and folder picker input
  - **Playback**
    - Loads an MP4 into `DashcamMP4`, parses frames + SEI, and drives WebCodecs decoding
  - **Preview pipeline**
    - Generates clip row thumbnails + minimaps lazily as rows scroll into view
  - **Autoplay**
    - When enabled, any load action triggers playback automatically
  - **UI persistence**
    - Clips panel mode (floating/docked/collapsed)
    - Multi-cam enabled state + layout preset
  - **Multi-cam**
    - Per-slot stream objects with their own `VideoDecoder`
    - Timestamp alignment across cameras + per-tile focus mode
  - **Sentry collections**
    - `buildDisplayItems()` collapses Sentry groups into a single collection item per `eventId`
    - `collectionState` manages virtual timeline playback across segments

- **`dashcam-mp4.js`**
  - **`DashcamMP4`**: parses MP4 atoms and returns video configuration + frame stream
  - SEI parsing helpers (detect “user data unregistered” payload and decode protobuf)
  - `DashcamHelpers` utilities:
    - `initProtobuf()` loads `dashcam.proto` and initializes protobuf decoding with `{ keepCase: true }`
    - `getFilesFromDataTransfer()` recursively reads a dropped folder

- **`dashcam.proto`**
  - Protobuf schema (`SeiMetadata`) for decoding telemetry.

### Data Flow (Single MP4 Playback)
1. User selects an MP4 (directly or via clip group selection).
2. `handleFile(file)` loads the file into memory (`ArrayBuffer`) and constructs `DashcamMP4`.
3. `DashcamMP4.parseFrames(seiType)` returns `frames[]`, where each frame includes:
   - `timestamp` (ms)
   - `duration` (ms, derived from MP4 `stts`)
   - `keyframe` (true for IDR)
   - `data` (H.264 NAL payload)
   - `sei` (decoded protobuf message, or null)
4. `showFrame(index)` updates:
   - Dashboard + map using `frames[index].sei`
   - Canvas using WebCodecs decoding from the nearest preceding keyframe

### TeslaCam Folder Ingest (Clip Browser)
Folder ingest is designed to be “metadata-first” and scalable:

- **Goal**: don’t load/parse 200 MP4s eagerly; instead:
  - index quickly from filenames/paths
  - generate previews lazily per row

#### Clip grouping rules
TeslaCam folders contain many MP4s that are logically one “moment” in time across cameras.

- **ClipGroup key**:
  - `tag` (folder under `TeslaCam`, e.g. `RecentClips`, `SentryClips`, `SavedClips`)
  - `eventId` (Sentry only; event folder name)
  - `timestampKey` from filename: `YYYY-MM-DD_HH-MM-SS`

- **Cameras** are identified from the filename suffix:
  - `front`, `back`, `left_repeater`, `right_repeater` (unknown suffixes are preserved as-is)

In `script.js`, each clip group is stored with:
- `filesByCamera: Map<camera, ClipFile>`
- `id: string` used as the stable UI key

#### Folder selection mechanisms
Folder ingest supports multiple browser paths:

1. **Drag & drop folder**
   - Uses `DataTransferItem.webkitGetAsEntry()` (Chromium-based browsers, some Safari builds)
   - Implemented by `DashcamHelpers.getFilesFromDataTransfer()`
   - To help grouping, the helper stores `entry.fullPath` onto the `File` as a non-enumerable `_teslaPath` field.

2. **Folder picker**
   - Uses `<input type="file" webkitdirectory multiple>`
   - Provides `file.webkitRelativePath` which is ideal for deriving tag/event folders.

If neither is available, you can still load individual MP4s.

### Preview Generation (Thumbnail + Mini Route)
The clip list generates previews lazily using `IntersectionObserver`:

- **Minimap**
  - Reads SEI messages from a representative file (prefers `front`)
  - Extracts GPS points and down-samples them for a tiny canvas route preview

- **Thumbnail**
  1. Best effort snapshot via an off-DOM `<video>` element
  2. Fallback to WebCodecs decoding of the first keyframe directly from MP4 bytes (more reliable)

Previews are cached in-memory and generated with a small concurrency limit to keep the UI responsive.

### Autoplay Behavior
Autoplay is controlled by `#autoplayToggle` (default ON).

- If enabled, after a file is loaded and the first frame is shown, the app calls `play()`.
- This means selecting a different clip group or switching camera angles will immediately start playback.

### Multi‑Camera (Implementation Details)
Multi-camera mode lives entirely in the frontend (no server-side work).

#### Concepts
- **Slots vs cameras**:
  - The grid is treated as a set of **UI slots** (`tl`, `tr`, `bl`, `br`), each mapped to a camera key.
  - Layout presets are configured in `script.js` as `MULTI_LAYOUTS`.
  - This design intentionally makes it easy to add future layouts (including 6-camera) without rewriting sync logic.

- **Master camera**
  - Dashboard + map + timeline use the master camera’s `frames[]`.
  - Other cameras use frame index mapping by timestamp.

#### Sync strategy
- For each master frame at time `t`, each non-master stream finds the nearest frame index where:
  - `stream.frames[idx].timestamp <= t` (binary search over a cached timestamp array)
- Each stream decodes from its nearest preceding keyframe up to the target frame (simple, correct baseline).

#### Focus mode
- Focus is purely UI:
  - A CSS class (`.multi-cam-grid.focused`) and a `data-focus-slot` attribute choose which tile is displayed.
  - `Esc` clears focus.

### UI State Persistence (localStorage keys)
Tesla Replay persists several UX choices so the app feels “sticky”:

- `teslareplay.ui.clipsMode`: `floating` | `docked` | `collapsed`
- `teslareplay.ui.clipsPrevMode`: last non-collapsed mode
- `teslareplay.ui.multiEnabled`: `"1"` | `"0"`
- `teslareplay.ui.multiLayout`: `fb_lr` | `fb_rl`

### Sentry Collections (Implementation Details)
Sentry collections are designed to avoid heavy upfront parsing:

- **Indexing**
  - Sentry per-minute clips are still indexed as normal `ClipGroup`s.
  - `buildDisplayItems()` groups them by `SentryClips/<eventId>` and emits a single `collection` item.

- **Timeline model**
  - The collection has a global duration estimate computed from the first and last segment filename timestamps.
  - `progressBar` represents **milliseconds from collection start** (not frame index).

- **Segment selection**
  - `showCollectionAtMs(ms)` chooses the correct segment by comparing `ms` to `segmentStartsMs`.
  - When the segment changes, it loads that segment’s MP4(s) and then renders the nearest local frame.

- **Playback loop**
  - Collection playback schedules the next tick **only after** `showCollectionAtMs()` resolves.
  - This avoids timer races that can otherwise double-schedule and cause playback to speed up at boundaries.

- **Event marker**
  - If `event.json.timestamp` parses successfully, we compute an `anchorMs` within the collection.
  - The list UI renders a red marker at `anchorMs / durationMs`.

### Running Locally
Because the app uses `fetch('dashcam.proto')` and WebCodecs can require a secure context, run via a local server:

**Python 3:**
```bash
python3 -m http.server
```

**Node.js (http-server):**
```bash
npx http-server .
```

Then open `http://localhost:8000` (or the port shown in your terminal).

### Dependencies

- **protobuf.js** (`vendor/protobuf.min.js`): Used for decoding the Protocol Buffer messages embedded in the SEI NAL units.
- **jszip** (`vendor/jszip.min.js`): Included for legacy/export compatibility (optional for the main player).
- **Leaflet** (via CDN): Used for rendering the map and plotting the GPS coordinates.

### Key Components

#### MP4 Parsing & SEI Extraction
The `DashcamMP4` class scans the MP4 file structure to locate the `mdat` atom containing the video data. It iterates through NAL units, looking for type 6 (SEI). When found, it passes the payload to the protobuf decoder defined by `dashcam.proto`.

#### Frame Synchronization
Instead of using a standard HTML `<video>` element (which doesn't expose frame-accurate metadata extraction easily), this app uses the WebCodecs `VideoDecoder` API. This allows:
1. Decoding frames manually.
2. Associating the exact SEI data package with the specific frame being rendered.
3. Drawing the frame to a `<canvas>` element.

#### Mapping Logic
When a file is loaded, the app iterates through all parsed frames to extract GPS coordinates (`latitude_deg`, `longitude_deg`). It creates a `L.polyline` to visualize the entire route immediately. During playback, a `L.circleMarker` is updated frame-by-frame to reflect the car's current position.

### Implementation Notes & Lessons Learned

If you are building your own parser or modifying this one, pay attention to these critical details:

1. **Protobuf & Case Sensitivity**:
   The standard `protobuf.js` library converts field names to camelCase by default (e.g., `vehicle_speed_mps` becomes `vehicleSpeedMps`). However, the Tesla `.proto` definitions and downstream logic often expect snake_case.
   - **Solution**: Always initialize the parser with `{ keepCase: true }`.
   ```javascript
   protobuf.parse(protoText, { keepCase: true });
   ```

2. **SEI Parsing**:
   Tesla embeds telemetry in "User Data Unregistered" SEI messages (NAL type 6, payload type 5).
   - **Magic Bytes**: Look for the protobuf payload inside the SEI message.
   - **Emulation Prevention**: Raw NAL units contain "emulation prevention bytes" (`0x03`) inserted to prevent false start codes (`0x000001`). You **must** strip these bytes before attempting to decode the protobuf message, or parsing will fail corruptly.

3.  **Variable Frame Rates**:
    Tesla dashcam footage is not always a perfect constant frame rate.
    - **Solution**: Do not assume 30 FPS. Read the `stts` (Sample To Time) atom in the MP4 `moov` header to get the exact duration of each frame for smooth playback synchronization.

4. **Coordinate Systems**:
   - **Steering Angle**: The raw value is in degrees.
   - **Acceleration**: The IMU values (`linear_acceleration_mps2`) are in meters per second squared ($m/s^2$).

5. **Folder ingest is not “one API fits all”**
   - Drag/drop folder traversal relies on `DataTransferItem.webkitGetAsEntry()` which is not consistently supported across all browsers/versions.
   - Folder picking uses `<input webkitdirectory>`, which is widely supported in Chromium and works in Safari depending on version.
   - **Practical takeaway**: support both, treat paths as “best effort”, and never assume the presence of a stable relative path.

6. **Thumbnails from `<video>` can be flaky**
   - Some browsers won’t produce a drawable frame immediately after `loadeddata`.
   - The thumbnail implementation is more robust when it:
     - waits for `loadedmetadata`
     - seeks slightly forward
     - waits for an actual decoded frame (`requestVideoFrameCallback` when available)
   - **Fallback**: decoding the first keyframe via WebCodecs is significantly more reliable for local Tesla MP4s.

7. **Multi-camera decode cost is real**
   - The “decode from keyframe to target frame” approach is simple and correct, but it can be CPU-heavy when scrubbing.
   - For future optimization:
     - cache decoded frames around the current time window
     - avoid recreating `VideoDecoder` for small seeks
     - consider a per-stream “decoder warm state” and smarter flush strategy
     - downscale decode outputs for multi-cam tiles (if/when WebCodecs scaling fits the target browsers)

8. **Collections require careful timebase handling**
   - Collections switch the scrubber from “frame index” to “milliseconds from start”.
   - One subtle Safari gotcha: if you set a large slider `step` (e.g., 100ms) Safari may snap programmatic updates, which can make playback appear stuck or jittery.
   - **Practical solution**: keep `step=1` and quantize only *user scrubs*, not programmatic playback.

9. **Timer races are the #1 source of “sudden speed-up” bugs**
   - Any segment-based system that loads asynchronously can accidentally create overlapping timers.
   - The safe pattern is:
     - cancel any existing timer
     - perform the async load
     - schedule the next tick only after the load resolves

### Public Release Notes (Optional but Recommended)
If you host this publicly (GitHub Pages, etc.), these quick polish items improve perceived quality:

- **Avoid source-map 404s in the console**
  - Some vendored libraries reference `.map` files that you may not ship (e.g. `protobuf.min.js.map`).
  - These errors are harmless, but they look scary in DevTools. Either include the `.map` files or remove the sourceMappingURL comment from the vendor bundle.

- **Consider replacing `alert()` with toasts**
  - Browser alerts are blocking and feel “old web”.
  - A small non-blocking toast system is a great low-risk UX upgrade.

### Design Notes for Future Work (Multi-Camera + Export)
This repo is now structured so future features plug in cleanly:

- **6-camera playback layouts (planned)**
  - Newer vehicles/firmware may include additional cameras (e.g., left/right pillar feeds).
  - The multi-cam system is already slot/layout driven; adding a 3×2 grid is mostly UI + layout config work.

- **Export (planned)**
  - SEI extraction already exists (`DashcamMP4.extractSeiMessages()`).
  - Export formats to consider:
    - CSV per clip or per folder
    - GPX/GeoJSON for route paths
    - “event summaries” for Sentry clips

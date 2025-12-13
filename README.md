# Tesla Replay

[**Use the hosted version →**](https://martyearthy.github.io/teslareplay/)

A modern web-based tool for viewing Tesla Dashcam footage with integrated telemetry visualization. This application parses MP4 files directly in your browser, extracts the embedded SEI (Supplemental Enhancement Information) metadata, and overlays driving data in real-time.

Original code from Tesla: https://github.com/teslamotors/dashcam

## Features

- **Local Video Playback**: Uses the browser's native `VideoDecoder` API to play MP4 files frame-by-frame.
- **Privacy-First**: All processing happens locally in your browser. No video or telemetry data is uploaded to any server.
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
   - Use **Autoplay** (toggle in the control bar) to automatically start playback whenever you:
     - select a different clip group
     - switch camera angles
     - load a single MP4
   - Use **Play/Pause** or `Spacebar` to toggle playback.
   - Use the scrubber or `Left/Right Arrow` keys to jump through frames.

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

### Requirements
- A modern web browser (Chrome, Edge, Safari, Firefox) with support for the `VideoDecoder` API.
- MP4 files generated by a Tesla vehicle (HW3 or newer, firmware 2025.44.25+ for full SEI data support).

## For Developers

### High-Level Architecture
Tesla Replay is intentionally “no build step”: **vanilla HTML/CSS/JS** with Web APIs.

There are two major subsystems:

1. **Playback + telemetry (single MP4)**
   - Parses an MP4 into frames with timestamps and attached SEI
   - Decodes frames using **WebCodecs** and draws them to `<canvas>`
   - Updates dashboard + map in lockstep with the currently displayed frame

2. **TeslaCam folder ingest + clip browser (Phase 1)**
   - Accepts a folder of MP4s
   - Indexes them into timestamp-based **clip groups** with multiple cameras
   - Renders a sidebar list with **lazy previews** (thumbnail + mini route)
   - Loads a selected group + camera into the existing single-MP4 playback pipeline

### Repository Layout (Key Files)
- **`index.html`**
  - App shell + DOM structure (canvas, controls, floating panels)
  - UI hooks for folder and file selection (`#folderInput`, `#fileInput`)
  - Clip browser container (`#clipBrowser`) and list (`#clipList`)
  - Autoplay toggle (`#autoplayToggle`) and camera selector (`#cameraSelect`)

- **`style.css`**
  - Dark UI styling and glassmorphism
  - Clip browser sidebar styles (list rows, badges, thumbnail + minimap tiles)
  - Small unobtrusive info button linking to GitHub

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

### Running Locally

Because the application uses `fetch` to load the `.proto` file and `VideoDecoder` which requires a secure context (or localhost), you must run it via a local web server.

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

### Design Notes for Future Work (Multi-Camera + Export)
This repo is now structured so future features plug in cleanly:

- **Multi-camera playback (planned “Step 6”)**
  - `ClipGroup` already stores per-camera files; the next step is to decode N canvases in parallel.
  - The existing “decode from keyframe to target frame” approach can be applied per camera.
  - A “master timeline” can drive all camera decoders, with per-file frame alignment (nearest timestamp).

- **Export (planned)**
  - SEI extraction already exists (`DashcamMP4.extractSeiMessages()`).
  - Export formats to consider:
    - CSV per clip or per folder
    - GPX/GeoJSON for route paths
    - “event summaries” for Sentry clips

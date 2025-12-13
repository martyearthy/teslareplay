// State
let mp4 = null;
let frames = null;
let firstKeyframe = 0;
let decoder = null;
let decoding = false;
let pendingFrame = null;
let playing = false;
let playTimer = null;
let seiType = null;
let enumFields = null;

// Folder/Clip Browser State (Phase 1)
let clipGroups = [];
let clipGroupById = new Map();
let selectedGroupId = null;
let selectedCamera = 'front';
let folderLabel = null; // e.g. "TeslaCam" or picked folder name

// Preview pipeline (lazy, cached)
const previewCache = new Map(); // groupId -> { thumbDataUrl, pathPoints, status }
let previewObserver = null;
const previewQueue = [];
let previewInFlight = 0;
const MAX_PREVIEW_CONCURRENCY = 1;

// DOM Elements
const $ = id => document.getElementById(id);
const dropOverlay = $('dropOverlay');
const fileInput = $('fileInput');
const folderInput = $('folderInput');
const overlayChooseFolderBtn = $('overlayChooseFolderBtn');
const overlayChooseFileBtn = $('overlayChooseFileBtn');
const canvas = $('videoCanvas');
const ctx = canvas.getContext('2d');
const progressBar = $('progressBar');
const playBtn = $('playBtn');
const timeDisplay = $('timeDisplay');
const dashboardVis = $('dashboardVis');
const videoContainer = $('videoContainer');
const clipList = $('clipList');
const clipBrowserSubtitle = $('clipBrowserSubtitle');
const chooseFolderBtn = $('chooseFolderBtn');
const chooseFileBtn = $('chooseFileBtn');
const cameraSelect = $('cameraSelect');
const autoplayToggle = $('autoplayToggle');

// Visualization Elements
const speedValue = $('speedValue');
const gearP = $('gearP');
const gearR = $('gearR');
const gearN = $('gearN');
const gearD = $('gearD');
const blinkLeft = $('blinkLeft');
const blinkRight = $('blinkRight');
const steeringIcon = $('steeringIcon');
const autopilotStatus = $('autopilotStatus');
const apText = $('apText');
const brakeInd = $('brakeInd');
const accelBar = $('accelBar');
const toggleExtra = $('toggleExtra');
const extraDataContainer = document.querySelector('.extra-data-container');
const mapVis = $('mapVis');

// Map State
let map = null;
let mapMarker = null;
let mapPolyline = null;
let mapPath = [];

// Extra Data Elements
const valLat = $('valLat');
const valLon = $('valLon');
const valHeading = $('valHeading');
const valAccX = $('valAccX');
const valAccY = $('valAccY');
const valAccZ = $('valAccZ');
const valSeq = $('valSeq');

// Constants
const MPS_TO_MPH = 2.23694;

// Initialize
(async function init() {
    // Init Map
    try {
        if (window.L) {
            map = L.map('map', { zoomControl: false, attributionControl: false }).setView([0, 0], 2);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                maxZoom: 19,
                subdomains: 'abcd'
            }).addTo(map);
        }
    } catch(e) { console.error('Leaflet init failed', e); }

    try {
        const { SeiMetadata, enumFields: ef } = await DashcamHelpers.initProtobuf();
        seiType = SeiMetadata;
        enumFields = ef;
    } catch (e) {
        console.error('Failed to init protobuf:', e);
        alert('Failed to initialize metadata parser.');
    }

    // Clip Browser buttons
    chooseFolderBtn.onclick = (e) => {
        e.preventDefault();
        folderInput.click();
    };
    chooseFileBtn.onclick = (e) => {
        e.preventDefault();
        fileInput.click();
    };

    cameraSelect.onchange = () => {
        selectedCamera = cameraSelect.value;
        const g = selectedGroupId ? clipGroupById.get(selectedGroupId) : null;
        if (g) loadClipGroupCamera(g, selectedCamera);
    };
})();

// Drag & Drop Logic for Floating Vis
let isDragging = false;
let draggedEl = null;
const dragOffsets = new Map(); // el -> {x, y}

const dragHandleSelector = '.vis-header';
videoContainer.addEventListener('mousedown', dragStart);
videoContainer.addEventListener('mouseup', dragEnd);
videoContainer.addEventListener('mousemove', drag);
videoContainer.addEventListener('mouseleave', dragEnd);

function getDragOffset(el) {
    if (!dragOffsets.has(el)) dragOffsets.set(el, { x: 0, y: 0 });
    return dragOffsets.get(el);
}

function dragStart(e) {
    const handle = e.target.closest(dragHandleSelector);
    if (!handle) return;
    
    const el = handle.parentElement;
    if (el && (el.classList.contains('dashboard-vis') || el.classList.contains('map-vis'))) {
        draggedEl = el;
        isDragging = true;
        
        const offset = getDragOffset(el);
        // Store initial mouse position relative to current translation
        el.dataset.startX = e.clientX - offset.x;
        el.dataset.startY = e.clientY - offset.y;
    }
}

function dragEnd(e) {
    isDragging = false;
    draggedEl = null;
}

function drag(e) {
    if (isDragging && draggedEl) {
        e.preventDefault();
        const startX = parseFloat(draggedEl.dataset.startX);
        const startY = parseFloat(draggedEl.dataset.startY);
        
        const currentX = e.clientX - startX;
        const currentY = e.clientY - startY;
        
        const offset = getDragOffset(draggedEl);
        offset.x = currentX;
        offset.y = currentY;
        
        setTranslate(currentX, currentY, draggedEl);
    }
}

function setTranslate(xPos, yPos, el) {
    el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
}

// File Handling
// Default click = choose folder (streamlined TeslaCam flow).
dropOverlay.onclick = (e) => {
    // If a nested button handled it, do nothing here.
    if (e?.target?.closest?.('#overlayChooseFolderBtn, #overlayChooseFileBtn')) return;
    folderInput.click();
};
overlayChooseFolderBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    folderInput.click();
};
overlayChooseFileBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileInput.click();
};
fileInput.onchange = e => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) handleFile(f);
};
folderInput.onchange = e => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;
    const root = getRootFolderNameFromWebkitRelativePath(files[0]?.webkitRelativePath);
    handleFolderFiles(files, root);
};
dropOverlay.ondragover = e => { e.preventDefault(); dropOverlay.classList.add('hover'); };
dropOverlay.ondragleave = e => { dropOverlay.classList.remove('hover'); };
dropOverlay.ondrop = e => {
    e.preventDefault();
    dropOverlay.classList.remove('hover');

    // Prefer directory traversal if available (supports dropping TeslaCam folder).
    const items = e.dataTransfer?.items;
    if (items?.length && window.DashcamHelpers?.getFilesFromDataTransfer) {
        DashcamHelpers.getFilesFromDataTransfer(items).then(({ files, directoryName }) => {
            if (files?.length > 1) {
                handleFolderFiles(files, directoryName);
            } else if (files?.length === 1) {
                handleFile(files[0]);
            } else if (e.dataTransfer?.files?.length) {
                handleFile(e.dataTransfer.files[0]);
            }
        }).catch(() => {
            if (e.dataTransfer?.files?.length) handleFile(e.dataTransfer.files[0]);
        });
        return;
    }

    if (e.dataTransfer?.files?.length) handleFile(e.dataTransfer.files[0]);
};

async function handleFile(file) {
    if (!file || !file.name.toLowerCase().endsWith('.mp4')) {
        alert('Please select a valid MP4 file.');
        return;
    }

    // Leaving folder mode? Keep clip list, but update subtitle.
    clipBrowserSubtitle.textContent = selectedGroupId ? clipBrowserSubtitle.textContent : 'Single MP4 loaded';
    folderLabel = folderLabel || null;

    // Reset state
    pause();
    if (decoder) { try { decoder.close(); } catch { } decoder = null; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // UI Reset
    dropOverlay.classList.add('hidden');
    dashboardVis.classList.remove('visible');
    mapVis.classList.remove('visible');
    playBtn.disabled = true;
    progressBar.disabled = true;

    try {
        await loadMp4IntoPlayer(file);
        
        firstKeyframe = frames.findIndex(f => f.keyframe);
        if (firstKeyframe === -1) throw new Error('No keyframes found in MP4');

        const config = mp4.getConfig();
        canvas.width = config.width;
        canvas.height = config.height;
        
        // Setup Progress Bar
        progressBar.min = 0;
        progressBar.max = frames.length - 1;
        progressBar.value = firstKeyframe;
        
        // Map Setup
        if (map) {
            mapPath = [];
            if (mapMarker) { mapMarker.remove(); mapMarker = null; }
            if (mapPolyline) { mapPolyline.remove(); mapPolyline = null; }
            
            // Extract all coordinates for path
            // This might be heavy for long videos, but standard clips are 1 min ~ 1800-3600 frames. Fine.
            mapPath = frames
                .filter(f => f.sei && f.sei.latitude_deg && f.sei.longitude_deg)
                .map(f => [f.sei.latitude_deg, f.sei.longitude_deg]);

            if (mapPath.length > 0) {
                mapVis.classList.add('visible');
                // Allow transition
                setTimeout(() => {
                    map.invalidateSize();
                    mapPolyline = L.polyline(mapPath, { color: '#3e9cbf', weight: 3, opacity: 0.7 }).addTo(map);
                    map.fitBounds(mapPolyline.getBounds(), { padding: [20, 20] });
                }, 100);
            }
        }
        
        // Enable UI
        playBtn.disabled = false;
        progressBar.disabled = false;
        dashboardVis.classList.add('visible');
        
        showFrame(firstKeyframe);

        // Autoplay if enabled
        if (autoplayToggle?.checked) {
            // Let the first frame draw before starting playback.
            setTimeout(() => play(), 0);
        }
    } catch (err) {
        console.error(err);
        alert('Error loading file: ' + err.message);
        dropOverlay.classList.remove('hidden');
    }
}

async function loadMp4IntoPlayer(file) {
    const buffer = await file.arrayBuffer();
    mp4 = new DashcamMP4(buffer);
    frames = mp4.parseFrames(seiType);
    return { mp4, frames };
}

// -------------------------------------------------------------
// Folder ingest + Clip Groups (Phase 1)
// -------------------------------------------------------------

function getRootFolderNameFromWebkitRelativePath(relPath) {
    if (!relPath || typeof relPath !== 'string') return null;
    const parts = relPath.split('/').filter(Boolean);
    return parts.length ? parts[0] : null;
}

function getBestEffortRelPath(file, directoryName = null) {
    // 1) webkitdirectory input provides webkitRelativePath
    if (file?.webkitRelativePath) return file.webkitRelativePath;

    // 2) directory drop traversal: our helper stores entry.fullPath on the File as _teslaPath
    //    Example: "/TeslaCam/RecentClips/2025-...-front.mp4"
    const p = file?._teslaPath;
    if (typeof p === 'string' && p.length) {
        return p.startsWith('/') ? p.slice(1) : p;
    }

    // 3) fall back to whatever we know
    return directoryName ? `${directoryName}/${file.name}` : file.name;
}

function parseTeslaCamPath(relPath) {
    const norm = (relPath || '').replace(/\\/g, '/');
    const parts = norm.split('/').filter(Boolean);

    // Find "TeslaCam" segment if present.
    const teslaIdx = parts.findIndex(p => p.toLowerCase() === 'teslacam');
    const base = teslaIdx >= 0 ? parts.slice(teslaIdx) : parts;

    // base: ["TeslaCam", "<tag>", ...]
    if (base.length >= 2 && base[0].toLowerCase() === 'teslacam') {
        const tag = base[1];
        const rest = base.slice(2);
        return { tag, rest };
    }

    // No TeslaCam root: best effort tag from first folder if any
    if (parts.length >= 2) return { tag: parts[0], rest: parts.slice(1) };
    return { tag: 'Unknown', rest: parts.slice(1) };
}

function parseClipFilename(name) {
    // Tesla naming: YYYY-MM-DD_HH-MM-SS-front.mp4
    // Also seen in Sentry: same naming inside event folder; also "event.mp4" which we ignore.
    const lower = name.toLowerCase();
    if (!lower.endsWith('.mp4')) return null;
    if (lower === 'event.mp4') return null;

    const m = name.match(/^(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})-(.+)\.mp4$/i);
    if (!m) return null;
    const timestampKey = `${m[1]}_${m[2]}`;
    const cameraRaw = m[3];
    return { timestampKey, camera: normalizeCamera(cameraRaw) };
}

function normalizeCamera(cameraRaw) {
    const c = (cameraRaw || '').toLowerCase();
    if (c === 'front') return 'front';
    if (c === 'back') return 'back';
    if (c === 'left_repeater' || c === 'left') return 'left_repeater';
    if (c === 'right_repeater' || c === 'right') return 'right_repeater';
    return c || 'unknown';
}

function cameraLabel(camera) {
    if (camera === 'front') return 'Front';
    if (camera === 'back') return 'Back';
    if (camera === 'left_repeater') return 'Left';
    if (camera === 'right_repeater') return 'Right';
    return camera;
}

function timestampLabel(timestampKey) {
    // "2025-12-11_17-12-17" -> "2025-12-11 17:12:17"
    return (timestampKey || '').replace('_', ' ').replace(/-/g, (m, off, s) => {
        // keep date hyphens; convert time hyphens to colons by using position in string
        return m;
    }).replace(/(\d{4}-\d{2}-\d{2}) (\d{2})-(\d{2})-(\d{2})/, '$1 $2:$3:$4');
}

function buildClipGroupsFromFiles(files, directoryName = null) {
    const groups = new Map(); // id -> group
    let inferredRoot = directoryName || null;

    for (const file of files) {
        const relPath = getBestEffortRelPath(file, directoryName);
        const { tag, rest } = parseTeslaCamPath(relPath);
        const filename = rest[rest.length - 1] || file.name;
        const parsed = parseClipFilename(filename);
        if (!parsed) continue;

        // SentryClips/<eventId>/YYYY-...-front.mp4
        // RecentClips/YYYY-...-front.mp4
        let eventId = null;
        if (tag.toLowerCase() === 'sentryclips' && rest.length >= 2) {
            eventId = rest[0];
        }

        const groupId = `${tag}/${eventId ? eventId + '/' : ''}${parsed.timestampKey}`;
        if (!groups.has(groupId)) {
            groups.set(groupId, {
                id: groupId,
                tag,
                eventId,
                timestampKey: parsed.timestampKey,
                filesByCamera: new Map(),
                bestRelPathHint: relPath
            });
        }
        const g = groups.get(groupId);
        g.filesByCamera.set(parsed.camera, { file, relPath, tag, eventId, timestampKey: parsed.timestampKey, camera: parsed.camera });

        // try to infer folder label from relPath root if possible
        if (!inferredRoot && relPath) inferredRoot = relPath.split('/')[0] || null;
    }

    const arr = Array.from(groups.values());
    arr.sort((a, b) => (b.timestampKey || '').localeCompare(a.timestampKey || ''));
    return { groups: arr, inferredRoot };
}

function handleFolderFiles(fileList, directoryName = null) {
    if (!seiType) {
        alert('Metadata parser not initialized yet—try again in a second.');
        return;
    }

    const files = (Array.isArray(fileList) ? fileList : Array.from(fileList))
        .filter(f => f.name?.toLowerCase().endsWith('.mp4'));

    if (!files.length) {
        alert('No MP4 files found in that folder.');
        return;
    }

    // Build index
    const built = buildClipGroupsFromFiles(files, directoryName);
    clipGroups = built.groups;
    clipGroupById = new Map(clipGroups.map(g => [g.id, g]));
    folderLabel = built.inferredRoot || directoryName || 'Folder';

    // Reset selection + previews
    selectedGroupId = null;
    previewCache.clear();
    previewQueue.length = 0;
    previewInFlight = 0;

    // Update UI
    clipBrowserSubtitle.textContent = `${folderLabel}: ${clipGroups.length} clip group${clipGroups.length === 1 ? '' : 's'}`;
    renderClipList();

    // Autoselect first group (most recent)
    if (clipGroups.length) {
        selectClipGroup(clipGroups[0].id);
    }

    // Hide overlay once we have a folder loaded
    dropOverlay.classList.add('hidden');
}

function renderClipList() {
    clipList.innerHTML = '';
    if (!clipGroups.length) return;

    if (previewObserver) {
        try { previewObserver.disconnect(); } catch { /* ignore */ }
        previewObserver = null;
    }

    for (const g of clipGroups) {
        const item = document.createElement('div');
        item.className = 'clip-item';
        item.dataset.groupid = g.id;

        const cameras = Array.from(g.filesByCamera.keys());
        const badges = [
            `<span class="badge">${escapeHtml(g.tag)}</span>`,
            g.eventId ? `<span class="badge muted">${escapeHtml(g.eventId)}</span>` : '',
            `<span class="badge muted">${cameras.length} cam</span>`
        ].join('');

        item.innerHTML = `
            <div class="clip-media">
                <div class="clip-thumb"><img alt="" /></div>
                <canvas class="clip-minimap" width="112" height="63"></canvas>
            </div>
            <div class="clip-meta">
                <div class="clip-title">${escapeHtml(timestampLabel(g.timestampKey))}</div>
                <div class="clip-badges">${badges}</div>
                <div class="clip-sub">
                    <div>${escapeHtml(cameras.map(cameraLabel).join(' · '))}</div>
                </div>
            </div>
        `;

        item.onclick = () => selectClipGroup(g.id);
        clipList.appendChild(item);
    }

    // Setup (or refresh) IntersectionObserver for lazy previews
    previewObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const el = entry.target;
            const groupId = el.dataset.groupid;
            if (groupId) ensureGroupPreview(groupId);
        }
    }, { root: clipList, threshold: 0.2 });

    for (const el of clipList.querySelectorAll('.clip-item')) {
        previewObserver.observe(el);
    }
    highlightSelectedClip();
}

function highlightSelectedClip() {
    for (const el of clipList.querySelectorAll('.clip-item')) {
        el.classList.toggle('selected', el.dataset.groupid === selectedGroupId);
    }
}

function selectClipGroup(groupId) {
    const g = clipGroupById.get(groupId);
    if (!g) return;
    selectedGroupId = groupId;
    highlightSelectedClip();

    // Choose default camera: front preferred, else first available
    const defaultCam = g.filesByCamera.has('front') ? 'front' : (g.filesByCamera.keys().next().value || 'front');
    selectedCamera = defaultCam;
    updateCameraSelect(g);
    loadClipGroupCamera(g, selectedCamera);

    // Kick off preview for this group immediately
    ensureGroupPreview(groupId, { highPriority: true });
}

function updateCameraSelect(group) {
    const cams = Array.from(group.filesByCamera.keys());
    cameraSelect.innerHTML = '';
    const ordered = ['front', 'back', 'left_repeater', 'right_repeater', ...cams];
    const seen = new Set();
    for (const cam of ordered) {
        if (seen.has(cam)) continue;
        seen.add(cam);
        if (!group.filesByCamera.has(cam)) continue;
        const opt = document.createElement('option');
        opt.value = cam;
        opt.textContent = cameraLabel(cam);
        cameraSelect.appendChild(opt);
    }
    cameraSelect.disabled = cameraSelect.options.length === 0;
    cameraSelect.value = selectedCamera;
}

function loadClipGroupCamera(group, camera) {
    const entry = group.filesByCamera.get(camera) || group.filesByCamera.get('front') || group.filesByCamera.values().next().value;
    if (!entry?.file) return;
    // This will reset player state and parse SEI/frames, preserving SEI importance.
    handleFile(entry.file);
}

function ensureGroupPreview(groupId, opts = {}) {
    const existing = previewCache.get(groupId);
    if (existing?.status === 'ready' || existing?.status === 'loading') return;
    previewCache.set(groupId, { status: 'queued' });

    const task = async () => {
        previewCache.set(groupId, { ...(previewCache.get(groupId) || {}), status: 'loading' });
        const group = clipGroupById.get(groupId);
        if (!group) return;

        // choose best file for preview: front preferred
        const entry = group.filesByCamera.get('front') || group.filesByCamera.values().next().value;
        if (!entry?.file) return;

        // 1) minimap from SEI GPS
        let pathPoints = null;
        let buffer = null;
        try {
            buffer = await entry.file.arrayBuffer();
            const pmp4 = new DashcamMP4(buffer);
            const messages = pmp4.extractSeiMessages(seiType);
            const pts = [];
            for (const m of messages) {
                const lat = m?.latitude_deg;
                const lon = m?.longitude_deg;
                if (typeof lat === 'number' && typeof lon === 'number' && lat !== 0 && lon !== 0) pts.push([lat, lon]);
            }
            pathPoints = downsamplePoints(pts, 120);
        } catch { /* ignore */ }

        // 2) thumbnail (best-effort) using HTMLVideoElement snapshot (fast enough for previews)
        let thumbDataUrl = null;
        try {
            thumbDataUrl = await captureVideoThumbnail(entry.file, 112, 63);
        } catch { /* ignore */ }
        // Fallback: decode first keyframe using WebCodecs (more reliable for local MP4s)
        if (!thumbDataUrl && buffer) {
            try {
                thumbDataUrl = await captureWebcodecsThumbnailFromMp4Buffer(buffer, 112, 63);
            } catch { /* ignore */ }
        }

        previewCache.set(groupId, { status: 'ready', thumbDataUrl, pathPoints });
        applyGroupPreviewToRow(groupId);
    };

    if (opts.highPriority) previewQueue.unshift(task);
    else previewQueue.push(task);
    pumpPreviewQueue();
}

function pumpPreviewQueue() {
    while (previewInFlight < MAX_PREVIEW_CONCURRENCY && previewQueue.length) {
        const task = previewQueue.shift();
        previewInFlight++;
        Promise.resolve()
            .then(task)
            .catch(() => { })
            .finally(() => {
                previewInFlight--;
                pumpPreviewQueue();
            });
    }
}

function applyGroupPreviewToRow(groupId) {
    const el = clipList.querySelector(`.clip-item[data-groupid="${cssEscape(groupId)}"]`);
    if (!el) return;
    const preview = previewCache.get(groupId);
    if (!preview || preview.status !== 'ready') return;

    const img = el.querySelector('.clip-thumb img');
    if (img && preview.thumbDataUrl) img.src = preview.thumbDataUrl;

    const canvasEl = el.querySelector('canvas.clip-minimap');
    if (canvasEl && preview.pathPoints?.length) {
        drawMiniPath(canvasEl, preview.pathPoints);
    }
}

function downsamplePoints(points, maxPoints) {
    if (!Array.isArray(points) || points.length <= maxPoints) return points;
    const step = points.length / maxPoints;
    const out = [];
    for (let i = 0; i < maxPoints; i++) out.push(points[Math.floor(i * step)]);
    return out;
}

function drawMiniPath(canvasEl, points) {
    const c = canvasEl.getContext('2d');
    const w = canvasEl.width, h = canvasEl.height;
    c.clearRect(0, 0, w, h);

    // background
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(0, 0, w, h);

    let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
    for (const [lat, lon] of points) {
        minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
        minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon);
    }
    const pad = 6;
    const dx = (maxLon - minLon) || 1e-9;
    const dy = (maxLat - minLat) || 1e-9;

    c.strokeStyle = 'rgba(62, 156, 191, 0.95)';
    c.lineWidth = 2;
    c.beginPath();
    points.forEach(([lat, lon], idx) => {
        const x = pad + ((lon - minLon) / dx) * (w - pad * 2);
        const y = pad + (1 - (lat - minLat) / dy) * (h - pad * 2);
        if (idx === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
    });
    c.stroke();

    // start/end markers
    const [sLat, sLon] = points[0];
    const [eLat, eLon] = points[points.length - 1];
    const sx = pad + ((sLon - minLon) / dx) * (w - pad * 2);
    const sy = pad + (1 - (sLat - minLat) / dy) * (h - pad * 2);
    const ex = pad + ((eLon - minLon) / dx) * (w - pad * 2);
    const ey = pad + (1 - (eLat - minLat) / dy) * (h - pad * 2);

    c.fillStyle = 'rgba(255,255,255,0.9)';
    c.beginPath(); c.arc(sx, sy, 2.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255, 0, 0, 0.85)';
    c.beginPath(); c.arc(ex, ey, 2.5, 0, Math.PI * 2); c.fill();
}

async function captureVideoThumbnail(file, width, height) {
    const url = URL.createObjectURL(file);
    try {
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.preload = 'auto';
        video.src = url;

        // Some browsers won't decode a drawable frame until after metadata + a seek + a frame callback.
        await new Promise((resolve, reject) => {
            const onError = () => reject(new Error('video load failed'));
            video.addEventListener('error', onError, { once: true });
            video.addEventListener('loadedmetadata', () => resolve(), { once: true });
            try { video.load(); } catch { /* ignore */ }
        });

        // Seek a bit to avoid black/empty first frame in some encodes.
        const seekTo = (() => {
            const d = Number.isFinite(video.duration) ? video.duration : 0;
            if (d > 0) return Math.min(0.5, Math.max(0.05, d * 0.05));
            return 0.1;
        })();
        try {
            video.currentTime = seekTo;
            await new Promise((resolve) => video.addEventListener('seeked', resolve, { once: true }));
        } catch { /* ignore seek errors */ }

        // Wait for an actual decoded frame if possible.
        if (video.requestVideoFrameCallback) {
            await new Promise((resolve) => video.requestVideoFrameCallback(() => resolve()));
        } else {
            await new Promise((resolve, reject) => {
                const onError = () => reject(new Error('video decode failed'));
                video.addEventListener('error', onError, { once: true });
                video.addEventListener('canplay', () => resolve(), { once: true });
                // Safety timeout so we don't hang forever
                setTimeout(resolve, 250);
            });
        }

        const c = document.createElement('canvas');
        c.width = width;
        c.height = height;
        const cctx = c.getContext('2d');
        if (!video.videoWidth || !video.videoHeight) throw new Error('video has no decoded frame');
        cctx.drawImage(video, 0, 0, width, height);
        return c.toDataURL('image/jpeg', 0.72);
    } finally {
        URL.revokeObjectURL(url);
    }
}

async function captureWebcodecsThumbnailFromMp4Buffer(buffer, width, height) {
    if (!window.VideoDecoder) throw new Error('VideoDecoder not available');

    const localMp4 = new DashcamMP4(buffer);
    // Parse frames without decoding SEI for speed
    const localFrames = localMp4.parseFrames(null);
    const firstKeyIdx = localFrames.findIndex(f => f.keyframe);
    if (firstKeyIdx < 0) throw new Error('No keyframe found');

    const config = localMp4.getConfig();
    const frame = localFrames[firstKeyIdx];
    const sc = new Uint8Array([0, 0, 0, 1]);
    const data = frame.keyframe
        ? DashcamMP4.concat(sc, frame.sps || config.sps, sc, frame.pps || config.pps, sc, frame.data)
        : DashcamMP4.concat(sc, frame.data);

    const canvasEl = document.createElement('canvas');
    canvasEl.width = width;
    canvasEl.height = height;
    const cctx = canvasEl.getContext('2d');

    const decoder = new VideoDecoder({
        output: (vf) => {
            try {
                cctx.drawImage(vf, 0, 0, width, height);
            } finally {
                vf.close();
            }
        },
        error: () => { /* handled by flush */ }
    });
    decoder.configure({ codec: config.codec, width: config.width, height: config.height });
    decoder.decode(new EncodedVideoChunk({ type: 'key', timestamp: 0, data }));
    await decoder.flush();
    try { decoder.close(); } catch { /* ignore */ }
    return canvasEl.toDataURL('image/jpeg', 0.72);
}

function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c]));
}

function cssEscape(s) {
    if (window.CSS?.escape) return window.CSS.escape(String(s));
    // minimal escape for attribute selector usage
    return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

// Playback Logic
playBtn.onclick = () => playing ? pause() : play();
progressBar.oninput = () => {
    pause();
    showFrame(+progressBar.value);
};

// Keyboard controls
document.addEventListener('keydown', (e) => {
    if (!frames) return;
    if (e.code === 'Space') {
        e.preventDefault();
        playing ? pause() : play();
    } else if (e.code === 'ArrowLeft') {
        pause();
        const prev = Math.max(0, +progressBar.value - 15); // ~0.5s jump
        progressBar.value = prev;
        showFrame(prev);
    } else if (e.code === 'ArrowRight') {
        pause();
        const next = Math.min(frames.length - 1, +progressBar.value + 15);
        progressBar.value = next;
        showFrame(next);
    }
});

function play() {
    if (!frames || playing) return;
    playing = true;
    updatePlayButton();
    playNext();
}

function pause() {
    playing = false;
    updatePlayButton();
    if (playTimer) { clearTimeout(playTimer); playTimer = null; }
}

function updatePlayButton() {
    playBtn.innerHTML = playing 
        ? '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
        : '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
}

function playNext() {
    if (!playing) return;
    let next = +progressBar.value + 1;
    if (next >= frames.length) {
        pause();
        return;
    }
    progressBar.value = next;
    showFrame(next);
    
    // Calculate delay based on frame duration
    const duration = frames[next].duration || 33; 
    playTimer = setTimeout(playNext, duration);
}

function showFrame(index) {
    if (!frames[index]) return;
    
    // Update Vis
    updateVisualization(frames[index].sei);
    updateTimeDisplay(index);

    // Decode & Render Video
    if (decoding) {
        pendingFrame = index;
    } else {
        decodeFrame(index);
    }
}

async function decodeFrame(index) {
    decoding = true;
    try {
        // Find preceding keyframe
        let keyIdx = index;
        while (keyIdx >= 0 && !frames[keyIdx].keyframe) keyIdx--;
        if (keyIdx < 0) return; // Should not happen if firstKeyframe is correct

        if (decoder) try { decoder.close(); } catch { }
        
        const targetCount = index - keyIdx + 1;
        let count = 0;

        await new Promise((resolve, reject) => {
            decoder = new VideoDecoder({
                output: frame => {
                    count++;
                    if (count === targetCount) {
                        ctx.drawImage(frame, 0, 0);
                    }
                    frame.close();
                    if (count >= targetCount) resolve();
                },
                error: reject
            });

            const config = mp4.getConfig();
            decoder.configure({
                codec: config.codec,
                width: config.width,
                height: config.height
            });

            for (let i = keyIdx; i <= index; i++) {
                decoder.decode(createChunk(frames[i]));
            }
            decoder.flush().catch(reject);
        });
    } catch (e) {
        console.error('Decode error:', e);
    } finally {
        decoding = false;
        if (pendingFrame !== null) {
            const next = pendingFrame;
            pendingFrame = null;
            decodeFrame(next);
        }
    }
}

function createChunk(frame) {
    const sc = new Uint8Array([0, 0, 0, 1]);
    const config = mp4.getConfig();
    const data = frame.keyframe
        ? DashcamMP4.concat(sc, frame.sps || config.sps, sc, frame.pps || config.pps, sc, frame.data)
        : DashcamMP4.concat(sc, frame.data);
        
    return new EncodedVideoChunk({
        type: frame.keyframe ? 'key' : 'delta',
        timestamp: frame.timestamp * 1000,
        data
    });
}

// Visualization Logic
function updateVisualization(sei) {
    if (!sei) return;

    // Speed
    const mps = sei.vehicle_speed_mps || 0;
    const mph = Math.round(mps * MPS_TO_MPH);
    speedValue.textContent = mph;

    // Gear
    // Protocol: 0=Park, 1=Drive, 2=Reverse, 3=Neutral (Check proto definition)
    // From file read: GEAR_PARK=0, GEAR_DRIVE=1, GEAR_REVERSE=2, GEAR_NEUTRAL=3
    const gear = sei.gear_state; 
    // Reset gears
    [gearP, gearR, gearN, gearD].forEach(el => el.classList.remove('active'));
    
    if (gear === 0) gearP.classList.add('active'); // P
    else if (gear === 1) gearD.classList.add('active'); // D
    else if (gear === 2) gearR.classList.add('active'); // R
    else if (gear === 3) gearN.classList.add('active'); // N

    // Blinkers
    blinkLeft.classList.toggle('active', !!sei.blinker_on_left);
    blinkRight.classList.toggle('active', !!sei.blinker_on_right);

    // Steering
    // steering_wheel_angle is likely degrees.
    const angle = sei.steering_wheel_angle || 0;
    steeringIcon.style.transform = `rotate(${angle}deg)`;

    // Autopilot
    // 0=NONE, 1=SELF_DRIVING, 2=AUTOSTEER, 3=TACC
    const apState = sei.autopilot_state;
    autopilotStatus.className = 'autopilot-status'; // Reset
    if (apState === 2 || apState === 3) {
        autopilotStatus.classList.add('active-ap');
        apText.textContent = apState === 3 ? 'TACC' : 'Autosteer';
    } else if (apState === 1) {
        autopilotStatus.classList.add('active-fsd'); // Or just use same blue/rainbow
        apText.textContent = 'FSD';
    } else {
        apText.textContent = 'Manual';
    }

    // Pedals
    // Brake
    if (sei.brake_applied) {
        brakeInd.classList.add('active');
    } else {
        brakeInd.classList.remove('active');
    }

    // Accelerator
    // Value is typically 0-100 or 0-1.
    // Assuming 0-100 based on protobuf float type common usage, but will clamp.
    let accel = sei.accelerator_pedal_position || 0;
    // Heuristic: if value is consistently <= 1.0 and user is moving, it might be 0-1.
    // But dashcam data usually stores % as 0-100.
    if (accel > 100) accel = 100;
    if (accel < 0) accel = 0;
    
    // If we suspect 0-1 range (e.g. max observed is 1.0), we might need to multiply.
    // However, existing knowledge of Tesla data suggests 0-100.
    accelBar.style.width = `${accel}%`;

    // Extra Data
    if (extraDataContainer.classList.contains('expanded')) {
        valSeq.textContent = sei.frame_seq_no || '--';
        valLat.textContent = (sei.latitude_deg || 0).toFixed(6);
        valLon.textContent = (sei.longitude_deg || 0).toFixed(6);
        valHeading.textContent = (sei.heading_deg || 0).toFixed(1) + '°';
        
        valAccX.textContent = (sei.linear_acceleration_mps2_x || 0).toFixed(2);
        valAccY.textContent = (sei.linear_acceleration_mps2_y || 0).toFixed(2);
        valAccZ.textContent = (sei.linear_acceleration_mps2_z || 0).toFixed(2);
    }

    // Map Update
    if (map && sei.latitude_deg && sei.longitude_deg) {
        const latlng = [sei.latitude_deg, sei.longitude_deg];
        if (!mapMarker) {
            mapMarker = L.circleMarker(latlng, {
                radius: 6,
                fillColor: '#fff',
                color: '#3e9cbf',
                weight: 2,
                opacity: 1,
                fillOpacity: 1
            }).addTo(map);
        } else {
            mapMarker.setLatLng(latlng);
        }
        // Optional: Auto-pan?
        // map.panTo(latlng); 
    }
}

// Toggle Extra Data
toggleExtra.onclick = () => {
    extraDataContainer.classList.toggle('expanded');
    // Refresh data if expanding while paused
    if (extraDataContainer.classList.contains('expanded') && frames && progressBar.value) {
         updateVisualization(frames[+progressBar.value].sei);
    }
};

function updateTimeDisplay(frameIndex) {
    if (!frames || !frames[frameIndex]) return;
    const seconds = Math.floor(frames[frameIndex].timestamp / 1000);
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    timeDisplay.textContent = `${m}:${s}`;
}


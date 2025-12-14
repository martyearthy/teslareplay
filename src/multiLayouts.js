// Multi-cam layout presets.
// 4-cam layouts use slots: tl, tr, bl, br (2×2 grid).
// 6-cam layouts use slots: tl, tc, tr, bl, bc, br (3×2 grid).

export const MULTI_LAYOUTS = {
  // --- 4-camera layouts (2×2 grid) ---
  fb_lr: {
    name: 'Front/Back/Left/Right (4-cam)',
    columns: 2,
    slots: [
      { slot: 'tl', camera: 'front', label: 'Front' },
      { slot: 'tr', camera: 'back', label: 'Back' },
      { slot: 'bl', camera: 'left_repeater', label: 'Left' },
      { slot: 'br', camera: 'right_repeater', label: 'Right' }
    ]
  },
  fb_rl: {
    name: 'Front/Back/Right/Left (4-cam)',
    columns: 2,
    slots: [
      { slot: 'tl', camera: 'front', label: 'Front' },
      { slot: 'tr', camera: 'back', label: 'Back' },
      { slot: 'bl', camera: 'right_repeater', label: 'Right' },
      { slot: 'br', camera: 'left_repeater', label: 'Left' }
    ]
  },

  // --- 6-camera layouts (3×2 grid) ---
  // Spatial layout: front-facing cameras on top, rear-facing on bottom
  six_spatial: {
    name: 'All 6 Cameras (Spatial)',
    columns: 3,
    slots: [
      { slot: 'tl', camera: 'left_repeater', label: 'Left Rep' },
      { slot: 'tc', camera: 'front', label: 'Front' },
      { slot: 'tr', camera: 'right_repeater', label: 'Right Rep' },
      { slot: 'bl', camera: 'left_pillar', label: 'Left Pillar' },
      { slot: 'bc', camera: 'back', label: 'Back' },
      { slot: 'br', camera: 'right_pillar', label: 'Right Pillar' }
    ]
  },
  // Front/Back prominent in top-left/top-center
  six_fb_first: {
    name: 'All 6 Cameras (F/B First)',
    columns: 3,
    slots: [
      { slot: 'tl', camera: 'front', label: 'Front' },
      { slot: 'tc', camera: 'back', label: 'Back' },
      { slot: 'tr', camera: 'left_repeater', label: 'Left Rep' },
      { slot: 'bl', camera: 'right_repeater', label: 'Right Rep' },
      { slot: 'bc', camera: 'left_pillar', label: 'Left Pillar' },
      { slot: 'br', camera: 'right_pillar', label: 'Right Pillar' }
    ]
  }
};

export const DEFAULT_MULTI_LAYOUT = 'six_spatial';



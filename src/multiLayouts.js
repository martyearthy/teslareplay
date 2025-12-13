// Multi-cam layout presets.
// Slot order is TL, TR, BL, BR (2x2).

export const MULTI_LAYOUTS = {
  fb_lr: {
    name: 'Front/Back/Left/Right',
    slots: [
      { slot: 'tl', camera: 'front', label: 'Front' },
      { slot: 'tr', camera: 'back', label: 'Back' },
      { slot: 'bl', camera: 'left_repeater', label: 'Left' },
      { slot: 'br', camera: 'right_repeater', label: 'Right' }
    ]
  },
  fb_rl: {
    name: 'Front/Back/Right/Left',
    slots: [
      { slot: 'tl', camera: 'front', label: 'Front' },
      { slot: 'tr', camera: 'back', label: 'Back' },
      { slot: 'bl', camera: 'right_repeater', label: 'Right' },
      { slot: 'br', camera: 'left_repeater', label: 'Left' }
    ]
  }
  // Future: add 6-cam layouts that include left/right pillar cameras.
};

export const DEFAULT_MULTI_LAYOUT = 'fb_lr';



// ============================================================
// collageTemplates.js — Pre-designed collage templates
// RULES: Zero 50/50 | Hero obligatoriu | Asimetrie totală
// Coordinates: percentages (0-100) of full spread
// x+w <= 100, y+h <= 100, zero gaps, zero overlaps
// ============================================================

const TEMPLATES = {
  1: [
    { id: '1A', frames: [{x:0, y:0, w:100, h:100}] },
  ],

  2: [
    // Hero stânga 65%
    { id: '2A', frames: [{x:0, y:0, w:65, h:100}, {x:65, y:0, w:35, h:100}] },
    // Hero dreapta 62%
    { id: '2B', frames: [{x:0, y:0, w:38, h:100}, {x:38, y:0, w:62, h:100}] },
    // Hero stânga 70%
    { id: '2C', frames: [{x:0, y:0, w:70, h:100}, {x:70, y:0, w:30, h:100}] },
    // Hero dreapta 68%
    { id: '2D', frames: [{x:0, y:0, w:32, h:100}, {x:32, y:0, w:68, h:100}] },
    // Asimetric 58/42
    { id: '2E', frames: [{x:0, y:0, w:58, h:100}, {x:58, y:0, w:42, h:100}] },
  ],

  3: [
    // Hero stânga 62% + 2 stivuite dreapta
    { id: '3A', frames: [{x:0, y:0, w:62, h:100}, {x:62, y:0, w:38, h:55}, {x:62, y:55, w:38, h:45}] },
    // 2 stivuite stânga + hero dreapta 65%
    { id: '3B', frames: [{x:0, y:0, w:35, h:48}, {x:0, y:48, w:35, h:52}, {x:35, y:0, w:65, h:100}] },
    // 3 coloane asimetrice (hero centru)
    { id: '3C', frames: [{x:0, y:0, w:28, h:100}, {x:28, y:0, w:42, h:100}, {x:70, y:0, w:30, h:100}] },
    // Hero stânga 66% + 2 stivuite 34%
    { id: '3D', frames: [{x:0, y:0, w:66, h:100}, {x:66, y:0, w:34, h:42}, {x:66, y:42, w:34, h:58}] },
    // 2 stivuite stânga 32% + hero dreapta 68%
    { id: '3E', frames: [{x:0, y:0, w:32, h:58}, {x:0, y:58, w:32, h:42}, {x:32, y:0, w:68, h:100}] },
    // 3 coloane: mic-mare-mic
    { id: '3F', frames: [{x:0, y:0, w:25, h:100}, {x:25, y:0, w:45, h:100}, {x:70, y:0, w:30, h:100}] },
    // Hero stânga 58% + 2 mici 42% (40/60 split)
    { id: '3G', frames: [{x:0, y:0, w:58, h:100}, {x:58, y:0, w:42, h:40}, {x:58, y:40, w:42, h:60}] },
    // 3 coloane descrescătoare
    { id: '3H', frames: [{x:0, y:0, w:45, h:100}, {x:45, y:0, w:30, h:100}, {x:75, y:0, w:25, h:100}] },
  ],

  4: [
    // Hero stânga 58% + 3 stivuite dreapta
    { id: '4A', frames: [{x:0, y:0, w:58, h:100}, {x:58, y:0, w:42, h:30}, {x:58, y:30, w:42, h:38}, {x:58, y:68, w:42, h:32}] },
    // 3 stivuite stânga + hero dreapta 60%
    { id: '4B', frames: [{x:0, y:0, w:40, h:32}, {x:0, y:32, w:40, h:36}, {x:0, y:68, w:40, h:32}, {x:40, y:0, w:60, h:100}] },
    // Mosaic L: hero sus-stânga + 3 mici
    { id: '4C', frames: [{x:0, y:0, w:62, h:62}, {x:62, y:0, w:38, h:62}, {x:0, y:62, w:38, h:38}, {x:38, y:62, w:62, h:38}] },
    // 4 coloane asimetrice
    { id: '4D', frames: [{x:0, y:0, w:35, h:100}, {x:35, y:0, w:25, h:100}, {x:60, y:0, w:20, h:100}, {x:80, y:0, w:20, h:100}] },
    // Hero stânga 62% + 3 mici micro dreapta
    { id: '4E', frames: [{x:0, y:0, w:62, h:100}, {x:62, y:0, w:38, h:28}, {x:62, y:28, w:38, h:42}, {x:62, y:70, w:38, h:30}] },
    // Mosaic Z: alternant
    { id: '4F', frames: [{x:0, y:0, w:58, h:55}, {x:58, y:0, w:42, h:40}, {x:0, y:55, w:42, h:45}, {x:42, y:40, w:58, h:60}] },
    // Hero centru + 3 mici
    { id: '4G', frames: [{x:0, y:0, w:28, h:100}, {x:28, y:0, w:44, h:100}, {x:72, y:0, w:28, h:55}, {x:72, y:55, w:28, h:45}] },
    // 4 coloane crescătoare
    { id: '4H', frames: [{x:0, y:0, w:18, h:100}, {x:18, y:0, w:22, h:100}, {x:40, y:0, w:28, h:100}, {x:68, y:0, w:32, h:100}] },
    // Bracket: 2 stânga + hero centru + 1 dreapta
    { id: '4I', frames: [{x:0, y:0, w:25, h:55}, {x:0, y:55, w:25, h:45}, {x:25, y:0, w:45, h:100}, {x:70, y:0, w:30, h:100}] },
    // Mosaic invers: hero jos-dreapta
    { id: '4J', frames: [{x:0, y:0, w:40, h:42}, {x:40, y:0, w:60, h:42}, {x:0, y:42, w:38, h:58}, {x:38, y:42, w:62, h:58}] },
  ],

  5: [
    // Hero stânga 55% + 4 micro dreapta (cluster 2x2)
    { id: '5A', frames: [{x:0, y:0, w:55, h:100}, {x:55, y:0, w:45, h:28}, {x:55, y:28, w:45, h:30}, {x:55, y:58, w:45, h:22}, {x:55, y:80, w:45, h:20}] },
    // 4 micro stânga + hero dreapta 58%
    { id: '5B', frames: [{x:0, y:0, w:42, h:28}, {x:0, y:28, w:42, h:25}, {x:0, y:53, w:42, h:22}, {x:0, y:75, w:42, h:25}, {x:42, y:0, w:58, h:100}] },
    // Mosaic complex: hero stânga-sus + 4 mici
    { id: '5C', frames: [{x:0, y:0, w:60, h:62}, {x:60, y:0, w:40, h:45}, {x:60, y:45, w:40, h:55}, {x:0, y:62, w:35, h:38}, {x:35, y:62, w:25, h:38}] },
    // 5 coloane asimetrice
    { id: '5D', frames: [{x:0, y:0, w:30, h:100}, {x:30, y:0, w:22, h:100}, {x:52, y:0, w:18, h:100}, {x:70, y:0, w:15, h:100}, {x:85, y:0, w:15, h:100}] },
    // Hero centru + 2 stânga + 2 dreapta
    { id: '5E', frames: [{x:0, y:0, w:22, h:58}, {x:0, y:58, w:22, h:42}, {x:22, y:0, w:48, h:100}, {x:70, y:0, w:30, h:55}, {x:70, y:55, w:30, h:45}] },
    // Mosaic: L mare + cluster
    { id: '5F', frames: [{x:0, y:0, w:55, h:65}, {x:55, y:0, w:45, h:38}, {x:55, y:38, w:45, h:62}, {x:0, y:65, w:30, h:35}, {x:30, y:65, w:25, h:35}] },
    // Hero dreapta + 4 micro stânga (grid asimetric)
    { id: '5G', frames: [{x:0, y:0, w:20, h:55}, {x:20, y:0, w:22, h:55}, {x:0, y:55, w:22, h:45}, {x:22, y:55, w:20, h:45}, {x:42, y:0, w:58, h:100}] },
    // 5 coloane descrescătoare
    { id: '5H', frames: [{x:0, y:0, w:32, h:100}, {x:32, y:0, w:25, h:100}, {x:57, y:0, w:18, h:100}, {x:75, y:0, w:14, h:100}, {x:89, y:0, w:11, h:100}] },
  ],

  6: [
    // Hero stânga 52% + 5 micro dreapta
    { id: '6A', frames: [{x:0, y:0, w:52, h:100}, {x:52, y:0, w:48, h:22}, {x:52, y:22, w:48, h:20}, {x:52, y:42, w:48, h:22}, {x:52, y:64, w:48, h:18}, {x:52, y:82, w:48, h:18}] },
    // 5 micro stânga + hero dreapta 55%
    { id: '6B', frames: [{x:0, y:0, w:45, h:22}, {x:0, y:22, w:45, h:18}, {x:0, y:40, w:45, h:22}, {x:0, y:62, w:45, h:20}, {x:0, y:82, w:45, h:18}, {x:45, y:0, w:55, h:100}] },
    // Mosaic: hero sus-stânga + 5 cluster
    { id: '6C', frames: [{x:0, y:0, w:58, h:58}, {x:58, y:0, w:42, h:32}, {x:58, y:32, w:42, h:26}, {x:0, y:58, w:32, h:42}, {x:32, y:58, w:26, h:42}, {x:58, y:58, w:42, h:42}] },
    // 6 coloane asimetrice
    { id: '6D', frames: [{x:0, y:0, w:25, h:100}, {x:25, y:0, w:20, h:100}, {x:45, y:0, w:15, h:100}, {x:60, y:0, w:15, h:100}, {x:75, y:0, w:13, h:100}, {x:88, y:0, w:12, h:100}] },
    // Hero centru + 2 stânga + 3 dreapta
    { id: '6E', frames: [{x:0, y:0, w:20, h:55}, {x:0, y:55, w:20, h:45}, {x:20, y:0, w:45, h:100}, {x:65, y:0, w:35, h:35}, {x:65, y:35, w:35, h:30}, {x:65, y:65, w:35, h:35}] },
    // Mosaic Z complex
    { id: '6F', frames: [{x:0, y:0, w:55, h:42}, {x:55, y:0, w:45, h:55}, {x:0, y:42, w:30, h:58}, {x:30, y:42, w:25, h:35}, {x:30, y:77, w:25, h:23}, {x:55, y:55, w:45, h:45}] },
    // 3+3 asimetric (nu egal!)
    { id: '6G', frames: [{x:0, y:0, w:38, h:58}, {x:38, y:0, w:32, h:58}, {x:70, y:0, w:30, h:58}, {x:0, y:58, w:30, h:42}, {x:30, y:58, w:35, h:42}, {x:65, y:58, w:35, h:42}] },
    // Hero stânga + 5 micro cluster dreapta
    { id: '6H', frames: [{x:0, y:0, w:55, h:100}, {x:55, y:0, w:25, h:35}, {x:80, y:0, w:20, h:35}, {x:55, y:35, w:45, h:30}, {x:55, y:65, w:22, h:35}, {x:77, y:65, w:23, h:35}] },
  ],

  7: [
    // Hero stânga 50% + 6 micro dreapta (3x2 cluster)
    { id: '7A', frames: [{x:0, y:0, w:50, h:100}, {x:50, y:0, w:25, h:35}, {x:75, y:0, w:25, h:35}, {x:50, y:35, w:50, h:30}, {x:50, y:65, w:20, h:35}, {x:70, y:65, w:15, h:35}, {x:85, y:65, w:15, h:35}] },
    // 6 micro stânga + hero dreapta 52%
    { id: '7B', frames: [{x:0, y:0, w:25, h:35}, {x:25, y:0, w:23, h:35}, {x:0, y:35, w:48, h:28}, {x:0, y:63, w:22, h:37}, {x:22, y:63, w:13, h:37}, {x:35, y:63, w:13, h:37}, {x:48, y:0, w:52, h:100}] },
    // Mosaic: hero centru + 3 stânga + 3 dreapta
    { id: '7C', frames: [{x:0, y:0, w:22, h:38}, {x:0, y:38, w:22, h:32}, {x:0, y:70, w:22, h:30}, {x:22, y:0, w:45, h:100}, {x:67, y:0, w:33, h:35}, {x:67, y:35, w:33, h:32}, {x:67, y:67, w:33, h:33}] },
    // 7 coloane asimetrice
    { id: '7D', frames: [{x:0, y:0, w:22, h:100}, {x:22, y:0, w:18, h:100}, {x:40, y:0, w:14, h:100}, {x:54, y:0, w:12, h:100}, {x:66, y:0, w:12, h:100}, {x:78, y:0, w:11, h:100}, {x:89, y:0, w:11, h:100}] },
    // Hero sus + 6 micro jos (cluster)
    { id: '7E', frames: [{x:0, y:0, w:100, h:55}, {x:0, y:55, w:22, h:45}, {x:22, y:55, w:18, h:45}, {x:40, y:55, w:15, h:45}, {x:55, y:55, w:15, h:45}, {x:70, y:55, w:15, h:45}, {x:85, y:55, w:15, h:45}] },
    // Mosaic complex cu hero stânga-sus
    { id: '7F', frames: [{x:0, y:0, w:55, h:58}, {x:55, y:0, w:22, h:38}, {x:77, y:0, w:23, h:38}, {x:55, y:38, w:45, h:20}, {x:0, y:58, w:32, h:42}, {x:32, y:58, w:35, h:42}, {x:67, y:58, w:33, h:42}] },
  ],
};

export function getTemplatesForCount(count) {
  return TEMPLATES[count] || [];
}

export function templateToCells(template) {
  return template.frames.map(f => ({
    x: f.x / 100,
    y: f.y / 100,
    width: f.w / 100,
    height: f.h / 100,
  }));
}

export function getAvailableCounts() {
  return Object.keys(TEMPLATES).map(Number).sort((a, b) => a - b);
}

export default TEMPLATES;

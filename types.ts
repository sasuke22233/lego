
export type Vector3Tuple = [number, number, number];

export type BrickShape = 'cube' | 'cylinder' | 'pyramid' | 'cone';

export interface BrickType {
  id: string;
  name: string;
  width: number; // x size in studs
  depth: number; // z size in studs
  height: number; // y usually 1
  shape: BrickShape;
}

export interface BrickData {
  id: string;
  typeId: string;
  position: Vector3Tuple;
  rotation: number; // 0, 1, 2, 3 (multipliers of 90 deg)
  color: string;
  textureUrl?: string | null;
}

export interface SavedScene {
  id: string;
  name: string;
  date: number;
  data: BrickData[];
}

export interface DragState {
  isDragging: boolean;
  startPos: { x: number; y: number } | null;
}

export const BRICK_TYPES: BrickType[] = [
  // Standard Bricks
  { id: '1x1', name: '1x1', width: 1, depth: 1, height: 1, shape: 'cube' },
  { id: '2x1', name: '2x1', width: 2, depth: 1, height: 1, shape: 'cube' },
  { id: '2x2', name: '2x2', width: 2, depth: 2, height: 1, shape: 'cube' },
  { id: '3x1', name: '3x1', width: 3, depth: 1, height: 1, shape: 'cube' },
  { id: '4x1', name: '4x1', width: 4, depth: 1, height: 1, shape: 'cube' },
  { id: '4x2', name: '4x2', width: 4, depth: 2, height: 1, shape: 'cube' },
  
  // Cylinders
  { id: 'cyl-1x1', name: 'Cyl 1x1', width: 1, depth: 1, height: 1, shape: 'cylinder' },
  
  // Pyramids & Slopes
  { id: 'pyr-1x1', name: 'Pyr 1x1', width: 1, depth: 1, height: 1, shape: 'pyramid' },
  { id: 'cone-1x1', name: 'Cone 1x1', width: 1, depth: 1, height: 1, shape: 'cone' },
];

export const COLORS = [
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#eab308', // Yellow
  '#22c55e', // Green
  '#ffffff', // White
  '#1f2937', // Black
  '#a855f7', // Purple
  '#f97316', // Orange
];

export interface TextureItem {
  id: string;
  name: string;
  url: string;
  thumbnail: string;
}

export const TEXTURES: TextureItem[] = [
  { 
    id: 'none', 
    name: 'None', 
    url: '', 
    thumbnail: '' 
  },
  { 
    id: 'wood', 
    name: 'Wood', 
    url: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/hardwood2_diffuse.jpg', 
    thumbnail: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/hardwood2_diffuse.jpg' 
  },
  { 
    id: 'concrete', 
    name: 'Brick', 
    url: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/brick_diffuse.jpg', 
    thumbnail: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/brick_diffuse.jpg' 
  },
  { 
    id: 'fabric', 
    name: 'Grid', 
    url: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/uv_grid_opengl.jpg', 
    thumbnail: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/uv_grid_opengl.jpg' 
  },
  {
    id: 'marble',
    name: 'Moon',
    url: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/moon_1024.jpg',
    thumbnail: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/moon_1024.jpg'
  },
  {
    id: 'water',
    name: 'Water',
    url: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/water.jpg',
    thumbnail: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/water.jpg'
  },
  {
    id: 'crate',
    name: 'Crate',
    url: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/crate.gif',
    thumbnail: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/crate.gif'
  }
];
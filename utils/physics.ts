import { BrickData, BrickType, BRICK_TYPES, Vector3Tuple } from '../types';

export const GRID_SIZE = 1; // 1 unit = 1 stud

interface AABB {
  min: Vector3Tuple;
  max: Vector3Tuple;
}

/**
 * Calculates the Axis-Aligned Bounding Box (AABB) for a brick.
 * We assume the 'position' is the center of the 'min' corner grid cell.
 * E.g., position [0,0,0] for a 1x1x1 brick covers [-0.5, -0.5, -0.5] to [0.5, 0.5, 0.5].
 */
export const getAABB = (
  position: Vector3Tuple,
  rotation: number,
  type: BrickType
): AABB => {
  const [x, y, z] = position;
  
  const isRotated = rotation % 2 !== 0;
  const dimX = isRotated ? type.depth : type.width;
  const dimZ = isRotated ? type.width : type.depth;
  const dimY = type.height;

  // The 'position' marks the center of the first unit cube.
  // So the volume starts at position - 0.5.
  const min: Vector3Tuple = [
    x - 0.5,
    y - 0.5,
    z - 0.5
  ];

  const max: Vector3Tuple = [
    min[0] + dimX,
    min[1] + dimY,
    min[2] + dimZ
  ];

  return { min, max };
};

/**
 * Checks intersection between two AABBs.
 * Uses a small epsilon to allow flush contacts without triggering collision.
 */
const checkAABBCollision = (box1: AABB, box2: AABB): boolean => {
  const EPSILON = 0.001;
  return (
    box1.min[0] < box2.max[0] - EPSILON &&
    box1.max[0] > box2.min[0] + EPSILON &&
    box1.min[1] < box2.max[1] - EPSILON &&
    box1.max[1] > box2.min[1] + EPSILON &&
    box1.min[2] < box2.max[2] - EPSILON &&
    box1.max[2] > box2.min[2] + EPSILON
  );
};

/**
 * Checks if a proposed brick placement collides with existing bricks.
 */
export const checkCollision = (
  candidate: { position: Vector3Tuple; rotation: number; typeId: string; id?: string },
  existingBricks: BrickData[]
): boolean => {
  const type = BRICK_TYPES.find((t) => t.id === candidate.typeId);
  if (!type) return false;

  const candidateBox = getAABB(candidate.position, candidate.rotation, type);

  // Ground collision check
  // The bottom of the brick is candidateBox.min[1].
  // Ground is at -0.5 (relative to grid center 0) effectively, or y=0 plane is the surface.
  // Our logic: position y=0 -> min y=-0.5.
  // If min y < -0.5, it is below the logical "floor" surface which is at y=-0.5 relative to the center 0.
  // Actually, visual ground is at y=0. But '0' grid position is centered at 0.5 in world space usually if resting on floor?
  // Let's stick to the previous convention: position [x, 0, z] rests ON the grid.
  // BrickMesh renders at `position[1] + (height-1)/2`. 
  // If height=1, pos=[0,0,0], meshY=0.
  // If mesh is centered at 0, box is -0.5 to 0.5.
  // Grid is at -0.01. So floor is effectively -0.5 relative to the 0-coordinate block? 
  // Wait, Scene uses <Grid position={[0, -0.01, 0]} />.
  // To keep it simple: we just forbid Y < 0 for the position coordinate.
  if (candidate.position[1] < 0) return true;

  for (const brick of existingBricks) {
    if (brick.id === candidate.id) continue;

    const otherType = BRICK_TYPES.find((t) => t.id === brick.typeId);
    if (!otherType) continue;

    const otherBox = getAABB(brick.position, brick.rotation, otherType);

    if (checkAABBCollision(candidateBox, otherBox)) {
      return true;
    }
  }

  return false;
};

/**
 * Snaps a world position to the nearest integer grid coordinate.
 */
export const snapToGrid = (x: number, y: number, z: number): Vector3Tuple => {
  return [Math.round(x), Math.max(0, Math.round(y)), Math.round(z)];
};

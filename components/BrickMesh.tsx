
import React, { useMemo, Suspense } from 'react';
import { BrickType, Vector3Tuple } from '../types';
import { Edges, useTexture } from '@react-three/drei';
import * as THREE from 'three';

interface BrickMeshProps {
  type: BrickType;
  position: Vector3Tuple;
  rotation: number;
  color: string;
  textureUrl?: string | null;
  opacity?: number;
  isSelected?: boolean;
  isValid?: boolean; // For ghost brick
  onClick?: (e: any) => void;
  onPointerMove?: (e: any) => void;
  transparent?: boolean;
}

interface MaterialProps {
  color: string;
  opacity: number;
  transparent: boolean;
  textureUrl?: string | null;
}

const TexturedMaterial: React.FC<MaterialProps & { textureUrl: string }> = ({ 
  color, opacity, transparent, textureUrl 
}) => {
  const texture = useTexture(textureUrl);
  
  const map = useMemo(() => {
    const t = texture.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    // We could adjust repeat here based on brick size if needed
    return t;
  }, [texture]);

  return (
    <meshStandardMaterial
      color={color}
      map={map}
      roughness={0.8}
      metalness={0.1}
      opacity={opacity}
      transparent={transparent || opacity < 1}
    />
  );
};

const StandardMaterial: React.FC<MaterialProps> = ({ color, opacity, transparent }) => {
  return (
    <meshStandardMaterial
      color={color}
      roughness={0.2}
      metalness={0.1}
      opacity={opacity}
      transparent={transparent || opacity < 1}
    />
  );
};

const BrickMaterial: React.FC<MaterialProps> = (props) => {
  if (props.textureUrl) {
    return (
      <Suspense fallback={<StandardMaterial {...props} />}>
        <TexturedMaterial {...props} textureUrl={props.textureUrl} />
      </Suspense>
    );
  }
  return <StandardMaterial {...props} />;
};

const BrickMesh: React.FC<BrickMeshProps> = ({
  type,
  position,
  rotation,
  color,
  textureUrl,
  opacity = 1,
  isSelected,
  isValid = true,
  onClick,
  onPointerMove,
  transparent = false
}) => {
  // Logic to center the mesh based on corner-based grid position
  const isRotated = rotation % 2 !== 0;
  const dimX = isRotated ? type.depth : type.width;
  const dimZ = isRotated ? type.width : type.depth;

  const meshPosition: [number, number, number] = [
    position[0] + (dimX - 1) / 2,
    position[1] + (type.height - 1) / 2,
    position[2] + (dimZ - 1) / 2,
  ];

  const meshRotation: [number, number, number] = [0, rotation * (Math.PI / 2), 0];
  
  // For Pyramid (4-sided cone), we need to rotate it 45 degrees around Y so the sides align with the grid
  // Standard cone has base vertex at X axis. Rotating 45 deg makes flat side align with axes.
  const geometryRotation: [number, number, number] = type.shape === 'pyramid' ? [0, Math.PI / 4, 0] : [0, 0, 0];

  // Determine display color/opacity based on validity for ghost
  const displayColor = isValid ? color : '#ff0000';
  const displayOpacity = isValid ? opacity : 0.5;

  const materialProps = {
    color: displayColor,
    opacity: displayOpacity,
    transparent: transparent,
    textureUrl: isValid ? textureUrl : null // Don't show texture on invalid ghost
  };

  // Geometry Generation
  const renderGeometry = () => {
    switch (type.shape) {
      case 'cylinder':
        // Radius = 0.5 for 1x1 block
        // Width is diameter effectively for box, so width/2 is radius
        return <cylinderGeometry args={[type.width / 2, type.width / 2, type.height, 32]} />;
      case 'cone':
        // Round spike
        return <cylinderGeometry args={[0, type.width / 2, type.height, 32]} />;
      case 'pyramid':
        // 4-sided pyramid
        // Radius calculation: For a square of side `w` inscribed in a circle, the diameter is `w * sqrt(2)`.
        // So radius is `(w * sqrt(2)) / 2`.
        const radius = (type.width * Math.sqrt(2)) / 2;
        return <cylinderGeometry args={[0, radius, type.height, 4, 1]} />;
      case 'cube':
      default:
        return <boxGeometry args={[type.width, type.height, type.depth]} />;
    }
  };

  // Stud generation
  const studs = useMemo(() => {
    // Only cubes and cylinders get studs on top. Pyramids and cones are pointy.
    if (type.shape !== 'cube' && type.shape !== 'cylinder') return null;

    const s = [];
    for (let i = 0; i < type.width; i++) {
      for (let j = 0; j < type.depth; j++) {
        // Adjust stud position relative to center
        // Grid centers are at 0, 1, 2... relative to corner
        // If width=2, center is at 0.5. Studs at -0.5, 0.5 relative to center.
        
        // Calculate stud offset from the center of the mesh
        const xOffset = i - (type.width - 1) / 2;
        const zOffset = j - (type.depth - 1) / 2;
        
        s.push(
          <mesh key={`${i}-${j}`} position={[xOffset, type.height / 2 + 0.1, zOffset]}>
            <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
            <BrickMaterial {...materialProps} />
          </mesh>
        );
      }
    }
    return s;
  }, [type, materialProps]);

  return (
    <group position={meshPosition} rotation={meshRotation}>
      {/* Main Mesh */}
      <mesh
        castShadow
        receiveShadow
        onClick={onClick}
        onPointerMove={onPointerMove}
        rotation={geometryRotation}
      >
        {renderGeometry()}
        <BrickMaterial {...materialProps} />
        {isSelected && (
          <Edges
            scale={1.05}
            threshold={15}
            color="white"
          />
        )}
      </mesh>

      {/* Studs */}
      {studs}
    </group>
  );
};

export default BrickMesh;


import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { BrickData, BRICK_TYPES, Vector3Tuple } from '../types';
import BrickMesh from './BrickMesh';
import { snapToGrid, checkCollision } from '../utils/physics';

interface SceneProps {
  bricks: BrickData[];
  selectedBrickId: string | null;
  currentType: string;
  currentColor: string;
  currentTexture: string | null;
  rotation: number;
  isSnapping: boolean;
  onAddBrick: (brick: BrickData) => void;
  onSelectBrick: (id: string | null) => void;
  onUpdateBrick: (brick: BrickData) => void;
}

const SceneContent: React.FC<SceneProps> = ({
  bricks,
  selectedBrickId,
  currentType,
  currentColor,
  currentTexture,
  rotation,
  isSnapping,
  onAddBrick,
  onSelectBrick,
  onUpdateBrick,
}) => {
  const [hoverPos, setHoverPos] = useState<Vector3Tuple | null>(null);
  const { camera, raycaster, scene } = useThree();
  const controlsRef = useRef<any>(null);

  const activeType = BRICK_TYPES.find((t) => t.id === currentType) || BRICK_TYPES[0];

  // Camera Keyboard Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!controlsRef.current) return;
      
      const ROTATION_STEP = Math.PI / 4; // 45 degrees
      
      switch (e.key) {
        case 'ArrowLeft':
          controlsRef.current.setAzimuthalAngle(controlsRef.current.getAzimuthalAngle() + ROTATION_STEP);
          break;
        case 'ArrowRight':
          controlsRef.current.setAzimuthalAngle(controlsRef.current.getAzimuthalAngle() - ROTATION_STEP);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Calculate Ghost Validity
  const isGhostValid = useMemo(() => {
    if (!hoverPos) return false;
    const candidate = {
      position: hoverPos,
      rotation: rotation,
      typeId: activeType.id,
      id: 'ghost',
    };
    return !checkCollision(candidate, bricks);
  }, [hoverPos, rotation, activeType, bricks]);

  const handlePointerMove = (e: any) => {
    e.stopPropagation();
    
    if (e.point && e.face) {
      const p = e.point;
      const n = e.face.normal;
      
      // Calculate 'ideal' integer center target
      const targetX = p.x + n.x * 0.5;
      const targetY = p.y + n.y * 0.5;
      const targetZ = p.z + n.z * 0.5;
      
      let finalPos: Vector3Tuple;

      if (isSnapping) {
        finalPos = snapToGrid(targetX, targetY, targetZ);
      } else {
        // Free placement
        finalPos = [targetX, Math.max(0, targetY), targetZ];
      }
      
      // Safety check for ground
      if (finalPos[1] < 0) finalPos[1] = 0;

      setHoverPos(finalPos);
    }
  };

  const handlePlanePointerMove = (e: any) => {
     e.stopPropagation();
     const p = e.point;
     
     let finalPos: Vector3Tuple;

     if (isSnapping) {
       finalPos = snapToGrid(p.x, 0, p.z);
     } else {
       finalPos = [p.x, 0, p.z];
     }

     setHoverPos(finalPos);
  };

  const handleClick = (e: any) => {
    e.stopPropagation();

    if (selectedBrickId) {
      onSelectBrick(null);
      return;
    }

    if (hoverPos && isGhostValid) {
      const newBrick: BrickData = {
        id: crypto.randomUUID(),
        typeId: currentType,
        position: hoverPos,
        rotation: rotation,
        color: currentColor,
        textureUrl: currentTexture
      };
      onAddBrick(newBrick);
    }
  };

  return (
    <>
      <OrbitControls 
        ref={controlsRef} 
        makeDefault 
        enableDamping
        dampingFactor={0.05}
        maxPolarAngle={Math.PI / 2 - 0.1}
      />
      <ambientLight intensity={0.6} />
      <directionalLight 
        position={[10, 20, 10]} 
        intensity={1.2} 
        castShadow 
        shadow-mapSize={[1024, 1024]} 
      >
        <orthographicCamera attach="shadow-camera" args={[-20, 20, 20, -20]} />
      </directionalLight>

      <Environment preset="city" />

      {/* Grid Floor */}
      <Grid 
        infiniteGrid 
        fadeDistance={30} 
        sectionSize={1} 
        cellSize={1} 
        position={[0, -0.01, 0]} 
        cellColor="#444" 
        sectionColor="#666" 
      />
      
      {/* Invisible Plane for Raycasting on Ground */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -0.01, 0]} 
        onPointerMove={handlePlanePointerMove}
        onClick={handleClick}
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Ghost Brick (Preview) */}
      {hoverPos && !selectedBrickId && (
        <group>
            <BrickMesh
              type={activeType}
              position={hoverPos}
              rotation={rotation}
              color={currentColor}
              textureUrl={currentTexture}
              opacity={0.6}
              isValid={isGhostValid}
              transparent
            />
        </group>
      )}

      {/* Placed Bricks */}
      {bricks.map((brick) => (
        <BrickMesh
          key={brick.id}
          type={BRICK_TYPES.find(t => t.id === brick.typeId) || BRICK_TYPES[0]}
          position={brick.position}
          rotation={brick.rotation}
          color={brick.color}
          textureUrl={brick.textureUrl}
          isSelected={selectedBrickId === brick.id}
          onClick={(e) => {
             if (e.shiftKey) {
                if (hoverPos && isGhostValid) {
                    const newBrick: BrickData = {
                        id: crypto.randomUUID(),
                        typeId: currentType,
                        position: hoverPos,
                        rotation: rotation,
                        color: currentColor,
                        textureUrl: currentTexture,
                    };
                    onAddBrick(newBrick);
                }
             } else {
                 e.stopPropagation();
                 onSelectBrick(brick.id);
             }
          }}
          onPointerMove={handlePointerMove}
        />
      ))}
    </>
  );
};

export default function Scene(props: SceneProps) {
  return (
    <Canvas shadows camera={{ position: [10, 10, 10], fov: 45 }}>
      <SceneContent {...props} />
    </Canvas>
  );
}

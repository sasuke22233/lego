
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { View, Center, OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import Scene from './components/Scene';
import BrickMesh from './components/BrickMesh';
import { BrickData, BRICK_TYPES, COLORS, TEXTURES, SavedScene } from './types';
import { checkCollision } from './utils/physics';
import { 
  RotateCw, Trash2, MousePointer2, Move, Save, Download, Magnet, 
  Undo2, Redo2, Image as ImageIcon, Ban, FolderOpen, Upload, X, FileJson
} from 'lucide-react';

const App: React.FC = () => {
  // History State
  const [history, setHistory] = useState<BrickData[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  
  // Derived State
  const bricks = history[historyIndex];

  const [selectedBrickId, setSelectedBrickId] = useState<string | null>(null);
  
  // HUD State
  const [currentType, setCurrentType] = useState<string>(BRICK_TYPES[0].id);
  const [currentColor, setCurrentColor] = useState<string>(COLORS[0]);
  const [currentTexture, setCurrentTexture] = useState<string | null>(null);
  const [rotation, setRotation] = useState<number>(0);
  const [isSnapping, setIsSnapping] = useState<boolean>(true);

  // Library State
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [savedScenes, setSavedScenes] = useState<SavedScene[]>([]);
  const [newSaveName, setNewSaveName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refs for 3D Icons
  const iconRefs = useMemo(() => {
    const refs: { [key: string]: React.RefObject<HTMLDivElement | null> } = {};
    BRICK_TYPES.forEach(type => {
      refs[type.id] = React.createRef();
    });
    return refs;
  }, []);

  // Initialize Library
  useEffect(() => {
    try {
      const stored = localStorage.getItem('react-bricks-library');
      if (stored) {
        setSavedScenes(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load library", e);
    }
  }, []);

  // Helper to find selected brick
  const selectedBrick = bricks.find(b => b.id === selectedBrickId);

  const pushToHistory = (newBricks: BrickData[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newBricks);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setSelectedBrickId(null);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setSelectedBrickId(null);
    }
  };

  const handleAddBrick = (brick: BrickData) => {
    pushToHistory([...bricks, brick]);
  };

  const handleUpdateBrick = (updatedBrick: BrickData) => {
    // Check collision for the modification (excluding itself)
    const isValid = !checkCollision(
      { 
        position: updatedBrick.position, 
        rotation: updatedBrick.rotation, 
        typeId: updatedBrick.typeId, 
        id: updatedBrick.id 
      }, 
      bricks
    );

    if (isValid) {
      const newBricks = bricks.map(b => b.id === updatedBrick.id ? updatedBrick : b);
      pushToHistory(newBricks);
    } else {
      console.warn("Cannot move/rotate brick there, collision detected.");
    }
  };

  const handleDeleteBrick = () => {
    if (selectedBrickId) {
      const newBricks = bricks.filter(b => b.id !== selectedBrickId);
      pushToHistory(newBricks);
      setSelectedBrickId(null);
    }
  };

  const handleRotate = () => {
    if (selectedBrick) {
      // Rotate selected
      const newRotation = (selectedBrick.rotation + 1) % 4;
      handleUpdateBrick({ ...selectedBrick, rotation: newRotation });
    } else {
      // Rotate palette
      setRotation(prev => (prev + 1) % 4);
    }
  };

  const handleColorChange = (color: string) => {
    setCurrentColor(color);
    if (selectedBrick) {
      handleUpdateBrick({ ...selectedBrick, color: color });
    }
  };

  const handleTextureChange = (textureUrl: string) => {
    const newVal = textureUrl === '' ? null : textureUrl;
    setCurrentTexture(newVal);
    if (selectedBrick) {
      handleUpdateBrick({ ...selectedBrick, textureUrl: newVal });
    }
  };

  // --- Library Functions ---

  const handleSaveScene = () => {
    if (!newSaveName.trim()) return;
    
    const newScene: SavedScene = {
      id: crypto.randomUUID(),
      name: newSaveName,
      date: Date.now(),
      data: bricks
    };

    const updatedLibrary = [newScene, ...savedScenes];
    setSavedScenes(updatedLibrary);
    localStorage.setItem('react-bricks-library', JSON.stringify(updatedLibrary));
    setNewSaveName('');
    alert('Scene Saved!');
  };

  const handleLoadScene = (scene: SavedScene) => {
    if (window.confirm(`Load "${scene.name}"? Unsaved changes will be lost.`)) {
      setHistory([scene.data]);
      setHistoryIndex(0);
      setSelectedBrickId(null);
      setIsLibraryOpen(false);
    }
  };

  const handleDeleteScene = (id: string) => {
    if (window.confirm('Are you sure you want to delete this scene?')) {
      const updatedLibrary = savedScenes.filter(s => s.id !== id);
      setSavedScenes(updatedLibrary);
      localStorage.setItem('react-bricks-library', JSON.stringify(updatedLibrary));
    }
  };

  const handleDownloadScene = (scene: SavedScene) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(scene.data));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${scene.name.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
            // Basic validation: check if it looks like bricks
            const isValid = parsed.every(b => b.id && b.typeId && b.position);
            if (isValid) {
                setHistory([parsed]);
                setHistoryIndex(0);
                setSelectedBrickId(null);
                setIsLibraryOpen(false);
                alert('Scene loaded from file!');
            } else {
                throw new Error("Invalid brick data format");
            }
        } else {
             throw new Error("File content is not an array");
        }
      } catch (err) {
        console.error(err);
        alert('Failed to load file. Invalid JSON format.');
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again
    event.target.value = '';
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if input is focused 
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'r' || e.key === 'R') handleRotate();
      if (e.key === 'Delete' || e.key === 'Backspace') handleDeleteBrick();
      if (e.key === 'Escape') setSelectedBrickId(null);

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
      
      // Save Shortcut
       if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setIsLibraryOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBrickId, bricks, rotation, historyIndex, history]); 

  return (
    <div className="w-full h-full relative bg-gray-900 text-white font-sans select-none">
      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
        <Scene
          bricks={bricks}
          selectedBrickId={selectedBrickId}
          currentType={currentType}
          currentColor={currentColor}
          currentTexture={currentTexture}
          rotation={rotation}
          isSnapping={isSnapping}
          onAddBrick={handleAddBrick}
          onSelectBrick={setSelectedBrickId}
          onUpdateBrick={handleUpdateBrick}
        />
      </div>

      {/* 3D Icon Overlay Canvas */}
      <Canvas
        className="absolute inset-0 z-20 pointer-events-none"
        eventSource={document.getElementById('root')!}
      >
        <Environment preset="city" />
        {BRICK_TYPES.map((type) => (
          <View track={iconRefs[type.id]} key={type.id}>
             <PerspectiveCamera makeDefault position={[3, 3, 3]} fov={50} />
             <ambientLight intensity={0.8} />
             <directionalLight position={[5, 10, 5]} intensity={1.5} />
             <Center>
               <BrickMesh
                 type={type}
                 position={[0, 0, 0]}
                 rotation={0}
                 color={currentColor}
                 textureUrl={currentTexture}
                 isSelected={currentType === type.id}
               />
             </Center>
             <OrbitControls 
                enableZoom={false} 
                enablePan={false} 
                autoRotate 
                autoRotateSpeed={4} 
              />
          </View>
        ))}
      </Canvas>

      {/* Library Modal */}
      {isLibraryOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
           <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-gray-700">
              
              {/* Modal Header */}
              <div className="flex justify-between items-center p-4 border-b border-gray-700">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <FolderOpen className="text-blue-400"/> Scene Library
                </h2>
                <button 
                  onClick={() => setIsLibraryOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 flex-1 overflow-y-auto">
                
                {/* Save Current Section */}
                <div className="mb-6 bg-gray-700/50 p-4 rounded-xl border border-gray-600">
                  <h3 className="text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wide">Save Current Scene</h3>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Enter scene name..." 
                      className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={newSaveName}
                      onChange={(e) => setNewSaveName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveScene()}
                    />
                    <button 
                      onClick={handleSaveScene}
                      disabled={!newSaveName.trim()}
                      className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <Save size={18} /> Save
                    </button>
                  </div>
                </div>

                {/* Saved List */}
                <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">Saved Scenes</h3>
                
                {savedScenes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 italic">
                    No saved scenes found. Save your masterpiece!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {savedScenes.map(scene => (
                      <div key={scene.id} className="bg-gray-700/40 hover:bg-gray-700/70 border border-gray-600/50 rounded-xl p-3 transition-colors group">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-bold text-white truncate max-w-[150px]">{scene.name}</div>
                            <div className="text-xs text-gray-400">
                              {new Date(scene.date).toLocaleDateString()} • {scene.data.length} Bricks
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                             <button 
                                onClick={() => handleDownloadScene(scene)}
                                className="p-1.5 hover:bg-gray-600 rounded text-gray-300 hover:text-white"
                                title="Export JSON"
                             >
                                <FileJson size={16}/>
                             </button>
                             <button 
                                onClick={() => handleDeleteScene(scene.id)}
                                className="p-1.5 hover:bg-red-500/20 rounded text-gray-300 hover:text-red-400"
                                title="Delete"
                             >
                                <Trash2 size={16}/>
                             </button>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleLoadScene(scene)}
                          className="w-full py-2 bg-gray-600 hover:bg-blue-600 text-sm rounded-lg transition-colors text-gray-200 hover:text-white font-medium"
                        >
                          Load Scene
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-gray-700 bg-gray-800/50 rounded-b-2xl">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept=".json" 
                  className="hidden" 
                  onChange={handleImportFile}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-600 hover:border-gray-400 hover:bg-gray-700/30 rounded-xl text-gray-400 hover:text-white transition-all"
                >
                  <Upload size={20} />
                  <span>Import Scene from JSON File</span>
                </button>
              </div>

           </div>
        </div>
      )}

      {/* Overlay UI */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6">
        
        {/* Header / Info */}
        <div className="flex justify-between items-start pointer-events-auto">
          <div className="bg-gray-800/80 backdrop-blur-md p-4 rounded-xl border border-gray-700 shadow-xl">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              React Bricks 3D
            </h1>
            <div className="text-xs text-gray-400 mt-1 flex flex-col gap-1">
              <span className="flex items-center gap-1"><MousePointer2 size={12}/> Click empty space to Build</span>
              <span className="flex items-center gap-1"><MousePointer2 size={12}/> Shift + Click brick to Stack</span>
              <span className="flex items-center gap-1"><MousePointer2 size={12}/> Click brick to Select/Edit</span>
              <span className="flex items-center gap-1"><RotateCw size={12}/> 'R' to Rotate Brick</span>
              <span className="flex items-center gap-1"><Move size={12}/> Arrow Keys / Drag to Rotate Cam</span>
              <span className="flex items-center gap-1"><Undo2 size={12}/> Ctrl+Z Undo / Ctrl+Y Redo</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 items-end">
            {/* Global Actions */}
            <div className="bg-gray-800/80 backdrop-blur-md p-2 rounded-xl border border-gray-700 shadow-xl flex gap-2">
                <button
                  onClick={handleUndo}
                  disabled={historyIndex === 0}
                  className={`p-2 rounded-lg transition-colors ${historyIndex === 0 ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 size={20} />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={historyIndex === history.length - 1}
                  className={`p-2 rounded-lg transition-colors ${historyIndex === history.length - 1 ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}
                  title="Redo (Ctrl+Y)"
                >
                  <Redo2 size={20} />
                </button>
                
                <div className="w-px bg-gray-600 mx-1"></div>

                <button 
                  onClick={() => setIsSnapping(!isSnapping)}
                  className={`p-2 rounded-lg transition-colors ${isSnapping ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}
                  title={isSnapping ? "Snap to Grid: ON" : "Snap to Grid: OFF"}
                >
                  <Magnet size={20} />
                </button>
                <div className="w-px bg-gray-600 mx-1"></div>
                
                {/* Library Button */}
                <button 
                  onClick={() => setIsLibraryOpen(true)}
                  className="p-2 hover:bg-blue-600/50 rounded-lg transition-colors text-gray-300 hover:text-white"
                  title="Scene Library (Save/Load/Import)"
                >
                  <FolderOpen size={20} />
                </button>
            </div>

            {selectedBrick && (
              <div className="bg-blue-600/90 backdrop-blur-md p-3 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in">
                <span className="font-semibold text-sm">Selected: {BRICK_TYPES.find(t=>t.id === selectedBrick.typeId)?.name}</span>
                <button 
                  onClick={handleDeleteBrick}
                  className="bg-red-500 hover:bg-red-600 p-2 rounded transition-colors"
                  title="Delete (Del)"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-col gap-4 pointer-events-auto items-center">
          
          {/* Shapes Palette */}
          <div className="bg-gray-800/90 backdrop-blur-md p-2 rounded-xl border border-gray-700 shadow-2xl flex gap-2 overflow-x-auto max-w-[90vw]">
            {BRICK_TYPES.map(type => (
              <button
                key={type.id}
                onClick={() => {
                   setCurrentType(type.id);
                }}
                className={`
                  flex flex-col items-center justify-center p-2 rounded-lg transition-all min-w-[80px]
                  ${currentType === type.id && !selectedBrickId ? 'bg-blue-600/30 ring-2 ring-blue-400' : 'hover:bg-gray-700 bg-gray-700/50'}
                `}
              >
                {/* 3D Icon Container */}
                <div 
                  ref={iconRefs[type.id]} 
                  className="w-12 h-12 mb-1 pointer-events-none"
                />
                <span className="text-[10px] font-mono text-gray-300">{type.name}</span>
              </button>
            ))}
          </div>

          {/* Tools & Colors & Textures */}
          <div className="flex gap-4">
             {/* Rotation Control */}
             <div className="bg-gray-800/90 backdrop-blur-md p-2 rounded-xl border border-gray-700 shadow-xl flex items-center">
               <button
                 onClick={handleRotate}
                 className="p-3 hover:bg-gray-700 rounded-lg active:scale-95 transition-transform flex flex-col items-center gap-1"
                 title="Rotate (R)"
               >
                 <RotateCw size={24} className={selectedBrickId ? 'text-yellow-400' : 'text-white'} />
                 <span className="text-[10px]">Rotate</span>
               </button>
             </div>

             {/* Color Palette */}
             <div className="bg-gray-800/90 backdrop-blur-md p-3 rounded-xl border border-gray-700 shadow-xl flex flex-col gap-1">
               <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider mb-1">Colors</span>
               <div className="flex gap-2">
                {/* No Color / White Button */}
                <button
                    onClick={() => handleColorChange('#ffffff')}
                    className={`
                        w-8 h-8 rounded-full border-2 shadow-sm transition-transform hover:scale-110 flex items-center justify-center bg-white relative
                        ${currentColor === '#ffffff' ? 'border-blue-500 scale-110 ring-2 ring-blue-500/50' : 'border-gray-600'}
                    `}
                    title="No Color / Original Texture"
                >
                    <Ban size={14} className="text-gray-400" />
                </button>
                {COLORS.filter(c => c !== '#ffffff').map(c => (
                  <button
                    key={c}
                    onClick={() => handleColorChange(c)}
                    className={`
                      w-8 h-8 rounded-full border-2 shadow-sm transition-transform hover:scale-110
                      ${currentColor === c ? 'border-white scale-110 ring-2 ring-white/50' : 'border-transparent'}
                    `}
                    style={{ backgroundColor: c }}
                  />
                ))}
               </div>
             </div>

             {/* Texture Palette */}
             <div className="bg-gray-800/90 backdrop-blur-md p-3 rounded-xl border border-gray-700 shadow-xl flex flex-col gap-1">
                <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider mb-1 flex items-center gap-1">
                  <ImageIcon size={10} /> Textures
                </span>
                <div className="flex gap-2">
                  {TEXTURES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleTextureChange(t.url)}
                      className={`
                        w-8 h-8 rounded-lg border-2 shadow-sm transition-transform hover:scale-110 overflow-hidden relative
                        ${(currentTexture === t.url || (!currentTexture && t.id === 'none')) ? 'border-white scale-110 ring-2 ring-white/50' : 'border-gray-600'}
                      `}
                      title={t.name}
                    >
                      {t.id === 'none' ? (
                        <div className="w-full h-full bg-gray-600 flex items-center justify-center">
                          <span className="text-[8px] text-gray-300">None</span>
                        </div>
                      ) : (
                         <img src={t.thumbnail} alt={t.name} className="w-full h-full object-cover" />
                      )}
                    </button>
                  ))}
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default App;

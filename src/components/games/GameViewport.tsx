import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Environment, 
  Float, 
  MeshWobbleMaterial,
  Text,
  ContactShadows
} from '@react-three/drei';
import { GameType } from '@/types';

interface SceneProps {
  gameId: GameType;
}

function CasinoTable({ gameId }: SceneProps) {
  return (
    <group>
      {/* Polished Marble Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial 
          color="#1a1a1a" 
          roughness={0.05} 
          metalness={0.8} 
        />
      </mesh>

      {/* Luxury Casino Table */}
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
        <mesh position={[0, 0, 0]} castShadow>
          <cylinderGeometry args={[2, 2.2, 0.5, 64]} />
          <meshStandardMaterial 
            color="#072a1a" 
            roughness={0.3} 
            metalness={0.2} 
          />
        </mesh>
        
        {/* Table Trim (Gold) */}
        <mesh position={[0, 0.25, 0]}>
          <torusGeometry args={[2.1, 0.05, 16, 100]} rotation={[Math.PI / 2, 0, 0]} />
          <meshStandardMaterial 
            color="#D4AF37" 
            metalness={1} 
            roughness={0.1} 
          />
        </mesh>

        {/* Game Label */}
        <Text
          position={[0, 0.6, 0]}
          fontSize={0.3}
          color="#D4AF37"
          font="/fonts/casino-font.woff" // Assuming font exists or fallback
          anchorX="center"
          anchorY="middle"
        >
          {gameId.toUpperCase()} CLUB
        </Text>
      </Float>

      {/* Decorative Lighting / Neon Reflections */}
      <rectAreaLight
        width={10}
        height={10}
        intensity={2}
        color="#D4AF37"
        position={[0, 5, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
    </group>
  );
}

export default function GameViewport({ gameId }: SceneProps) {
  return (
    <div className="w-full h-[600px] bg-black rounded-xl overflow-hidden border border-[#D4AF37]/30 shadow-2xl relative">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 3, 7]} fov={50} />
        <OrbitControls 
          enablePan={false} 
          minPolarAngle={Math.PI / 4} 
          maxPolarAngle={Math.PI / 2.2}
          makeDefault 
        />
        
        <Suspense fallback={null}>
          <CasinoTable gameId={gameId} />
          <Environment preset="city" />
          <ContactShadows 
            opacity={0.4} 
            scale={10} 
            blur={2.4} 
            far={10} 
            resolution={256} 
            color="#000000" 
          />
        </Suspense>

        <ambientLight intensity={0.5} />
        <spotLight 
          position={[10, 10, 10]} 
          angle={0.15} 
          penumbra={1} 
          intensity={1} 
          castShadow 
        />
      </Canvas>
      
      {/* UI Overlay for AAA feel */}
      <div className="absolute top-4 left-4 pointer-events-none">
        <div className="bg-black/60 backdrop-blur-md border border-[#D4AF37]/40 p-3 rounded-lg">
          <h2 className="text-[#D4AF37] font-casino text-xl tracking-widest">NEXT-GEN SIMULATION</h2>
          <p className="text-white/60 text-xs">ULTRA-REALISTIC 3D ENVIRONMENT</p>
        </div>
      </div>
    </div>
  );
}

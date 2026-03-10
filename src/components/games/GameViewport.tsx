import { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Environment, 
  Float, 
  Text,
  ContactShadows,
  MeshReflectorMaterial
} from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ToneMapping, N8AO } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import type { GameType } from '@/types';

interface SceneProps {
  gameId: GameType;
}

function FloatingParticles({ count = 80 }: { count?: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 14,
      y: Math.random() * 6 - 0.5,
      z: (Math.random() - 0.5) * 14,
      speed: 0.002 + Math.random() * 0.005,
      offset: Math.random() * Math.PI * 2,
      scale: 0.015 + Math.random() * 0.025,
    }));
  }, [count]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    particles.forEach((p, i) => {
      dummy.position.set(
        p.x + Math.sin(t * p.speed * 50 + p.offset) * 0.3,
        p.y + Math.sin(t * 0.3 + p.offset) * 0.5,
        p.z + Math.cos(t * p.speed * 50 + p.offset) * 0.3
      );
      dummy.scale.setScalar(p.scale * (0.7 + 0.3 * Math.sin(t * 2 + p.offset)));
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#D4AF37" transparent opacity={0.4} />
    </instancedMesh>
  );
}

function CinematicCamera() {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const startTime = useRef<number | null>(null);
  const animationDuration = 2.5;

  useFrame(({ clock }) => {
    if (!cameraRef.current) return;
    if (startTime.current === null) startTime.current = clock.getElapsedTime();
    const elapsed = clock.getElapsedTime() - startTime.current;
    const progress = Math.min(elapsed / animationDuration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);

    const startPos = new THREE.Vector3(0, 8, 14);
    const endPos = new THREE.Vector3(0, 3, 7);
    cameraRef.current.position.lerpVectors(startPos, endPos, eased);
    cameraRef.current.lookAt(0, 0, 0);
  });

  return <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 8, 14]} fov={50} />;
}

function ChipStack({ position, color, secondaryColor }: { position: [number, number, number]; color: string; secondaryColor: string }) {
  const chips = [0, 0.08, 0.16, 0.24, 0.32];
  return (
    <group position={position}>
      {chips.map((y, i) => (
        <group key={i} position={[0, y, 0]} rotation={[0, i * 0.3, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.18, 0.18, 0.06, 32]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? color : secondaryColor}
              metalness={0.7}
              roughness={0.2}
            />
          </mesh>
          <mesh position={[0, 0.031, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.002, 32]} />
            <meshStandardMaterial color="#D4AF37" metalness={1} roughness={0.1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function CasinoTable({ gameId }: SceneProps) {
  return (
    <group>
      {/* Polished Marble Floor — now with MeshReflectorMaterial */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <MeshReflectorMaterial
          mirror={0.35}
          blur={[300, 100]}
          resolution={512}
          mixBlur={0.8}
          mixStrength={0.6}
          roughness={0.15}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#1a1a1a"
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
          <torusGeometry args={[2.1, 0.05, 16, 100]} />
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
          font={undefined}
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

      {/* === ADDED: Accent Lights === */}
      <pointLight position={[3, 2, 3]} intensity={0.8} color="#ff6b35" distance={8} decay={2} />
      <pointLight position={[-3, 2, -3]} intensity={0.8} color="#ff6b35" distance={8} decay={2} />
      <pointLight position={[3, 1.5, -3]} intensity={0.5} color="#9b59b6" distance={6} decay={2} />
      <pointLight position={[-3, 1.5, 3]} intensity={0.5} color="#3498db" distance={6} decay={2} />
      <spotLight
        position={[0, 6, 0]}
        angle={0.4}
        penumbra={0.8}
        intensity={1.5}
        color="#D4AF37"
        castShadow
        target-position={[0, 0, 0]}
      />

      {/* === ADDED: $Pc Branded Chip Stacks === */}
      <ChipStack position={[-2.8, -0.7, 1.2]} color="#1a1a2e" secondaryColor="#D4AF37" />
      <ChipStack position={[2.8, -0.7, 1.2]} color="#8B0000" secondaryColor="#D4AF37" />
      <ChipStack position={[-2.5, -0.7, -1.5]} color="#072a1a" secondaryColor="#C0C0C0" />
      <ChipStack position={[2.5, -0.7, -1.5]} color="#1a1a2e" secondaryColor="#D4AF37" />
      <ChipStack position={[0, -0.7, 2.8]} color="#4a0e4e" secondaryColor="#D4AF37" />

      {/* === ADDED: Floating Particles === */}
      <FloatingParticles count={80} />
    </group>
  );
}

export default function GameViewport({ gameId }: SceneProps) {
  return (
    <div className="w-full h-[600px] bg-black rounded-xl overflow-hidden border border-[#D4AF37]/30 shadow-2xl relative">
      <Canvas shadows>
        <CinematicCamera />
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

        {/* === ADDED: Post-Processing Pipeline === */}
        <EffectComposer>
          <Bloom
            intensity={0.6}
            luminanceThreshold={0.6}
            luminanceSmoothing={0.4}
            mipmapBlur
          />
          <N8AO
            aoRadius={0.5}
            intensity={1.5}
            distanceFalloff={0.5}
          />
          <Vignette eskil={false} offset={0.2} darkness={0.8} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
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

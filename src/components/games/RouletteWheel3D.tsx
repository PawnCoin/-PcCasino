import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

const WHEEL_NUMBERS = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const SEGMENT_ANGLE = (Math.PI * 2) / 37;

function isRed(num: number) {
  return RED_NUMBERS.includes(num);
}

function getPocketColor(num: number): string {
  if (num === 0) return '#15803d';
  return isRed(num) ? '#dc2626' : '#1a1a1a';
}

function WheelPockets({ winningNumber }: { winningNumber: number | null }) {
  const pocketsRef = useRef<THREE.Group>(null);

  const pocketMeshes = useMemo(() => {
    const shape = new THREE.Shape();
    const innerR = 1.6;
    const outerR = 2.3;
    const halfAngle = SEGMENT_ANGLE * 0.48;

    shape.moveTo(Math.cos(-halfAngle) * innerR, Math.sin(-halfAngle) * innerR);
    shape.lineTo(Math.cos(-halfAngle) * outerR, Math.sin(-halfAngle) * outerR);
    const steps = 8;
    for (let i = 0; i <= steps; i++) {
      const a = -halfAngle + (halfAngle * 2 * i) / steps;
      shape.lineTo(Math.cos(a) * outerR, Math.sin(a) * outerR);
    }
    shape.lineTo(Math.cos(halfAngle) * innerR, Math.sin(halfAngle) * innerR);
    for (let i = steps; i >= 0; i--) {
      const a = -halfAngle + (halfAngle * 2 * i) / steps;
      shape.lineTo(Math.cos(a) * innerR, Math.sin(a) * innerR);
    }
    shape.closePath();

    const extrudeSettings = { depth: 0.15, bevelEnabled: false };
    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    return { geom };
  }, []);

  const dividerGeom = useMemo(() => {
    return new THREE.BoxGeometry(0.02, 0.72, 0.2);
  }, []);

  return (
    <group ref={pocketsRef} position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {WHEEL_NUMBERS.map((num, i) => {
        const angle = i * SEGMENT_ANGLE;
        const color = getPocketColor(num);
        const isWinner = winningNumber === num;

        return (
          <group key={num} rotation={[0, 0, angle]}>
            <mesh geometry={pocketMeshes.geom} castShadow receiveShadow>
              <meshStandardMaterial
                color={color}
                roughness={0.4}
                metalness={0.1}
                emissive={isWinner ? '#D4AF37' : '#000000'}
                emissiveIntensity={isWinner ? 0.5 : 0}
              />
            </mesh>

            <mesh
              position={[Math.cos(SEGMENT_ANGLE * 0.5) * 1.95, Math.sin(SEGMENT_ANGLE * 0.5) * 1.95, 0.08]}
              rotation={[0, 0, SEGMENT_ANGLE * 0.5]}
              geometry={dividerGeom}
            >
              <meshStandardMaterial color="#D4AF37" metalness={0.9} roughness={0.15} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function WheelNumbers() {
  return (
    <group position={[0, 0.32, 0]}>
      {WHEEL_NUMBERS.map((num, i) => {
        const angle = i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
        const radius = 1.95;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        return (
          <Text
            key={num}
            position={[x, 0, z]}
            rotation={[-Math.PI / 2, 0, -angle + Math.PI]}
            fontSize={0.13}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            font={undefined}
            fontWeight={700}
          >
            {num.toString()}
          </Text>
        );
      })}
    </group>
  );
}

function OuterRim() {
  return (
    <group>
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.7, 2.75, 0.4, 64, 1, true]} />
        <meshStandardMaterial
          color="#5D4037"
          roughness={0.25}
          metalness={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[0, 0.31, 0]}>
        <torusGeometry args={[2.72, 0.04, 16, 64]} />
        <meshStandardMaterial color="#D4AF37" metalness={1} roughness={0.1} />
      </mesh>

      <mesh position={[0, -0.11, 0]}>
        <torusGeometry args={[2.72, 0.03, 16, 64]} />
        <meshStandardMaterial color="#D4AF37" metalness={1} roughness={0.1} />
      </mesh>

      <mesh position={[0, 0.1, 0]} receiveShadow>
        <cylinderGeometry args={[2.65, 2.65, 0.38, 64]} />
        <meshStandardMaterial color="#2E1A12" roughness={0.3} metalness={0.4} />
      </mesh>
    </group>
  );
}

function BallTrack() {
  return (
    <mesh position={[0, 0.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[2.35, 2.6, 64]} />
      <meshStandardMaterial
        color="#1a1a1a"
        roughness={0.15}
        metalness={0.8}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function GoldDecorativeRing() {
  return (
    <mesh position={[0, 0.26, 0]}>
      <torusGeometry args={[2.35, 0.025, 16, 64]} />
      <meshStandardMaterial color="#D4AF37" metalness={1} roughness={0.1} />
    </mesh>
  );
}

function CenterHub() {
  return (
    <group>
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.65, 0.35, 32]} />
        <meshStandardMaterial
          color="#D4AF37"
          metalness={0.9}
          roughness={0.15}
        />
      </mesh>

      <mesh position={[0, 0.38, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 0.02, 32]} />
        <meshStandardMaterial color="#F4D03F" metalness={1} roughness={0.1} />
      </mesh>

      <mesh position={[0, 0.39, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.06, 16]} />
        <meshStandardMaterial color="#B8860B" metalness={1} roughness={0.1} />
      </mesh>

      <mesh position={[0, 0.26, 0]}>
        <torusGeometry args={[0.61, 0.02, 16, 32]} />
        <meshStandardMaterial color="#F4D03F" metalness={1} roughness={0.1} />
      </mesh>

      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 1.0, 0.18, Math.sin(a) * 1.0]}
            rotation={[0, -a, 0]}
          >
            <boxGeometry args={[0.04, 0.08, 0.8]} />
            <meshStandardMaterial color="#D4AF37" metalness={0.9} roughness={0.15} />
          </mesh>
        );
      })}

      <mesh position={[0, 0.15, 0]} receiveShadow>
        <cylinderGeometry args={[1.55, 1.55, 0.05, 64]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.3} metalness={0.5} />
      </mesh>
    </group>
  );
}

function Ball({ ballAngle, ballRadius, isSpinning }: { ballAngle: number; ballRadius: number; isSpinning: boolean }) {
  const ballRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.PointLight>(null);

  useFrame(() => {
    if (!ballRef.current) return;
    const x = Math.cos(ballAngle) * ballRadius;
    const z = Math.sin(ballAngle) * ballRadius;
    const y = isSpinning ? 0.38 : 0.32;
    ballRef.current.position.set(x, y, z);
    if (glowRef.current) {
      glowRef.current.position.set(x, y + 0.1, z);
    }
  });

  return (
    <>
      <mesh ref={ballRef} castShadow>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial
          color="#f0f0f0"
          metalness={0.8}
          roughness={0.1}
          emissive="#ffffff"
          emissiveIntensity={0.1}
        />
      </mesh>
      <pointLight ref={glowRef} color="#ffffff" intensity={0.3} distance={1} decay={2} />
    </>
  );
}

interface RouletteWheel3DProps {
  rotation: number;
  ballAngle: number;
  ballRadius: number;
  isSpinning: boolean;
  winningNumber: number | null;
}

export default function RouletteWheel3D({
  rotation,
  ballAngle,
  ballRadius,
  isSpinning,
  winningNumber,
}: RouletteWheel3DProps) {
  const wheelGroupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!wheelGroupRef.current) return;
    wheelGroupRef.current.rotation.y = (rotation * Math.PI) / 180;
  });

  return (
    <group rotation={[0.4, 0, 0]}>
      <spotLight
        position={[0, 5, 2]}
        angle={0.5}
        penumbra={0.8}
        intensity={3}
        color="#FFF5E1"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <ambientLight intensity={0.4} color="#FFF5E1" />
      <pointLight position={[3, 2, 0]} intensity={0.6} color="#D4AF37" distance={8} decay={2} />
      <pointLight position={[-3, 2, 0]} intensity={0.6} color="#D4AF37" distance={8} decay={2} />
      <pointLight position={[0, 1, 3]} intensity={0.3} color="#ffffff" distance={6} decay={2} />

      <OuterRim />
      <BallTrack />
      <GoldDecorativeRing />

      <group ref={wheelGroupRef}>
        <WheelPockets winningNumber={winningNumber} />
        <WheelNumbers />
        <CenterHub />
      </group>

      <Ball ballAngle={ballAngle} ballRadius={ballRadius} isSpinning={isSpinning} />
    </group>
  );
}

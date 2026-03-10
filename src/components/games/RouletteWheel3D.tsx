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
  if (num === 0) return '#1fa34a';
  return isRed(num) ? '#e53935' : '#222222';
}

function WheelBase() {
  return (
    <group>
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[2.9, 2.9, 0.06, 64]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.2} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <torusGeometry args={[2.9, 0.03, 16, 64]} />
        <meshStandardMaterial color="#D4AF37" metalness={1} roughness={0.1} />
      </mesh>
    </group>
  );
}

function WheelPockets({ winningNumber }: { winningNumber: number | null }) {
  const pocketGeom = useMemo(() => {
    const shape = new THREE.Shape();
    const innerR = 1.55;
    const outerR = 2.35;
    const halfAngle = SEGMENT_ANGLE * 0.47;

    shape.moveTo(Math.cos(-halfAngle) * innerR, Math.sin(-halfAngle) * innerR);
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const a = -halfAngle + (halfAngle * 2 * i) / steps;
      shape.lineTo(Math.cos(a) * outerR, Math.sin(a) * outerR);
    }
    for (let i = steps; i >= 0; i--) {
      const a = -halfAngle + (halfAngle * 2 * i) / steps;
      shape.lineTo(Math.cos(a) * innerR, Math.sin(a) * innerR);
    }
    shape.closePath();

    return new THREE.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: false });
  }, []);

  const dividerGeom = useMemo(() => {
    return new THREE.BoxGeometry(0.025, 0.82, 0.26);
  }, []);

  return (
    <group position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {WHEEL_NUMBERS.map((num, i) => {
        const angle = i * SEGMENT_ANGLE;
        const color = getPocketColor(num);
        const isWinner = winningNumber === num;

        return (
          <group key={num} rotation={[0, 0, angle]}>
            <mesh geometry={pocketGeom} castShadow receiveShadow>
              <meshStandardMaterial
                color={color}
                roughness={0.35}
                metalness={0.05}
                emissive={isWinner ? '#D4AF37' : '#000000'}
                emissiveIntensity={isWinner ? 0.8 : 0}
              />
            </mesh>

            <mesh
              position={[Math.cos(SEGMENT_ANGLE * 0.5) * 1.95, Math.sin(SEGMENT_ANGLE * 0.5) * 1.95, 0.11]}
              rotation={[0, 0, SEGMENT_ANGLE * 0.5]}
              geometry={dividerGeom}
            >
              <meshStandardMaterial color="#C0A030" metalness={0.85} roughness={0.2} />
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
            fontSize={0.16}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            font={undefined}
            fontWeight={700}
            outlineWidth={0.008}
            outlineColor="#000000"
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
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.72, 2.78, 0.5, 64, 1, true]} />
        <meshStandardMaterial
          color="#6D4C41"
          roughness={0.3}
          metalness={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[0, 0.41, 0]}>
        <torusGeometry args={[2.74, 0.05, 16, 64]} />
        <meshStandardMaterial color="#D4AF37" metalness={1} roughness={0.1} />
      </mesh>

      <mesh position={[0, -0.1, 0]}>
        <torusGeometry args={[2.76, 0.04, 16, 64]} />
        <meshStandardMaterial color="#D4AF37" metalness={1} roughness={0.1} />
      </mesh>

      <mesh position={[0, 0.15, 0]} receiveShadow>
        <cylinderGeometry args={[2.65, 2.65, 0.48, 64]} />
        <meshStandardMaterial color="#3E2723" roughness={0.35} metalness={0.3} />
      </mesh>
    </group>
  );
}

function BallTrack() {
  return (
    <group>
      <mesh position={[0, 0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.38, 2.62, 64]} />
        <meshStandardMaterial
          color="#2a2a2a"
          roughness={0.1}
          metalness={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.31, 0]}>
        <torusGeometry args={[2.38, 0.02, 16, 64]} />
        <meshStandardMaterial color="#D4AF37" metalness={1} roughness={0.1} />
      </mesh>
    </group>
  );
}

function CenterHub() {
  return (
    <group>
      <mesh position={[0, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.6, 0.4, 32]} />
        <meshStandardMaterial
          color="#D4AF37"
          metalness={0.85}
          roughness={0.2}
        />
      </mesh>

      <mesh position={[0, 0.43, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.03, 32]} />
        <meshStandardMaterial color="#F4D03F" metalness={1} roughness={0.1} />
      </mesh>

      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.06, 16]} />
        <meshStandardMaterial color="#B8860B" metalness={1} roughness={0.1} />
      </mesh>

      <mesh position={[0, 0.32, 0]}>
        <torusGeometry args={[0.56, 0.025, 16, 32]} />
        <meshStandardMaterial color="#F4D03F" metalness={1} roughness={0.1} />
      </mesh>

      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 1.0, 0.2, Math.sin(a) * 1.0]}
            rotation={[0, -a, 0]}
          >
            <boxGeometry args={[0.05, 0.1, 0.85]} />
            <meshStandardMaterial color="#D4AF37" metalness={0.85} roughness={0.2} />
          </mesh>
        );
      })}

      <mesh position={[0, 0.15, 0]} receiveShadow>
        <cylinderGeometry args={[1.5, 1.5, 0.06, 64]} />
        <meshStandardMaterial color="#111111" roughness={0.25} metalness={0.4} />
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
    const y = isSpinning ? 0.42 : 0.34;
    ballRef.current.position.set(x, y, z);
    if (glowRef.current) {
      glowRef.current.position.set(x, y + 0.15, z);
    }
  });

  return (
    <>
      <mesh ref={ballRef} castShadow>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial
          color="#f5f5f5"
          metalness={0.7}
          roughness={0.05}
          emissive="#ffffff"
          emissiveIntensity={0.15}
        />
      </mesh>
      <pointLight ref={glowRef} color="#ffffff" intensity={0.5} distance={1.5} decay={2} />
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
    <group rotation={[0.35, 0, 0]}>
      <spotLight
        position={[0, 6, 3]}
        angle={0.6}
        penumbra={0.6}
        intensity={5}
        color="#FFF8E8"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <ambientLight intensity={0.7} color="#FFF5E1" />
      <pointLight position={[3, 3, 1]} intensity={1.2} color="#D4AF37" distance={10} decay={2} />
      <pointLight position={[-3, 3, 1]} intensity={1.2} color="#D4AF37" distance={10} decay={2} />
      <pointLight position={[0, 2, 4]} intensity={0.8} color="#ffffff" distance={8} decay={2} />
      <pointLight position={[0, 4, -2]} intensity={0.5} color="#FFF5E1" distance={10} decay={2} />

      <WheelBase />
      <OuterRim />
      <BallTrack />

      <group ref={wheelGroupRef}>
        <WheelPockets winningNumber={winningNumber} />
        <WheelNumbers />
        <CenterHub />
      </group>

      <Ball ballAngle={ballAngle} ballRadius={ballRadius} isSpinning={isSpinning} />
    </group>
  );
}

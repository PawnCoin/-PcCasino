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
  if (num === 0) return '#22a84a';
  return isRed(num) ? '#e53935' : '#3a3a3a';
}

function getPocketEmissive(num: number): string {
  if (num === 0) return '#0a5a1a';
  return isRed(num) ? '#5a0a0a' : '#111111';
}

function WheelBase() {
  return (
    <mesh position={[0, 0.02, 0]} receiveShadow>
      <cylinderGeometry args={[2.9, 2.9, 0.06, 64]} />
      <meshStandardMaterial color="#2a2a2a" roughness={0.4} metalness={0.3} />
    </mesh>
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

    return new THREE.ExtrudeGeometry(shape, { depth: 0.18, bevelEnabled: false });
  }, []);

  return (
    <group position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {WHEEL_NUMBERS.map((num, i) => {
        const angle = i * SEGMENT_ANGLE;
        const color = getPocketColor(num);
        const emissiveColor = getPocketEmissive(num);
        const isWinner = winningNumber === num;

        return (
          <mesh key={num} rotation={[0, 0, angle]} geometry={pocketGeom}>
            <meshStandardMaterial
              color={color}
              roughness={0.6}
              metalness={0}
              emissive={isWinner ? '#D4AF37' : emissiveColor}
              emissiveIntensity={isWinner ? 1.2 : 0.3}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function WheelNumbers() {
  return (
    <group position={[0, 0.28, 0]}>
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
            fontSize={0.18}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            font={undefined}
            fontWeight={700}
            outlineWidth={0.012}
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
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[2.72, 2.78, 0.4, 64, 1, true]} />
        <meshStandardMaterial
          color="#8D6E63"
          roughness={0.5}
          metalness={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.12, 0]} receiveShadow>
        <cylinderGeometry args={[2.65, 2.65, 0.35, 64]} />
        <meshStandardMaterial color="#5D4037" roughness={0.5} metalness={0.1} />
      </mesh>
    </group>
  );
}

function BallTrack() {
  return (
    <mesh position={[0, 0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[2.38, 2.62, 64]} />
      <meshStandardMaterial
        color="#444444"
        roughness={0.3}
        metalness={0.3}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function CenterHub() {
  return (
    <group>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.55, 0.6, 0.35, 32]} />
        <meshStandardMaterial
          color="#D4AF37"
          metalness={0.5}
          roughness={0.3}
          emissive="#8B6914"
          emissiveIntensity={0.3}
        />
      </mesh>
      <mesh position={[0, 0.41, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.03, 32]} />
        <meshStandardMaterial color="#F4D03F" metalness={0.5} roughness={0.3} emissive="#B8860B" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0, 0.15, 0]} receiveShadow>
        <cylinderGeometry args={[1.5, 1.5, 0.06, 64]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.5} metalness={0.1} />
      </mesh>
    </group>
  );
}

interface RouletteWheel3DProps {
  targetSpeed: number;
  ballDropped: boolean;
  winningNumber: number | null;
}

export default function RouletteWheel3D({
  targetSpeed,
  ballDropped,
  winningNumber,
}: RouletteWheel3DProps) {
  const wheelGroupRef = useRef<THREE.Group>(null);
  const ballRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.PointLight>(null);

  const wheelRotRef = useRef(0);
  const ballAngleRef = useRef(Math.random() * Math.PI * 2);
  const currentSpeedRef = useRef(0);
  const ballRadiusRef = useRef(2.45);
  const ballYRef = useRef(0.42);
  const dropTransitionRef = useRef(0);
  const prevBallDroppedRef = useRef(false);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);

    const targetSpeedRad = (targetSpeed * Math.PI) / 180;
    const lerpRate = targetSpeedRad > currentSpeedRef.current ? 3.5 : 2.5;
    currentSpeedRef.current += (targetSpeedRad - currentSpeedRef.current) * Math.min(dt * lerpRate, 1);

    wheelRotRef.current += currentSpeedRef.current * dt;

    if (wheelGroupRef.current) {
      wheelGroupRef.current.rotation.y = wheelRotRef.current;
    }

    if (ballRef.current) {
      if (!ballDropped) {
        if (prevBallDroppedRef.current) {
          dropTransitionRef.current = 0;
        }

        ballAngleRef.current -= currentSpeedRef.current * 3 * dt;
        ballRadiusRef.current += (2.45 - ballRadiusRef.current) * Math.min(dt * 3, 1);
        ballYRef.current += (0.42 - ballYRef.current) * Math.min(dt * 3, 1);

        const x = Math.cos(ballAngleRef.current) * ballRadiusRef.current;
        const z = Math.sin(ballAngleRef.current) * ballRadiusRef.current;
        ballRef.current.position.set(x, ballYRef.current, z);
      } else if (winningNumber !== null) {
        if (!prevBallDroppedRef.current) {
          dropTransitionRef.current = 0;
        }
        dropTransitionRef.current = Math.min(dropTransitionRef.current + dt, 1.0);

        const t = Math.min(dropTransitionRef.current / 0.8, 1);

        const pocketIdx = WHEEL_NUMBERS.indexOf(winningNumber);
        const pocketAngle = pocketIdx * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
        const targetAngle = wheelRotRef.current + pocketAngle;
        const targetRadius = 1.95;
        const targetY = 0.30;

        if (t < 0.3) {
          const bounceProgress = t / 0.3;
          const bounceEase = 1 - Math.pow(1 - bounceProgress, 2);
          const midRadius = 2.45 + (2.15 - 2.45) * bounceEase;
          ballRadiusRef.current = midRadius;
          ballAngleRef.current += (targetAngle - ballAngleRef.current) * Math.min(dt * 8, 1);
          ballYRef.current += (0.36 - ballYRef.current) * Math.min(dt * 6, 1);
        } else {
          ballAngleRef.current = targetAngle;
          ballRadiusRef.current += (targetRadius - ballRadiusRef.current) * Math.min(dt * 5, 1);
          ballYRef.current += (targetY - ballYRef.current) * Math.min(dt * 5, 1);

          const settleT = (t - 0.3) / 0.7;
          if (settleT < 0.5) {
            const wobble = Math.sin(settleT * Math.PI * 4) * 0.02 * (1 - settleT);
            ballRadiusRef.current += wobble;
          }
        }

        const x = Math.cos(ballAngleRef.current) * ballRadiusRef.current;
        const z = Math.sin(ballAngleRef.current) * ballRadiusRef.current;
        ballRef.current.position.set(x, ballYRef.current, z);
      }

      if (glowRef.current && ballRef.current) {
        glowRef.current.position.copy(ballRef.current.position);
        glowRef.current.position.y += 0.2;
      }
    }

    prevBallDroppedRef.current = ballDropped;
  });

  return (
    <group rotation={[0.35, 0, 0]}>
      <ambientLight intensity={2.5} color="#ffffff" />
      <directionalLight position={[0, 8, 0]} intensity={3} color="#ffffff" />
      <spotLight
        position={[0, 7, 4]}
        angle={0.8}
        penumbra={0.5}
        intensity={15}
        color="#FFF8E8"
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
      />
      <spotLight
        position={[0, 6, -3]}
        angle={0.7}
        penumbra={0.6}
        intensity={8}
        color="#ffffff"
      />
      <pointLight position={[3, 4, 2]} intensity={3} color="#ffffff" distance={12} decay={2} />
      <pointLight position={[-3, 4, 2]} intensity={3} color="#ffffff" distance={12} decay={2} />
      <pointLight position={[0, 3, 5]} intensity={2} color="#ffffff" distance={10} decay={2} />

      <WheelBase />
      <OuterRim />
      <BallTrack />

      <group ref={wheelGroupRef}>
        <WheelPockets winningNumber={winningNumber} />
        <WheelNumbers />
        <CenterHub />
      </group>

      <mesh ref={ballRef} castShadow>
        <sphereGeometry args={[0.13, 32, 32]} />
        <meshPhysicalMaterial
          color="#f0f0f0"
          metalness={0.15}
          roughness={0.06}
          clearcoat={1.0}
          clearcoatRoughness={0.05}
          reflectivity={1.0}
          emissive="#ffffff"
          emissiveIntensity={0.45}
        />
      </mesh>
      <pointLight ref={glowRef} color="#fffaf0" intensity={2.5} distance={2.5} decay={2} />
    </group>
  );
}

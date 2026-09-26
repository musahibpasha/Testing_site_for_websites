import { Suspense, useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sphere, Ring, Icosahedron, Stars } from "@react-three/drei";
import { useTesting, PHASES } from "../../context/TestingContext";
import "./Assistant3D.css";

const STATUS_COLOR = {
  [PHASES.IDLE]: "#00e5ff",
  [PHASES.CRAWLING]: "#7c4dff",
  [PHASES.TESTING]: "#ffb020",
  [PHASES.ANALYZING]: "#ff3ec8",
  [PHASES.DONE]: "#00ffb2",
  [PHASES.ERROR]: "#ff4d6d",
};

// The orb feels more alive when it gently drifts in place and responds to
// pointer motion, instead of just spinning with no sense of presence.
function PointerRig({ children, interactive }) {
  const group = useRef();
  const { pointer } = useThree();

  useFrame((state, delta) => {
    if (!group.current) return;

    const time = state.clock.getElapsedTime();
    const driftX = Math.sin(time * 0.7) * 0.45;
    const driftY = Math.cos(time * 0.9) * 0.35;
    const targetX = interactive ? pointer.x * 0.8 + driftX : driftX;
    const targetY = interactive ? -pointer.y * 0.65 + driftY : driftY;

    group.current.rotation.y += (targetX - group.current.rotation.y) * 0.05;
    group.current.rotation.x += (targetY - group.current.rotation.x) * 0.05;
    group.current.rotation.z += delta * 0.12;
  });

  return <group ref={group}>{children}</group>;
}

function Core({ status, flash }) {
  const meshRef = useRef();
  const shellRef = useRef();
  const nucleusRef = useRef();
  const speed = status === PHASES.IDLE ? 0.35 : 1.6;

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    const targetScale = flash ? 1.12 + Math.sin(time * 14) * 0.08 : 1.03 + Math.sin(time * 2.4) * 0.04;

    if (meshRef.current) {
      meshRef.current.rotation.y += delta * speed;
      meshRef.current.rotation.x += delta * speed * 0.45;
      meshRef.current.scale.x += (targetScale - meshRef.current.scale.x) * 0.08;
      meshRef.current.scale.y += (targetScale - meshRef.current.scale.y) * 0.08;
      meshRef.current.scale.z += (targetScale - meshRef.current.scale.z) * 0.08;
    }

    if (shellRef.current) {
      shellRef.current.rotation.y -= delta * speed * 0.3;
      shellRef.current.rotation.z += delta * speed * 0.2;
    }

    if (nucleusRef.current) {
      nucleusRef.current.position.x = Math.sin(time * 3.2) * 0.12;
      nucleusRef.current.position.y = Math.cos(time * 2.6) * 0.1;
    }
  });

  const color = flash ? "#ff4d6d" : STATUS_COLOR[status] || STATUS_COLOR[PHASES.IDLE];

  return (
    <Float speed={2.4} rotationIntensity={0.9} floatIntensity={1.8}>
      <Sphere ref={meshRef} args={[1.1, 64, 64]}>
        <MeshDistortMaterial
          color={color}
          emissive={color}
          emissiveIntensity={flash ? 1.4 : 0.8}
          distort={status === PHASES.IDLE ? 0.25 : 0.48}
          speed={status === PHASES.IDLE ? 1.2 : 3.2}
          roughness={0.12}
          metalness={0.72}
        />
      </Sphere>
      <mesh ref={nucleusRef} position={[0, 0, 0.4]}>
        <sphereGeometry args={[0.35, 24, 24]} />
        <meshBasicMaterial color="#eafcff" transparent opacity={0.78} />
      </mesh>
      <Icosahedron ref={shellRef} args={[1.85, 1]}>
        <meshBasicMaterial color={color} wireframe transparent opacity={0.2} />
      </Icosahedron>
      <Ring args={[1.6, 1.65, 64]} rotation={[Math.PI / 2.3, 0, 0]}>
        <meshBasicMaterial color={color} transparent opacity={0.55} />
      </Ring>
      <Ring args={[2.0, 2.03, 64]} rotation={[Math.PI / 1.8, 0.4, 0]}>
        <meshBasicMaterial color={color} transparent opacity={0.3} />
      </Ring>
    </Float>
  );
}

export default function Assistant3D() {
  const { status, bugs } = useTesting();
  const [flash, setFlash] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const prevBugCount = useRef(0);

  // Brief red pulse whenever a new bug comes in over the live stream —
  // gives the assistant a reactive, "it's actually watching" feel.
  useEffect(() => {
    if (bugs.length > prevBugCount.current) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 350);
      prevBugCount.current = bugs.length;
      return () => clearTimeout(t);
    }
    prevBugCount.current = bugs.length;
  }, [bugs.length]);

  return (
    <div
      className="wg-assistant3d"
      onMouseEnter={() => setInteractive(true)}
      onMouseLeave={() => setInteractive(false)}
    >
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <pointLight position={[5, 5, 5]} intensity={1.5} />
        <pointLight position={[-5, -3, -5]} intensity={0.9} color="#7c4dff" />
        <Suspense fallback={null}>
          <PointerRig interactive={interactive}>
            <Core status={status} flash={flash} />
          </PointerRig>
          <Stars radius={40} depth={30} count={1200} factor={2} fade speed={0.5} />
        </Suspense>
      </Canvas>
      <div className="wg-assistant3d__label">
        <span>WEBGUARD AI</span>
        <small>{status === PHASES.IDLE ? "standing by" : `${status}...`}</small>
      </div>
    </div>
  );
}

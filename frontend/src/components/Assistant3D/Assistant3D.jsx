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

// Whole scene tilts gently toward the pointer, so the assistant feels
// like it's tracking you rather than just spinning on its own.
function PointerRig({ children }) {
  const group = useRef();
  const { pointer } = useThree();

  useFrame(() => {
    if (!group.current) return;
    group.current.rotation.y += (pointer.x * 0.5 - group.current.rotation.y) * 0.04;
    group.current.rotation.x += (-pointer.y * 0.3 - group.current.rotation.x) * 0.04;
  });

  return <group ref={group}>{children}</group>;
}

function Core({ status, flash }) {
  const meshRef = useRef();
  const shellRef = useRef();
  const speed = status === PHASES.IDLE ? 0.3 : 1.4;

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * speed;
      meshRef.current.rotation.x += delta * speed * 0.4;
    }
    if (shellRef.current) {
      shellRef.current.rotation.y -= delta * speed * 0.25;
      shellRef.current.rotation.z += delta * speed * 0.15;
    }
  });

  const color = flash ? "#ff4d6d" : STATUS_COLOR[status] || STATUS_COLOR[PHASES.IDLE];

  return (
    <Float speed={2} rotationIntensity={0.6} floatIntensity={1.2}>
      <Sphere ref={meshRef} args={[1.1, 64, 64]}>
        <MeshDistortMaterial
          color={color}
          emissive={color}
          emissiveIntensity={flash ? 1.2 : 0.6}
          distort={status === PHASES.IDLE ? 0.25 : 0.5}
          speed={status === PHASES.IDLE ? 1 : 3}
          roughness={0.15}
          metalness={0.6}
        />
      </Sphere>
      <Icosahedron ref={shellRef} args={[1.85, 1]}>
        <meshBasicMaterial color={color} wireframe transparent opacity={0.18} />
      </Icosahedron>
      <Ring args={[1.6, 1.65, 64]} rotation={[Math.PI / 2.3, 0, 0]}>
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </Ring>
      <Ring args={[2.0, 2.03, 64]} rotation={[Math.PI / 1.8, 0.4, 0]}>
        <meshBasicMaterial color={color} transparent opacity={0.25} />
      </Ring>
    </Float>
  );
}

export default function Assistant3D() {
  const { status, bugs } = useTesting();
  const [flash, setFlash] = useState(false);
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
    <div className="wg-assistant3d">
      <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <pointLight position={[5, 5, 5]} intensity={1.2} />
        <pointLight position={[-5, -3, -5]} intensity={0.6} color="#7c4dff" />
        <Suspense fallback={null}>
          <PointerRig>
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

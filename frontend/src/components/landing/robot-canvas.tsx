"use client";

import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Box3, Group, Vector3 } from "three";

const MODEL_URL = "/models/sani_robot.glb";

function RobotModel() {
  const { scene } = useGLTF(MODEL_URL);
  const group = useRef<Group>(null);

  useEffect(() => {
    // Auto-fit: center the model and scale it into a ~2.6-unit envelope so
    // the framing survives re-exports of the GLB without hand-tuned numbers.
    const box = new Box3().setFromObject(scene);
    const size = box.getSize(new Vector3()).length();
    const center = box.getCenter(new Vector3());
    scene.position.sub(center);
    if (size > 0) group.current?.scale.setScalar(2.6 / size);
  }, [scene]);

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.35;
  });

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
}

export default function RobotCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0.25, 3.1], fov: 38 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 4, 5]} intensity={1.6} />
      <directionalLight position={[-4, 2, -3]} intensity={0.5} />
      <Suspense fallback={null}>
        <RobotModel />
      </Suspense>
    </Canvas>
  );
}

useGLTF.preload(MODEL_URL);

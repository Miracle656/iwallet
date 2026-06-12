"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, Clone, useGLTF } from "@react-three/drei";

const MODEL_URL = "/models/sani_robot.glb";

function RobotModel() {
  const { scene } = useGLTF(MODEL_URL);
  // Clone so the same cached GLB can appear in several canvases at once.
  return <Clone object={scene} />;
}

/**
 * Static (non-rotating) render of the sani robot. `accent` tints the key
 * light so the duplicates on the side cards read as different colorways of
 * the same model.
 */
export default function RobotCanvas({ accent = "#ffffff" }: { accent?: string }) {
  return (
    <Canvas
      frameloop="demand"
      camera={{ position: [0, 0, 5], fov: 35 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.85} />
      <directionalLight color={accent} position={[3, 4, 5]} intensity={1.9} />
      <directionalLight color="#ffffff" position={[-4, 2, -3]} intensity={0.6} />
      <Suspense fallback={null}>
        {/* Bounds frames whatever the GLB's actual size/origin is. */}
        <Bounds fit clip observe margin={1.15}>
          <RobotModel />
        </Bounds>
      </Suspense>
    </Canvas>
  );
}

useGLTF.preload(MODEL_URL);

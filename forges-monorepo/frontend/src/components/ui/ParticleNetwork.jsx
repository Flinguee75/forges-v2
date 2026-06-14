import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const PARTICLE_COUNT = 55;
const CONNECTION_DISTANCE = 0.13;
const MOUSE_INFLUENCE = 0.06;

function Particles({ mouse }) {
  const pointsRef = useRef();
  const linesRef = useRef();

  const positions = useMemo(() => {
    const arr = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 2;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 2;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
    }
    return arr;
  }, []);

  const velocities = useMemo(() => {
    const arr = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 0.0006;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 0.0006;
      arr[i * 3 + 2] = 0;
    }
    return arr;
  }, []);

  const linePositions = useMemo(() => new Float32Array(PARTICLE_COUNT * PARTICLE_COUNT * 6), []);
  const lineColors = useMemo(() => new Float32Array(PARTICLE_COUNT * PARTICLE_COUNT * 6), []);

  const { size } = useThree();

  useFrame(() => {
    const pos = pointsRef.current.geometry.attributes.position.array;
    const mx = (mouse.current[0] / size.width) * 2 - 1;
    const my = -(mouse.current[1] / size.height) * 2 + 1;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ix = i * 3;
      const dx = mx - pos[ix];
      const dy = my - pos[ix + 1];
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 0.5) {
        velocities[ix] += dx * MOUSE_INFLUENCE * 0.0002;
        velocities[ix + 1] += dy * MOUSE_INFLUENCE * 0.0002;
      }

      velocities[ix] *= 0.995;
      velocities[ix + 1] *= 0.995;

      pos[ix] += velocities[ix];
      pos[ix + 1] += velocities[ix + 1];

      if (pos[ix] > 1) pos[ix] = -1;
      if (pos[ix] < -1) pos[ix] = 1;
      if (pos[ix + 1] > 1) pos[ix + 1] = -1;
      if (pos[ix + 1] < -1) pos[ix + 1] = 1;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;

    let lineIdx = 0;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      for (let j = i + 1; j < PARTICLE_COUNT; j++) {
        const ix = i * 3;
        const jx = j * 3;
        const dx = pos[ix] - pos[jx];
        const dy = pos[ix + 1] - pos[jx + 1];
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CONNECTION_DISTANCE) {
          const alpha = (1 - dist / CONNECTION_DISTANCE) * 0.03;
          linePositions[lineIdx] = pos[ix];
          linePositions[lineIdx + 1] = pos[ix + 1];
          linePositions[lineIdx + 2] = pos[ix + 2];
          linePositions[lineIdx + 3] = pos[jx];
          linePositions[lineIdx + 4] = pos[jx + 1];
          linePositions[lineIdx + 5] = pos[jx + 2];
          lineColors[lineIdx] = alpha;
          lineColors[lineIdx + 1] = alpha;
          lineColors[lineIdx + 2] = alpha;
          lineColors[lineIdx + 3] = alpha;
          lineColors[lineIdx + 4] = alpha;
          lineColors[lineIdx + 5] = alpha;
          lineIdx += 6;
        }
      }
    }

    for (let k = lineIdx; k < linePositions.length; k++) {
      linePositions[k] = 0;
      lineColors[k] = 0;
    }

    linesRef.current.geometry.attributes.position.needsUpdate = true;
    linesRef.current.geometry.attributes.color.needsUpdate = true;
  });

  return (
    <>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={positions}
            count={PARTICLE_COUNT}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.004}
          color="#ffffff"
          opacity={0.25}
          transparent
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={linePositions}
            count={linePositions.length / 3}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            array={lineColors}
            count={lineColors.length / 3}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial vertexColors transparent opacity={1} depthWrite={false} />
      </lineSegments>
    </>
  );
}

export default function ParticleNetwork() {
  const mouse = useRef([0, 0]);

  useEffect(() => {
    const onMove = (e) => {
      mouse.current = [e.clientX, e.clientY];
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <Canvas
      camera={{ position: [0, 0, 1], fov: 75 }}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      gl={{ antialias: false, alpha: true, powerPreference: 'low-power' }}
      dpr={Math.min(window.devicePixelRatio, 1.5)}
    >
      <Particles mouse={mouse} />
    </Canvas>
  );
}

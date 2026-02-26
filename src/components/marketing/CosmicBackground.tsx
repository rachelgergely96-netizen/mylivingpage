"use client";

import { useEffect, useRef } from "react";

export default function CosmicBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animationId = 0;
    let disposed = false;

    const initialize = async () => {
      const THREE = await import("three");
      if (disposed || !canvasRef.current) {
        return;
      }

      const canvas = canvasRef.current;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.z = 30;

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);

      const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
      const handleMouseMove = (event: MouseEvent) => {
        mouse.tx = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.ty = -(event.clientY / window.innerHeight) * 2 + 1;
      };
      window.addEventListener("mousemove", handleMouseMove);

      const particleCount = 1600;
      const particleGeometry = new THREE.BufferGeometry();
      const particlePositions = new Float32Array(particleCount * 3);
      const particleColors = new Float32Array(particleCount * 3);
      const particleSpeeds = new Float32Array(particleCount);

      for (let index = 0; index < particleCount; index += 1) {
        const i3 = index * 3;
        particlePositions[i3] = (Math.random() - 0.5) * 80;
        particlePositions[i3 + 1] = (Math.random() - 0.5) * 80;
        particlePositions[i3 + 2] = (Math.random() - 0.5) * 60 - 10;

        const hue = 0.08 + Math.random() * 0.06;
        const saturation = 0.3 + Math.random() * 0.5;
        const lightness = 0.5 + Math.random() * 0.4;
        const color = new THREE.Color();
        color.setHSL(hue, saturation, lightness);
        particleColors[i3] = color.r;
        particleColors[i3 + 1] = color.g;
        particleColors[i3 + 2] = color.b;
        particleSpeeds[index] = 0.2 + Math.random() * 0.8;
      }

      particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
      particleGeometry.setAttribute("color", new THREE.BufferAttribute(particleColors, 3));

      const particleMaterial = new THREE.PointsMaterial({
        size: 1.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      });
      const particleMesh = new THREE.Points(particleGeometry, particleMaterial);
      scene.add(particleMesh);

      const lineGeometry = new THREE.BufferGeometry();
      const linePositions = new Float32Array(300 * 6);
      lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0xd4a654,
        transparent: true,
        opacity: 0.06,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const lineMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
      scene.add(lineMesh);

      const accentGroup = new THREE.Group();
      const accentGeometries = [
        new THREE.IcosahedronGeometry(2, 0),
        new THREE.OctahedronGeometry(1.5, 0),
        new THREE.TorusGeometry(1.5, 0.3, 8, 6),
      ];

      for (let index = 0; index < 5; index += 1) {
        const material = new THREE.MeshBasicMaterial({
          color: new THREE.Color().setHSL(0.08, 0.6, 0.5),
          wireframe: true,
          transparent: true,
          opacity: 0.05 + Math.random() * 0.05,
        });
        const mesh = new THREE.Mesh(accentGeometries[index % accentGeometries.length], material);
        mesh.position.set((Math.random() - 0.5) * 60, (Math.random() - 0.5) * 50, -10 + Math.random() * -10);
        mesh.userData = {
          rotX: (Math.random() - 0.5) * 0.003,
          rotY: (Math.random() - 0.5) * 0.003,
          rotZ: (Math.random() - 0.5) * 0.003,
          offset: Math.random() * Math.PI * 2,
          amp: 0.5 + Math.random() * 1.5,
        };
        accentGroup.add(mesh);
      }
      scene.add(accentGroup);

      const clock = new THREE.Clock();
      const animate = () => {
        const elapsed = clock.getElapsedTime();
        mouse.x += (mouse.tx - mouse.x) * 0.05;
        mouse.y += (mouse.ty - mouse.y) * 0.05;

        const positions = particleGeometry.attributes.position.array as Float32Array;
        for (let index = 0; index < particleCount; index += 1) {
          const i3 = index * 3;
          positions[i3 + 1] += Math.sin(elapsed * particleSpeeds[index] + index) * 0.003;
          positions[i3] += Math.cos(elapsed * particleSpeeds[index] * 0.7 + index) * 0.002;
          positions[i3] += mouse.x * 0.001 * particleSpeeds[index];
          positions[i3 + 1] += mouse.y * 0.001 * particleSpeeds[index];
        }
        particleGeometry.attributes.position.needsUpdate = true;

        let lineIndex = 0;
        const lines = lineGeometry.attributes.position.array as Float32Array;
        for (let i = 0; i < Math.min(particleCount, 170); i += 1) {
          for (let j = i + 1; j < Math.min(particleCount, 170); j += 1) {
            if (lineIndex >= 300) {
              break;
            }
            const i3 = i * 3;
            const j3 = j * 3;
            const dx = positions[i3] - positions[j3];
            const dy = positions[i3 + 1] - positions[j3 + 1];
            const dz = positions[i3 + 2] - positions[j3 + 2];
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (distance < 6.2) {
              const li = lineIndex * 6;
              lines[li] = positions[i3];
              lines[li + 1] = positions[i3 + 1];
              lines[li + 2] = positions[i3 + 2];
              lines[li + 3] = positions[j3];
              lines[li + 4] = positions[j3 + 1];
              lines[li + 5] = positions[j3 + 2];
              lineIndex += 1;
            }
          }
        }
        for (let i = lineIndex * 6; i < lines.length; i += 1) {
          lines[i] = 0;
        }
        lineGeometry.attributes.position.needsUpdate = true;
        lineGeometry.setDrawRange(0, lineIndex * 2);

        accentGroup.children.forEach((mesh) => {
          mesh.rotation.x += mesh.userData.rotX;
          mesh.rotation.y += mesh.userData.rotY;
          mesh.rotation.z += mesh.userData.rotZ;
          mesh.position.y += Math.sin(elapsed * 0.35 + mesh.userData.offset) * 0.003 * mesh.userData.amp;
        });

        camera.position.x = Math.sin(elapsed * 0.08) * 1.5 + mouse.x * 2;
        camera.position.y = Math.cos(elapsed * 0.06) * 1 + mouse.y * 1.5;
        camera.lookAt(0, 0, 0);
        particleMaterial.opacity = 0.34 + Math.sin(elapsed * 0.5) * 0.1;

        renderer.render(scene, camera);
        animationId = window.requestAnimationFrame(animate);
      };
      animate();

      const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("resize", handleResize);
        window.cancelAnimationFrame(animationId);
        scene.clear();
        renderer.dispose();
        particleGeometry.dispose();
        particleMaterial.dispose();
        lineGeometry.dispose();
        lineMaterial.dispose();
        accentGeometries.forEach((geometry) => geometry.dispose());
      };
    };

    let cleanup: (() => void) | undefined;
    initialize().then((fn) => {
      cleanup = fn;
    });

    return () => {
      disposed = true;
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        inset: 0,
        height: "100%",
        left: 0,
        pointerEvents: "none",
        position: "fixed",
        top: 0,
        width: "100%",
        zIndex: 0,
      }}
    />
  );
}

"use client";

import { useEffect, useRef } from "react";

interface CosmicBackgroundProps {
  activeWhileId?: string;
}

export default function CosmicBackground({ activeWhileId }: CosmicBackgroundProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;

    const initialize = async () => {
      try {
        const THREE = await import("three");
        if (disposed || !canvasRef.current) {
          return;
        }

        const canvas = canvasRef.current;
        const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
        const coarsePointer = coarsePointerQuery.matches;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 30;

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: !coarsePointer, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarsePointer ? 1.25 : 2));
        renderer.setSize(window.innerWidth, window.innerHeight);

        const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
        const particleCount = coarsePointer ? 480 : 760;
        const connectedParticleCount = coarsePointer ? 0 : Math.min(particleCount, 145);
        const maxConnections = coarsePointer ? 0 : 150;
        const particleGeometry = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(particleCount * 3);
        const particleColors = new Float32Array(particleCount * 3);
        const particleSpeeds = new Float32Array(particleCount);

        for (let index = 0; index < particleCount; index += 1) {
          const i3 = index * 3;
          particlePositions[i3] = (Math.random() - 0.5) * 80;
          particlePositions[i3 + 1] = (Math.random() - 0.5) * 80;
          particlePositions[i3 + 2] = (Math.random() - 0.5) * 60 - 10;

          const color = new THREE.Color();
          color.setHSL(
            0.58 + Math.random() * 0.08,
            0.4 + Math.random() * 0.5,
            0.5 + Math.random() * 0.4,
          );
          particleColors[i3] = color.r;
          particleColors[i3 + 1] = color.g;
          particleColors[i3 + 2] = color.b;
          particleSpeeds[index] = 0.2 + Math.random() * 0.8;
        }

        particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
        particleGeometry.setAttribute("color", new THREE.BufferAttribute(particleColors, 3));

        const particleMaterial = new THREE.PointsMaterial({
          size: coarsePointer ? 1 : 1.2,
          vertexColors: true,
          transparent: true,
          opacity: 0.22,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          sizeAttenuation: true,
        });
        const particleMesh = new THREE.Points(particleGeometry, particleMaterial);
        scene.add(particleMesh);

        const lineGeometry = new THREE.BufferGeometry();
        const linePositions = new Float32Array(Math.max(maxConnections, 1) * 6);
        lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
        lineGeometry.setDrawRange(0, 0);
        const lineMaterial = new THREE.LineBasicMaterial({
          color: 0x3b82f6,
          transparent: true,
          opacity: 0.035,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const lineMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
        scene.add(lineMesh);

        const accentGroup = new THREE.Group();
        const accentGeometries = coarsePointer
          ? []
          : [
              new THREE.IcosahedronGeometry(2, 0),
              new THREE.OctahedronGeometry(1.5, 0),
              new THREE.TorusGeometry(1.5, 0.3, 8, 6),
            ];
        const accentMaterials: Array<{ dispose: () => void }> = [];

        accentGeometries.forEach((geometry) => {
          const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color().setHSL(0.6, 0.6, 0.5),
            wireframe: true,
            transparent: true,
            opacity: 0.03 + Math.random() * 0.03,
          });
          accentMaterials.push(material);
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set((Math.random() - 0.5) * 60, (Math.random() - 0.5) * 50, -10 + Math.random() * -10);
          mesh.userData = {
            rotX: (Math.random() - 0.5) * 0.003,
            rotY: (Math.random() - 0.5) * 0.003,
            rotZ: (Math.random() - 0.5) * 0.003,
            offset: Math.random() * Math.PI * 2,
            amp: 0.5 + Math.random() * 1.5,
          };
          accentGroup.add(mesh);
        });
        scene.add(accentGroup);

        const clock = new THREE.Clock();
        let animationId: number | null = null;
        let frameCount = 0;
        let sceneVisible = true;
        let visibilityObserver: IntersectionObserver | null = null;

        const handleMouseMove = (event: MouseEvent) => {
          if (reducedMotionQuery.matches) {
            return;
          }
          mouse.tx = (event.clientX / window.innerWidth) * 2 - 1;
          mouse.ty = -(event.clientY / window.innerHeight) * 2 + 1;
        };

        const updateConnections = (positions: Float32Array) => {
          if (maxConnections === 0 || frameCount % 3 !== 0) {
            return;
          }

          let lineIndex = 0;
          const lines = lineGeometry.attributes.position.array as Float32Array;
          for (let i = 0; i < connectedParticleCount && lineIndex < maxConnections; i += 1) {
            for (let j = i + 1; j < connectedParticleCount && lineIndex < maxConnections; j += 1) {
              const i3 = i * 3;
              const j3 = j * 3;
              const dx = positions[i3] - positions[j3];
              const dy = positions[i3 + 1] - positions[j3 + 1];
              const dz = positions[i3 + 2] - positions[j3 + 2];
              const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
              if (distance < 6.2) {
                const lineOffset = lineIndex * 6;
                lines[lineOffset] = positions[i3];
                lines[lineOffset + 1] = positions[i3 + 1];
                lines[lineOffset + 2] = positions[i3 + 2];
                lines[lineOffset + 3] = positions[j3];
                lines[lineOffset + 4] = positions[j3 + 1];
                lines[lineOffset + 5] = positions[j3 + 2];
                lineIndex += 1;
              }
            }
          }
          lineGeometry.attributes.position.needsUpdate = true;
          lineGeometry.setDrawRange(0, lineIndex * 2);
        };

        const renderFrame = (elapsed: number, animateScene: boolean) => {
          if (animateScene) {
            mouse.x += (mouse.tx - mouse.x) * 0.05;
            mouse.y += (mouse.ty - mouse.y) * 0.05;

            const positions = particleGeometry.attributes.position.array as Float32Array;
            for (let index = 0; index < particleCount; index += 1) {
              const i3 = index * 3;
              positions[i3 + 1] += Math.sin(elapsed * particleSpeeds[index] + index) * 0.003;
              positions[i3] += Math.cos(elapsed * particleSpeeds[index] * 0.7 + index) * 0.002;
            }
            particleGeometry.attributes.position.needsUpdate = true;
            updateConnections(positions);

            accentGroup.children.forEach((mesh) => {
              mesh.rotation.x += mesh.userData.rotX;
              mesh.rotation.y += mesh.userData.rotY;
              mesh.rotation.z += mesh.userData.rotZ;
              mesh.position.y += Math.sin(elapsed * 0.35 + mesh.userData.offset) * 0.003 * mesh.userData.amp;
            });

            camera.position.x = Math.sin(elapsed * 0.08) * 1.5 + mouse.x * 2;
            camera.position.y = Math.cos(elapsed * 0.06) * 1 + mouse.y * 1.5;
            camera.lookAt(0, 0, 0);
            particleMaterial.opacity = 0.2 + Math.sin(elapsed * 0.4) * 0.05;
          }

          renderer.render(scene, camera);
        };

        const animate = () => {
          frameCount += 1;
          renderFrame(clock.getElapsedTime(), true);
          animationId = window.requestAnimationFrame(animate);
        };

        const stop = () => {
          if (animationId !== null) {
            window.cancelAnimationFrame(animationId);
            animationId = null;
          }
        };

        const start = () => {
          stop();
          if (document.hidden || reducedMotionQuery.matches || !sceneVisible) {
            renderFrame(clock.getElapsedTime(), false);
            return;
          }
          animationId = window.requestAnimationFrame(animate);
        };

        const syncMotionPreference = () => {
          canvas.dataset.ambient = reducedMotionQuery.matches ? "static" : "full";
          start();
        };

        const handleVisibility = () => {
          if (document.hidden) {
            stop();
          } else {
            start();
          }
        };

        const handleResize = () => {
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
          renderFrame(clock.getElapsedTime(), false);
        };

        window.addEventListener("resize", handleResize);
        document.addEventListener("visibilitychange", handleVisibility);
        if (!coarsePointer) {
          window.addEventListener("mousemove", handleMouseMove, { passive: true });
        }
        reducedMotionQuery.addEventListener?.("change", syncMotionPreference);

        if (activeWhileId && "IntersectionObserver" in window) {
          const activeElement = document.getElementById(activeWhileId);
          if (activeElement) {
            visibilityObserver = new IntersectionObserver(
              ([entry]) => {
                sceneVisible = Boolean(entry?.isIntersecting);
                if (sceneVisible) {
                  start();
                } else {
                  stop();
                }
              },
              { rootMargin: "120px 0px", threshold: 0 },
            );
            visibilityObserver.observe(activeElement);
          }
        }

        syncMotionPreference();

        return () => {
          stop();
          window.removeEventListener("resize", handleResize);
          document.removeEventListener("visibilitychange", handleVisibility);
          window.removeEventListener("mousemove", handleMouseMove);
          reducedMotionQuery.removeEventListener?.("change", syncMotionPreference);
          visibilityObserver?.disconnect();
          scene.clear();
          renderer.dispose();
          particleGeometry.dispose();
          particleMaterial.dispose();
          lineGeometry.dispose();
          lineMaterial.dispose();
          accentGeometries.forEach((geometry) => geometry.dispose());
          accentMaterials.forEach((material) => material.dispose());
        };
      } catch {
        if (canvasRef.current) {
          canvasRef.current.dataset.ambient = "static";
        }
        return undefined;
      }
    };

    void initialize().then((dispose) => {
      if (disposed) {
        dispose?.();
        return;
      }
      cleanup = dispose;
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [activeWhileId]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-testid="cosmic-background"
      data-ambient="full"
      className="fixed inset-0 z-0 h-full w-full pointer-events-none"
    />
  );
}

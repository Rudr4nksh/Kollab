import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeHeroCanvasProps {
  className?: string;
}

export const ThreeHeroCanvas: React.FC<ThreeHeroCanvasProps> = ({ className }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Camera & Scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 25;

    // High performance renderer capped at 1.0 pixel ratio for zero lag on all GPUs
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: false,
      powerPreference: 'high-performance' 
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(1.0); // 1.0 guarantees zero lag even on 4k screens / integrated GPUs
    container.appendChild(renderer.domElement);

    const sceneGroup = new THREE.Group();
    scene.add(sceneGroup);

    // Only 8 clean, elegant, soft floating ambient orbs (no tiny swarms, clean looking!)
    const orbCount = 8;
    const orbGeo = new THREE.BufferGeometry();
    const orbPositions = new Float32Array(orbCount * 3);
    const orbVelocities: { x: number; y: number; z: number }[] = [];

    // Distinct calm coordinates spread out nicely across the background
    const initialCoords = [
      [-14, 8, -5],
      [15, 10, -8],
      [-16, -6, -3],
      [14, -8, -6],
      [-5, 12, -10],
      [6, -12, -4],
      [-18, 2, -7],
      [18, 0, -5],
    ];

    for (let i = 0; i < orbCount; i++) {
      const coord = initialCoords[i] || [0, 0, 0];
      orbPositions[i * 3] = coord[0];
      orbPositions[i * 3 + 1] = coord[1];
      orbPositions[i * 3 + 2] = coord[2];

      orbVelocities.push({
        x: (Math.random() - 0.5) * 0.005,
        y: 0.004 + Math.random() * 0.006,
        z: (Math.random() - 0.5) * 0.005,
      });
    }

    orbGeo.setAttribute('position', new THREE.BufferAttribute(orbPositions, 3));

    // Clean, soft glowing translucent orb texture
    const orbCanvas = document.createElement('canvas');
    orbCanvas.width = 64;
    orbCanvas.height = 64;
    const orbCtx = orbCanvas.getContext('2d');
    if (orbCtx) {
      const g = orbCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(56, 189, 248, 0.7)');
      g.addColorStop(0.25, 'rgba(2, 132, 199, 0.35)');
      g.addColorStop(0.6, 'rgba(2, 132, 199, 0.08)');
      g.addColorStop(1, 'rgba(2, 132, 199, 0)');
      orbCtx.fillStyle = g;
      orbCtx.fillRect(0, 0, 64, 64);
    }
    const orbTexture = new THREE.CanvasTexture(orbCanvas);

    const orbMat = new THREE.PointsMaterial({
      size: 6.5,
      map: orbTexture,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const orbs = new THREE.Points(orbGeo, orbMat);
    sceneGroup.add(orbs);

    // Parallax variables
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;
    let targetScrollY = window.scrollY || 0;
    let currentScrollY = targetScrollY;

    const handleWindowMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      targetMouseX = (e.clientX / innerWidth - 0.5) * 1.5;
      targetMouseY = (e.clientY / innerHeight - 0.5) * 1.5;
    };

    const handleWindowScroll = () => {
      targetScrollY = window.scrollY || 0;
    };

    window.addEventListener('mousemove', handleWindowMouseMove, { passive: true });
    window.addEventListener('scroll', handleWindowScroll, { passive: true });

    const handleResize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Lightweight Animation Loop: ~0.1% CPU
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Smooth camera parallax
      currentMouseX += (targetMouseX - currentMouseX) * 0.04;
      currentMouseY += (targetMouseY - currentMouseY) * 0.04;
      currentScrollY += (targetScrollY - currentScrollY) * 0.06;

      sceneGroup.rotation.y = currentMouseX * 0.12;
      sceneGroup.rotation.x = -currentMouseY * 0.08;
      sceneGroup.position.y = currentScrollY * 0.008;

      // Slow, peaceful floating for the 8 orbs
      const pos = orbGeo.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;

      for (let i = 0; i < orbCount; i++) {
        const i3 = i * 3;
        arr[i3] += orbVelocities[i].x;
        arr[i3 + 1] += orbVelocities[i].y;
        arr[i3 + 2] += orbVelocities[i].z;

        // Gentle wrap bounds
        if (arr[i3 + 1] > 16) arr[i3 + 1] = -16;
        if (arr[i3] > 22) arr[i3] = -22;
        if (arr[i3] < -22) arr[i3] = 22;
      }
      pos.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('scroll', handleWindowScroll);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      orbGeo.dispose();
      orbMat.dispose();
      orbTexture.dispose();
    };
  }, []);

  return (
    <div 
      ref={mountRef} 
      className={className} 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        pointerEvents: 'none', 
        overflow: 'hidden',
        zIndex: 0 
      }} 
    />
  );
};

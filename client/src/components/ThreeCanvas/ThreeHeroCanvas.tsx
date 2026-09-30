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

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 24;

    // High performance renderer with powerPreference
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: false, // Turn off heavy MSAA for ultra-low latency & 120fps smoothness
      powerPreference: 'high-performance' 
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Cap pixel ratio to 1.5 for buttery performance
    container.appendChild(renderer.domElement);

    const sceneGroup = new THREE.Group();
    scene.add(sceneGroup);

    // 1. Soft Glowing Bubble Orbs (Layer 1: Large translucent floating orbs)
    const orbCount = 28;
    const orbGeo = new THREE.BufferGeometry();
    const orbPositions = new Float32Array(orbCount * 3);
    const orbVelocities: { x: number; y: number; z: number }[] = [];

    for (let i = 0; i < orbCount * 3; i += 3) {
      orbPositions[i] = (Math.random() - 0.5) * 45;
      orbPositions[i + 1] = (Math.random() - 0.5) * 30;
      orbPositions[i + 2] = (Math.random() - 0.5) * 20;
      orbVelocities.push({
        x: (Math.random() - 0.5) * 0.008,
        y: 0.006 + Math.random() * 0.012,
        z: (Math.random() - 0.5) * 0.008,
      });
    }
    orbGeo.setAttribute('position', new THREE.BufferAttribute(orbPositions, 3));

    // Canvas texture for large soft glowing circular bubble orbs
    const orbCanvas = document.createElement('canvas');
    orbCanvas.width = 64;
    orbCanvas.height = 64;
    const orbCtx = orbCanvas.getContext('2d');
    if (orbCtx) {
      const g = orbCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(56, 189, 248, 0.9)');
      g.addColorStop(0.3, 'rgba(2, 132, 199, 0.45)');
      g.addColorStop(0.65, 'rgba(2, 132, 199, 0.12)');
      g.addColorStop(1, 'rgba(2, 132, 199, 0)');
      orbCtx.fillStyle = g;
      orbCtx.fillRect(0, 0, 64, 64);
    }
    const orbTexture = new THREE.CanvasTexture(orbCanvas);

    const orbMat = new THREE.PointsMaterial({
      size: 4.8,
      map: orbTexture,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const largeOrbs = new THREE.Points(orbGeo, orbMat);
    sceneGroup.add(largeOrbs);

    // 2. Micro Bubble Star Field (Layer 2: Crisp floating bubbles from before)
    const particleCount = 220;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities: { x: number; y: number; z: number }[] = [];

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 55;
      positions[i + 1] = (Math.random() - 0.5) * 35;
      positions[i + 2] = (Math.random() - 0.5) * 30;
      velocities.push({
        x: (Math.random() - 0.5) * 0.012,
        y: 0.005 + Math.random() * 0.015,
        z: (Math.random() - 0.5) * 0.012,
      });
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Canvas texture for crisp glowing bubble dots
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 32;
    pCanvas.height = 32;
    const pCtx = pCanvas.getContext('2d');
    if (pCtx) {
      const gradient = pCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, 'rgba(56, 189, 248, 1)');
      gradient.addColorStop(0.4, 'rgba(2, 132, 199, 0.6)');
      gradient.addColorStop(0.8, 'rgba(2, 132, 199, 0.1)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      pCtx.fillStyle = gradient;
      pCtx.fillRect(0, 0, 32, 32);
    }
    const particleTexture = new THREE.CanvasTexture(pCanvas);

    const particleMat = new THREE.PointsMaterial({
      size: 1.1,
      map: particleTexture,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    sceneGroup.add(particles);

    // Parallax tracking variables (Pure numbers, ZERO React state!)
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    let targetScrollY = window.scrollY || 0;
    let currentScrollY = targetScrollY;

    const handleWindowMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      targetMouseX = (e.clientX / innerWidth - 0.5) * 2;
      targetMouseY = (e.clientY / innerHeight - 0.5) * 2;
    };

    const handleWindowScroll = () => {
      targetScrollY = window.scrollY || 0;
    };

    window.addEventListener('mousemove', handleWindowMouseMove, { passive: true });
    window.addEventListener('scroll', handleWindowScroll, { passive: true });

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Animation Loop: 60-120 FPS locked
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Smooth mouse lerp
      currentMouseX += (targetMouseX - currentMouseX) * 0.05;
      currentMouseY += (targetMouseY - currentMouseY) * 0.05;

      // Smooth scroll parallax lerp
      currentScrollY += (targetScrollY - currentScrollY) * 0.08;

      // Parallax camera tilt & vertical displacement
      sceneGroup.rotation.y = currentMouseX * 0.18;
      sceneGroup.rotation.x = -currentMouseY * 0.12;
      sceneGroup.position.y = currentScrollY * 0.012; // Smooth vertical scroll parallax!

      // Animate Large Orbs
      const orbPos = orbGeo.attributes.position as THREE.BufferAttribute;
      const orbArr = orbPos.array as Float32Array;
      for (let i = 0; i < orbCount; i++) {
        const i3 = i * 3;
        orbArr[i3] += orbVelocities[i].x;
        orbArr[i3 + 1] += orbVelocities[i].y;
        orbArr[i3 + 2] += orbVelocities[i].z;

        if (orbArr[i3 + 1] > 18) orbArr[i3 + 1] = -18;
        if (orbArr[i3] > 24) orbArr[i3] = -24;
        if (orbArr[i3] < -24) orbArr[i3] = 24;
      }
      orbPos.needsUpdate = true;

      // Animate Micro Particles
      const pAttr = particleGeo.attributes.position as THREE.BufferAttribute;
      const pArr = pAttr.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        pArr[i3] += velocities[i].x;
        pArr[i3 + 1] += velocities[i].y;
        pArr[i3 + 2] += velocities[i].z;

        if (pArr[i3 + 1] > 20) pArr[i3 + 1] = -20;
        if (pArr[i3] > 28) pArr[i3] = -28;
        if (pArr[i3] < -28) pArr[i3] = 28;
      }
      pAttr.needsUpdate = true;

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
      particleGeo.dispose();
      particleMat.dispose();
      particleTexture.dispose();
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

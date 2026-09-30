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
    camera.position.z = 24;

    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: false,
      powerPreference: 'high-performance' 
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(1.0);
    container.appendChild(renderer.domElement);

    const sceneGroup = new THREE.Group();
    scene.add(sceneGroup);

    // Subtle celestial ambient stars (matching reference image: delicate, calm, clean)
    const starCount = 60;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starVelocities: { x: number; y: number; z: number }[] = [];

    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 50;
      starPositions[i + 1] = (Math.random() - 0.5) * 36;
      starPositions[i + 2] = (Math.random() - 0.5) * 24;
      starVelocities.push({
        x: (Math.random() - 0.5) * 0.003,
        y: 0.002 + Math.random() * 0.004,
        z: (Math.random() - 0.5) * 0.003,
      });
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));

    // Soft celestial star texture
    const sCanvas = document.createElement('canvas');
    sCanvas.width = 32;
    sCanvas.height = 32;
    const sCtx = sCanvas.getContext('2d');
    if (sCtx) {
      const g = sCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, 'rgba(230, 235, 255, 0.9)');
      g.addColorStop(0.2, 'rgba(168, 140, 255, 0.45)');
      g.addColorStop(0.6, 'rgba(100, 60, 220, 0.08)');
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sCtx.fillStyle = g;
      sCtx.fillRect(0, 0, 32, 32);
    }
    const starTexture = new THREE.CanvasTexture(sCanvas);

    const starMat = new THREE.PointsMaterial({
      size: 1.4,
      map: starTexture,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const stars = new THREE.Points(starGeo, starMat);
    sceneGroup.add(stars);

    // Parallax tracking
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;
    let targetScrollY = window.scrollY || 0;
    let currentScrollY = targetScrollY;

    const handleWindowMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      targetMouseX = (e.clientX / innerWidth - 0.5) * 1.2;
      targetMouseY = (e.clientY / innerHeight - 0.5) * 1.2;
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

    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      currentMouseX += (targetMouseX - currentMouseX) * 0.03;
      currentMouseY += (targetMouseY - currentMouseY) * 0.03;
      currentScrollY += (targetScrollY - currentScrollY) * 0.05;

      sceneGroup.rotation.y = currentMouseX * 0.1;
      sceneGroup.rotation.x = -currentMouseY * 0.06;
      sceneGroup.position.y = currentScrollY * 0.006;

      const pos = starGeo.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;

      for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;
        arr[i3] += starVelocities[i].x;
        arr[i3 + 1] += starVelocities[i].y;
        arr[i3 + 2] += starVelocities[i].z;

        if (arr[i3 + 1] > 18) arr[i3 + 1] = -18;
        if (arr[i3] > 25) arr[i3] = -25;
        if (arr[i3] < -25) arr[i3] = 25;
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
      starGeo.dispose();
      starMat.dispose();
      starTexture.dispose();
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

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
      52,
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
    renderer.setPixelRatio(1.0); // 1.0 ensures 120fps with zero lag
    container.appendChild(renderer.domElement);

    const sceneGroup = new THREE.Group();
    scene.add(sceneGroup);

    // 1. Warm Sunset Coral Circles (20 circles) - Creative, warm, human palette
    const coralCount = 20;
    const coralGeo = new THREE.BufferGeometry();
    const coralPositions = new Float32Array(coralCount * 3);
    const coralVelocities: { x: number; y: number; z: number }[] = [];

    const coralCoords = [
      [-16, 10, -4], [14, 12, -7], [-18, -8, -3], [16, -10, -6],
      [-6, 14, -8], [8, -14, -5], [-12, -2, -6], [15, 2, -4],
      [-22, 6, -9], [20, -5, -8], [-4, -8, -4], [6, 8, -5],
      [-10, 16, -7], [12, -16, -6], [-15, 4, -5], [17, 8, -6],
      [-8, -12, -5], [10, 14, -7], [-19, -4, -6], [19, 5, -5]
    ];

    for (let i = 0; i < coralCount; i++) {
      const c = coralCoords[i] || [0, 0, 0];
      coralPositions[i * 3] = c[0];
      coralPositions[i * 3 + 1] = c[1];
      coralPositions[i * 3 + 2] = c[2];

      coralVelocities.push({
        x: (Math.random() - 0.5) * 0.007,
        y: 0.005 + Math.random() * 0.007,
        z: (Math.random() - 0.5) * 0.006,
      });
    }
    coralGeo.setAttribute('position', new THREE.BufferAttribute(coralPositions, 3));

    // Warm Sunset Coral Circle Texture
    const cCanvas = document.createElement('canvas');
    cCanvas.width = 64;
    cCanvas.height = 64;
    const cCtx = cCanvas.getContext('2d');
    if (cCtx) {
      const g = cCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255, 94, 58, 0.85)');
      g.addColorStop(0.25, 'rgba(255, 122, 89, 0.45)');
      g.addColorStop(0.65, 'rgba(255, 154, 120, 0.1)');
      g.addColorStop(1, 'rgba(255, 94, 58, 0)');
      cCtx.fillStyle = g;
      cCtx.fillRect(0, 0, 64, 64);
    }
    const coralTexture = new THREE.CanvasTexture(cCanvas);

    const coralMat = new THREE.PointsMaterial({
      size: 4.8,
      map: coralTexture,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const coralOrbs = new THREE.Points(coralGeo, coralMat);
    sceneGroup.add(coralOrbs);

    // 2. Electric Fresh Mint / Emerald Circles (18 circles)
    const mintCount = 18;
    const mintGeo = new THREE.BufferGeometry();
    const mintPositions = new Float32Array(mintCount * 3);
    const mintVelocities: { x: number; y: number; z: number }[] = [];

    const mintCoords = [
      [12, 6, -5], [-14, -10, -6], [8, -6, -4], [-8, 6, -5],
      [18, 12, -8], [-20, 10, -7], [4, 14, -6], [-5, -14, -5],
      [16, -4, -4], [-16, 2, -6], [22, -8, -9], [-22, -6, -8],
      [2, -4, -3], [-3, 4, -4], [14, -12, -6], [-13, 14, -7],
      [7, 10, -5], [-9, -8, -5]
    ];

    for (let i = 0; i < mintCount; i++) {
      const m = mintCoords[i] || [0, 0, 0];
      mintPositions[i * 3] = m[0];
      mintPositions[i * 3 + 1] = m[1];
      mintPositions[i * 3 + 2] = m[2];

      mintVelocities.push({
        x: (Math.random() - 0.5) * 0.006,
        y: 0.004 + Math.random() * 0.007,
        z: (Math.random() - 0.5) * 0.006,
      });
    }
    mintGeo.setAttribute('position', new THREE.BufferAttribute(mintPositions, 3));

    // Fresh Mint Circle Texture
    const mCanvas = document.createElement('canvas');
    mCanvas.width = 64;
    mCanvas.height = 64;
    const mCtx = mCanvas.getContext('2d');
    if (mCtx) {
      const g = mCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(0, 242, 155, 0.8)');
      g.addColorStop(0.28, 'rgba(16, 185, 129, 0.4)');
      g.addColorStop(0.68, 'rgba(0, 242, 155, 0.1)');
      g.addColorStop(1, 'rgba(0, 242, 155, 0)');
      mCtx.fillStyle = g;
      mCtx.fillRect(0, 0, 64, 64);
    }
    const mintTexture = new THREE.CanvasTexture(mCanvas);

    const mintMat = new THREE.PointsMaterial({
      size: 4.2,
      map: mintTexture,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mintOrbs = new THREE.Points(mintGeo, mintMat);
    sceneGroup.add(mintOrbs);

    // Parallax tracking variables
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

    // Animation Loop: locked 60-120fps with gentle drift
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Smooth camera parallax
      currentMouseX += (targetMouseX - currentMouseX) * 0.04;
      currentMouseY += (targetMouseY - currentMouseY) * 0.04;
      currentScrollY += (targetScrollY - currentScrollY) * 0.06;

      sceneGroup.rotation.y = currentMouseX * 0.14;
      sceneGroup.rotation.x = -currentMouseY * 0.09;
      sceneGroup.position.y = currentScrollY * 0.01;

      // Animate Coral circles
      const cPos = coralGeo.attributes.position as THREE.BufferAttribute;
      const cArr = cPos.array as Float32Array;
      for (let i = 0; i < coralCount; i++) {
        const i3 = i * 3;
        cArr[i3] += coralVelocities[i].x;
        cArr[i3 + 1] += coralVelocities[i].y;
        cArr[i3 + 2] += coralVelocities[i].z;

        if (cArr[i3 + 1] > 18) cArr[i3 + 1] = -18;
        if (cArr[i3] > 24) cArr[i3] = -24;
        if (cArr[i3] < -24) cArr[i3] = 24;
      }
      cPos.needsUpdate = true;

      // Animate Mint circles
      const mPos = mintGeo.attributes.position as THREE.BufferAttribute;
      const mArr = mPos.array as Float32Array;
      for (let i = 0; i < mintCount; i++) {
        const i3 = i * 3;
        mArr[i3] += mintVelocities[i].x;
        mArr[i3 + 1] += mintVelocities[i].y;
        mArr[i3 + 2] += mintVelocities[i].z;

        if (mArr[i3 + 1] > 18) mArr[i3 + 1] = -18;
        if (mArr[i3] > 24) mArr[i3] = -24;
        if (mArr[i3] < -24) mArr[i3] = 24;
      }
      mPos.needsUpdate = true;

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
      coralGeo.dispose();
      coralMat.dispose();
      coralTexture.dispose();
      mintGeo.dispose();
      mintMat.dispose();
      mintTexture.dispose();
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

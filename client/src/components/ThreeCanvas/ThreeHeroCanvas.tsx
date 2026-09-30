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

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 22;

    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, 
      antialias: true, 
      powerPreference: 'high-performance' 
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // Group for parallax movement
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // Custom Fresnel Shader for high-quality translucent glowing glass bubbles
    const bubbleVertexShader = `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      uniform float uTime;
      uniform float uDistort;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        
        // Gentle organic surface pulse
        vec3 pos = position;
        float wave = sin(uTime * 1.5 + position.y * 2.0 + position.x * 2.0) * uDistort;
        pos += normal * wave;

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const bubbleFragmentShader = `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      uniform vec3 uColorBase;
      uniform vec3 uColorRim;
      uniform float uOpacity;
      uniform float uFresnelPower;

      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);

        // Photorealistic Fresnel rim light
        float fresnel = dot(normal, viewDir);
        fresnel = clamp(1.0 - fresnel, 0.0, 1.0);
        float fresnelFactor = pow(fresnel, uFresnelPower);

        // Core soft glow with chromatic rim accent
        vec3 color = mix(uColorBase, uColorRim, fresnelFactor * 0.85);
        float alpha = clamp(fresnelFactor * uOpacity + 0.08, 0.0, 0.95);

        gl_FragColor = vec4(color, alpha);
      }
    `;

    // Color palettes for organic glowing bubbles
    const bubblePalettes = [
      { base: new THREE.Color(0x0284c7), rim: new THREE.Color(0x38bdf8), power: 2.2, opacity: 0.65 },
      { base: new THREE.Color(0x0369a1), rim: new THREE.Color(0x67e8f9), power: 2.8, opacity: 0.55 },
      { base: new THREE.Color(0x4338ca), rim: new THREE.Color(0x818cf8), power: 2.4, opacity: 0.50 },
      { base: new THREE.Color(0x0f766e), rim: new THREE.Color(0x2dd4bf), power: 3.0, opacity: 0.60 },
      { base: new THREE.Color(0x1e1b4b), rim: new THREE.Color(0x38bdf8), power: 1.8, opacity: 0.70 }
    ];

    interface BubbleInstance {
      mesh: THREE.Mesh;
      baseX: number;
      baseY: number;
      baseZ: number;
      speed: number;
      amplitude: number;
      phase: number;
      parallaxFactor: number;
      uniforms: {
        uTime: { value: number };
        uDistort: { value: number };
        uColorBase: { value: THREE.Color };
        uColorRim: { value: THREE.Color };
        uOpacity: { value: number };
        uFresnelPower: { value: number };
      };
    }

    const bubbles: BubbleInstance[] = [];
    const sphereGeo = new THREE.SphereGeometry(1, 32, 32);

    // 1. Generate 34 Multi-depth floating bubbles (no lines, no wireframe!)
    const bubbleCount = 34;
    for (let i = 0; i < bubbleCount; i++) {
      const palette = bubblePalettes[i % bubblePalettes.length];
      
      // Radius distribution: mostly delicate floating droplets (0.5 to 1.8), with a few large ambient orbs (2.5 to 4.2)
      const isHeroOrb = i < 4;
      const radius = isHeroOrb 
        ? 2.6 + Math.random() * 1.8 
        : 0.45 + Math.random() * 1.35;

      const uniforms = {
        uTime: { value: 0 },
        uDistort: { value: isHeroOrb ? 0.04 : 0.02 },
        uColorBase: { value: palette.base },
        uColorRim: { value: palette.rim },
        uOpacity: { value: isHeroOrb ? palette.opacity * 0.75 : palette.opacity },
        uFresnelPower: { value: palette.power }
      };

      const mat = new THREE.ShaderMaterial({
        vertexShader: bubbleVertexShader,
        fragmentShader: bubbleFragmentShader,
        uniforms,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const mesh = new THREE.Mesh(sphereGeo, mat);
      mesh.scale.set(radius, radius, radius);

      // Positioning across a wide 3D space
      const x = (Math.random() - 0.5) * 36;
      const y = (Math.random() - 0.5) * 28;
      const z = (Math.random() - 0.5) * 18 - (isHeroOrb ? 4 : 0);

      mesh.position.set(x, y, z);
      worldGroup.add(mesh);

      // Depth-based parallax: bubbles closer to z=10 move significantly faster than deep bubbles at z=-10
      const depthFactor = (z + 12) / 24; // 0 to 1
      const parallaxFactor = 0.015 + depthFactor * 0.045;

      bubbles.push({
        mesh,
        baseX: x,
        baseY: y,
        baseZ: z,
        speed: 0.6 + Math.random() * 0.9,
        amplitude: 0.6 + Math.random() * 0.8,
        phase: Math.random() * Math.PI * 2,
        parallaxFactor,
        uniforms
      });
    }

    // 2. Add glowing soft luminescence particles (delicate luminous bokeh)
    const sparkleCount = 90;
    const sparkleGeo = new THREE.BufferGeometry();
    const sparklePositions = new Float32Array(sparkleCount * 3);
    const sparkleVelocities: { x: number; y: number; z: number }[] = [];

    for (let i = 0; i < sparkleCount * 3; i += 3) {
      sparklePositions[i] = (Math.random() - 0.5) * 44;
      sparklePositions[i + 1] = (Math.random() - 0.5) * 32;
      sparklePositions[i + 2] = (Math.random() - 0.5) * 20;
      sparkleVelocities.push({
        x: (Math.random() - 0.5) * 0.008,
        y: 0.006 + Math.random() * 0.012,
        z: (Math.random() - 0.5) * 0.008
      });
    }

    sparkleGeo.setAttribute('position', new THREE.BufferAttribute(sparklePositions, 3));

    // Circular soft gradient texture
    const sCanvas = document.createElement('canvas');
    sCanvas.width = 32;
    sCanvas.height = 32;
    const sCtx = sCanvas.getContext('2d');
    if (sCtx) {
      const grad = sCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, 'rgba(56, 189, 248, 1)');
      grad.addColorStop(0.3, 'rgba(2, 132, 199, 0.6)');
      grad.addColorStop(0.7, 'rgba(2, 132, 199, 0.15)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 32, 32);
    }
    const sparkleTex = new THREE.CanvasTexture(sCanvas);

    const sparkleMat = new THREE.PointsMaterial({
      size: 0.9,
      map: sparkleTex,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const sparkles = new THREE.Points(sparkleGeo, sparkleMat);
    worldGroup.add(sparkles);

    // Mouse & Scroll Parallax Tracking
    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    let targetScrollY = window.scrollY || 0;
    let currentScrollY = targetScrollY;

    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      targetMouseX = (e.clientX / innerWidth - 0.5) * 2;
      targetMouseY = (e.clientY / innerHeight - 0.5) * 2;
    };

    const handleScroll = () => {
      targetScrollY = window.scrollY || 0;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

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

    // Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      clock.getDelta();
      const time = clock.getElapsedTime();

      // Smooth mouse lerp
      currentMouseX += (targetMouseX - currentMouseX) * 0.04;
      currentMouseY += (targetMouseY - currentMouseY) * 0.04;

      // Smooth scroll lerp for cinematic parallax
      currentScrollY += (targetScrollY - currentScrollY) * 0.06;

      // Parallax camera tilt & slight drift
      worldGroup.rotation.y = currentMouseX * 0.12;
      worldGroup.rotation.x = -currentMouseY * 0.08;

      // Animate individual bubbles with fluid organic floating + depth scroll parallax
      for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i];
        
        // Fluid organic floating dynamics
        const floatY = Math.sin(time * b.speed + b.phase) * b.amplitude;
        const floatX = Math.cos(time * (b.speed * 0.7) + b.phase) * (b.amplitude * 0.4);

        // Scroll Parallax displacement: each bubble moves upward relative to its depth
        const scrollOffset = currentScrollY * b.parallaxFactor;

        b.mesh.position.y = b.baseY + floatY + scrollOffset;
        b.mesh.position.x = b.baseX + floatX + (currentMouseX * b.parallaxFactor * 40);

        // Update bubble surface shader time
        b.uniforms.uTime.value = time;
      }

      // Animate glowing micro-particles drifting upward
      const pAttr = sparkleGeo.attributes.position as THREE.BufferAttribute;
      const pArr = pAttr.array as Float32Array;
      for (let i = 0; i < sparkleCount; i++) {
        const i3 = i * 3;
        pArr[i3] += sparkleVelocities[i].x;
        pArr[i3 + 1] += sparkleVelocities[i].y;
        pArr[i3 + 2] += sparkleVelocities[i].z;

        // Wrap around bounds
        if (pArr[i3 + 1] > 20) pArr[i3 + 1] = -20;
        if (pArr[i3] > 24) pArr[i3] = -24;
        if (pArr[i3] < -24) pArr[i3] = 24;
      }
      pAttr.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      sphereGeo.dispose();
      sparkleGeo.dispose();
      sparkleMat.dispose();
      sparkleTex.dispose();
      bubbles.forEach(b => {
        b.mesh.geometry.dispose();
        (b.mesh.material as THREE.Material).dispose();
      });
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

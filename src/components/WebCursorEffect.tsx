"use client";

import React, { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// --- DATA STRUCTURES FOR REALISTIC SPIDER-MAN WEB FLUID PHENOMENA ---

interface SilkMistParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

interface DendriticBranch {
  startT: number; // 0.4 to 0.8 along main tendril
  angleOffset: number; // Radians offset from parent
  length: number;
  padSize: number;
}

interface AnchorTendril {
  angle: number;
  length: number;
  curveOffset: number; // Control point deviation for organic bezier
  anchorPadSize: number;
  branches: DendriticBranch[];
}

interface GossamerArc {
  idxA: number;
  idxB: number;
  tA: number; // Position along tendril A (e.g. 0.45 or 0.8)
  tB: number; // Position along tendril B
  sagRatio: number; // Catenary sag depth
}

interface WebShot {
  id: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  flightProgress: number; // 0 to 1
  flightSpeed: number; // High-velocity travel rate
  hasHit: boolean;
  age: number; // Frame counter after hitting
  maxLife: number; // Total lifespan (~110 frames / ~1.8s)
  vibrationAmp: number;
  vibrationFreq: number;
  vibrationDecay: number;
  tendrils: AnchorTendril[];
  gossamers: GossamerArc[];
  mist: SilkMistParticle[];
}

interface DraglinePoint {
  x: number;
  y: number;
  age: number;
  maxAge: number;
}

export const WebCursorEffect: React.FC = () => {
  const pathname = usePathname();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Custom Spider Cursor active ONLY on Home page (/) and Event Pass views (/dashboard, /success, /verify).
  // Native normal cursor active for Registration form (/register), Review (/review), Payment (/payment), and Admin (/admin).
  const isSpiderRoute =
    pathname === "/" ||
    pathname?.startsWith("/dashboard") ||
    pathname?.startsWith("/success") ||
    pathname?.startsWith("/verify");

  useEffect(() => {
    if (!isSpiderRoute) {
      document.body.classList.remove("spider-cursor-active");
      return;
    }

    document.body.classList.add("spider-cursor-active");

    return () => {
      document.body.classList.remove("spider-cursor-active");
    };
  }, [isSpiderRoute]);

  useEffect(() => {
    if (!isSpiderRoute) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animFrameId: number;
    let isTouchDevice = false;

    if (typeof window !== "undefined") {
      isTouchDevice = "ontouchstart" in window && !window.matchMedia("(pointer: fine)").matches;
    }

    // Preload ultra HD clean transparent Spider cursor
    const spiderImg = new Image();
    spiderImg.src = "/assets/spider-cursor-clean.png";

    // Setup high-DPI canvas
    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0); // reset scale before re-applying
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    // Audio Context for authentic, soft Spider-Man "THWIP" silk sound (failsafe)
    let audioCtx: AudioContext | null = null;
    const playThwipSound = () => {
      try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;
        if (!audioCtx) {
          audioCtx = new AudioContextClass();
        }
        if (audioCtx.state === "suspended") {
          audioCtx.resume();
        }

        const now = audioCtx.currentTime;
        
        // 1. Pressurized Air Ejection (White noise burst through bandpass filter)
        const bufferSize = audioCtx.sampleRate * 0.09; // 90ms
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
        }

        const noiseSource = audioCtx.createBufferSource();
        noiseSource.buffer = buffer;

        const filter = audioCtx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(3200, now);
        filter.frequency.exponentialRampToValueAtTime(800, now + 0.08);
        filter.Q.setValueAtTime(3.5, now);

        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(0.12, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        noiseSource.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(audioCtx.destination);
        noiseSource.start(now);

        // 2. High-tension silk snap resonance
        const osc = audioCtx.createOscillator();
        const oscGain = audioCtx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.07);

        oscGain.gain.setValueAtTime(0.07, now);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

        osc.connect(oscGain);
        oscGain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } catch {
        // Silent fallback if audio context isn't permitted by browser policy
      }
    };

    // State collections
    const webShots: WebShot[] = [];
    const draglinePoints: DraglinePoint[] = [];

    let mouseX = -100;
    let mouseY = -100;
    let clickCount = 0;
    let cursorRecoil = 0; // Micro recoil animation on web shot

    // Track mouse movement to generate natural spider dragline silk
    const handleMouseMove = (e: MouseEvent) => {
      if (isTouchDevice) return;
      mouseX = e.clientX;
      mouseY = e.clientY;

      // Add dragline silk point with distance threshold
      const lastPoint = draglinePoints[draglinePoints.length - 1];
      const dist = lastPoint ? Math.hypot(mouseX - lastPoint.x, mouseY - lastPoint.y) : 999;
      if (dist > 8) {
        draglinePoints.push({
          x: mouseX,
          y: mouseY,
          age: 0,
          maxAge: 24, // Fades after ~0.4s
        });

        if (draglinePoints.length > 25) {
          draglinePoints.shift();
        }
      }
    };

    // GENERATE NATURAL ORGANIC SPIDER-MAN WEB SHOT
    const shootSpiderWeb = (targetX: number, targetY: number) => {
      clickCount++;
      cursorRecoil = 1.0;
      playThwipSound();

      const winWidth = window.innerWidth;
      const winHeight = window.innerHeight;

      // Alternate Spider-Man's dual wrist shooters (left wrist / right wrist)
      // or bias based on click position
      const isLeft = clickCount % 2 === 1;
      const wristX = isLeft ? winWidth * 0.18 : winWidth * 0.82;
      const wristY = winHeight + 35; // Fired from just below the screen edge

      // 1. Natural Organic Splat Tendrils (Bio-adhesive Anchor Splatter)
      const numTendrils = Math.floor(Math.random() * 4) + 10; // 10 to 13 tendrils
      const tendrils: AnchorTendril[] = [];

      for (let i = 0; i < numTendrils; i++) {
        // Natural uneven radial distribution with clustering
        const baseAngle = (i / numTendrils) * Math.PI * 2;
        const angleJitter = (Math.random() - 0.5) * 0.45;
        const angle = baseAngle + angleJitter;

        // Organic reach: mix of short adhesive anchors and long clinging tendrils
        const length = Math.random() < 0.25 
          ? Math.random() * 45 + 75  // Long anchor reaching 75 - 120px
          : Math.random() * 35 + 30; // Medium anchor 30 - 65px

        const curveOffset = (Math.random() - 0.5) * 0.35; // Natural tensile curve

        // Dendritic micro-branches (liquid silk splitting under pressure)
        const branches: DendriticBranch[] = [];
        const numBranches = Math.random() < 0.7 ? 1 : (Math.random() < 0.4 ? 2 : 0);
        for (let b = 0; b < numBranches; b++) {
          branches.push({
            startT: Math.random() * 0.35 + 0.45, // Branches out 45% - 80% along tendril
            angleOffset: (Math.random() < 0.5 ? -1 : 1) * (Math.random() * 0.4 + 0.25),
            length: length * (Math.random() * 0.35 + 0.25),
            padSize: Math.random() * 1.5 + 0.8,
          });
        }

        tendrils.push({
          angle,
          length,
          curveOffset,
          anchorPadSize: Math.random() * 2.2 + 1.2,
          branches,
        });
      }

      // 2. Connecting Gossamer Arcs (Natural catenary sagging threads between anchors)
      const gossamers: GossamerArc[] = [];
      for (let i = 0; i < numTendrils; i++) {
        const nextIdx = (i + 1) % numTendrils;
        // Connect inner ring of gossamers
        if (Math.random() < 0.85) {
          gossamers.push({
            idxA: i,
            idxB: nextIdx,
            tA: Math.random() * 0.2 + 0.4, // ~50% out
            tB: Math.random() * 0.2 + 0.4,
            sagRatio: Math.random() * 0.25 + 0.15, // Catenary sag towards center
          });
        }
        // Outer gossamer connections on longer strands
        if (Math.random() < 0.6) {
          gossamers.push({
            idxA: i,
            idxB: nextIdx,
            tA: Math.random() * 0.2 + 0.75, // ~85% out
            tB: Math.random() * 0.2 + 0.75,
            sagRatio: Math.random() * 0.3 + 0.2,
          });
        }
      }

      // 3. Atomized Fluid Droplets / Pressurized Silk Mist
      const mist: SilkMistParticle[] = [];
      const mistCount = Math.floor(Math.random() * 8) + 16; // 16-24 droplets
      for (let m = 0; m < mistCount; m++) {
        const mAngle = Math.random() * Math.PI * 2;
        const mSpeed = Math.random() * 6 + 2.5; // High initial ejection speed
        mist.push({
          x: targetX,
          y: targetY,
          vx: Math.cos(mAngle) * mSpeed,
          vy: Math.sin(mAngle) * mSpeed,
          size: Math.random() * 2.2 + 0.8,
          alpha: Math.random() * 0.4 + 0.6,
          life: 0,
          maxLife: Math.floor(Math.random() * 15 + 20),
        });
      }

      // 4. Instantiate High-Velocity Web Shot
      const newShot: WebShot = {
        id: Date.now() + Math.random(),
        startX: wristX,
        startY: wristY,
        targetX,
        targetY,
        flightProgress: 0,
        flightSpeed: 0.24, // Ultra-fast ~4 frames (under 70ms) to strike target
        hasHit: false,
        age: 0,
        maxLife: 105, // Stays visible and taut for ~1.75s before full natural dissolution
        vibrationAmp: 18, // High-tension recoil amplitude in pixels
        vibrationFreq: 0.55, // Fast elastic hum
        vibrationDecay: 0.09, // Rapid exponential damping
        tendrils,
        gossamers,
        mist,
      };

      webShots.push(newShot);

      // Keep maximum concurrent web shots bounded for pristine performance
      if (webShots.length > 7) {
        webShots.shift();
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      shootSpiderWeb(e.clientX, e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mousedown", handleMouseDown, { passive: true });

    // -------------------------------------------------------------
    // HIGH PERFORMANCE HARDWARE-ACCELERATED RENDER LOOP (60-120 FPS)
    // -------------------------------------------------------------
    const render = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      ctx.clearRect(0, 0, width, height);

      // ==========================================
      // 1. RENDER ORGANIC SILK DRAGLINE BEHIND SPIDER
      // ==========================================
      if (draglinePoints.length > 1) {
        for (let i = draglinePoints.length - 1; i >= 0; i--) {
          const pt = draglinePoints[i];
          pt.age += 1;
          if (pt.age >= pt.maxAge) {
            draglinePoints.splice(i, 1);
          }
        }

        if (draglinePoints.length > 1) {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(draglinePoints[0].x, draglinePoints[0].y);

          for (let i = 1; i < draglinePoints.length - 1; i++) {
            const pCurr = draglinePoints[i];
            const pNext = draglinePoints[i + 1];
            const midX = (pCurr.x + pNext.x) * 0.5;
            const midY = (pCurr.y + pNext.y) * 0.5;
            ctx.quadraticCurveTo(pCurr.x, pCurr.y, midX, midY);
          }

          const lastPt = draglinePoints[draglinePoints.length - 1];
          ctx.lineTo(lastPt.x, lastPt.y);

          // Subtle natural gossamer dragline silk appearance
          const headAlpha = Math.max(0, 1 - lastPt.age / lastPt.maxAge) * 0.4;
          ctx.strokeStyle = `rgba(255, 255, 255, ${headAlpha})`;
          ctx.lineWidth = 0.9;
          ctx.shadowColor = "rgba(255, 255, 255, 0.4)";
          ctx.shadowBlur = 2;
          ctx.stroke();
          ctx.restore();
        }
      }

      // ==========================================
      // 2. RENDER SPIDER-MAN WEB SHOTS & SILK PHENOMENA
      // ==========================================
      for (let sIdx = webShots.length - 1; sIdx >= 0; sIdx--) {
        const shot = webShots[sIdx];

        // Advance flight or age
        if (!shot.hasHit) {
          shot.flightProgress += shot.flightSpeed;
          if (shot.flightProgress >= 1.0) {
            shot.flightProgress = 1.0;
            shot.hasHit = true;
          }
        } else {
          shot.age += 1;
          if (shot.age >= shot.maxLife) {
            webShots.splice(sIdx, 1);
            continue;
          }
        }

        // Dissolution curve: full opacity until ~65% life, then natural silk sublimation fade
        const progressLife = shot.age / shot.maxLife;
        const globalAlpha = progressLife < 0.65 
          ? 1.0 
          : Math.max(0, 1 - (progressLife - 0.65) / 0.35);

        // Current tip of the traveling or anchored web line
        const headX = shot.startX + (shot.targetX - shot.startX) * shot.flightProgress;
        const headY = shot.startY + (shot.targetY - shot.startY) * shot.flightProgress;

        const dx = headX - shot.startX;
        const dy = headY - shot.startY;
        const lineDist = Math.hypot(dx, dy);

        // Transversal normal vector for elastic wave vibration
        const nx = lineDist > 0 ? -dy / lineDist : 0;
        const ny = lineDist > 0 ? dx / lineDist : 0;

        // High-tension vibration calculation
        const vibe = shot.hasHit
          ? Math.sin(shot.age * shot.vibrationFreq) *
            Math.exp(-shot.age * shot.vibrationDecay) *
            shot.vibrationAmp
          : 0;

        // -------------------------------------------------------------
        // A. THE HIGH-VELOCITY BRAIDED WEB LINE (Spider-Man's Silk Strand)
        // -------------------------------------------------------------
        ctx.save();
        const numSegments = 24;
        const points: { x: number; y: number }[] = [];

        for (let i = 0; i <= numSegments; i++) {
          const u = i / numSegments;
          // Standing wave envelope: 0 at wrist, 0 at target, max in middle
          const standingWave = Math.sin(u * Math.PI) * vibe;
          // Micro catenary droop (natural slight gravitational sag)
          const catenarySag = Math.sin(u * Math.PI) * (lineDist * 0.015);

          const px = shot.startX + dx * u + nx * standingWave;
          const py = shot.startY + dy * u + ny * standingWave + catenarySag;
          points.push({ x: px, y: py });
        }

        // 1. Soft Luminescent Atmospheric Halo
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.22 * globalAlpha})`;
        ctx.lineWidth = 4.8 * globalAlpha;
        ctx.shadowColor = "rgba(255, 255, 255, 0.9)";
        ctx.shadowBlur = 8;
        ctx.stroke();

        // 2. Core High-Tensile Web Strand (Crisp, High-Density Solidified Silk)
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * globalAlpha})`;
        ctx.lineWidth = Math.max(1.2, 2.3 * globalAlpha);
        ctx.shadowBlur = 0;
        ctx.stroke();

        // 3. Multi-Filament Spun Braiding (Natural Twisted Silk Fibers)
        if (globalAlpha > 0.3) {
          // Fiber A (spiraling left)
          ctx.beginPath();
          ctx.strokeStyle = `rgba(220, 242, 255, ${0.65 * globalAlpha})`;
          ctx.lineWidth = 0.9 * globalAlpha;
          for (let i = 0; i < points.length; i++) {
            const u = i / numSegments;
            const spiral = Math.sin(u * 38 + shot.age * 0.15) * 1.8 * Math.sin(u * Math.PI);
            const fx = points[i].x + nx * spiral;
            const fy = points[i].y + ny * spiral;
            if (i === 0) ctx.moveTo(fx, fy);
            else ctx.lineTo(fx, fy);
          }
          ctx.stroke();

          // Fiber B (spiraling right)
          ctx.beginPath();
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 * globalAlpha})`;
          ctx.lineWidth = 0.8 * globalAlpha;
          for (let i = 0; i < points.length; i++) {
            const u = i / numSegments;
            const spiral = -Math.sin(u * 38 + shot.age * 0.15) * 1.8 * Math.sin(u * Math.PI);
            const fx = points[i].x + nx * spiral;
            const fy = points[i].y + ny * spiral;
            if (i === 0) ctx.moveTo(fx, fy);
            else ctx.lineTo(fx, fy);
          }
          ctx.stroke();
        }
        ctx.restore();

        // -------------------------------------------------------------
        // B. ORGANIC IMPACT SPLAT & ANCHOR WEB (Natural Phenomena)
        // -------------------------------------------------------------
        if (shot.hasHit) {
          // Splat expands rapidly on impact (0 to 1 over first 8 frames)
          const splatProgress = Math.min(1, shot.age / 7);
          const splatEase = 1 - Math.pow(1 - splatProgress, 3); // Smooth cubic ease-out

          // Cache endpoint positions of tendrils for gossamer connections
          const tendrilPoints: { tipX: number; tipY: number; midX: number; midY: number }[] = [];

          ctx.save();

          // 1. Organic Anchor Tendrils & Sub-Branches
          for (let t = 0; t < shot.tendrils.length; t++) {
            const tendril = shot.tendrils[t];
            const curLen = tendril.length * splatEase;
            const cosA = Math.cos(tendril.angle);
            const sinA = Math.sin(tendril.angle);

            // Natural organic curvature control point
            const midLen = curLen * 0.52;
            const cpX = shot.targetX + Math.cos(tendril.angle + tendril.curveOffset) * midLen;
            const cpY = shot.targetY + Math.sin(tendril.angle + tendril.curveOffset) * midLen;

            // Tip position
            const tipX = shot.targetX + cosA * curLen;
            const tipY = shot.targetY + sinA * curLen;

            tendrilPoints.push({
              tipX,
              tipY,
              midX: cpX,
              midY: cpY,
            });

            // Draw primary organic tendril (thick anchor tapering to thin tip)
            ctx.beginPath();
            ctx.moveTo(shot.targetX, shot.targetY);
            ctx.quadraticCurveTo(cpX, cpY, tipX, tipY);
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.9 * globalAlpha})`;
            ctx.lineWidth = Math.max(0.7, 1.8 * globalAlpha * (1 - splatProgress * 0.25));
            ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
            ctx.shadowBlur = 3;
            ctx.stroke();

            // Dendritic Sub-Branches (Liquid silk splits adhering to surface)
            for (let b = 0; b < tendril.branches.length; b++) {
              const branch = tendril.branches[b];
              const branchStartLen = curLen * branch.startT;
              const bStartX = shot.targetX + Math.cos(tendril.angle) * branchStartLen;
              const bStartY = shot.targetY + Math.sin(tendril.angle) * branchStartLen;

              const bBranchLen = branch.length * splatEase;
              const bAngle = tendril.angle + branch.angleOffset;
              const bTipX = bStartX + Math.cos(bAngle) * bBranchLen;
              const bTipY = bStartY + Math.sin(bAngle) * bBranchLen;

              ctx.beginPath();
              ctx.moveTo(bStartX, bStartY);
              ctx.lineTo(bTipX, bTipY);
              ctx.strokeStyle = `rgba(235, 248, 255, ${0.75 * globalAlpha})`;
              ctx.lineWidth = Math.max(0.5, 1.0 * globalAlpha);
              ctx.stroke();

              // Anchor pad at sub-branch tip
              ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * globalAlpha})`;
              ctx.beginPath();
              ctx.arc(bTipX, bTipY, branch.padSize * splatEase, 0, Math.PI * 2);
              ctx.fill();
            }

            // Adhesive anchor pad at main tendril tip
            ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * globalAlpha})`;
            ctx.beginPath();
            ctx.arc(tipX, tipY, tendril.anchorPadSize * splatEase, 0, Math.PI * 2);
            ctx.fill();
          }

          // 2. Catenary Gossamer Arcs (Realistic sagging cross-filaments)
          if (splatProgress > 0.4) {
            const gossamerAlpha = (splatProgress - 0.4) / 0.6 * globalAlpha;
            ctx.shadowBlur = 0;

            for (let g = 0; g < shot.gossamers.length; g++) {
              const arc = shot.gossamers[g];
              const pA = tendrilPoints[arc.idxA];
              const pB = tendrilPoints[arc.idxB];
              if (!pA || !pB) continue;

              // Compute points along tendril
              const startX = shot.targetX + (pA.tipX - shot.targetX) * arc.tA;
              const startY = shot.targetY + (pA.tipY - shot.targetY) * arc.tA;
              const endX = shot.targetX + (pB.tipX - shot.targetX) * arc.tB;
              const endY = shot.targetY + (pB.tipY - shot.targetY) * arc.tB;

              // Center-pull sag: catenary sag pulled inward toward the center impact
              const midDirectX = (startX + endX) * 0.5;
              const midDirectY = (startY + endY) * 0.5;
              const pullX = midDirectX + (shot.targetX - midDirectX) * arc.sagRatio;
              const pullY = midDirectY + (shot.targetY - midDirectY) * arc.sagRatio;

              ctx.beginPath();
              ctx.moveTo(startX, startY);
              ctx.quadraticCurveTo(pullX, pullY, endX, endY);
              ctx.strokeStyle = `rgba(255, 255, 255, ${0.55 * gossamerAlpha})`;
              ctx.lineWidth = Math.max(0.5, 0.9 * globalAlpha);
              ctx.stroke();
            }
          }

          // 3. Central Adhesive Impact Clump / Hub Knot
          const hubRadius = 4.5 * splatEase;
          const radialGlow = ctx.createRadialGradient(
            shot.targetX, shot.targetY, 0,
            shot.targetX, shot.targetY, hubRadius * 2.5
          );
          radialGlow.addColorStop(0, `rgba(255, 255, 255, ${0.98 * globalAlpha})`);
          radialGlow.addColorStop(0.4, `rgba(225, 245, 255, ${0.8 * globalAlpha})`);
          radialGlow.addColorStop(1, `rgba(229, 9, 20, 0)`); // Subtle red edge dissipation

          ctx.fillStyle = radialGlow;
          ctx.beginPath();
          ctx.arc(shot.targetX, shot.targetY, hubRadius * 2, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();

          // 4. Atomized Fluid Mist / Droplets
          for (let m = shot.mist.length - 1; m >= 0; m--) {
            const p = shot.mist[m];
            p.life += 1;
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.88; // Air resistance deceleration
            p.vy *= 0.88;

            const mAlpha = Math.max(0, 1 - p.life / p.maxLife) * p.alpha * globalAlpha;
            if (p.life >= p.maxLife || mAlpha <= 0) {
              shot.mist.splice(m, 1);
              continue;
            }

            ctx.fillStyle = `rgba(255, 255, 255, ${mAlpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // ==========================================
      // 3. CRISP RESPONSIVE SPIDER CURSOR (18x22)
      // ==========================================
      if (!isTouchDevice && mouseX > 0 && mouseY > 0) {
        ctx.save();
        ctx.translate(mouseX, mouseY);

        // Recoil damping: snaps down on web click and springs back
        if (cursorRecoil > 0.01) {
          cursorRecoil *= 0.82;
        } else {
          cursorRecoil = 0;
        }
        const cursorScale = 1.0 - cursorRecoil * 0.28;
        ctx.scale(cursorScale, cursorScale);

        if (spiderImg.complete && spiderImg.naturalWidth > 0) {
          const imgWidth = 18;
          const imgHeight = 22;
          ctx.drawImage(spiderImg, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
        } else {
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.ellipse(0, 0, 4, 5, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      animFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      if (audioCtx) {
        audioCtx.close().catch(() => {});
      }
    };
  }, [pathname, isSpiderRoute]);

  if (!isSpiderRoute) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-50 pointer-events-none w-full h-full"
      style={{ pointerEvents: "none" }}
    />
  );
};

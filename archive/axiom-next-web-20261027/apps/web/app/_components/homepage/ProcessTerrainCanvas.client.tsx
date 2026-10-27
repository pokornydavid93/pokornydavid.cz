"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { DESIGN_PRIMITIVE_MEDIA_QUERIES } from "@/app/theme/design-primitives";
import s from "../../homepage.module.css";

const PROCESS_DOT_ROW_COUNT = 25;
const PROCESS_DOT_COLUMN_COUNT = 150;
const REFERENCES_DOT_ROW_COUNT = 30;
const REFERENCES_DOT_COLUMN_COUNT = 160;
const FRAME_INTERVAL = 1000 / 30;

type PointTerrainVariant = "process" | "references";

const terrainVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uPointScale;
  uniform float uAmplitude;
  uniform float uLightTheme;

  attribute float aDepth;
  attribute float aProgress;
  attribute float aRowTone;
  attribute float aScatter;

  varying float vDepth;
  varying float vProgress;
  varying float vRowTone;
  varying float vScatter;
  varying float vCrest;
  varying float vSurfaceLight;
  varying float vSlope;

  float getTerrainHeight(vec3 point) {
    float time = uTime * mix(0.16, 0.105, uLightTheme);
    float directionalX = point.x + point.z * 0.22;
    float edgeEnvelope = smoothstep(-9.4, -6.8, point.x)
      * (1.0 - smoothstep(6.8, 9.4, point.x));
    float longSwell = sin(
      directionalX * 0.48 + aDepth * 1.72 - time
    ) * 0.66;
    float crossSwell = sin(
      point.x * 0.25 - point.z * 0.58 - aDepth * 2.4 + time * 0.68
    ) * 0.24;
    float fineFold = sin(
      point.x * 1.12 + point.z * 0.38 + aDepth * 3.6 - time * 0.42
    ) * 0.046;
    float ridgeDomain = point.x * 0.36 + point.z * 0.15
      + sin(point.z * 0.30) * 0.22;
    float ridge = exp(-pow(ridgeDomain - 0.25, 2.0) / 0.22) * 0.28;
    float processTerrain = (
      (longSwell + crossSwell + fineFold) * mix(0.72, 1.12, aDepth)
      + ridge
    );

    // The light CTA variant uses a slower, multi-scale field. The nested phase
    // shifts keep it feeling like one continuous surface instead of parallel
    // sine rows while retaining the same low-cost point geometry.
    vec2 flowDomain = vec2(
      point.x * 0.42 + point.z * 0.18,
      point.z * 0.58 - point.x * 0.08
    );
    float broadFlow = sin(
      flowDomain.x + sin(flowDomain.y * 0.82) * 0.42 - time
    ) * 0.62;
    float opposingFlow = sin(
      point.x * 0.22 - point.z * 0.72 + time * 0.63
    ) * 0.27;
    float surfaceDetail = sin(
      point.x * 0.71 + point.z * 0.44 - time * 0.38
      + sin(point.z * 0.33) * 0.35
    ) * 0.095;
    float depthEnvelope = mix(0.78, 1.18, smoothstep(0.04, 0.96, aDepth));
    float referenceTerrain = (
      broadFlow + opposingFlow + surfaceDetail
    ) * depthEnvelope;

    return mix(processTerrain, referenceTerrain, uLightTheme)
      * edgeEnvelope
      * uAmplitude;
  }

  void main() {
    vec3 transformed = position;
    float height = getTerrainHeight(position);
    transformed.y += height;
    float processDepthDrift = (
      cos(position.x * 0.34 - aDepth * 2.1 - uTime * 0.11) * 0.34
      + height * 0.24
    );
    float referenceDepthDrift = (
      cos(position.x * 0.21 - aDepth * 2.8 - uTime * 0.07) * 0.25
      + sin(position.x * 0.47 + aDepth * 1.6 + uTime * 0.045) * 0.08
      + height * 0.34
    );
    transformed.z += mix(
      processDepthDrift,
      referenceDepthDrift,
      uLightTheme
    ) * smoothstep(0.02, 0.34, aDepth);

    float sampleDistance = 0.08;
    float slopeX = (
      getTerrainHeight(position + vec3(sampleDistance, 0.0, 0.0)) - height
    ) / sampleDistance;
    float slopeZ = (
      getTerrainHeight(position + vec3(0.0, 0.0, sampleDistance)) - height
    ) / sampleDistance;
    vec3 surfaceNormal = normalize(vec3(-slopeX, 1.0, -slopeZ));
    vec3 sideLight = normalize(vec3(-0.42, 0.82, 0.38));
    float surfaceLight = clamp(
      dot(surfaceNormal, sideLight) * 0.58 + 0.48,
      0.0,
      1.0
    );
    float processPrimaryCenter = 0.56
      + sin(position.x * 0.32 - uTime * 0.15) * 0.22
      + sin(position.x * 0.71 + uTime * 0.08) * 0.05;
    float processSecondaryCenter = 0.22
      + sin(position.x * 0.30 + uTime * 0.10) * 0.052;
    float processPrimaryRidge = exp(
      -pow((aDepth - processPrimaryCenter) / 0.065, 2.0)
    );
    float processSecondaryRidge = exp(
      -pow((aDepth - processSecondaryCenter) / 0.052, 2.0)
    )
      * 0.34;
    float processRidge = max(processPrimaryRidge, processSecondaryRidge);

    float referencePrimaryCenter = 0.54
      + sin(position.x * 0.24 - uTime * 0.075) * 0.18
      + sin(position.x * 0.57 + uTime * 0.042) * 0.075;
    float referenceSecondaryCenter = 0.25
      + sin(position.x * 0.19 + uTime * 0.052) * 0.085;
    float referencePrimaryRidge = exp(
      -pow((aDepth - referencePrimaryCenter) / 0.105, 2.0)
    );
    float referenceSecondaryRidge = exp(
      -pow((aDepth - referenceSecondaryCenter) / 0.082, 2.0)
    ) * 0.48;
    float referenceRidge = max(
      referencePrimaryRidge,
      referenceSecondaryRidge
    );
    float ridge = mix(processRidge, referenceRidge, uLightTheme);
    transformed.y += ridge
      * sin(
        position.x * mix(0.58, 0.44, uLightTheme)
        - uTime * mix(0.12, 0.09, uLightTheme)
      )
      * mix(0.072, 0.105, uLightTheme);

    vDepth = aDepth;
    vProgress = aProgress;
    vRowTone = aRowTone;
    vScatter = aScatter;
    vCrest = ridge;
    vSurfaceLight = surfaceLight;
    vSlope = clamp(length(vec2(slopeX, slopeZ)) * 0.72, 0.0, 1.0);

    vec4 viewPosition = modelViewMatrix * vec4(transformed, 1.0);
    gl_Position = projectionMatrix * viewPosition;

    float perspective = clamp(10.5 / max(2.0, -viewPosition.z), 0.82, 1.40);
    float pointSize = mix(
      mix(1.95, 3.25, aDepth),
      mix(2.12, 3.58, pow(aDepth, 0.9)),
      uLightTheme
    );
    pointSize *= mix(0.95, 1.06, aScatter);
    pointSize *= mix(0.88, mix(1.15, 1.24, uLightTheme), surfaceLight);
    pointSize *= mix(0.92, 1.12, aRowTone);
    pointSize *= mix(1.0, mix(1.58, 1.42, uLightTheme), ridge);
    gl_PointSize = min(
      pointSize * uPixelRatio * perspective * uPointScale,
      mix(4.8, 5.4, uLightTheme) * uPixelRatio
    );
  }
`;

const terrainFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uOpacity;
  uniform float uLightTheme;

  varying float vDepth;
  varying float vProgress;
  varying float vRowTone;
  varying float vScatter;
  varying float vCrest;
  varying float vSurfaceLight;
  varying float vSlope;

  void main() {
    vec3 farColor = mix(
      vec3(0.24, 0.34, 0.27),
      vec3(0.045, 0.090, 0.048),
      uLightTheme
    );
    vec3 nearColor = mix(
      vec3(0.50, 0.64, 0.53),
      vec3(0.095, 0.205, 0.085),
      uLightTheme
    );
    vec3 limeColor = mix(
      vec3(0.69, 0.89, 0.33),
      vec3(0.165, 0.315, 0.080),
      uLightTheme
    );
    vec3 color = mix(farColor, nearColor, pow(vDepth, 0.82));
    float ridgeLight = smoothstep(0.24, 0.88, vCrest);
    float slopeLight = smoothstep(0.16, 0.72, vSlope);
    float signal = ridgeLight * mix(0.74, 1.0, vRowTone);
    color = mix(
      color,
      limeColor,
      signal * mix(0.82, 0.68, uLightTheme)
    );
    color = mix(color, nearColor, slopeLight * uLightTheme * 0.28);

    float pointDistance = length(gl_PointCoord - vec2(0.5));
    float pointCore = 1.0 - smoothstep(0.22, 0.44, pointDistance);
    float pointHalo = (
      1.0 - smoothstep(0.34, 0.5, pointDistance)
    ) * 0.24;
    float pointMask = mix(
      1.0 - smoothstep(0.24, 0.5, pointDistance),
      max(pointCore, pointHalo),
      uLightTheme
    );
    float edgeFade = smoothstep(0.0, 0.075, vProgress)
      * (1.0 - smoothstep(0.925, 1.0, vProgress));
    float processAlpha = mix(0.17, 0.49, pow(vDepth, 1.08));
    float referenceAlpha = mix(0.25, 0.64, pow(vDepth, 0.94));
    float alpha = mix(processAlpha, referenceAlpha, uLightTheme);
    float processRowTone = mix(0.22, 1.18, pow(vRowTone, 3.0));
    float referenceRowTone = mix(0.72, 1.08, vScatter);
    alpha *= mix(processRowTone, referenceRowTone, uLightTheme);
    alpha *= mix(0.82, 1.20, vSurfaceLight);
    alpha *= mix(0.94, mix(1.46, 1.34, uLightTheme), vCrest);
    alpha *= mix(1.0, 1.22, slopeLight * uLightTheme);
    alpha *= mix(0.94, 1.0, vScatter);
    alpha = mix(
      alpha,
      mix(0.82, 0.67, uLightTheme),
      signal * mix(1.0, 0.72, uLightTheme)
    );
    alpha *= mix(1.0, 0.92, uLightTheme);
    alpha *= pointMask * edgeFade;
    alpha = min(alpha * uOpacity, 1.0);
    if (alpha < 0.003) discard;

    gl_FragColor = vec4(color, alpha);
  }
`;

function createTerrainGeometry({
  columnCount,
  rowCount,
}: {
  columnCount: number;
  rowCount: number;
}) {
  const positions: number[] = [];
  const depths: number[] = [];
  const progresses: number[] = [];
  const rowTones: number[] = [];
  const scatters: number[] = [];

  for (let row = 0; row < rowCount; row += 1) {
    const rowProgress = row / (rowCount - 1);
    const depth = rowProgress ** 1.12;
    const y = THREE.MathUtils.lerp(3.08, -3.26, depth);
    const z = THREE.MathUtils.lerp(-2.25, 1.55, depth);
    const rowTone = row % 4 === 0 ? 1 : row % 2 === 0 ? 0.76 : 0.56;

    for (let column = 0; column < columnCount; column += 1) {
      const progress = column / (columnCount - 1);
      const scatter = ((row * 73 + column * 37) % 101) / 100;
      const horizontalScatter = ((row * 41 + column * 61) % 103) / 102;
      const x = THREE.MathUtils.lerp(-9.4, 9.4, progress)
        + (horizontalScatter - 0.5) * 0.024;
      positions.push(x, y + (scatter - 0.5) * 0.008, z);
      depths.push(depth);
      progresses.push(progress);
      rowTones.push(rowTone);
      scatters.push(scatter);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("aDepth", new THREE.Float32BufferAttribute(depths, 1));
  geometry.setAttribute("aProgress", new THREE.Float32BufferAttribute(progresses, 1));
  geometry.setAttribute("aRowTone", new THREE.Float32BufferAttribute(rowTones, 1));
  geometry.setAttribute("aScatter", new THREE.Float32BufferAttribute(scatters, 1));
  geometry.computeBoundingSphere();
  return geometry;
}

export default function ProcessTerrainCanvas({
  variant = "process",
}: {
  variant?: PointTerrainVariant;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const shell = shellRef.current;
    if (!canvas || !shell) return undefined;
    if (window.matchMedia("(forced-colors: active)").matches) {
      shell.dataset.state = "fallback";
      return undefined;
    }

    const isReferencesVariant = variant === "references";
    const sceneSection = shell.closest<HTMLElement>(
      isReferencesVariant
        ? "[data-references-cta-stage]"
        : "[data-home-module='process']",
    );
    const motionQuery = window.matchMedia(
      DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion,
    );
    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        canvas,
        powerPreference: "high-performance",
        preserveDrawingBuffer: process.env.NODE_ENV !== "production",
      });
    } catch {
      shell.dataset.state = "fallback";
      return undefined;
    }

    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 40);
    const geometry = createTerrainGeometry({
      columnCount: isReferencesVariant
        ? REFERENCES_DOT_COLUMN_COUNT
        : PROCESS_DOT_COLUMN_COUNT,
      rowCount: isReferencesVariant
        ? REFERENCES_DOT_ROW_COUNT
        : PROCESS_DOT_ROW_COUNT,
    });
    const material = new THREE.ShaderMaterial({
      depthTest: true,
      depthWrite: false,
      fragmentShader: terrainFragmentShader,
      transparent: true,
      uniforms: {
        uAmplitude: { value: isReferencesVariant ? 0.88 : 1 },
        uLightTheme: { value: isReferencesVariant ? 1 : 0 },
        uOpacity: { value: 0.68 },
        uPixelRatio: { value: 1 },
        uPointScale: { value: 1 },
        uTime: { value: 0 },
      },
      vertexShader: terrainVertexShader,
    });
    const terrain = new THREE.Points(geometry, material);
    terrain.frustumCulled = false;
    scene.add(terrain);

    let animationFrame = 0;
    let isVisible = true;
    let isPaused = !isReferencesVariant
      && Boolean(
        sceneSection?.hasAttribute("data-process-terrain-paused"),
      );
    let lastFrame = -FRAME_INTERVAL;
    let reducedMotion = motionQuery.matches;
    const canAnimate = () => (
      isVisible && !document.hidden && !reducedMotion && !isPaused
    );
    const render = (time: number) => {
      if (reducedMotion) material.uniforms.uTime.value = 0;
      else if (!isPaused) material.uniforms.uTime.value = time * 0.001;
      renderer.render(scene, camera);
    };
    const frame = (time: number) => {
      animationFrame = 0;
      if (!canAnimate()) return;
      if (time - lastFrame >= FRAME_INTERVAL) {
        lastFrame = time;
        render(time);
      }
      animationFrame = window.requestAnimationFrame(frame);
    };
    const start = () => {
      if (animationFrame || !canAnimate()) return;
      animationFrame = window.requestAnimationFrame(frame);
    };
    const stop = () => {
      if (!animationFrame) return;
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    };
    const syncPausedState = () => {
      const nextPaused = !isReferencesVariant
        && Boolean(
          sceneSection?.hasAttribute("data-process-terrain-paused"),
        );
      if (nextPaused === isPaused) return;

      isPaused = nextPaused;
      shell.toggleAttribute("data-paused", isPaused);
      if (isPaused) stop();
      else {
        render(performance.now());
        start();
      }
    };
    const setReady = (ready: boolean) => {
      shell.dataset.state = ready ? "ready" : "fallback";
      const readyAttribute = isReferencesVariant
        ? "data-references-wave-ready"
        : "data-process-webgl-ready";
      if (ready) sceneSection?.setAttribute(readyAttribute, "true");
      else sceneSection?.removeAttribute(readyAttribute);
    };
    const resize = () => {
      const width = Math.max(1, shell.clientWidth);
      const height = Math.max(1, shell.clientHeight);
      const narrow = width < 768;
      const pixelRatioCap = narrow ? 1 : 1.35;
      const pixelRatio = Math.min(window.devicePixelRatio, pixelRatioCap);

      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
      material.uniforms.uPixelRatio.value = pixelRatio;
      material.uniforms.uAmplitude.value = isReferencesVariant
        ? narrow ? 0.68 : 0.88
        : 1;
      material.uniforms.uOpacity.value = isReferencesVariant
        ? narrow ? 0.7 : 0.9
        : narrow ? 0.56 : 0.68;
      material.uniforms.uPointScale.value = isReferencesVariant
        ? narrow ? 0.9 : 1.02
        : narrow ? 1.04 : 1;

      camera.aspect = width / height;
      camera.fov = isReferencesVariant
        ? narrow ? 51 : 45
        : narrow ? 49 : 44;
      camera.position.set(
        isReferencesVariant ? narrow ? 0.6 : 0.15 : narrow ? 1.55 : 0.72,
        isReferencesVariant ? narrow ? 0.28 : 0.46 : narrow ? 0.32 : 0.38,
        isReferencesVariant ? narrow ? 10.15 : 9.35 : narrow ? 9.8 : 9.15,
      );
      camera.lookAt(
        isReferencesVariant ? narrow ? 0.45 : 0.22 : narrow ? 1.28 : 0.38,
        isReferencesVariant ? narrow ? -0.32 : -0.2 : narrow ? -0.42 : -0.18,
        -0.1,
      );
      camera.updateProjectionMatrix();

      terrain.position.set(
        isReferencesVariant ? narrow ? 0.72 : 0.52 : narrow ? 2.45 : 1.08,
        isReferencesVariant ? narrow ? -0.24 : -0.12 : narrow ? -0.2 : -0.14,
        isReferencesVariant ? -0.88 : -0.82,
      );
      terrain.rotation.set(
        isReferencesVariant ? narrow ? -0.055 : -0.07 : narrow ? -0.06 : -0.08,
        isReferencesVariant ? narrow ? -0.035 : -0.08 : narrow ? -0.08 : -0.13,
        isReferencesVariant ? narrow ? -0.055 : -0.075 : narrow ? -0.085 : -0.11,
      );
      terrain.scale.setScalar(
        isReferencesVariant ? narrow ? 1.04 : 1.12 : narrow ? 1.08 : 1.16,
      );
      render(performance.now());
    };

    const resizeObserver = new ResizeObserver(resize);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry?.isIntersecting ?? true;
      if (isVisible) start();
      else stop();
    }, { rootMargin: "120px" });
    const pauseObserver = new MutationObserver(syncPausedState);
    const handleMotionChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
      if (reducedMotion) {
        stop();
        render(0);
      } else {
        start();
      }
    };
    const handleVisibilityChange = () => {
      if (document.hidden) stop();
      else start();
    };
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      stop();
      setReady(false);
    };
    const handleContextRestored = () => {
      resize();
      setReady(true);
      start();
    };

    resizeObserver.observe(shell);
    intersectionObserver.observe(shell);
    if (!isReferencesVariant && sceneSection) {
      pauseObserver.observe(sceneSection, {
        attributeFilter: ["data-process-terrain-paused"],
        attributes: true,
      });
      shell.toggleAttribute("data-paused", isPaused);
    }
    motionQuery.addEventListener("change", handleMotionChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);

    resize();
    setReady(true);
    if (!reducedMotion) start();

    return () => {
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      pauseObserver.disconnect();
      motionQuery.removeEventListener("change", handleMotionChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
      sceneSection?.removeAttribute(
        isReferencesVariant
          ? "data-references-wave-ready"
          : "data-process-webgl-ready",
      );
      shell.removeAttribute("data-paused");
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [variant]);

  const isReferencesVariant = variant === "references";

  return (
    <div
      aria-hidden="true"
      className={isReferencesVariant
        ? s.referencesCtaWaveCanvas
        : s.processTerrainCanvas}
      data-process-webgl-terrain={isReferencesVariant ? undefined : ""}
      data-references-wave-canvas={isReferencesVariant ? "" : undefined}
      data-renderer={isReferencesVariant
        ? "point-terrain-light"
        : "point-terrain"}
      data-state="loading"
      ref={shellRef}
    >
      <canvas
        className={isReferencesVariant
          ? s.referencesCtaWaveCanvasElement
          : s.processTerrainCanvasElement}
        ref={canvasRef}
      />
    </div>
  );
}

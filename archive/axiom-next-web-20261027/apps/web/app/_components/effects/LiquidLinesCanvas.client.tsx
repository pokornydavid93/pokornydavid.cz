"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { DESIGN_PRIMITIVE_MEDIA_QUERIES } from "@/app/theme/design-primitives";
import { SITE_THEME_CHANGE_EVENT } from "@/app/theme/site-themes";
import s from "./liquidLines.module.css";

const DESKTOP_FRAME_INTERVAL = 1000 / 30;
const COMPACT_FRAME_INTERVAL = 1000 / 24;

const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uBaseColor;
  uniform vec3 uForestColor;
  uniform vec3 uLimeColor;
  uniform vec3 uIvoryColor;

  varying vec2 vUv;

  float gaussian(float distanceToLine, float width) {
    float ratio = distanceToLine / max(width, 0.0001);
    return exp(-(ratio * ratio));
  }

  void main() {
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    float slope = mix(0.54, 0.68, smoothstep(0.62, 1.42, aspect));
    float axis = vUv.y + vUv.x * slope
      + sin(vUv.x * 5.8 + uTime * 0.72) * 0.028
      + sin((vUv.x + vUv.y) * 10.5 - uTime * 0.42) * 0.009;
    float drift = sin(uTime * 0.55) * 0.078;

    float primaryDistance = abs(axis - (1.02 + drift));
    float nearDistance = abs(axis - (0.36 - drift * 0.25));
    float farDistance = abs(
      axis - (1.62 + sin(uTime * 0.4 + 2.0) * 0.045)
    );
    float halo = clamp(
      gaussian(primaryDistance, 0.115)
        + gaussian(nearDistance, 0.085) * 0.58
        + gaussian(farDistance, 0.105) * 0.42,
      0.0,
      1.0
    );
    float seam = clamp(
      gaussian(primaryDistance, 0.014)
        + gaussian(nearDistance, 0.011) * 0.48
        + gaussian(farDistance, 0.013) * 0.34,
      0.0,
      1.0
    );
    float silkEdge = clamp(
      gaussian(abs(primaryDistance - 0.033), 0.007)
        + gaussian(abs(nearDistance - 0.026), 0.006) * 0.42,
      0.0,
      1.0
    );

    float vignette = 1.0 - smoothstep(
      0.34,
      1.16,
      length((vUv - 0.5) * vec2(1.15, 1.0))
    );
    float readingZone = smoothstep(0.07, 0.22, vUv.x)
      * (1.0 - smoothstep(0.82, 0.98, vUv.x));
    float verticalEdge = smoothstep(0.02, 0.14, vUv.y)
      * (1.0 - smoothstep(0.86, 0.99, vUv.y));
    float crossShimmer = 0.9
      + sin(axis * 18.0 - uTime * 1.18) * 0.1;
    float travellingLight = 0.9
      + sin(vUv.x * 7.4 + vUv.y * 2.2 - uTime * 1.7) * 0.07
      + sin(vUv.x * 12.8 - uTime * 0.86) * 0.03;
    float shimmer = clamp(crossShimmer * travellingLight, 0.72, 1.08);
    float protection = mix(1.0, 0.58, readingZone)
      * mix(0.82, 1.0, verticalEdge);
    float haloAlpha = clamp(halo * uIntensity * 0.22, 0.0, 0.26);
    float lightAlpha = clamp(
      (seam * 0.67 + silkEdge * 0.27) * uIntensity * shimmer,
      0.0,
      0.76
    ) * protection;

    vec3 shadowFloor = mix(
      uBaseColor,
      uForestColor,
      0.035 + vignette * 0.025
    );
    vec3 haloColor = mix(uBaseColor, uForestColor, 0.78);
    vec3 ribbonColor = mix(uForestColor, uLimeColor, 0.89);
    ribbonColor = mix(ribbonColor, uIvoryColor, seam * 0.028);
    vec3 color = mix(shadowFloor, haloColor, haloAlpha);
    color = mix(color, ribbonColor, lightAlpha);
    color += uForestColor * 0.008 * vignette;

    // Gentle filmic compression retains detail without white hot spots.
    color = vec3(1.0) - exp(-color * 0.94);

    gl_FragColor = vec4(color, 1.0);
  }
`;

export default function LiquidLinesCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const shell = shellRef.current;
    if (!canvas || !shell) return undefined;

    const motionQuery = window.matchMedia(
      DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion,
    );
    const forcedColorsQuery = window.matchMedia("(forced-colors: active)");
    if (forcedColorsQuery.matches) {
      shell.dataset.state = "fallback";
      return undefined;
    }

    const processSection = shell.closest<HTMLElement>(
      "[data-home-module='process']",
    );
    const backdrop = shell.closest<HTMLElement>("[data-liquid-lines]");
    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        alpha: false,
        antialias: false,
        canvas,
        depth: false,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
        stencil: false,
      });
    } catch {
      shell.dataset.state = "fallback";
      return undefined;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const themeColor = (property: string, fallback: string) => (
      window.getComputedStyle(document.documentElement)
        .getPropertyValue(property)
        .trim() || fallback
    );
    const forestColor = new THREE.Color(
      themeColor("--brand-forest", "#224f10"),
    );
    const baseColor = new THREE.Color("#020604")
      .lerp(new THREE.Color(themeColor("--brand-jet", "#0d0d0d")), 0.72)
      .lerp(forestColor, 0.04);
    renderer.setClearColor(baseColor, 1);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      fragmentShader,
      uniforms: {
        uBaseColor: { value: baseColor },
        uForestColor: { value: forestColor },
        uIntensity: { value: 1 },
        uIvoryColor: {
          value: new THREE.Color(themeColor("--brand-ivory", "#f6f4e8")),
        },
        uLimeColor: {
          value: new THREE.Color(themeColor("--brand-lime", "#cbec10")),
        },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
      },
      vertexShader,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    scene.add(mesh);

    let animationFrame = 0;
    let isVisible = true;
    let isPaused = processSection?.dataset.processVideoState === "open";
    let lastFrame = -DESKTOP_FRAME_INTERVAL;
    let frameInterval = DESKTOP_FRAME_INTERVAL;
    let reducedMotion = motionQuery.matches;
    let contextLost = false;

    const canAnimate = () => (
      isVisible
      && !document.hidden
      && !reducedMotion
      && !isPaused
      && !contextLost
    );
    const render = (time: number) => {
      material.uniforms.uTime.value = reducedMotion ? 0 : time * 0.00036;
      renderer.render(scene, camera);
    };
    const syncThemeColors = () => {
      const nextForest = new THREE.Color(
        themeColor("--brand-forest", "#224f10"),
      );
      const nextBase = new THREE.Color("#020604")
        .lerp(
          new THREE.Color(themeColor("--brand-jet", "#0d0d0d")),
          0.72,
        )
        .lerp(nextForest, 0.04);

      material.uniforms.uBaseColor.value.copy(nextBase);
      material.uniforms.uForestColor.value.copy(nextForest);
      material.uniforms.uLimeColor.value.set(
        themeColor("--brand-lime", "#cbec10"),
      );
      material.uniforms.uIvoryColor.value.set(
        themeColor("--brand-ivory", "#f6f4e8"),
      );
      renderer.setClearColor(nextBase, 1);
      if (!contextLost) render(performance.now());
    };
    const frame = (time: number) => {
      animationFrame = 0;
      if (!canAnimate()) return;
      if (time - lastFrame >= frameInterval) {
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
    const setReady = (ready: boolean) => {
      shell.dataset.state = ready ? "ready" : "fallback";
      if (backdrop) {
        backdrop.dataset.renderer = ready
          ? "three-fragment-shader"
          : "liquid-lines-static";
        backdrop.dataset.state = ready ? "ready" : "fallback";
      }
      if (ready) {
        processSection?.setAttribute("data-process-liquid-ready", "true");
      } else {
        processSection?.removeAttribute("data-process-liquid-ready");
      }
    };
    const resize = () => {
      const width = Math.max(1, shell.clientWidth);
      const height = Math.max(1, shell.clientHeight);
      const compact = width < 768;
      const pixelRatio = Math.min(
        window.devicePixelRatio,
        compact ? 0.78 : 0.95,
      );

      frameInterval = compact
        ? COMPACT_FRAME_INTERVAL
        : DESKTOP_FRAME_INTERVAL;
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
      material.uniforms.uResolution.value.set(width, height);
      material.uniforms.uIntensity.value = compact ? 0.76 : 0.96;
      render(performance.now());
    };
    const syncPausedState = () => {
      isPaused = processSection?.dataset.processVideoState === "open";
      shell.toggleAttribute("data-paused", isPaused);
      if (isPaused) stop();
      else start();
    };
    const handleMotionChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
      if (reducedMotion) {
        stop();
        render(0);
      } else {
        render(performance.now());
        start();
      }
    };
    const handleVisibilityChange = () => {
      if (document.hidden) stop();
      else start();
    };
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      stop();
      setReady(false);
    };
    const handleContextRestored = () => {
      contextLost = false;
      resize();
      setReady(true);
      start();
    };

    const resizeObserver = new ResizeObserver(resize);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry?.isIntersecting ?? true;
      if (isVisible) start();
      else stop();
    }, { rootMargin: "160px 0px" });
    const pauseObserver = new MutationObserver(syncPausedState);

    resizeObserver.observe(shell);
    intersectionObserver.observe(shell);
    if (processSection) {
      pauseObserver.observe(processSection, {
        attributeFilter: ["data-process-video-state"],
        attributes: true,
      });
    }
    motionQuery.addEventListener("change", handleMotionChange);
    window.addEventListener(SITE_THEME_CHANGE_EVENT, syncThemeColors);
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
      window.removeEventListener(SITE_THEME_CHANGE_EVENT, syncThemeColors);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
      processSection?.removeAttribute("data-process-liquid-ready");
      if (backdrop?.dataset.state === "ready") {
        backdrop.dataset.renderer = "liquid-lines-static";
        backdrop.dataset.state = "fallback";
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={s.webgl}
      data-process-liquid-lines-webgl
      data-liquid-lines-webgl
      data-renderer="three-fragment-shader"
      data-state="loading"
      ref={shellRef}
    >
      <canvas
        className={s.canvas}
        data-process-liquid-lines-canvas
        ref={canvasRef}
      />
    </div>
  );
}

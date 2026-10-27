"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  REACT_BITS_SILK_PATTERN_GLSL,
  readReactBitsSilkMotion,
  subscribeReactBitsSilkMotion,
  type ReactBitsSilkMotion,
} from "../effects/reactBitsSilkMotion";
import { DESIGN_PRIMITIVE_MEDIA_QUERIES } from "@/app/theme/design-primitives";

const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uPortrait;
  uniform vec2 uViewportSize;
  uniform vec2 uCoverScale;
  uniform vec2 uCoverOffset;
  uniform vec2 uSilkUvOffset;
  uniform vec2 uSilkUvScale;
  uniform float uTime;
  uniform float uSpeed;
  uniform float uScale;
  uniform float uRotation;
  uniform float uWarpPixels;

  varying vec2 vUv;

  float smoother01(float value) {
    value = clamp(value, 0.0, 1.0);
    return value * value * value * (
      value * (value * 6.0 - 15.0) + 10.0
    );
  }

  float portraitBackgroundBoundary(float sourceY) {
    return mix(0.485, 0.375, smoothstep(0.4, 0.52, sourceY));
  }

  ${REACT_BITS_SILK_PATTERN_GLSL}

  void main() {
    vec2 localUv = vec2(vUv.x, 1.0 - vUv.y);
    vec2 sourceTopUv = localUv * uCoverScale + uCoverOffset;

    if (
      sourceTopUv.x <= 0.0
      || sourceTopUv.x >= 1.0
      || sourceTopUv.y <= 0.0
      || sourceTopUv.y >= 1.0
    ) {
      discard;
    }

    vec2 silkTopUv = uSilkUvOffset + localUv * uSilkUvScale;
    vec2 silkUv = vec2(silkTopUv.x, 1.0 - silkTopUv.y);
    float silkPhase = reactBitsSilkPhase(
      silkUv,
      uTime,
      uSpeed,
      uScale,
      uRotation
    );
    float silkWave = sin(silkPhase);
    float silkSlope = cos(silkPhase);
    float horizontalWave = silkWave;
    float verticalWave = silkSlope * 0.55;
    float seamShift = horizontalWave
      * uWarpPixels
      / max(uViewportSize.x, 1.0)
      * uCoverScale.x;

    float personBoundary = portraitBackgroundBoundary(sourceTopUv.y);
    float warpBoundary = personBoundary + 0.055;
    float seamStart = warpBoundary - 0.24;
    float seamSampleX = sourceTopUv.x - seamShift * 0.72;
    float seamBand = smoother01(
      (seamSampleX - (seamStart - 0.045)) / 0.045
    ) * (
      1.0 - smoother01(
        (seamSampleX - (warpBoundary - 0.08)) / 0.08
      )
    );
    float viewportEdgeFade = smoothstep(0.0, 0.035, localUv.x)
      * (1.0 - smoothstep(0.985, 1.0, localUv.x));
    float silkReachMask = 1.0 - smoother01((localUv.x - 0.4) / 0.1);
    vec2 faceQ = (
      sourceTopUv - vec2(0.595, 0.305)
    ) / vec2(0.145, 0.205);
    float faceGuard = smoothstep(1.0, 1.15, length(faceQ));
    float effectMask = seamBand
      * viewportEdgeFade
      * silkReachMask
      * faceGuard;
    if (effectMask < 0.008) discard;

    // The warped strip replaces the base photograph instead of sitting over it
    // as a translucent duplicate. Opacity reaches one before displacement is
    // visually meaningful; at the outer feather the warp is already sub-pixel.
    float replacementMask = smoother01(
      clamp(effectMask / 0.14, 0.0, 1.0)
    );

    vec2 warpPixels = vec2(
      horizontalWave * uWarpPixels,
      -verticalWave * uWarpPixels * 0.25
    );
    vec2 sourceWarp = vec2(
      warpPixels.x / max(uViewportSize.x, 1.0) * uCoverScale.x,
      warpPixels.y / max(uViewportSize.y, 1.0) * uCoverScale.y
    );

    sourceTopUv += sourceWarp * effectMask;
    sourceTopUv = clamp(sourceTopUv, vec2(0.001), vec2(0.999));

    vec4 portrait = texture2D(
      uPortrait,
      vec2(sourceTopUv.x, 1.0 - sourceTopUv.y)
    );
    float directionalFold = clamp(
      silkSlope * 0.025,
      -0.03,
      0.03
    );
    float valleyShadow = smoothstep(0.15, 0.95, -silkWave) * 0.018;
    float sourceLuminance = dot(
      portrait.rgb,
      vec3(0.2126, 0.7152, 0.0722)
    );
    float sourcePeak = max(portrait.r, max(portrait.g, portrait.b));
    float shadowRoom = smoothstep(0.035, 0.22, sourceLuminance);
    float highlightRoom = 1.0 - smoothstep(0.64, 0.88, sourcePeak);
    float foldLight = clamp(
      1.0
        + max(directionalFold, 0.0) * effectMask * highlightRoom
        + min(directionalFold, 0.0) * effectMask * shadowRoom
        - valleyShadow * effectMask * shadowRoom,
      0.97,
      1.03
    );
    portrait.rgb *= foldLight;

    float alpha = replacementMask * portrait.a;
    if (alpha < 0.008) discard;
    gl_FragColor = vec4(portrait.rgb, alpha);
    #include <colorspace_fragment>
  }
`;

type HeroPortraitEdgeWarpProps = {
  className?: string;
  motionChannel: string;
  pauseAttribute?: string;
};

const parseObjectPosition = (value: string) => {
  const [x = "50%", y = "50%"] = value.trim().split(/\s+/);
  const parseAxis = (axis: string) => {
    if (axis === "left" || axis === "top") return 0;
    if (axis === "right" || axis === "bottom") return 1;
    if (axis === "center") return 0.5;
    const numeric = Number.parseFloat(axis);
    return Number.isFinite(numeric)
      ? THREE.MathUtils.clamp(axis.endsWith("%") ? numeric / 100 : numeric, 0, 1)
      : 0.5;
  };

  return new THREE.Vector2(parseAxis(x), parseAxis(y));
};

export default function HeroPortraitEdgeWarp({
  className,
  motionChannel,
  pauseAttribute = "data-hero-handoff-frozen",
}: HeroPortraitEdgeWarpProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const shell = shellRef.current;
    const canvas = canvasRef.current;
    const portrait = shell?.closest<HTMLElement>("[data-hero-portrait]");
    const hero = shell?.closest<HTMLElement>("[data-cinematic-home-hero]");
    const silkHost = hero?.querySelector<HTMLElement>("[data-hero-silk-host]");
    const portraitImage = portrait?.querySelector<HTMLImageElement>("img");
    if (
      !shell
      || !canvas
      || !portrait
      || !hero
      || !silkHost
      || !portraitImage
      || window.matchMedia("(forced-colors: active)").matches
    ) {
      return undefined;
    }

    const motionQuery = window.matchMedia(DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion);
    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false,
        canvas,
        powerPreference: "high-performance",
        preserveDrawingBuffer: process.env.NODE_ENV !== "production",
      });
    } catch {
      shell.dataset.state = "fallback";
      return undefined;
    }

    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const geometry = new THREE.PlaneGeometry(2, 2, 1, 1);
    const texture = new THREE.Texture(portraitImage);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    const material = new THREE.ShaderMaterial({
      depthWrite: false,
      fragmentShader,
      transparent: true,
      uniforms: {
        uCoverOffset: { value: new THREE.Vector2(0, 0) },
        uCoverScale: { value: new THREE.Vector2(1, 1) },
        uPortrait: { value: texture },
        uRotation: { value: 0 },
        uScale: { value: 1 },
        uSilkUvOffset: { value: new THREE.Vector2(0, 0) },
        uSilkUvScale: { value: new THREE.Vector2(1, 1) },
        uSpeed: { value: 5 },
        uTime: { value: 0 },
        uViewportSize: { value: new THREE.Vector2(1, 1) },
        uWarpPixels: { value: 11 },
      },
      vertexShader,
    });
    const quad = new THREE.Mesh(geometry, material);
    quad.frustumCulled = false;
    scene.add(quad);

    let contextAvailable = true;
    let externallyPaused = hero.hasAttribute(pauseAttribute);
    let reducedMotion = motionQuery.matches;
    let textureReady = false;
    let firstFrameRendered = false;
    let disposed = false;
    let currentMotion: Readonly<ReactBitsSilkMotion> =
      readReactBitsSilkMotion(motionChannel);

    const markFirstFrameRendered = () => {
      if (
        firstFrameRendered
        || !textureReady
        || canvas.width <= 0
        || canvas.height <= 0
      ) {
        return;
      }
      firstFrameRendered = true;
      shell.dataset.state = "ready";
      hero.setAttribute("data-hero-portrait-warp-ready", "true");
    };

    const resetFrameReadiness = (state: "fallback" | "loading") => {
      firstFrameRendered = false;
      shell.dataset.state = state;
      hero.removeAttribute("data-hero-portrait-warp-ready");
    };

    const render = (motion = currentMotion) => {
      currentMotion = motion;
      if (
        disposed
        || !contextAvailable
        || !textureReady
        || reducedMotion
        || externallyPaused
      ) return;

      material.uniforms.uTime.value = motion.time;
      material.uniforms.uSpeed.value = motion.speed;
      material.uniforms.uScale.value = motion.scale;
      material.uniforms.uRotation.value = motion.rotation;
      renderer.render(scene, camera);
      markFirstFrameRendered();
    };

    const resize = () => {
      if (disposed || !contextAvailable) return;
      const width = Math.max(1, shell.clientWidth);
      const height = Math.max(1, shell.clientHeight);
      const heroRect = hero.getBoundingClientRect();
      const shellRect = shell.getBoundingClientRect();
      const silkRect = silkHost.getBoundingClientRect();
      const viewportWidth = Math.max(1, heroRect.width);
      const silkWidth = Math.max(1, silkRect.width);
      const silkHeight = Math.max(1, silkRect.height);
      const sourceWidth = Math.max(1, portraitImage.naturalWidth);
      const sourceHeight = Math.max(1, portraitImage.naturalHeight);
      const viewportAspect = width / height;
      const sourceAspect = sourceWidth / sourceHeight;
      const objectPosition = parseObjectPosition(
        getComputedStyle(portraitImage).objectPosition,
      );
      const coverScale = material.uniforms.uCoverScale.value as THREE.Vector2;
      const coverOffset = material.uniforms.uCoverOffset.value as THREE.Vector2;

      if (viewportAspect > sourceAspect) {
        coverScale.set(1, sourceAspect / viewportAspect);
      } else {
        coverScale.set(viewportAspect / sourceAspect, 1);
      }
      coverOffset.set(
        (1 - coverScale.x) * objectPosition.x,
        (1 - coverScale.y) * objectPosition.y,
      );
      (material.uniforms.uViewportSize.value as THREE.Vector2).set(width, height);
      (material.uniforms.uSilkUvOffset.value as THREE.Vector2).set(
        (shellRect.left - silkRect.left) / silkWidth,
        (shellRect.top - silkRect.top) / silkHeight,
      );
      (material.uniforms.uSilkUvScale.value as THREE.Vector2).set(
        shellRect.width / silkWidth,
        shellRect.height / silkHeight,
      );

      if (viewportWidth < 900) {
        material.uniforms.uWarpPixels.value = 5.5;
      } else if (viewportWidth < 1_200) {
        material.uniforms.uWarpPixels.value = 7.5;
      } else if (viewportWidth < 1_680) {
        material.uniforms.uWarpPixels.value = 11;
      } else {
        material.uniforms.uWarpPixels.value = 13;
      }

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, viewportWidth < 768 ? 1 : 1.15));
      renderer.setSize(width, height, false);
      render();
    };

    const syncExternalPause = () => {
      externallyPaused = hero.hasAttribute(pauseAttribute);
      shell.toggleAttribute("data-portrait-warp-paused", externallyPaused);
      if (!externallyPaused) render();
    };

    const resizeObserver = new ResizeObserver(resize);
    const pauseObserver = new MutationObserver(syncExternalPause);
    const handleMotionChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
      if (!reducedMotion) render();
    };
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      contextAvailable = false;
      resetFrameReadiness("fallback");
    };
    const handleContextRestored = () => {
      if (disposed) return;
      contextAvailable = true;
      resetFrameReadiness("loading");
      resize();
    };
    const markTextureReady = () => {
      if (disposed || textureReady || portraitImage.naturalWidth <= 0) return;
      texture.needsUpdate = true;
      textureReady = true;
      resetFrameReadiness("loading");
      resize();
    };
    const markTextureFallback = () => {
      if (disposed) return;
      resetFrameReadiness("fallback");
    };

    resizeObserver.observe(shell);
    resizeObserver.observe(hero);
    resizeObserver.observe(silkHost);
    pauseObserver.observe(hero, {
      attributeFilter: [pauseAttribute],
      attributes: true,
    });
    motionQuery.addEventListener("change", handleMotionChange);
    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);
    portraitImage.addEventListener("load", markTextureReady);
    portraitImage.addEventListener("error", markTextureFallback);
    syncExternalPause();
    const unsubscribeMotion = subscribeReactBitsSilkMotion(
      motionChannel,
      (motion) => render(motion),
    );
    if (portraitImage.complete && portraitImage.naturalWidth > 0) {
      markTextureReady();
    }

    return () => {
      disposed = true;
      unsubscribeMotion();
      resizeObserver.disconnect();
      pauseObserver.disconnect();
      motionQuery.removeEventListener("change", handleMotionChange);
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
      portraitImage.removeEventListener("load", markTextureReady);
      portraitImage.removeEventListener("error", markTextureFallback);
      hero.removeAttribute("data-hero-portrait-warp-ready");
      texture.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [motionChannel, pauseAttribute]);

  return (
    <div
      aria-hidden="true"
      className={className}
      data-hero-portrait-warp
      data-portrait-warp-source="react-bits-silk"
      data-silk-motion-channel={motionChannel}
      data-state="loading"
      ref={shellRef}
    >
      <canvas data-hero-portrait-warp-canvas ref={canvasRef} />
    </div>
  );
}

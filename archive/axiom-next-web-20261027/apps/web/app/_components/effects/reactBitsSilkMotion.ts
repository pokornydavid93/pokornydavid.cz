/*
 * React Bits — Silk motion contract.
 * Source: https://github.com/DavidHDev/react-bits/blob/main/src/ts-default/Backgrounds/Silk/Silk.tsx
 *
 * MIT + Commons Clause License Condition v1.0
 * Copyright (c) 2026 David Haz
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute the Software as
 * part of an application, website, or product, provided that this copyright
 * notice and permission notice are included. The Software may not be sold,
 * sublicensed, or redistributed as a component, bundle, or ported version.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
 */

export type ReactBitsSilkMotion = {
  rotation: number;
  scale: number;
  speed: number;
  time: number;
};

type ReactBitsSilkMotionState = ReactBitsSilkMotion & {
  listeners: Set<ReactBitsSilkMotionListener>;
  owner: symbol | null;
};

type ReactBitsSilkMotionListener = (
  motion: Readonly<ReactBitsSilkMotion>,
) => void;

const DEFAULT_MOTION: Readonly<ReactBitsSilkMotion> = Object.freeze({
  rotation: 0,
  scale: 1,
  speed: 5,
  time: 0,
});

const channels = new Map<string, ReactBitsSilkMotionState>();

const getOrCreateChannel = (channel: string) => {
  const existing = channels.get(channel);
  if (existing) return existing;

  const state: ReactBitsSilkMotionState = {
    ...DEFAULT_MOTION,
    listeners: new Set(),
    owner: null,
  };
  channels.set(channel, state);
  return state;
};

const notifyMotionListeners = (state: ReactBitsSilkMotionState) => {
  for (const listener of [...state.listeners]) listener(state);
};

/**
 * The public React Bits wave equation, isolated once so every material that
 * joins a Silk scene evaluates the exact same field in the same UV space.
 */
export const REACT_BITS_SILK_PATTERN_GLSL = /* glsl */ `
  vec2 rotateSilkUvs(vec2 uv, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    mat2 rot = mat2(c, -s, s, c);
    return rot * uv;
  }

  float reactBitsSilkPhase(
    vec2 sourceUv,
    float time,
    float speed,
    float scale,
    float rotation
  ) {
    vec2 uv = rotateSilkUvs(sourceUv * scale, rotation);
    vec2 tex = uv * scale;
    float tOffset = speed * time;

    tex.y += 0.03 * sin(8.0 * tex.x - tOffset);

    return 5.0 * (
      tex.x
      + tex.y
      + cos(3.0 * tex.x + 5.0 * tex.y)
      + 0.02 * tOffset
    ) + sin(20.0 * (tex.x + tex.y - 0.1 * tOffset));
  }

  float reactBitsSilkWave(
    vec2 sourceUv,
    float time,
    float speed,
    float scale,
    float rotation
  ) {
    return sin(
      reactBitsSilkPhase(sourceUv, time, speed, scale, rotation)
    );
  }

  float reactBitsSilkPattern(
    vec2 sourceUv,
    float time,
    float speed,
    float scale,
    float rotation
  ) {
    return 0.6 + 0.4 * reactBitsSilkWave(
      sourceUv,
      time,
      speed,
      scale,
      rotation
      );
  }
`;

export const beginReactBitsSilkMotionChannel = (
  channel: string,
  motion: Omit<ReactBitsSilkMotion, "time">,
) => {
  const owner = Symbol(channel);
  const state = getOrCreateChannel(channel);
  state.owner = owner;
  state.rotation = motion.rotation;
  state.scale = motion.scale;
  state.speed = motion.speed;
  state.time = 0;
  notifyMotionListeners(state);
  return owner;
};

export const publishReactBitsSilkMotion = (
  channel: string,
  owner: symbol,
  motion: ReactBitsSilkMotion,
) => {
  const state = channels.get(channel);
  if (!state || state.owner !== owner) return;

  state.rotation = motion.rotation;
  state.scale = motion.scale;
  state.speed = motion.speed;
  state.time = motion.time;
  notifyMotionListeners(state);
};

export const readReactBitsSilkMotion = (
  channel: string,
): Readonly<ReactBitsSilkMotion> => channels.get(channel) ?? DEFAULT_MOTION;

export const subscribeReactBitsSilkMotion = (
  channel: string,
  listener: ReactBitsSilkMotionListener,
) => {
  const state = getOrCreateChannel(channel);
  let subscribed = true;
  state.listeners.add(listener);
  listener(state);

  return () => {
    if (!subscribed) return;
    subscribed = false;
    state.listeners.delete(listener);
    if (state.owner === null && state.listeners.size === 0) {
      channels.delete(channel);
    }
  };
};

export const endReactBitsSilkMotionChannel = (
  channel: string,
  owner: symbol,
) => {
  const state = channels.get(channel);
  if (!state || state.owner !== owner) return;

  state.owner = null;
  if (state.listeners.size === 0) channels.delete(channel);
};


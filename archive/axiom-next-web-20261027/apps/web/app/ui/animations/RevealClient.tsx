"use client";

import type { ComponentProps } from "react";

import { Reveal } from "./Reveal";

type RevealClientProps = ComponentProps<typeof Reveal>;

const RevealClient = (props: RevealClientProps) => {
  return <Reveal {...props} />;
};

export default RevealClient;
export type { RevealClientProps };

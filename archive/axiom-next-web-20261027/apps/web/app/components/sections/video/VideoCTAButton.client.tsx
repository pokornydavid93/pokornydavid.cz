"use client";

import { ReactNode } from "react";

import ProcessCtaButton from "../processTimeline/ProcessCtaButton.client";

type VideoCTAButtonProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

const VideoCTAButton = ({ label, children, className }: VideoCTAButtonProps) => {
  const text = label || (typeof children === "string" ? children : undefined);

  return (
    <ProcessCtaButton
      className={className}
      label={text}
      leadFormTopic="Jiná situace"
      location="video"
      rootSelector="[data-video-section]"
    />
  );
};

export default VideoCTAButton;

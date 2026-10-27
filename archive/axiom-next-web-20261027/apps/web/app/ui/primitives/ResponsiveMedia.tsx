import Image, { type StaticImageData } from "next/image";
import type { ReactNode } from "react";
import Frame from "../layout/Frame";
import s from "./primitives.module.css";

type MediaSharedProps = {
  caption?: ReactNode;
  ratio?: "landscape" | "portrait" | "square" | "wide";
};

type ImageMediaProps = MediaSharedProps & {
  kind: "image";
  src: string | StaticImageData;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  sizes?: string;
};

type PictureMediaProps = MediaSharedProps & {
  kind: "picture";
  src: string | StaticImageData;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  sizes?: string;
  sources: ReadonlyArray<{
    srcSet: string;
    media?: string;
    type?: string;
  }>;
};

type EmbedMediaProps = MediaSharedProps & {
  kind: "embed";
  src: string;
  title: string;
  allow?: string;
};

export type ResponsiveMediaProps =
  | ImageMediaProps
  | PictureMediaProps
  | EmbedMediaProps;

export default function ResponsiveMedia(props: ResponsiveMediaProps) {
  const { caption, kind, ratio = "landscape" } = props;

  return (
    <figure className={s.responsiveMedia} data-component="responsive-media" data-kind={kind}>
      <Frame ratio={ratio}>
        {kind === "image" ? (
          <Image
            alt={props.alt}
            height={props.height}
            priority={props.priority}
            sizes={props.sizes ?? "100vw"}
            src={props.src}
            width={props.width}
          />
        ) : null}
        {kind === "picture" ? (
          <picture>
            {props.sources.map((source) => (
              <source
                key={`${source.media ?? "all"}-${source.srcSet}`}
                media={source.media}
                srcSet={source.srcSet}
                type={source.type}
              />
            ))}
            <Image
              alt={props.alt}
              height={props.height}
              priority={props.priority}
              sizes={props.sizes ?? "100vw"}
              src={props.src}
              width={props.width}
            />
          </picture>
        ) : null}
        {kind === "embed" ? (
          <iframe
            allow={props.allow}
            allowFullScreen
            loading="lazy"
            src={props.src}
            title={props.title}
          />
        ) : null}
      </Frame>
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}

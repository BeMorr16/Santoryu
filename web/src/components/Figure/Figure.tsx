import type { ComponentPropsWithoutRef, CSSProperties, ReactNode, Ref } from "react";
import { cx } from "../shared/cx.ts";
import { Typography } from "../Typography/Typography.tsx";
import styles from "./Figure.module.css";

/** A literal "" fails here; a string variable passes, since its value isn't known. */
type NonEmpty<A extends string> = A & (A extends "" ? { useDecorative: never } : unknown);

/** Exactly one of `alt` or `decorative`, so every image's text alternative is a decision (refinement R18.2). */
export type FigureAltProps<A extends string = string> =
  | {
      /** What the image shows or does. A literal "" is a type error: use `decorative` (refinement R18.2). */
      alt: NonEmpty<A>;
      decorative?: never;
    }
  | {
      /** Renders alt="", so assistive technology skips the image (refinement R18.2). */
      decorative: true;
      alt?: never;
    };

export interface FigureImageProps {
  src: string;
  srcSet?: string | undefined;
  sizes?: string | undefined;
  /** Intrinsic width in pixels, for the aspect ratio (refinement R18.3). */
  width: number;
  /** Intrinsic height in pixels, for the aspect ratio (refinement R18.3). */
  height: number;
  /** Default "lazy"; the image in view when the page loads takes "eager" (refinement R18.4). */
  loading?: "lazy" | "eager" | undefined;
  /** Default "async" (refinement R18.4). */
  decoding?: "async" | "sync" | "auto" | undefined;
  fetchPriority?: "high" | "low" | "auto" | undefined;
  crossOrigin?: "anonymous" | "use-credentials" | "" | undefined;
  referrerPolicy?: ComponentPropsWithoutRef<"img">["referrerPolicy"];
}

export type FigureOwnProps = FigureImageProps & {
  /** Rendered as the figcaption, right below the image; it names the figure (refinement R18.6). */
  caption?: ReactNode;
  /** A Figure holds one image (refinement R18.1). */
  children?: never;
};

export type FigureProps<A extends string = string> = FigureOwnProps &
  FigureAltProps<A> &
  Omit<ComponentPropsWithoutRef<"figure">, keyof FigureOwnProps | "alt"> & {
    /** The figure. */
    ref?: Ref<HTMLElement> | undefined;
  };

const hasContent = (node: ReactNode) => node !== undefined && node !== null && node !== false;

/** A content image with an optional caption below it (refinement R18). */
export function Figure<A extends string = string>({
  src,
  srcSet,
  sizes,
  width,
  height,
  loading = "lazy",
  decoding = "async",
  fetchPriority,
  crossOrigin,
  referrerPolicy,
  alt,
  decorative,
  caption,
  className,
  style,
  ref,
  ...rest
}: FigureProps<A>) {
  // The ratio turns the height cap into a width cap on the figure, so the figure is as wide as
  // the image even before it loads (refinement R18.5).
  const ratio = { "--_ratio": `${String(width)} / ${String(height)}` } as CSSProperties;
  const captioned = hasContent(caption);
  return (
    <figure
      // A decorative image with no caption leaves an empty figure, so it's hidden too; a passed role wins (refinement R18.2).
      role={decorative === true && !captioned ? "none" : undefined}
      {...rest}
      ref={ref}
      style={{ ...style, ...ratio }}
      className={cx(styles.figure, className)}
    >
      <img
        className={styles.image}
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        width={width}
        height={height}
        loading={loading}
        decoding={decoding}
        fetchPriority={fetchPriority}
        crossOrigin={crossOrigin}
        referrerPolicy={referrerPolicy}
        alt={decorative === true ? "" : alt}
      />
      {captioned && (
        <Typography as="figcaption" variant="small" tone="muted" measure className={styles.caption}>
          {caption}
        </Typography>
      )}
    </figure>
  );
}

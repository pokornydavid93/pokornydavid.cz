"use client";

import { forwardRef, type AnchorHTMLAttributes, type MouseEvent, type PropsWithChildren } from "react";
import { scrollToHashInstant } from "./scrollTo";

type HashLinkProps = PropsWithChildren<
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: `#${string}`;
  }
>;

const HashLink = forwardRef<HTMLAnchorElement, HashLinkProps>(
  ({ href, onClick, children, ...props }, ref) => {
    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);
      if (event.defaultPrevented) return;
      if (
        event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    scrollToHashInstant(href);
    };

    return (
      <a ref={ref} href={href} onClick={handleClick} {...props}>
        {children}
      </a>
    );
  }
);

HashLink.displayName = "HashLink";

export default HashLink;

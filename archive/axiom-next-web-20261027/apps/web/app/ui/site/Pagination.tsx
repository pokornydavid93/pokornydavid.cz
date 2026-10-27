import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "../primitives/Link";
import s from "./site.module.css";

export type PaginationProps = {
  page: number;
  pageCount: number;
  hrefForPage: (page: number) => string;
  ariaLabel?: string;
};

type PaginationItem = number | "ellipsis-start" | "ellipsis-end";

const getVisiblePages = (page: number, pageCount: number): PaginationItem[] => {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);

  const visible = new Set([1, pageCount, page - 1, page, page + 1]);
  const pages = [...visible]
    .filter((value) => value >= 1 && value <= pageCount)
    .sort((left, right) => left - right);
  const result: PaginationItem[] = [];

  pages.forEach((value, index) => {
    const previous = pages[index - 1];
    if (previous && value - previous > 1) {
      result.push(previous === 1 ? "ellipsis-start" : "ellipsis-end");
    }
    result.push(value);
  });

  return result;
};

export default function Pagination({
  ariaLabel = "Stránkování",
  hrefForPage,
  page,
  pageCount,
}: PaginationProps) {
  if (pageCount <= 1) return null;

  const currentPage = Math.min(Math.max(page, 1), pageCount);
  const visiblePages = getVisiblePages(currentPage, pageCount);

  return (
    <nav aria-label={ariaLabel} className={s.pagination} data-component="pagination">
      {currentPage > 1 ? (
        <Link aria-label="Předchozí stránka" href={hrefForPage(currentPage - 1)} variant="text">
          <ArrowLeft aria-hidden="true" />
          <span>Předchozí</span>
        </Link>
      ) : <span aria-hidden="true" className={s.paginationSpacer} />}

      <ol>
        {visiblePages.map((item) => (
          typeof item === "number" ? (
            <li key={item}>
              <Link
                aria-current={item === currentPage ? "page" : undefined}
                aria-label={`Stránka ${item}`}
                href={hrefForPage(item)}
                variant="text"
              >
                {item}
              </Link>
            </li>
          ) : (
            <li aria-hidden="true" key={item}>…</li>
          )
        ))}
      </ol>

      <span className={s.paginationCompactStatus}>
        <span className={s.visuallyHidden}>Stránka </span>
        {currentPage} z {pageCount}
      </span>

      {currentPage < pageCount ? (
        <Link aria-label="Následující stránka" href={hrefForPage(currentPage + 1)} variant="text">
          <span>Další</span>
          <ArrowRight aria-hidden="true" />
        </Link>
      ) : <span aria-hidden="true" className={s.paginationSpacer} />}
    </nav>
  );
}

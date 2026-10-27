import { Star } from "lucide-react";
import s from "../../homepage.module.css";

type ReviewRatingProps = {
  rating?: number;
  maximum?: number;
};

type StarFill = "empty" | "full" | "half";

function getStarFill(rating: number, index: number): StarFill {
  const remainder = rating - index;
  if (remainder >= 1) return "full";
  if (remainder >= 0.5) return "half";
  return "empty";
}

export default function ReviewRating({
  maximum = 5,
  rating,
}: ReviewRatingProps) {
  if (rating === undefined) return null;

  const normalizedRating = Math.min(maximum, Math.max(0, rating));

  return (
    <span
      aria-label={`Hodnocení ${normalizedRating} z ${maximum}`}
      className={s.reviewRating}
      data-review-rating={normalizedRating}
      role="img"
    >
      {Array.from({ length: maximum }, (_, index) => {
        const fill = getStarFill(normalizedRating, index);

        return (
          <span
            aria-hidden="true"
            className={s.reviewRatingStar}
            data-fill={fill}
            data-rating-star
            key={index}
          >
            <Star className={s.reviewRatingStarOutline} />
            {fill !== "empty" ? (
              <span className={s.reviewRatingStarFill}>
                <Star fill="currentColor" />
              </span>
            ) : null}
          </span>
        );
      })}
    </span>
  );
}

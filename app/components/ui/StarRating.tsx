// 1. Define the TypeScript structure for the component props
interface StarRatingProps {
  rating?: number;
  reviewCount?: number;
  showNumber?: boolean;
  colourStar?: string;
}

export default function StarRating({ rating = 0.0, reviewCount = 0, showNumber = true, colourStar = "text-orange-500" }: StarRatingProps) {
  rating = Number(rating) || 0;
  const formattedReviewCount = (() => {
  if (reviewCount >= 10000) {
    // Tier 1: 10k and above -> Drop decimals completely
    return `${Math.floor(reviewCount / 1000)}k`;
  } else if (reviewCount >= 1000) {
    // Tier 2: 1k to 9.9k -> Keep 1 decimal place (e.g., 2.1k)
    const thousands = reviewCount / 1000;
    // Math.floor(*10)/10 cuts off without rounding up (e.g., 2.19k becomes 2.1k)
    const truncated = Math.floor(thousands * 10) / 10;
    return `${truncated.toFixed(1)}k`;
  } else {
    // Tier 3: Below 1000 -> Just show the normal number with comma separators
    return reviewCount.toLocaleString();
  }
})();

    return (
        <div className={colourStar}>
            <span className="text-xs text-gray-900 mr-1">{rating.toFixed(1)}</span>
            <span>
              {"★".repeat(rating ? Math.round(rating) : 0)}{"☆".repeat(5 - (rating ? Math.round(rating) : 0))}{" "}
            </span>
            <span className="text-xs text-gray-900 mr-1">({formattedReviewCount})</span>
        </div>
    );
}
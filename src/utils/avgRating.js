export default function GetAvgRating(ratingArr) {
  // Courses with no reviews may have an undefined/null rating array.
  // Always return a valid numeric value so React never renders NaN.
  if (!Array.isArray(ratingArr) || ratingArr.length === 0) {
    return 0
  }

  const totalReviewCount = ratingArr.reduce((acc, curr) => {
    const rating = Number(curr?.rating)
    return acc + (Number.isFinite(rating) ? rating : 0)
  }, 0)

  const avgReviewCount = totalReviewCount / ratingArr.length

  return Number.isFinite(avgReviewCount)
    ? Math.round(avgReviewCount * 10) / 10
    : 0
}

import { ratingFor } from "../lib/score";

export function ScoreValue({ score, className = "text-[14px]" }) {
  return <span className={`font-semibold ${ratingFor(score).tone} ${className}`}>{score}</span>;
}

export function RatingPill({ score }) {
  const { label, pill } = ratingFor(score);
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-medium ring-1 ${pill}`}>
      {label}
    </span>
  );
}

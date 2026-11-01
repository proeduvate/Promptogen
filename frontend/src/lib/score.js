/* One rating scale for every screen. Green at 75+ keeps "Strong" in
   line with the score ring and metric bars on the Home dashboard. */
const RATINGS = [
  { min: 90, label: "Excellent", tone: "text-good", bar: "bg-good", pill: "bg-good/10 text-good ring-good/25" },
  { min: 75, label: "Strong", tone: "text-good", bar: "bg-good", pill: "bg-good/10 text-good ring-good/25" },
  { min: 70, label: "Good", tone: "text-brand", bar: "bg-brand", pill: "bg-brand/10 text-brand ring-brand/25" },
  { min: 60, label: "Fair", tone: "text-amber", bar: "bg-amber", pill: "bg-amber/10 text-amber ring-amber/25" },
  { min: 0, label: "Weak", tone: "text-bad", bar: "bg-bad", pill: "bg-bad/10 text-bad ring-bad/25" },
];

export const ratingFor = (score) => RATINGS.find(({ min }) => score >= min);


export interface Point {
  x: number;
  y: number;
}

// Calculates the cross product of vectors OA and OB
// A positive cross product indicates a counter-clockwise turn, negative indicates clockwise, and zero indicates collinear points.
function crossProduct(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

// Monotone Chain Algorithm to compute the Convex Hull
export function getConvexHull(points: Point[]): Point[] {
  const n = points.length;
  if (n <= 2) return points;

  // Sort points primarily by x-coordinate, secondarily by y-coordinate
  const sortedPoints = points.slice().sort((a, b) => {
    return a.x === b.x ? a.y - b.y : a.x - b.x;
  });

  const lower: Point[] = [];
  for (let i = 0; i < n; i++) {
    while (
      lower.length >= 2 &&
      crossProduct(lower[lower.length - 2], lower[lower.length - 1], sortedPoints[i]) <= 0
    ) {
      lower.pop();
    }
    lower.push(sortedPoints[i]);
  }

  const upper: Point[] = [];
  for (let i = n - 1; i >= 0; i--) {
    while (
      upper.length >= 2 &&
      crossProduct(upper[upper.length - 2], upper[upper.length - 1], sortedPoints[i]) <= 0
    ) {
      upper.pop();
    }
    upper.push(sortedPoints[i]);
  }

  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

// Calculate the Centroid (geometric center) of a polygon/set of points
export function getCentroid(points: Point[]): Point {
  let x = 0, y = 0;
  if (points.length === 0) return { x: 0, y: 0 };
  
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  return { x: x / points.length, y: y / points.length };
}

/** Small geo helpers. Deliberately not AI — proximity is arithmetic. */

export interface Point { lat: number; lng: number }

const EARTH_M = 6_371_000;

export function haversineMeters(a: Point, b: Point): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.sqrt(h));
}

export interface Clusterable extends Point { id: string }

/**
 * Single-link clustering with a distance threshold. ~250m is roughly two
 * St. Louis blocks — the distance a crew can cover on foot in 90 minutes.
 */
export function cluster<T extends Clusterable>(points: T[], thresholdMeters = 250, minSize = 3): T[][] {
  const unvisited = new Set(points.map((p) => p.id));
  const byId = new Map(points.map((p) => [p.id, p]));
  const clusters: T[][] = [];

  for (const point of points) {
    if (!unvisited.has(point.id)) continue;
    unvisited.delete(point.id);

    const group: T[] = [point];
    const queue: T[] = [point];

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const id of [...unvisited]) {
        const candidate = byId.get(id)!;
        if (haversineMeters(current, candidate) <= thresholdMeters) {
          unvisited.delete(id);
          group.push(candidate);
          queue.push(candidate);
        }
      }
    }

    if (group.length >= minSize) clusters.push(group);
  }

  return clusters.sort((a, b) => b.length - a.length);
}

export function centroid(points: Point[]): Point {
  const n = points.length || 1;
  return {
    lat: points.reduce((s, p) => s + p.lat, 0) / n,
    lng: points.reduce((s, p) => s + p.lng, 0) / n,
  };
}

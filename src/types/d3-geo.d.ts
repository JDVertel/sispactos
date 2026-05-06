declare module 'd3-geo' {
  export function geoMercator(): {
    fitSize(size: [number, number], object: unknown): any;
  };

  export function geoPath(projection?: any): (object: unknown) => string | null;
}

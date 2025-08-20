declare module '@mapbox/polyline' {
  export function decode(string: string): number[][];
  export function encode(coordinates: number[][]): string;
}
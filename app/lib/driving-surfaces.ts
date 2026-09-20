export type DriveSurfaceState = { zone: string; context: string; score: number; speedKmh: number; active: boolean };

export function syncDriveSurfaces(_state: DriveSurfaceState): boolean {
  return false;
}

export async function endDriveSurfaces(): Promise<void> {}

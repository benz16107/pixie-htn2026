export type DriveSurfaceState = { zone: string; context: string; factor: string; active: boolean };

export function syncDriveSurfaces(_state: DriveSurfaceState): boolean {
  return false;
}

export async function endDriveSurfaces(): Promise<void> {}

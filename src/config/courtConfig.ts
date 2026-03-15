/**
 * Court layout in percentages (0–1) relative to the court view.
 * Used to render the half-court and player slots.
 */

export interface CourtFeatureBasket {
  shape: 'circle';
  x: number;
  /** When anchor is 'top', bottom of circle is at y=0 (baseline); y is ignored. */
  y?: number;
  radius: number;
}

export interface CourtFeaturePaint {
  shape: 'rectangle';
  center_x: number;
  /** When anchor is 'top', top edge is at y=0 (baseline); center_y is ignored. */
  center_y?: number;
  width: number;
  height: number;
}

export interface CourtFeatureThreePointLine {
  shape: 'arc';
  center_x: number;
  center_y: number;
  radius: number;
}

export interface CourtFeatures {
  basket: CourtFeatureBasket;
  paint: CourtFeaturePaint;
  three_point_line: CourtFeatureThreePointLine;
}

export interface CourtPlayerSlot {
  id: string;
  role: string;
  x: number;
  y: number;
  invert?: boolean;
}

export interface CourtConfig {
  court: {
    type: string;
    features: CourtFeatures;
  };
  players: CourtPlayerSlot[];
}

export const courtConfig: CourtConfig = {
  court: {
    type: 'basketball_halfcourt',
    features: {
      basket: {
        shape: 'circle',
        x: 0.5,
        radius: 0.02,
      },
      paint: {
        shape: 'rectangle',
        center_x: 0.5,
        width: 0.18,
        height: 0.28,
      },
      three_point_line: {
        shape: 'arc',
        center_x: 0.5,
        center_y: 0.08,
        radius: 0.48,
      },
    },
  },
  players: [
    { id: 'PG', role: 'Point Guard', x: 0.5, y: 0.8 },
    { id: 'SG', role: 'Shooting Guard', x: 0.8, y: 0.55 },
    { id: 'SF', role: 'Small Forward', x: 0.2, y: 0.45 },
    { id: 'PF', role: 'Power Forward', x: 0.8, y: 0.25 },
    { id: 'C', role: 'Center', x: 0.34, y: 0.15 },
  ],
};

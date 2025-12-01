/**
 * Preview component types
 */

export interface PreviewSettings {
  [key: string]: string | number | boolean;
}

export interface PreviewMessage {
  type: 'RENDER' | 'RENDER_ERROR' | 'RESIZE';
  html?: string;
  css?: string;
  error?: string;
  height?: number;
}

export interface PreviewState {
  isLoading: boolean;
  error: string | null;
  lastRenderTime: number;
}

export type DeviceSize = 'mobile' | 'tablet' | 'desktop';

export const DEVICE_WIDTHS: Record<DeviceSize, number> = {
  mobile: 375,
  tablet: 768,
  desktop: 1200
};

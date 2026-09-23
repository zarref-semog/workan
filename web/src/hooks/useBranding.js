import { useEffect, useState } from 'react';
import { api } from '../services/api';

export const defaultBranding = {
  appName: '', tagline: '', logoUrl: '',
  primaryColor: '#0f766e', accentColor: '#2563eb', sidebarColor: '#ffffff',
};

export function hasCustomBranding(branding) {
  return ['appName', 'tagline', 'logoUrl'].some((key) => {
    const value = branding?.[key];
    return typeof value === 'string' && value.trim() !== '';
  });
}

export function applyBranding(branding) {
  const root = document.documentElement;
  root.style.setProperty('--teal', branding.primaryColor);
  root.style.setProperty('--teal2', branding.primaryColor);
  root.style.setProperty('--brand-accent', branding.accentColor);
  root.style.setProperty('--sidebar-bg', branding.sidebarColor);
  const hex = branding.sidebarColor?.replace('#', '') || 'ffffff';
  const rgb = hex.length === 3
    ? hex.split('').map((value) => parseInt(value + value, 16))
    : [hex.slice(0, 2), hex.slice(2, 4), hex.slice(4, 6)].map((value) => parseInt(value, 16));
  const luminance = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
  root.style.setProperty('--sidebar-text', luminance > 145 ? '#51616b' : '#f3f7f7');
  document.title = branding.appName || 'workan';
}

export function useBranding() {
  const [branding, setBranding] = useState(defaultBranding);
  useEffect(() => {
    api.getAppearance().then((value) => {
      const next = { ...defaultBranding, ...value };
      setBranding(next); applyBranding(next);
    }).catch(() => applyBranding(defaultBranding));
    const update = (event) => { setBranding(event.detail); applyBranding(event.detail); };
    window.addEventListener('branding-updated', update);
    return () => window.removeEventListener('branding-updated', update);
  }, []);
  return branding;
}

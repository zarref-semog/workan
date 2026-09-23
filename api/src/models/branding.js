import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const brandingSettingSchema = new Schema({
  key: { type: String, default: 'default', unique: true },
  appName: { type: String, default: '' },
  tagline: { type: String, default: '' },
  logoUrl: { type: String, default: '' },
  primaryColor: { type: String, default: '#0f766e' },
  accentColor: { type: String, default: '#2563eb' },
  sidebarColor: { type: String, default: '#ffffff' }
}, { timestamps: true });

export const BrandingSetting = model('BrandingSetting', brandingSettingSchema);

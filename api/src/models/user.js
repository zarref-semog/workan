import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  mustChangePassword: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
  permission: { type: String, enum: ['superadmin', 'admin', 'teamlead', 'member'], default: 'member' },
  initials: String,
  color: { type: String, default: '#0f766e' }
}, { timestamps: true });


export const User = model('User', userSchema);

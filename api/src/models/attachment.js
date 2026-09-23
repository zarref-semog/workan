import mongoose from 'mongoose';
const { Schema, model } = mongoose;
export const Attachment = model('Attachment', new Schema({
  name: { type: String, required: true },
  size: { type: Number, required: true },
  url: { type: String, required: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true }));

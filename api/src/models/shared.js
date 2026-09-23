import mongoose from 'mongoose';
const { Schema } = mongoose;
export const optionalObjectId = (reference) => ({
  type: Schema.Types.ObjectId,
  ref: reference,
  default: null,
  set: (value) => value || null
});

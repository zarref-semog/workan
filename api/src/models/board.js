import mongoose from 'mongoose';
const { Schema, model } = mongoose;
import { optionalObjectId } from './shared.js';
const customFieldSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['text', 'number', 'date', 'select', 'checkbox', 'file'], default: 'text' },
  required: { type: Boolean, default: false },
  options: { type: [String], default: [] }
});

const stepDataSchema = new Schema({
  stepId: { type: Schema.Types.ObjectId, required: true },
  stepName: { type: String, required: true },
  values: { type: Map, of: Schema.Types.Mixed, default: {} },
  movedAt: { type: Date, default: Date.now }
});

const cardSchema = new Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  createdBy: optionalObjectId('User'),
  createdByName: { type: String, default: '' },
  stepId: { type: Schema.Types.ObjectId, required: true },
  assigneeId: optionalObjectId('User'),
  dueDate: Date, labels: { type: [String], default: [] },
  fieldValues: { type: Map, of: Schema.Types.Mixed, default: {} },
  stepDataHistory: { type: [stepDataSchema], default: [] },
  order: { type: Number, default: 0 }
}, { timestamps: true });

const stepSchema = new Schema({
  assigneeIds: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: undefined },
  name: { type: String, required: true }, color: { type: String, default: '#0f766e' },
  assigneeId: optionalObjectId('User'), order: { type: Number, default: 0 },
  assigneeTeamId: optionalObjectId('Team'),
  nextStepIds: { type: [Schema.Types.ObjectId], default: undefined },
  customFields: { type: [customFieldSchema], default: [] }
});

const boardSchema = new Schema({
  name: { type: String, required: true }, description: String,
  teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  exampleKey: { type: String, unique: true, sparse: true },
  isExample: { type: Boolean, default: false },
  visibility: { type: String, enum: ['public', 'private'], default: 'private' },
  sharedTeamIds: [{ type: Schema.Types.ObjectId, ref: 'Team' }],
  sharedUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  color: { type: String, default: '#0f766e' }, ownerId: optionalObjectId('User'),
  memberIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  steps: { type: [stepSchema], default: [] }, cards: { type: [cardSchema], default: [] }
}, { timestamps: true });


export const Board = model('Board', boardSchema);

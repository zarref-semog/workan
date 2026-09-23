import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const personSchema = new Schema({
  name: { type: String, required: true },
  email: String,
  phone: String,
  permission: { type: String, enum: ['superadmin', 'admin', 'teamlead', 'member'], default: 'member' },
  initials: String
}, { _id: true });

const teamSchema = new Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  color: { type: String, default: '#0f766e' },
  people: { type: [personSchema], validate: {
    validator: (people) => people.filter((person) => person.permission === 'teamlead').length <= 1,
    message: 'Cada equipe pode ter apenas um líder.',
  } }
}, { timestamps: true });

export const Team = model('Team', teamSchema);

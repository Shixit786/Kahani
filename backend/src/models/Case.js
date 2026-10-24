import mongoose from 'mongoose';

const caseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Case title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    partyName: {
      type: String,
      required: [true, 'Party name is required'],
      trim: true,
    },
    partyAddress: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

export default mongoose.model('Case', caseSchema);

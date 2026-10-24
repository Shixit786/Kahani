import mongoose from 'mongoose';

const custodyEventSchema = new mongoose.Schema(
  {
    evidenceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Evidence',
      required: [true, 'evidenceId is required'],
      index: true,
    },
    // Monotonically increasing per evidence item; starts at 1
    seqNo: {
      type: Number,
      required: true,
    },
    action: {
      type: String,
      required: [true, 'action is required'],
      trim: true,
    },
    actor: {
      type: String,
      required: [true, 'actor is required'],
      trim: true,
    },
    actorRole: {
      type: String,
      enum: ['Party', 'Lawyer', 'Expert', 'Court'],
      required: [true, 'actorRole is required'],
    },
    details: {
      type: String,
      trim: true,
      default: '',
    },
    // Formatted as "DD/MM/YYYY HH:mm:ss IST" — stored as a string to preserve precision
    timestampIST: {
      type: String,
      required: true,
    },
    // SHA-256 hex of the previous event's entryHash; genesis event uses 64 zeros
    prevHash: {
      type: String,
      required: true,
      lowercase: true,
    },
    // SHA-256 hex of this event's canonical payload (fixed key order)
    entryHash: {
      type: String,
      required: true,
      lowercase: true,
    },
  },
  {
    // We deliberately do NOT use Mongoose timestamps here; timestampIST is the source of truth.
    timestamps: false,
  }
);

// Enforce append-only uniqueness: no two events for the same evidence share a seqNo
custodyEventSchema.index({ evidenceId: 1, seqNo: 1 }, { unique: true });

export default mongoose.model('CustodyEvent', custodyEventSchema);

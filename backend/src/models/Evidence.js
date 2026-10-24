import mongoose from 'mongoose';

const evidenceSchema = new mongoose.Schema(
  {
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      required: [true, 'caseId is required'],
      index: true,
    },
    filename: {
      type: String,
      required: [true, 'filename is required'],
      trim: true,
    },
    sizeBytes: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      trim: true,
      default: 'application/octet-stream',
    },
    // Hash computed server-side from the stored file
    sha256: {
      type: String,
      required: true,
      lowercase: true,
    },
    // Hash optionally provided by the client before upload (for cross-verification)
    clientSha256: {
      type: String,
      lowercase: true,
      default: null,
    },
    deviceType: {
      type: String,
      enum: ['Computer', 'Mobile', 'Flash Drive', 'Cloud', 'Other'],
      required: [true, 'deviceType is required'],
    },
    makeModel: {
      type: String,
      trim: true,
      default: '',
    },
    serialNo: {
      type: String,
      trim: true,
      default: '',
    },
    // IMEI / MAC / Cloud-account ID depending on deviceType
    deviceId: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    uploadedBy: {
      type: String,
      trim: true,
      required: [true, 'uploadedBy is required'],
    },
    storagePath: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Evidence', evidenceSchema);

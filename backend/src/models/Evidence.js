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
    declarationAccepted: {
      type: Boolean,
      default: false,
    },
    uploaderIp: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    // Sender map for WhatsApp forensic analysis
    senderMap: [
      {
        label: { type: String, trim: true },
        phoneNumber: { type: String, trim: true, default: '' },
        source: { type: String, enum: ['in-file', 'user-entered'], default: 'in-file' },
        screenshotEvidenceId: { type: String, default: null },
      },
    ],
    // Line-level cryptographic hashes
    lineHashes: [
      {
        lineIndex: Number,
        hash: String,
        raw: String,
      },
    ],
    // Corroboration verification items
    corroboration: {
      type: Map,
      of: new mongoose.Schema(
        {
          status: { type: String, enum: ['pending', 'done', 'failed'], default: 'pending' },
          by: { type: String, default: '' },
          at: { type: String, default: '' },
          note: { type: String, default: '' },
        },
        { _id: false }
      ),
      default: () => ({
        senderNumberRecorded: { status: 'pending', by: '', at: '', note: '' },
        counterpartMatch: { status: 'pending', by: '', at: '', note: '' },
        freshReexport: { status: 'pending', by: '', at: '', note: '' },
        telecomKyc: { status: 'pending', by: '', at: '', note: '' },
        cdrLocation: { status: 'pending', by: '', at: '', note: '' },
        deviceForensics: { status: 'pending', by: '', at: '', note: '' },
        expertCertificate: { status: 'pending', by: '', at: '', note: '' },
      }),
    },
    trustLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'LOW',
    },
    linkedType: {
      type: String,
      enum: ['original', 'counterpart', 'reexport', 'screenshot'],
      default: 'original',
    },
    parentEvidenceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Evidence',
      default: null,
    },
    // RFC 3161 Timestamp token
    tsaToken: {
      type: String,
      default: null,
    },
    tsaTime: {
      type: String,
      default: null,
    },
    tsaStatus: {
      type: String,
      enum: ['pending', 'verified', 'failed'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Evidence', evidenceSchema);

import mongoose, { Document, Schema } from "mongoose";

export interface IFileVersion extends Document {
  artifactId: mongoose.Types.ObjectId;
  versionNumber: number;
  r2Key: string;
  author: mongoose.Types.ObjectId;
  changeDescription?: string;
  createdAt: Date;
}

const FileVersionSchema = new Schema<IFileVersion>(
  {
    artifactId: {
      type: Schema.Types.ObjectId,
      ref: "Artifact",
      required: true,
      index: true,
    },
    versionNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    r2Key: {
      type: String,
      required: true,
      maxlength: 500,
      unique: true,
      sparse: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    changeDescription: {
      type: String,
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

// Compound index for efficient version history queries
FileVersionSchema.index({ artifactId: 1, versionNumber: 1 }, { unique: true });
// Index for finding latest version
FileVersionSchema.index({ artifactId: 1, createdAt: -1 });
// Index for user's version history
FileVersionSchema.index({ author: 1, createdAt: -1 });

export default mongoose.models.FileVersion ||
  mongoose.model<IFileVersion>("FileVersion", FileVersionSchema);

import mongoose, { Schema, Document, Model } from "mongoose";

export interface IOtp extends Document {
  email: string;
  otp: string;
  expiresAt: Date;
}

const OtpSchema: Schema<IOtp> = new Schema(
  {
    email: { type: String, required: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Index to automatically delete documents after they expire
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Otp: Model<IOtp> =
  mongoose.models.Otp || mongoose.model<IOtp>("Otp", OtpSchema);

export default Otp;

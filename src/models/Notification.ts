import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotification extends Document {
  user: mongoose.Types.ObjectId;
  type: "message" | "call" | "friend_request";
  message: string;
  fromUser?: mongoose.Types.ObjectId;
  chatId?: mongoose.Types.ObjectId;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema: Schema<INotification> = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["message", "call", "friend_request"],
      required: true,
    },
    message: { type: String, required: true },
    fromUser: { type: Schema.Types.ObjectId, ref: "User" },
    chatId: { type: Schema.Types.ObjectId, ref: "Chat" },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);

export default Notification;

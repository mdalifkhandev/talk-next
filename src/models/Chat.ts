import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IChat extends Document {
    participants: mongoose.Types.ObjectId[];
    lastMessage?: mongoose.Types.ObjectId;
    isGroup: boolean;
    groupName?: string;
    groupImage?: string;
    admins: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const ChatSchema: Schema<IChat> = new Schema(
    {
        participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
        isGroup: { type: Boolean, default: false },
        groupName: { type: String },
        groupImage: { type: String },
        admins: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    },
    { timestamps: true }
);

const Chat: Model<IChat> =
    mongoose.models.Chat || mongoose.model<IChat>('Chat', ChatSchema);

export default Chat;

import mongoose, { Schema, Document, Model } from 'mongoose';

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file';

export interface IReaction {
    user: mongoose.Types.ObjectId;
    type: string; // 'like', 'heart', 'sticker', etc.
}

export interface IMessage extends Document {
    sender: mongoose.Types.ObjectId;
    chat: mongoose.Types.ObjectId;
    content?: string;
    fileUrl?: string;
    fileType?: MessageType;
    reactions: IReaction[];
    readBy: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const MessageSchema: Schema<IMessage> = new Schema(
    {
        sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        chat: { type: Schema.Types.ObjectId, ref: 'Chat', required: true },
        content: { type: String },
        fileUrl: { type: String },
        fileType: {
            type: String,
            enum: ['text', 'image', 'video', 'audio', 'file'],
            default: 'text'
        },
        reactions: [
            {
                user: { type: Schema.Types.ObjectId, ref: 'User' },
                type: { type: String },
            },
        ],
        readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    },
    { timestamps: true }
);

const Message: Model<IMessage> =
    mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);

export default Message;

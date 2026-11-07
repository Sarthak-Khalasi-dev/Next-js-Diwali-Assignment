import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type SubscriptionStatus = "active" | "paused" | "cancelled" | "past_due";

export interface ISubscription extends Document {
  customer: Types.ObjectId;
  product: Types.ObjectId;
  price: Types.ObjectId;
  status: SubscriptionStatus;
  startDate: Date;
  nextBillingDate: Date;
  cancelledAt: Date | null;
  pausedAt: Date | null;
  history: {
    action: string;
    date: Date;
    details: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    price: { type: Schema.Types.ObjectId, ref: "Price", required: true },
    status: {
      type: String,
      enum: ["active", "paused", "cancelled", "past_due"],
      default: "active",
    },
    startDate: { type: Date, default: Date.now },
    nextBillingDate: { type: Date, required: true },
    cancelledAt: { type: Date, default: null },
    pausedAt: { type: Date, default: null },
    history: [
      {
        action: { type: String, required: true },
        date: { type: Date, default: Date.now },
        details: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true }
);

const Subscription: Model<ISubscription> =
  mongoose.models.Subscription ||
  mongoose.model<ISubscription>("Subscription", SubscriptionSchema);

export default Subscription;

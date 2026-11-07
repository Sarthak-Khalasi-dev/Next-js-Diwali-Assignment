import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type BillingInterval = "monthly" | "yearly" | "one_time";

export interface IPrice extends Document {
  product: Types.ObjectId;
  amount: number;
  currency: string;
  interval: BillingInterval;
  isActive: boolean;
  nickname: string;
  createdAt: Date;
  updatedAt: Date;
}

const PriceSchema = new Schema<IPrice>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR", uppercase: true },
    interval: {
      type: String,
      enum: ["monthly", "yearly", "one_time"],
      required: true,
    },
    isActive: { type: Boolean, default: true },
    nickname: { type: String, default: "" },
  },
  { timestamps: true }
);

const Price: Model<IPrice> =
  mongoose.models.Price || mongoose.model<IPrice>("Price", PriceSchema);

export default Price;

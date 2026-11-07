import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type PaymentStatus = "successful" | "pending" | "failed";
export type PaymentMethod = "credit_card" | "debit_card" | "bank_transfer" | "upi" | "cash" | "other";

export interface IPayment extends Document {
  invoice: Types.ObjectId;
  customer: Types.ObjectId;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId: string;
  notes: string;
  paidAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    invoice: { type: Schema.Types.ObjectId, ref: "Invoice", required: true },
    customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR", uppercase: true },
    method: {
      type: String,
      enum: ["credit_card", "debit_card", "bank_transfer", "upi", "cash", "other"],
      required: true,
    },
    status: {
      type: String,
      enum: ["successful", "pending", "failed"],
      default: "pending",
    },
    transactionId: { type: String, default: "" },
    notes: { type: String, default: "" },
    paidAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema);

export default Payment;

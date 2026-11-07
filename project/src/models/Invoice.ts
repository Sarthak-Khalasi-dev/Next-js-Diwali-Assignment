import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type InvoiceStatus = "draft" | "pending" | "paid" | "overdue";

export interface ILineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface IInvoice extends Document {
  invoiceNumber: string;
  customer: Types.ObjectId;
  subscription: Types.ObjectId | null;
  lineItems: ILineItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  status: InvoiceStatus;
  dueDate: Date;
  paidAt: Date | null;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const LineItemSchema = new Schema(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true },
  },
  { _id: false }
);

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    subscription: { type: Schema.Types.ObjectId, ref: "Subscription", default: null },
    lineItems: [LineItemSchema],
    subtotal: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    discountAmount: { type: Number, default: 0 },
    taxPercent: { type: Number, default: 18, min: 0, max: 100 },
    taxAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["draft", "pending", "paid", "overdue"],
      default: "draft",
    },
    dueDate: { type: Date, required: true },
    paidAt: { type: Date, default: null },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

const Invoice: Model<IInvoice> =
  mongoose.models.Invoice || mongoose.model<IInvoice>("Invoice", InvoiceSchema);

export default Invoice;

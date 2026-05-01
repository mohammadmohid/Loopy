import mongoose, { Schema } from "mongoose";

/** One row per JaaS `idempotencyKey` so we can ACK duplicate retries (JaaS may resend a slightly different body with the same signature). */
const jaasWebhookReceiptSchema = new Schema(
  {
    idempotencyKey: { type: String, required: true, unique: true, index: true },
    eventType: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("JaasWebhookReceipt", jaasWebhookReceiptSchema);

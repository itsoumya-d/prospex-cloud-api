import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type PurchaseOrderDocument = HydratedDocument<PurchaseOrderRecord>;

export type PurchaseOrderStatus = "pending" | "approved" | "rejected";

export class PurchaseOrderItem {
  sku!: string;
  quantity!: number;
  unitCents!: number;
}

@Schema({ timestamps: true, collection: "purchase_orders" })
export class PurchaseOrderRecord {
  @Prop({ required: true, index: true })
  supplier!: string;

  @Prop({ required: true, min: 1 })
  amountCents!: number;

  @Prop({ required: true, default: "USD", minlength: 3, maxlength: 3 })
  currency!: string;

  @Prop({ required: true, enum: ["pending", "approved", "rejected"], default: "pending", index: true })
  status!: PurchaseOrderStatus;

  @Prop({ type: [Object], default: [] })
  items!: PurchaseOrderItem[];

  @Prop()
  erpReference?: string;
}

export const PurchaseOrderSchema = SchemaFactory.createForClass(PurchaseOrderRecord);

export type PurchaseOrder = {
  id: string;
  supplier: string;
  amountCents: number;
  currency: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  erpReference?: string;
  createdAt: string;
  updatedAt: string;
};

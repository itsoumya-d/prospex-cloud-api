import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { isValidObjectId, Model } from "mongoose";
import { randomUUID } from "node:crypto";
import {
  PurchaseOrder,
  PurchaseOrderDocument,
  PurchaseOrderRecord,
  PurchaseOrderStatus,
} from "./purchase-order.schema";

export const PURCHASE_ORDERS_REPOSITORY = "PURCHASE_ORDERS_REPOSITORY";

export interface PurchaseOrdersRepository {
  create(order: Omit<PurchaseOrder, "id" | "createdAt" | "updatedAt">): Promise<PurchaseOrder>;
  list(): Promise<PurchaseOrder[]>;
  findById(id: string): Promise<PurchaseOrder | null>;
  updateStatus(id: string, status: PurchaseOrderStatus): Promise<PurchaseOrder | null>;
}

@Injectable()
export class InMemoryPurchaseOrdersRepository implements PurchaseOrdersRepository {
  private readonly orders = new Map<string, PurchaseOrder>();

  async create(order: Omit<PurchaseOrder, "id" | "createdAt" | "updatedAt">): Promise<PurchaseOrder> {
    const now = new Date().toISOString();
    const created: PurchaseOrder = { ...order, id: randomUUID(), createdAt: now, updatedAt: now };
    this.orders.set(created.id, created);
    return created;
  }

  async list(): Promise<PurchaseOrder[]> {
    return [...this.orders.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async findById(id: string): Promise<PurchaseOrder | null> {
    return this.orders.get(id) ?? null;
  }

  async updateStatus(id: string, status: PurchaseOrderStatus): Promise<PurchaseOrder | null> {
    const existing = this.orders.get(id);
    if (!existing) return null;
    const updated = { ...existing, status, updatedAt: new Date().toISOString() };
    this.orders.set(id, updated);
    return updated;
  }
}

@Injectable()
export class MongoPurchaseOrdersRepository implements PurchaseOrdersRepository {
  constructor(
    @InjectModel(PurchaseOrderRecord.name)
    private readonly model: Model<PurchaseOrderDocument>,
  ) {}

  async create(order: Omit<PurchaseOrder, "id" | "createdAt" | "updatedAt">): Promise<PurchaseOrder> {
    const document = await this.model.create(order);
    return this.toDomain(document);
  }

  async list(): Promise<PurchaseOrder[]> {
    const documents = await this.model.find().sort({ createdAt: -1 }).exec();
    return documents.map((document) => this.toDomain(document));
  }

  async findById(id: string): Promise<PurchaseOrder | null> {
    if (!isValidObjectId(id)) return null;
    const document = await this.model.findById(id).exec();
    return document ? this.toDomain(document) : null;
  }

  async updateStatus(id: string, status: PurchaseOrderStatus): Promise<PurchaseOrder | null> {
    if (!isValidObjectId(id)) return null;
    const document = await this.model.findByIdAndUpdate(id, { status }, { new: true }).exec();
    return document ? this.toDomain(document) : null;
  }

  private toDomain(document: PurchaseOrderDocument): PurchaseOrder {
    const createdAt = (document as unknown as { createdAt?: Date }).createdAt ?? new Date();
    const updatedAt = (document as unknown as { updatedAt?: Date }).updatedAt ?? createdAt;
    return {
      id: document._id.toString(),
      supplier: document.supplier,
      amountCents: document.amountCents,
      currency: document.currency,
      status: document.status,
      items: document.items ?? [],
      erpReference: document.erpReference,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    };
  }
}

import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { CreatePurchaseOrderDto } from "./dto";
import { EventsGateway } from "./events.gateway";
import { PurchaseOrder, PurchaseOrderStatus } from "./purchase-order.schema";
import {
  PURCHASE_ORDERS_REPOSITORY,
  PurchaseOrdersRepository,
} from "./purchase-orders.repository";

@Injectable()
export class PurchaseOrdersService {
  private readonly idempotency = new Map<string, string>();

  constructor(
    @Inject(PURCHASE_ORDERS_REPOSITORY)
    private readonly repository: PurchaseOrdersRepository,
    private readonly events: EventsGateway,
  ) {}

  async create(dto: CreatePurchaseOrderDto, idempotencyKey?: string): Promise<PurchaseOrder> {
    if (idempotencyKey) {
      const existingId = this.idempotency.get(idempotencyKey);
      if (existingId) {
        const existing = await this.repository.findById(existingId);
        if (existing) return existing;
      }
    }

    if (dto.amountCents <= 0) {
      throw new BadRequestException("amountCents must be positive");
    }
    if (dto.items.length === 0) {
      throw new BadRequestException("at least one item is required");
    }

    const order = await this.repository.create({
      supplier: dto.supplier,
      amountCents: dto.amountCents,
      currency: dto.currency,
      status: "pending",
      items: dto.items,
      erpReference: dto.erpReference,
    });

    if (idempotencyKey) {
      this.idempotency.set(idempotencyKey, order.id);
    }
    this.events.broadcast("purchase_order.created", order);
    return order;
  }

  async list(): Promise<PurchaseOrder[]> {
    return this.repository.list();
  }

  async findOne(id: string): Promise<PurchaseOrder> {
    const order = await this.repository.findById(id);
    if (!order) throw new NotFoundException("purchase order not found");
    return order;
  }

  async decide(id: string, status: Extract<PurchaseOrderStatus, "approved" | "rejected">): Promise<PurchaseOrder> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundException("purchase order not found");
    if (existing.status !== "pending") {
      throw new BadRequestException(`purchase order is already ${existing.status}`);
    }
    const updated = await this.repository.updateStatus(id, status);
    if (!updated) throw new NotFoundException("purchase order not found");
    this.events.broadcast("purchase_order.decided", updated);
    return updated;
  }
}

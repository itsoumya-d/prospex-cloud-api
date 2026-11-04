import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { EventsGateway } from "./events.gateway";
import { PurchaseOrdersService } from "./purchase-orders.service";
import {
  InMemoryPurchaseOrdersRepository,
  PURCHASE_ORDERS_REPOSITORY,
} from "./purchase-orders.repository";

describe("PurchaseOrdersService", () => {
  let service: PurchaseOrdersService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PurchaseOrdersService,
        EventsGateway,
        { provide: PURCHASE_ORDERS_REPOSITORY, useClass: InMemoryPurchaseOrdersRepository },
      ],
    }).compile();
    service = moduleRef.get(PurchaseOrdersService);
  });

  const dto = {
    supplier: "Acme Industrial",
    amountCents: 125_000,
    currency: "USD",
    items: [{ sku: "PUMP-01", quantity: 5, unitCents: 25_000 }],
    erpReference: "ERP-42",
  };

  it("creates a pending purchase order", async () => {
    const order = await service.create(dto);
    expect(order.status).toBe("pending");
    expect(order.supplier).toBe("Acme Industrial");
    expect(order.id).toBeTruthy();
  });

  it("replays an idempotent create", async () => {
    const first = await service.create(dto, "po-key-1");
    const second = await service.create(dto, "po-key-1");
    expect(second.id).toBe(first.id);
    expect(await service.list()).toHaveLength(1);
  });

  it("approves a pending order and rejects a second decision", async () => {
    const order = await service.create(dto);
    const approved = await service.decide(order.id, "approved");
    expect(approved.status).toBe("approved");
    await expect(service.decide(order.id, "rejected")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects an order", async () => {
    const order = await service.create(dto);
    const rejected = await service.decide(order.id, "rejected");
    expect(rejected.status).toBe("rejected");
  });

  it("returns 404 for a missing order", async () => {
    await expect(service.findOne("missing")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects a non-positive amount", async () => {
    await expect(service.create({ ...dto, amountCents: 0 })).rejects.toBeInstanceOf(BadRequestException);
  });
});

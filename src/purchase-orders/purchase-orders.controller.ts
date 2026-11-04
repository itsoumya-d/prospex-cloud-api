import { Body, Controller, Get, Headers, Param, Patch, Post } from "@nestjs/common";
import { CreatePurchaseOrderDto } from "./dto";
import { PurchaseOrdersService } from "./purchase-orders.service";

@Controller("purchase-orders")
export class PurchaseOrdersController {
  constructor(private readonly service: PurchaseOrdersService) {}

  @Post()
  create(@Body() dto: CreatePurchaseOrderDto, @Headers("idempotency-key") idempotencyKey?: string) {
    return this.service.create(dto, idempotencyKey);
  }

  @Get()
  list() {
    return this.service.list();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Patch(":id/approve")
  approve(@Param("id") id: string) {
    return this.service.decide(id, "approved");
  }

  @Patch(":id/reject")
  reject(@Param("id") id: string) {
    return this.service.decide(id, "rejected");
  }
}

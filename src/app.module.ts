import { Module } from "@nestjs/common";
import { PurchaseOrdersModule } from "./purchase-orders/purchase-orders.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [PurchaseOrdersModule.forRoot()],
  controllers: [HealthController],
})
export class AppModule {}

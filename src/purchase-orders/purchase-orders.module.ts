import { DynamicModule, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { EventsGateway } from "./events.gateway";
import { PurchaseOrderRecord, PurchaseOrderSchema } from "./purchase-order.schema";
import { PurchaseOrdersController } from "./purchase-orders.controller";
import {
  InMemoryPurchaseOrdersRepository,
  MongoPurchaseOrdersRepository,
  PURCHASE_ORDERS_REPOSITORY,
} from "./purchase-orders.repository";
import { PurchaseOrdersService } from "./purchase-orders.service";

@Module({})
export class PurchaseOrdersModule {
  static forRoot(): DynamicModule {
    const mongoUri = process.env.MONGO_URI;
    const mongoEnabled = Boolean(mongoUri);

    return {
      module: PurchaseOrdersModule,
      imports: mongoEnabled
        ? [
            MongooseModule.forRoot(mongoUri as string),
            MongooseModule.forFeature([{ name: PurchaseOrderRecord.name, schema: PurchaseOrderSchema }]),
          ]
        : [],
      controllers: [PurchaseOrdersController],
      providers: [
        PurchaseOrdersService,
        EventsGateway,
        InMemoryPurchaseOrdersRepository,
        ...(mongoEnabled ? [MongoPurchaseOrdersRepository] : []),
        {
          provide: PURCHASE_ORDERS_REPOSITORY,
          useExisting: mongoEnabled ? MongoPurchaseOrdersRepository : InMemoryPurchaseOrdersRepository,
        },
      ],
      exports: [PurchaseOrdersService],
    };
  }
}

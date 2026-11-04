import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { AppModule } from "./app.module";

describe("prospex-cloud-api (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("reports health", async () => {
    const response = await request(app.getHttpServer()).get("/health").expect(200);
    expect(response.body.status).toBe("ok");
  });

  it("creates, lists and approves a purchase order", async () => {
    const payload = {
      supplier: `E2E Supplier ${Date.now()}`,
      amountCents: 50_000,
      currency: "USD",
      items: [{ sku: "VALVE-9", quantity: 2, unitCents: 25_000 }],
    };

    const created = await request(app.getHttpServer())
      .post("/purchase-orders")
      .set("Idempotency-Key", `e2e-${Date.now()}`)
      .send(payload)
      .expect(201);

    expect(created.body.status).toBe("pending");

    const listed = await request(app.getHttpServer()).get("/purchase-orders").expect(200);
    expect(Array.isArray(listed.body)).toBe(true);

    const approved = await request(app.getHttpServer())
      .patch(`/purchase-orders/${created.body.id}/approve`)
      .expect(200);
    expect(approved.body.status).toBe("approved");
  });

  it("rejects an invalid purchase order", async () => {
    await request(app.getHttpServer())
      .post("/purchase-orders")
      .send({ supplier: "", amountCents: 0, currency: "US", items: [] })
      .expect(400);
  });
});

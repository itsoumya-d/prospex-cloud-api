import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  health() {
    return {
      status: "ok",
      repository: process.env.MONGO_URI ? "mongodb" : "memory",
      timestamp: new Date().toISOString(),
    };
  }
}

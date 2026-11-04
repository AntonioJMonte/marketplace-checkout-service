import { Module } from '@nestjs/common';
import { RabbitmqService } from './rabbitmq/rabbitmq.service.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PaymentQueueService } from './payment-queue/payment-queue.service.js';

@Module({
  imports: [ConfigModule],
  providers: [RabbitmqService, PaymentQueueService],
  exports: [RabbitmqService, PaymentQueueService],
})
export class EventsModule {}

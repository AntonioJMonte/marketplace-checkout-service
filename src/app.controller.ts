import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service.js';
import { PaymentOrderMessage } from './events/payment-queue.interface.js';
import { PaymentQueueService } from './events/payment-queue/payment-queue.service.js';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly paymentQueueService: PaymentQueueService
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('test/send-message')
  async testSendMessage(@Body() body?: Partial<PaymentOrderMessage>) {
    const testMessage: PaymentOrderMessage = {
      eventId: body?.eventId || `test-event-${Date.now()}`,
      orderId: body?.orderId || Date.now(),
      userId: body?.userId || Date.now(),
      amountInCents: body?.amountInCents || 199.99,
      currency: body?.currency || 'BRL',
      items: body?.items || [{
          productId: 100,
          quantity: 2,
          unitPriceInCents: 20.99,
      }],
      paymentMethod: body?.paymentMethod || 'pix',
      description: body?.description || 'teste',
      createdAt: new Date().toISOString(),
    }

    await this.paymentQueueService.publishPaymentOrder(testMessage)

    return {
      success: true,
      message: 'Mensagem enviada para o RabbitMQ',
      data: testMessage
    }
  }

}

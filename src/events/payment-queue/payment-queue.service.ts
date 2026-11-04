import { Injectable, Logger } from '@nestjs/common';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service.js';
import { PaymentOrderMessage } from '../payment-queue.interface.js';

@Injectable()
export class PaymentQueueService {
    private readonly logger = new Logger(PaymentQueueService.name);

    private readonly ROUING_KEY = 'payment.order';
    private readonly EXCHANGE = 'payments';

    constructor (private readonly rabbitMQService: RabbitmqService) {}

    async publishPaymentOrder (paymentOrder: PaymentOrderMessage): Promise<void> {
        this.logger.log(`Publishing payment order for orderId: ${paymentOrder.orderId}`)

        try {
            
            const enrichmentMessage: PaymentOrderMessage = {
                ...paymentOrder,
                createdAt: paymentOrder.createdAt || new Date().toISOString(),
                metadata: {
                    service: 'checkout-service',
                    timestamp: new Date().toISOString(),
                    // correlationId: correlationId ?? randomUUID()
                }
            }

            await this.rabbitMQService.publishMessage(
                this.EXCHANGE, // where to send it
                this.ROUING_KEY, // how to route the message
                enrichmentMessage // what to send
            )

            this.logger.log (
                `Payment order published successfully: ` +
                `eventId = ${paymentOrder.eventId}` +
                `orderId = ${paymentOrder.orderId}` +
                `amount = ${paymentOrder.amountInCents}` +
                `userId = ${paymentOrder.userId}`
            )

            this.logger.debug(`Payment order details: ${JSON.stringify(enrichmentMessage)}`)

        } catch (error) {
            this.logger.error(`Error publishing payment order: orderId = ${paymentOrder.orderId} `, error)
            throw error
        }
    }
    
    async publishPaymentOrderSafe (paymentOrder: PaymentOrderMessage): Promise<void> {
        if (!this.validatePaymentOrder(paymentOrder)) {
            throw new Error ('Invalid payment order')
        }

        await this.publishPaymentOrder (paymentOrder)
    }

    private validatePaymentOrder(paymentOrder: PaymentOrderMessage): boolean {
        
        if (!paymentOrder.eventId) {
            this.logger.error('Invalid payment order: missing eventId');
            return false
        }

        if (!paymentOrder.orderId) {
            this.logger.error('Invalid payment order: missing orderId');
            return false
        }

        if (!paymentOrder.userId) {
            this.logger.error('Invalid payment order: missing userId');
            return false
            
        }

        if (!paymentOrder.amountInCents || paymentOrder.amountInCents <= 0) {
            this.logger.error('Invalid payment order: invalid amout');
            return false
        }

        if (!paymentOrder.items || paymentOrder.items.length <= 0) {
            this.logger.error('Invalid payment order: no items');
            return false
        }

        return true
    }

}

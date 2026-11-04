export interface  PaymentOrderMessage {
    eventId: string;
    orderId: number;
    userId: number;
    amountInCents: number;
    currency: 'BRL';
    items: Array<{
        productId: number;
        quantity: number;
        unitPriceInCents: number;
    }>;
    paymentMethod: 'pix' | 'credit_card' | 'boleto' | 'debit_card' ;
    description?: string;
    createdAt?: string;
    metadata?: {
        service: string;
        timestamp: string;
        // correlationId: string
    }
}
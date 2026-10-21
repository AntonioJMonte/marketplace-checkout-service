export interface  PaymentOrderMessage {
    orderId: number;
    userId: number;
    amount: number;
    items: Array<{
        productId: number;
        quantity: number;
        price: number;
    }>;
    paymentMethod: string;
    description?: string;
    createdAt?: Date;
}
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib'
import { ConfigService } from '@nestjs/config'

@Injectable()
// Service responsible for connection and communication with RabbitMQ
export class RabbitmqService implements OnModuleInit, OnModuleDestroy {
    
    private readonly logger = new Logger(RabbitmqService.name)
    private connection: amqp.ChannelModel

    private channel: amqp.Channel

    constructor ( private configService: ConfigService ) {}

    async onModuleInit() {
        await this.connect()
    }

    async onModuleDestroy() {
        await this.disconnect()
    }


    private async connect() {

        try {
            const rabbitmqURL = this.configService.get<string>(
                'RABBITMQ_URL',
                'amqp://admin:admin@localhost:5672'
            )
    
            this.connection = await amqp.connect(rabbitmqURL)
            this.channel = await this.connection.createChannel()
            this.logger.log('Connected to RabbitMQ successfully')

            // Event listeners for monitoring the connection
            this.connection.on('error', (err) => {
                this.logger.error('RabbitMQ connection error: ', err)
            })

            this.connection.on('close', () => {
                this.logger.warn('RabbitMQ connection closed')
            })

            this.connection.on('blocked', (reason) => {
                this.logger.warn('RabbitMQ connection blocked: ', reason)
            })

            this.connection.on('unblocked', () => {
                this.logger.log('RabbitMQ connection unblocked')
            })
        } catch (error: unknown) {
            this.logger.warn(
                'Failed to connect to RabbitMQ, continuing without message queue: ',
                error instanceof Error ? error.message : error
            )
        }
        
    }

    private async disconnect() {
        try {
            
            if (this.channel) {
                await this.channel.close()
                this.logger.log('RabbitMQ channel closed')
            }

            if (this.connection) {
                await this.connection.close()
                this.logger.log('RabbitMQ connection closed')
            }

        } catch (error) {
            this.logger.error('Error disconnecting from RabbitMQ: ', error)
        }
    }


    // the exchange is the message router, it decides which queue the message goes to
    async publishMessage(exchange: string, routingKey: string, message: any): Promise<void> {
        try {

            if (!this.channel) {
                this.logger.warn('RabbitMQ channel not available, skipping message publish'); 
                return;
            }

            // the 'topic' type allows to use advanced routing
            await this.channel.assertExchange(exchange, 'topic', { durable: true })
            const messageBuffer = Buffer.from(JSON.stringify(message))

            const published = this.channel.publish(
                exchange, 
                routingKey, 
                messageBuffer,
                {
                    persistent: true,
                    contentType: 'application/json',
                    messageId: message.eventId,
                    // correlationId: message.metadata?.correlationId,
                    timestamp: Date.now(),
            })

            if (!published) {
                throw new Error('Failed to publish message to RabbitMQ')
            }

            this.logger.log(`Message published to ${exchange}:${routingKey}`)
            this.logger.debug(`Message content: ${JSON.stringify(message)}`)

        } catch (error) {
            this.logger.error(`Error publishing message to RabbitMQ:`, error)
        }

    }

    // method to consume queue
    async subscribeToQueue (
        queueName: string,
        exchange: string,
        routingKey: string,
        callback: (message: any) => Promise<void>,
    ): Promise<void> {
        try {

            if (!this.channel) {
                throw new Error ('RabbitMQ channel not available')
            }

            await this.channel.assertExchange(exchange, 'topic', { durable: true })
            const queue = await this.channel.assertQueue(queueName, { 
                    durable: true, 
                    arguments: {
                        'x-message-ttl': 86400000,
                        'x-max-length': 10000
                    }
            })

            // determines the type of message the queue receives
            await this.channel.bindQueue(queue.queue, exchange, routingKey)

            // how many messages will be processed at a time
            await this.channel.prefetch(1)

            // consume the messages
            await this.channel.consume(queue.queue, async (msg) => {
                if (msg) {
                    try {

                        const message = JSON.parse(msg.content.toString())
                        this.logger.log(`Message received from queue: ${queueName}`)
                        this.logger.debug(`Message content: ${JSON.stringify(message)}`)
                        await callback(message)

                        this.channel.ack(msg)
                        this.logger.log(`Message processed successfully from queue: ${queueName}`)
                    } catch (error) {
                        this.logger.error(`Error processing message: `, error)
                        this.channel.nack(msg, false, false)
                    }
                }
            })

        } catch (error) {
            this.logger.error(`Error subscribing to queue  ${queueName}:`, error)
        }
    }

    getChannel(): amqp.Channel {
        return this.channel
    }

    getConnection(): amqp.ChannelModel {
        return this.connection
    }

}

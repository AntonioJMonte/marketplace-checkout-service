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

    getChannel(): amqp.Channel {
        return this.channel
    }

    getConnection(): amqp.ChannelModel {
        return this.connection
    }
}

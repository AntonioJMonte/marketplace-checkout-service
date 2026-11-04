import { ConfigService } from '@nestjs/config'
import { TypeOrmModuleOptions } from '@nestjs/typeorm'

export const databaseConfig = (config: ConfigService): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: config.get('DB_HOST', 'localhost'),
    port: Number(config.get('DB_PORT', 5434)),
    username: config.get('DB_USERNAME', 'postgres'),
    password: config.get('DB_PASSWORD', 'postgres'),
    database: config.get('DB_DATABASE', 'checkout_db'),
    entities: [import.meta.dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: config.get('NODE_ENV') !== 'production',
    logging: config.get('NODE_ENV') === 'development',
})
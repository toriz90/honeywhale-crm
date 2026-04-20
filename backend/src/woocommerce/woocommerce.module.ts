import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from '../leads/lead.entity';
import { ConfiguracionModule } from '../configuracion/configuracion.module';
import { WoocommerceService } from './woocommerce.service';
import { WoocommerceSyncService } from './woocommerce-sync.service';
import { WoocommerceController } from './woocommerce.controller';
import { WoocommerceWebhookController } from './woocommerce-webhook.controller';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([Lead]),
    ConfiguracionModule,
  ],
  controllers: [WoocommerceController, WoocommerceWebhookController],
  providers: [WoocommerceService, WoocommerceSyncService],
  exports: [WoocommerceService],
})
export class WoocommerceModule {}

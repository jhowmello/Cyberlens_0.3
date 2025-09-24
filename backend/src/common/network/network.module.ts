import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SecureNetworkService } from './secure-network.service';
import { NetworkMonitoringService } from './network-monitoring.service';
import { NetworkDiscoveryService } from './network-discovery.service';
import { RateLimitingService } from './rate-limiting.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    SecureNetworkService,
    NetworkMonitoringService,
    NetworkDiscoveryService,
    RateLimitingService,
  ],
  exports: [
    SecureNetworkService,
    NetworkMonitoringService,
    NetworkDiscoveryService,
    RateLimitingService,
  ],
})
export class NetworkModule {}
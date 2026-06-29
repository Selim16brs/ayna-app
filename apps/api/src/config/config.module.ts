import { Global, Module } from '@nestjs/common';
import { type Env, loadEnv } from '@ayna/config/env';

export const ENV = Symbol('ENV');

/** Doğrulanmış ortamı (Zod) DI üzerinden sağlar. Boot'ta fail-fast. */
@Global()
@Module({
  providers: [{ provide: ENV, useFactory: (): Env => loadEnv() }],
  exports: [ENV],
})
export class ConfigModule {}

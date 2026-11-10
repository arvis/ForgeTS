import 'reflect-metadata';
import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { pathToFileURL } from 'node:url';

@Controller()
export class GreetingController {
  @Get()
  greeting(): { message: string } {
    return { message: 'Hello from ForgeTS' };
  }
}

@Module({ controllers: [GreetingController] })
export class AppModule {}

export async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.listen(4320, '127.0.0.1');
  return app;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  void bootstrap().catch(() => {
    process.stderr.write('SAMPLE_FAILED\n');
    process.exitCode = 1;
  });
}

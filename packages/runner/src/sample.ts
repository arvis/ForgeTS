// Approved initial source bytes; runtime never reads arbitrary host targets.
export const SAMPLE_FILES = [
  {
    path: 'src/main.ts',
    content:
      "import 'reflect-metadata';\nimport { Controller, Get, Module } from '@nestjs/common';\nimport { NestFactory } from '@nestjs/core';\nimport { pathToFileURL } from 'node:url';\n\n@Controller()\nexport class GreetingController {\n  @Get()\n  greeting(): { message: string } {\n    return { message: 'Hello from ForgeTS' };\n  }\n}\n\n@Module({ controllers: [GreetingController] })\nexport class AppModule {}\n\nexport async function bootstrap() {\n  const app = await NestFactory.create(AppModule, { logger: false });\n  await app.listen(4320, '127.0.0.1');\n  return app;\n}\n\nif (\n  process.argv[1] &&\n  import.meta.url === pathToFileURL(process.argv[1]).href\n) {\n  void bootstrap().catch(() => {\n    process.stderr.write('SAMPLE_FAILED\\n');\n    process.exitCode = 1;\n  });\n}\n",
  },
];

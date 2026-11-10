import 'reflect-metadata';
import {
  Body,
  Catch,
  Controller,
  Get,
  HttpException,
  Inject,
  Module,
  Param,
  Post,
  Query,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { FactoryService, Repository } from '@forgets/core';
import {
  DomainError,
  fail,
  localConfig,
  validated,
  FactoryRunSchema,
  parsePage,
  type LocalConfig,
} from '@forgets/contracts';
const SERVICE = 'M1_SERVICE';
const REPO = 'M1_REPOSITORY';
const runId = (id: string) => validated(FactoryRunSchema.shape.id, id);
@Catch()
class SafeErrors implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<ServerResponse>();
    let status = 500;
    let code = 'INTERNAL';
    if (error instanceof DomainError) {
      code = error.code;
      status =
        code === 'NOT_FOUND'
          ? 404
          : code === 'VALIDATION' || code === 'CONFIG'
            ? 400
            : code === 'PERSISTENCE' || code === 'OWNER_BUSY'
              ? 503
              : 409;
    } else if (error instanceof HttpException) {
      status = error.getStatus();
      code =
        status === 404
          ? 'NOT_FOUND'
          : status === 413
            ? 'TOO_LARGE'
            : 'HTTP_ERROR';
    } else if (
      error instanceof Error &&
      'status' in error &&
      (error.status === 400 || error.status === 413)
    ) {
      status = error.status;
      code = status === 413 ? 'TOO_LARGE' : 'VALIDATION';
    }
    response.statusCode = status;
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ error: code }));
  }
}
@Controller('runs')
class RunsController {
  constructor(
    @Inject(SERVICE) private readonly service: FactoryService,
    @Inject(REPO) private readonly repository: Repository,
  ) {}
  @Post() submit(@Body() body: unknown) {
    return this.service.submit(body);
  }
  @Get() list(@Query() query: Record<string, unknown>) {
    if ('after' in query) fail('VALIDATION');
    return this.repository.list(parsePage(query));
  }
  @Get(':id') get(@Param('id') id: string) {
    return this.repository.get(runId(id));
  }
  @Get(':id/events') events(
    @Param('id') id: string,
    @Query() query: Record<string, unknown>,
  ) {
    if ('cursor' in query || 'state' in query) fail('VALIDATION');
    return this.repository.events(runId(id), parsePage(query));
  }
  @Get(':id/report') async report(@Param('id') id: string) {
    return (await this.repository.get(runId(id))).report;
  }
  @Get(':id/wait') wait(@Param('id') id: string) {
    return this.service.wait(runId(id));
  }
  @Post(':id/cancel') cancel(@Param('id') id: string) {
    return this.service.cancel(runId(id));
  }
}
export async function createApi(
  service: FactoryService,
  repository: Repository,
  input: LocalConfig,
): Promise<NestExpressApplication> {
  const config = localConfig({
    FORGETS_ENV: input.purpose,
    FORGETS_HOST: input.host,
    FORGETS_DB_PASSWORD: input.password,
    FORGETS_DB_HOST: input.host,
    FORGETS_DB_NAME: input.database,
    FORGETS_DB_USER: input.user,
    FORGETS_DB_PORT: String(input.port),
    FORGETS_PORT: String(input.apiPort),
  });
  @Module({
    controllers: [RunsController],
    providers: [
      { provide: SERVICE, useValue: service },
      { provide: REPO, useValue: repository },
    ],
  })
  class ApiModule {}
  const app = await NestFactory.create<NestExpressApplication>(ApiModule, {
    logger: false,
    abortOnError: false,
    bodyParser: false,
  });
  app.use(
    (request: IncomingMessage, response: ServerResponse, next: () => void) => {
      const origin = request.headers.origin;
      const expected = `127.0.0.1:${config.apiPort}`;
      if (
        request.headers.host !== expected ||
        (origin !== undefined && origin !== `http://${expected}`) ||
        request.headers['sec-fetch-site'] === 'cross-site'
      ) {
        response.statusCode = 403;
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ error: 'ORIGIN_DENIED' }));
        return;
      }
      next();
    },
  );
  app.useBodyParser('json', { limit: 131072, strict: true });
  app.useGlobalFilters(new SafeErrors());
  try {
    await app.listen(config.apiPort, config.host);
    return app;
  } catch (error) {
    await app.close();
    throw error;
  }
}

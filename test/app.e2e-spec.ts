import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request, { Response as SupertestResponse } from 'supertest';
import { AppModule } from './../src/app.module';
import { configureHttpPipeline } from './../src/common/bootstrap/configure-http-pipeline';

interface RootEndpointResponse {
  success: boolean;
  statusCode: number;
  data: string;
  timestamp: string;
}

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureHttpPipeline(app);
    await app.init();
  });

  it('/ (GET)', () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    return request(httpServer)
      .get('/')
      .expect(200)
      .expect((response: SupertestResponse) => {
        const body = response.body as RootEndpointResponse;

        expect(body.success).toBe(true);
        expect(body.statusCode).toBe(200);
        expect(body.data).toBe('Hello World!');
        expect(typeof body.timestamp).toBe('string');
      });
  });

  afterEach(async () => {
    await app.close();
  });
});

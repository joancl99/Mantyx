import axios from 'axios';
import { Module } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
// E2E intentionally imports the API app entry pieces to exercise real routing.
// eslint-disable-next-line @nx/enforce-module-boundaries
import { AppController } from '../../../api/src/app/app.controller';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { AppService } from '../../../api/src/app/app.service';

@Module({
  controllers: [AppController],
  providers: [AppService],
})
class TestAppModule {}

describe('GET /api/health', () => {
  let app: INestApplication;
  let baseURL: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.listen(0);
    baseURL = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns API health status', async () => {
    const res = await axios.get('/api/health', { baseURL });

    expect(res.status).toBe(200);
    expect(res.data).toMatchObject({ status: 'ok' });
    expect(typeof res.data.timestamp).toBe('string');
  });
});

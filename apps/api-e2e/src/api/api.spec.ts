import axios from 'axios';

describe('GET /api/health', () => {
  it('returns API health status', async () => {
    const res = await axios.get('/api/health');

    expect(res.status).toBe(200);
    expect(res.data).toMatchObject({ status: 'ok' });
    expect(typeof res.data.timestamp).toBe('string');
  });
});

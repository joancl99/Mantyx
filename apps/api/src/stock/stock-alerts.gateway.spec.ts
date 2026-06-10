import { Server, Socket } from 'socket.io';
import { companyRoom, StockAlertsGateway } from './stock-alerts.gateway';

describe('StockAlertsGateway', () => {
  let jwt: { verifyAsync: jest.Mock };
  let redis: { get: jest.Mock };
  let config: { getOrThrow: jest.Mock };
  let emit: jest.Mock;
  let to: jest.Mock;
  let gateway: StockAlertsGateway;

  const payload = {
    sub: 'user-1',
    companyId: 'company-1',
    jti: 'jti-1',
  };

  function makeClient(token?: string) {
    return {
      id: 'socket-1',
      handshake: { auth: token === undefined ? {} : { token } },
      join: jest.fn(),
      disconnect: jest.fn(),
    } as unknown as Socket & { join: jest.Mock; disconnect: jest.Mock };
  }

  beforeEach(() => {
    jwt = { verifyAsync: jest.fn().mockResolvedValue(payload) };
    redis = { get: jest.fn().mockResolvedValue(null) };
    config = { getOrThrow: jest.fn().mockReturnValue('access-secret') };
    gateway = new StockAlertsGateway(
      jwt as never,
      redis as never,
      config as never,
    );
    emit = jest.fn();
    to = jest.fn().mockReturnValue({ emit });
    (gateway as unknown as { server: Server }).server = {
      to,
      emit,
    } as unknown as Server;
  });

  it('disconnects a client that presents no token', async () => {
    const client = makeClient();

    await gateway.handleConnection(client);

    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.join).not.toHaveBeenCalled();
    expect(jwt.verifyAsync).not.toHaveBeenCalled();
  });

  it('disconnects a client whose token fails verification', async () => {
    jwt.verifyAsync.mockRejectedValue(new Error('invalid signature'));
    const client = makeClient('bad-token');

    await gateway.handleConnection(client);

    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.join).not.toHaveBeenCalled();
  });

  it('disconnects a client whose access token was revoked on logout', async () => {
    redis.get.mockResolvedValue('1');
    const client = makeClient('revoked-token');

    await gateway.handleConnection(client);

    expect(redis.get).toHaveBeenCalledWith('denylist:access:jti-1');
    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.join).not.toHaveBeenCalled();
  });

  it('joins an authenticated client to its company room only', async () => {
    const client = makeClient('valid-token');

    await gateway.handleConnection(client);

    expect(jwt.verifyAsync).toHaveBeenCalledWith('valid-token', {
      secret: 'access-secret',
    });
    expect(client.join).toHaveBeenCalledWith('company:company-1');
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('keeps a SUPERADMIN connection without joining any tenant room', async () => {
    jwt.verifyAsync.mockResolvedValue({ ...payload, companyId: null });
    const client = makeClient('valid-token');

    await gateway.handleConnection(client);

    expect(client.join).not.toHaveBeenCalled();
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('emits low-stock alerts to the owning company room only', () => {
    const alert = {
      productId: 'product-1',
      name: 'Widget',
      sku: 'W-1',
      stock: 2,
      minStock: 5,
    };

    gateway.emitLowStock('company-1', alert);

    expect(to).toHaveBeenCalledWith(companyRoom('company-1'));
    expect(emit).toHaveBeenCalledWith('low-stock', alert);
  });
});

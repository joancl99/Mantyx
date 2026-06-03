import { appRoutes } from './app.routes';

describe('app routes', () => {
  it('defines the authenticated shell route', () => {
    expect(appRoutes.some((route) => route.path === 'app')).toBe(true);
  });
});

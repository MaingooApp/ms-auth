describe('Auth envs', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('parses environment variables', async () => {
    process.env.PORT = '3001';
    process.env.NATS_SERVERS = 'nats://localhost:4222';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.JWT_SECRET = 'secret';
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.REFRESH_JWT_SECRET = 'refresh';
    process.env.REFRESH_EXPIRES_IN = '7d';
    process.env.JWT_ISSUER = 'issuer';
    process.env.JWT_AUDIENCE = 'audience';

    const { envs } = await import('./envs');

    expect(envs.port).toBe(3001);
    expect(envs.natsServers).toEqual(['nats://localhost:4222']);
    expect(envs.databaseUrl).toContain('postgresql://user');
    expect(envs.jwtSecret).toBe('secret');
    expect(envs.refreshJwtSecret).toBe('refresh');
  });
});

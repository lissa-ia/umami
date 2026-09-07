import { beforeEach, describe, expect, test, vi } from 'vitest';
import redis from '@/lib/redis';
import { fetchAccount, fetchTeam } from './load';

vi.mock('@/lib/redis', () => ({
  default: {
    enabled: false,
    client: {
      get: vi.fn(),
      fetch: vi.fn(),
    },
  },
}));

vi.mock('@/queries/prisma', () => ({
  getWebsite: vi.fn(),
}));

vi.mock('@/queries/sql', () => ({
  getWebsiteSession: vi.fn(),
}));

const redisMock = redis as unknown as { enabled: boolean };

beforeEach(() => {
  redisMock.enabled = false;
  vi.mocked(redis.client.get).mockReset();
});

describe('fetchAccount', () => {
  test('returns null without touching the redis client when redis is disabled', async () => {
    const account = await fetchAccount('user-1');

    expect(account).toBeNull();
    expect(redis.client.get).not.toHaveBeenCalled();
  });

  test('reads the account from redis when redis is enabled', async () => {
    redisMock.enabled = true;
    vi.mocked(redis.client.get).mockResolvedValue({ id: 'user-1', hasSubscription: true });

    const account = await fetchAccount('user-1');

    expect(account).toEqual({ id: 'user-1', hasSubscription: true });
    expect(redis.client.get).toHaveBeenCalledWith('account:user-1');
  });
});

describe('fetchTeam', () => {
  test('returns null without touching the redis client when redis is disabled', async () => {
    const team = await fetchTeam('team-1');

    expect(team).toBeNull();
    expect(redis.client.get).not.toHaveBeenCalled();
  });

  test('reads the team from redis when redis is enabled', async () => {
    redisMock.enabled = true;
    vi.mocked(redis.client.get).mockResolvedValue({ teamOwnerId: 'user-1', isBusiness: true });

    const team = await fetchTeam('team-1');

    expect(team).toEqual({ teamOwnerId: 'user-1', isBusiness: true });
    expect(redis.client.get).toHaveBeenCalledWith('team:team-1');
  });
});

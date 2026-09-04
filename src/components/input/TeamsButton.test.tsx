import { expect, test, vi } from 'vitest';
import { render, screen } from '@/test/render';
import { TeamsButton } from './TeamsButton';

const mockPush = vi.fn();

vi.mock('@/components/hooks', () => ({
  useLoginQuery: () => ({ user: { username: 'admin', teams: [] } }),
  useMessages: () => ({
    t: (value: string) => value,
    labels: { myAccount: 'My account', teams: 'Teams' },
  }),
  useMobile: () => ({ isPhone: false }),
  useNavigation: () => ({ teamId: undefined, router: { push: mockPush } }),
}));

test('navigates to manage teams through the router so BASE_PATH is respected', async () => {
  mockPush.mockReset();

  const { user } = render(<TeamsButton />);

  await user.click(screen.getByRole('button', { name: 'admin' }));
  await user.click(screen.getByRole('menuitem', { name: 'Manage teams' }));

  // Router navigation prepends the configured basePath; a raw <a href> would not.
  expect(mockPush).toHaveBeenCalledWith('/settings/teams');
});

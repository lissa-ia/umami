import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { expect, test, vi } from 'vitest';
import { LookupField } from './LookupField';

vi.mock('@umami/react-zen', () => ({
  ListItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Loading: () => <div>Loading</div>,
  useDebounce: (value: string) => value,
}));

vi.mock('@/components/common/ComboBox', () => ({
  ComboBox: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/hooks', () => ({
  useMessages: () => ({
    t: (value: string) => value,
    messages: { noResultsFound: 'No results found' },
  }),
  useWebsiteValuesQuery: () => ({
    data: [{ value: '/home' }],
    isLoading: false,
  }),
}));

test('keeps the typed value selectable when the lookup omits it', () => {
  render(<LookupField websiteId="website-1" type="path" value="/" onChange={() => {}} />);

  expect(screen.getByText('/')).toBeInTheDocument();
  expect(screen.getByText('/home')).toBeInTheDocument();
});

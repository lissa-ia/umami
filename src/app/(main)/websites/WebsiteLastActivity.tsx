import { Text } from '@umami/react-zen';
import { useEffect } from 'react';
import { DateDistance } from '@/components/common/DateDistance';
import { useForceUpdate } from '@/components/hooks';
import { REALTIME_INTERVAL } from '@/lib/constants';

export function WebsiteLastActivity({
  lastActivity,
  isLoading,
}: {
  lastActivity?: string | null;
  isLoading?: boolean;
}) {
  const forceUpdate = useForceUpdate();

  // DateDistance renders 'x min ago' only once, so tick periodically to keep the
  // relative text advancing even when the timestamp itself does not change.
  useEffect(() => {
    if (!lastActivity) {
      return;
    }

    const id = setInterval(forceUpdate, REALTIME_INTERVAL);

    return () => clearInterval(id);
  }, [forceUpdate, lastActivity]);

  if (isLoading || !lastActivity) {
    return <Text>—</Text>;
  }

  return <DateDistance date={new Date(lastActivity)} />;
}

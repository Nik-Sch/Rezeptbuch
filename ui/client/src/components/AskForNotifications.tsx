import { useState, useEffect } from 'react';
import { Callout, H4, Button } from '@blueprintjs/core';
import { useTranslation } from 'react-i18next';
import { subscribeUser, useSWSubscribed } from '../serviceWorkerRegistration';
import { usePersistentState } from './helpers/CustomHooks';

export default function AskForNotifications() {

  const [t] = useTranslation();

  const subscribed = useSWSubscribed(true);

  const [denied, setDenied] = usePersistentState(false, 'noNotifications');

  const [showing, setShowing] = useState(false);

  useEffect(() => {
    (async () => {
      if (Notification.permission === 'denied') {
        console.log('[afn] permission denied');
        setShowing(false);
        return;
      }
      if (denied) {
        console.log('[afn] user doesn\'t want');
        setShowing(false);
        return;
      }
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('[afn] no push/sw');
        setShowing(false);
        return;
      }
      if (subscribed) {
        console.log('[afn] already subscribed');
        setShowing(false);
        return;
      }
      // check if sw is registered
      const regs = await (await navigator.serviceWorker.getRegistrations()).filter(r => r.active !== null);
      if (regs.length === 0) {
        console.log('[afn] sw not registered');
        setShowing(false);
        return;
      }
      console.log(`[afn] showing ${subscribed} ${regs}`);
      setShowing(true);
    })();
  }, [denied, subscribed]);

  if (!showing) {
    return null;
  }

  return <>
    <Callout
      intent='primary'
      icon='notifications'
      className='notification-asker'
    >
      <div className='title-wrapper'>
        <H4>{t('askNotificationsTitle')}</H4>
        <Button
          variant='minimal'
          icon='cross'
          onClick={() => setDenied(true)}
        />
      </div>
      <Button
        text={t('askNotifications')}
        variant='minimal'
        size='large'
        intent='success'
        endIcon='notifications-updated'
        onClick={async () => {
          const success = await subscribeUser();
          console.log(`[afn] subscribe success: ${success}`);
          if (!success) {
            setShowing(false);
          }
        }}
      />
    </Callout>
  </>
}
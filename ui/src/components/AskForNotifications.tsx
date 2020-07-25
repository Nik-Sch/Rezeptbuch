import React, { useState, useEffect } from 'react';
import { Callout, H4, Button } from '@blueprintjs/core';
import { useTranslation } from 'react-i18next';
import { observeSubscription, deleteCallback, subscribeUser } from '../pushServiceWorker';
import { usePersistentState } from './helpers/CustomHooks';

export default function AskForNotifications() {

  const [t] = useTranslation();

  const [subscribed, setSubscribed] = useState(false);

  const [denied, setDenied] = usePersistentState(false, 'noNotifications');
  // const [dialogOpen, setDialogOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);


  useEffect(() => {
    const handleSubscribedChange = (isSubscribed: boolean) => {
      console.log('[afn] handleSubscribed', isSubscribed);
      // setDialogOpen(false);
      setNotificationPermission(Notification.permission);
      setSubscribed(isSubscribed);
    };
    observeSubscription(handleSubscribedChange);
    return () => { deleteCallback(handleSubscribedChange) }
  }, []);

  if (notificationPermission === 'denied') {
    console.log('[afn] permission denied');
    return null;
  }
  if (denied) {
    console.log('[afn] user doesn\'t want');
    return null;
  }
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('[afn] no push/sw');
    return null;
  }

  if (subscribed) {
    console.log('[afn] already subscribed');
    return null;
  }

  return <>
    {/* <Dialog
      isOpen={dialogOpen}
      icon='notifications'
      title={t('notificationDialog')}
      canEscapeKeyClose={false}
      canOutsideClickClose={false}
      isCloseButtonShown={false}
    /> */}
    <Callout
      intent='primary'
      icon='notifications'
      className='notification-asker'
    >
      <div className='title-wrapper'>
        <H4>{t('askNotificationsTitle')}</H4>
        <Button
          minimal={true}
          icon='cross'
          onClick={() => setDenied(true)}
        />
      </div>
      <Button
        text={t('askNotifications')}
        minimal={true}
        large={true}
        intent='success'
        rightIcon='notifications-updated'
        onClick={() => {
          // setDialogOpen(true);
          subscribeUser();
        }}
      />
    </Callout>
  </>
}
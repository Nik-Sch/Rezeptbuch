import { useMobile } from '../helpers/CustomHooks';
import { Icon, Classes, Button, Dialog, H5 } from '@blueprintjs/core';
import { useState } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { AppToasterTop } from '../../util/toaster';
import i18n from '../../util/i18n';
import {
  getUniqueRecipeLink,
  IRecipe,
  emptyRecipe,
  IRecipeWithIngredientId,
} from '../../util/Network';

export async function shareLink(link?: string) {
  const shareLink = link ?? document.location.href;
  if ('share' in navigator) {
    await navigator.share({
      title: document.title,
      url: shareLink,
    });
  } else if ('clipboard' in navigator) {
    await (navigator as Navigator).clipboard.writeText(shareLink);
    AppToasterTop.show({ message: i18n.t('linkCopied') });
    return;
  } else {
    AppToasterTop.show({ message: i18n.t('linkDidntCopied'), intent: 'warning' });
  }
}

export default function ShareButton(props: {
  onlyLink?: boolean;
  recipe?: IRecipe | IRecipeWithIngredientId;
}) {
  const onlyLink = props.onlyLink ?? false;
  const mobile = useMobile();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const handleShareClick = () => {
    if (onlyLink) {
      void shareLink();
    } else {
      setIsOpen(true);
    }
  };

  return (
    <>
      <Dialog
        isOpen={isOpen}
        icon="share"
        onClose={() => setIsOpen(false)}
        title={t('shareOptionTitle')}
      >
        <div className={Classes.DIALOG_BODY}>
          <H5>{t('shareOptions')}</H5>
        </div>
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button
              text={t('shareLink')}
              intent="primary"
              size={mobile ? 'large' : 'medium'}
              onClick={() => {
                void shareLink();
                setIsOpen(false);
              }}
            />
            <Button
              text={t('shareRO')}
              intent="primary"
              size={mobile ? 'large' : 'medium'}
              onClick={() => {
                void (async () => {
                  const link = await getUniqueRecipeLink(props.recipe ?? emptyRecipe);
                  if (typeof link === 'undefined') {
                    AppToasterTop.show({ message: t('uniqueLinkError'), intent: 'danger' });
                  } else {
                    await shareLink(link);
                  }
                  setIsOpen(false);
                })();
              }}
            />
          </div>
        </div>
      </Dialog>
      {mobile ? (
        <Icon
          className={classNames(Classes.BUTTON, Classes.MINIMAL)}
          icon="share"
          size={24}
          onClick={handleShareClick}
        />
      ) : (
        <Button icon="share" text={t('share')} onClick={handleShareClick} />
      )}
    </>
  );
}

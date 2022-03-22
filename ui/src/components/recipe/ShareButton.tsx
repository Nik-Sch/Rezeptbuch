import { useMobile } from "../helpers/CustomHooks";
import { Icon, Classes, Button, Dialog, H5 } from "@blueprintjs/core";
import React, { useState } from "react";
import classNames from "classnames";
import { useTranslation } from "react-i18next";
import { AppToasterTop } from "../../util/toaster";
import i18n from "../../util/i18n";
import { getUniqueRecipeLink, IRecipe, emptyRecipe } from "../../util/Network";


async function shareLink(link?: string) {
  const shareLink = link || document.location.href;
  if ('share' in navigator) {
    (navigator as any).share({
      title: document.title,
      url: shareLink
    });
    return;
  }
  if ('clipboard' in navigator) {
    try {
      await (navigator as any).clipboard.writeText(shareLink);
      AppToasterTop.show({ message: i18n.t('linkCopied') });
      return;
    } catch { }
  }
  AppToasterTop.show({ message: i18n.t('linkDidntCopied'), intent: 'warning' });
}

export default function ShareButton(props: { onlyLink?: boolean, recipe?: IRecipe }) {
  const onlyLink = props.onlyLink || false;
  const mobile = useMobile();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const handleShareClick = () => {
    if (onlyLink) {
      shareLink();
    } else {
      setIsOpen(true);
    }
  }

  return <>
    <Dialog
      isOpen={isOpen}
      icon='share'
      onClose={() => setIsOpen(false)}
      title={t('shareOptionTitle')}
    >
      <div className={Classes.DIALOG_BODY}>
        <H5>
          {t('shareOptions')}
        </H5>
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button
            text={t('shareLink')}
            intent='primary'
            large={mobile}
            onClick={() => {
              shareLink();
              setIsOpen(false);
            }}
          />
          <Button
            text={t('shareRO')}
            intent='primary'
            large={mobile}
            onClick={() => {
              getUniqueRecipeLink(props.recipe || emptyRecipe).then(link => {
                if (typeof link === 'undefined') {
                  AppToasterTop.show({message: t('uniqueLinkError'), intent: 'danger'});
                } else {
                  shareLink(link);
                }
                setIsOpen(false);
              })
            }}
          />
        </div>
      </div>
    </Dialog>
    {mobile
      ? <Icon
        className={classNames(Classes.BUTTON, Classes.MINIMAL)}
        icon='share'
        iconSize={24}
        onClick={handleShareClick}
      />
      : <Button
        icon='share'
        text={t('share')}
        onClick={handleShareClick}
      />}
  </>
}

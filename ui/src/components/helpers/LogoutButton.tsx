import { Tooltip, AnchorButton } from "@blueprintjs/core";
import React from "react";
import { logout, getUserInfo } from "../../util/Network";
import { useHistory } from "react-router-dom";
import { useMobile, useOnline } from "./CustomHooks";
import { useTranslation } from "react-i18next";

export default function LogoutButton() {
  const mobile = useMobile();
  const history = useHistory();
  const online = useOnline();
  const { t } = useTranslation();
  if (typeof getUserInfo() === 'undefined') {
    return null;
  }

  return <Tooltip
    content={online ? t('logout') : t('tooltipOffline')}
    position='bottom'
  >
    <AnchorButton
      className='logout-button'
      icon='log-out'
      minimal={mobile}
      large={mobile}
      disabled={!online}
      intent='warning'
      onClick={() => {
        if (online) {
          (async () => {
            await logout();
            history.push('/login');
          })();
        }
      }}
    />
  </Tooltip>
}
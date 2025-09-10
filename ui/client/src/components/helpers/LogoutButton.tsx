import { AnchorButton, Tooltip } from "@blueprintjs/core";
import { logout, getUserInfo } from "../../util/Network";
import { useNavigate } from "react-router-dom";
import { useMobile, useOnline } from "./CustomHooks";
import { useTranslation } from "react-i18next";

export default function LogoutButton() {
  const mobile = useMobile();
  const navigate = useNavigate();
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
      variant={mobile ? 'minimal' : 'solid'}
      size={mobile ? 'large' : 'medium'}
      disabled={!online}
      intent='warning'
      onClick={() => {
        if (online) {
          (async () => {
            await logout();
            navigate('/login');
          })();
        }
      }}
    />
  </Tooltip>
}
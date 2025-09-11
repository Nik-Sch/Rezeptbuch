import { Switch } from '@blueprintjs/core';
import { useTranslation } from 'react-i18next';
import { IDarkThemeProps } from '../../App';

interface IProps {
  className?: string;
}

export function DarkModeSwitch(props: IProps & IDarkThemeProps) {
  const [t] = useTranslation();

  return <Switch
    checked={props.darkTheme}
    label={t('labelDarkTheme')}
    onChange={() => props.onDarkThemeChanged(!props.darkTheme)}

    className={props.className}
  ></Switch>;
}
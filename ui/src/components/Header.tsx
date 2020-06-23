import React from 'react';
import logoDark from '../static/logo-dark.svg';
import logo from '../static/logo.svg';
import logoNoText from '../static/logo-no-text.svg';
import { Link } from 'react-router-dom';
import { Classes, Icon, Navbar, IconName, ButtonGroup } from '@blueprintjs/core';
import { LanguageSelect } from './helpers/LanguageSelect';
import './Header.scss';
import classNames from 'classnames';
import { useMobile } from './helpers/CustomHooks';
import { DarkModeSwitch } from './helpers/DarkModeSwitch';
import { IDarkThemeProps } from '../App';
import LogoutButton from './helpers/LogoutButton';

export interface IHeaderProps {
  navigationIcon: IconName;
  onNavigationClick?: () => void;
  children?: React.ReactNode;
  logo?: boolean;
  className?: string;
  darkThemeProps: IDarkThemeProps;
}

export default function Header(props: IHeaderProps) {

  if (useMobile()) {
    return <>
      <header>
        <Navbar fixedToTop={true} className={classNames(props.className, 'mobile-header')} >
          <div className='left-align'>
            <Icon
              className={classNames('navigate-button', Classes.BUTTON, Classes.MINIMAL)}
              onClick={props.onNavigationClick}
              icon={props.navigationIcon}
              iconSize={24}
            />
          </div>
          <div className='right-align'>
            {props.children}
            {props.logo && <Link to='/'>
              <img
                src={logoNoText}
                className="logo"
                alt="logo"
              />
            </Link>}
          </div>
        </Navbar>
      </header>
    </>
  } else {
    return <header className='header-wrapper'>
      <div className={classNames(props.className, 'Desktop-header')}>
        <Link to='/'>
          <img
            src={props.darkThemeProps.darkTheme ? logoDark : logo}
            className="App-logo"
            alt="logo" />
        </Link>
        <div className='settings'>
          <DarkModeSwitch {...props.darkThemeProps} />
          <ButtonGroup>
            <LanguageSelect className='language-select' />
            <LogoutButton />
          </ButtonGroup>
        </div>
      </div>
    </header>
  }
}
import React from 'react';
import logoDark from '../static/logo-dark.svg';
import logo from '../static/logo.svg';
import logoNoText from '../static/logo-no-text.svg';
import { Link } from 'react-router-dom';
import { Navbar, ButtonGroup } from '@blueprintjs/core';
import { LanguageSelect } from './helpers/LanguageSelect';
import './Header.scss';
import classNames from 'classnames';
import { useMobile } from './helpers/CustomHooks';
import { DarkModeSwitch } from './helpers/DarkModeSwitch';
import { IDarkThemeProps } from '../App';
import LogoutButton from './helpers/LogoutButton';

export interface IHeaderProps {
  navigationIcon?: JSX.Element;
  onNavigationClick?: () => void;
  children?: React.ReactNode;
  className?: string;
  darkThemeProps: IDarkThemeProps;
}

export default function Header(props: IHeaderProps) {

  if (useMobile()) {
    return <>
      <header>
        <Navbar fixedToTop={true} className={classNames(props.className, 'mobile-header')} >
          <div className='left-align'>
            {props.navigationIcon}
          </div>
          <div className='right-align'>
            {props.children}
            <Link to='/'>
              <img
                src={logoNoText}
                className="logo"
                alt="logo"
              />
            </Link>
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
import React, { useState } from 'react';
import logoNoText from '../static/logo-no-text.svg';
import { Link } from 'react-router-dom';
import { Collapse, Classes, Divider } from '@blueprintjs/core';
import { LanguageSelect } from './helpers/LanguageSelect';
import './MobileHeader.scss';
import classNames from 'classnames';
import { DarkModeSwitch } from './helpers/DarkModeSwitch';
import { IDarkThemeProps } from '../App';
import LogoutButton from './helpers/LogoutButton';
import { getUserInfo } from '../util/Network';
import { INavigationLink, NavigationLinks } from './SideMenu';


function NavigationIcon(props: { isOpen: boolean, onClick?: () => void }) {
  return <div className='nav-icon2-wrapper'>
    <div
      id="nav-icon2"
      className={classNames(Classes.ICON, props.isOpen ? 'open' : '')}
      onClick={props.onClick}
    >
      <span></span>
      <span></span>
      <span></span>
      <span></span>
      <span></span>
      <span></span>
    </div>
  </div>
}

export interface IHeaderProps {
  children?: React.ReactNode;
  className?: string;
  darkThemeProps: IDarkThemeProps;
  navigationLinks?: INavigationLink[];
}

export default function MobileHeader(props: IHeaderProps) {
  const [menuIsOpen, setMenuIsOpen] = useState(false);
  const userInfo = getUserInfo();
  return <>
    <header
      className='mobile-header-wrapper'
    >
      <div className={classNames(props.className, 'mobile-header-content')} >
        <div className='left-align'
          onClick={() => setMenuIsOpen(!menuIsOpen)}>
          <NavigationIcon
            isOpen={menuIsOpen}
          />
        </div>
        <div className='right-align'>
          {props.children}
          <Link to='/'>
            <img
              src={logoNoText}
              className='logo'
              alt='logo'
            />
          </Link>
        </div>
      </div>
      <Collapse
        isOpen={menuIsOpen}
        className={classNames('mobile-header-menu', Classes.CARD, Classes.ELEVATION_2)}
      >
        <div className='settings'>
          <DarkModeSwitch {...props.darkThemeProps} />
          <div className='spacer' />
          <LanguageSelect />
          {typeof userInfo !== 'undefined' && <LogoutButton />}
        </div>
        {props.navigationLinks && <>
          <Divider />
          <div className='navigation'>
            <NavigationLinks navigationLinks={props.navigationLinks} />
          </div>
        </>}
      </Collapse>
    </header>
    {menuIsOpen && <div
      className='mobile-header-menu-clicker'
      onClick={() => setMenuIsOpen(false)}
      onTouchStart={() => setMenuIsOpen(false)}
    />}
  </>
}
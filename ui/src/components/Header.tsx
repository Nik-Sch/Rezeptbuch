import React, { useState } from 'react';
import logoDark from '../static/logo-dark.svg';
import logo from '../static/logo.svg';
import logoNoText from '../static/logo-no-text.svg';
import { Link } from 'react-router-dom';
import { Navbar, ButtonGroup, Collapse, Classes, Divider } from '@blueprintjs/core';
import { LanguageSelect } from './helpers/LanguageSelect';
import './Header.scss';
import classNames from 'classnames';
import { useMobile } from './helpers/CustomHooks';
import { DarkModeSwitch } from './helpers/DarkModeSwitch';
import { IDarkThemeProps } from '../App';
import LogoutButton from './helpers/LogoutButton';
import { NavigationIcon } from './recipeList/RecipeList';
import { getUserInfo } from '../util/Network';
import { INavigationLink, NavigationLinks } from './recipeList/RecipeListMenu';

export interface IHeaderProps {
  children?: React.ReactNode;
  className?: string;
  darkThemeProps: IDarkThemeProps;
  navigationLinks?: INavigationLink[];
}

export default function Header(props: IHeaderProps) {
  const [menuIsOpen, setMenuIsOpen] = useState(false);
  const userInfo = getUserInfo();

  if (useMobile()) {
    return <>
      <header
        className='mobile-header-wrapper'
      >
        <Navbar fixedToTop={true} className={classNames(props.className, 'mobile-header-content')} >
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
        </Navbar>
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
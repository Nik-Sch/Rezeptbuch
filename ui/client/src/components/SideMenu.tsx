import React from 'react';
import {Divider, Classes, Icon, IconName, ButtonGroup } from '@blueprintjs/core';
import { useTranslation } from 'react-i18next';
import logoDark from '../static/logo-dark.svg';
import logo from '../static/logo.svg';

import './SideMenu.scss'
import { IDarkThemeProps } from '../App';
import { useMobile } from './helpers/CustomHooks';
import { Link } from 'react-router-dom';
import classNames from 'classnames';
import { DarkModeSwitch } from './helpers/DarkModeSwitch';
import { LanguageSelect } from './helpers/LanguageSelect';
import LogoutButton from './helpers/LogoutButton';



export type Counts = { [id: number]: number };


export interface INavigationLink {
  to: string;
  icon: IconName;
  text: string;
  active?: boolean;
}

export function NavigationLinks(props: { navigationLinks: INavigationLink[] }) {
  const mobile = useMobile();

  return <>
    {props.navigationLinks.map(nav => (
      <div className='navigation-link' key={nav.to}>
        <Link
          to={nav.to}
          className={classNames(Classes.BUTTON, Classes.FILL, Classes.ALIGN_LEFT, Classes.MINIMAL, mobile ? Classes.LARGE : '', nav.active ? Classes.INTENT_PRIMARY : '')}
          role='button'
        >
          <Icon icon={nav.icon} />
          <span className={Classes.BUTTON_TEXT}>
            {nav.text}
          </span>
        </Link>
      </div>
    ))}
  </>
}

export interface ISideMenuProps {
  darkModeProps: IDarkThemeProps;
  children?: React.ReactNode;
  currentNavigation: 'recipes' | 'shopping-list';
}

export default function SideMenu(myProps: ISideMenuProps) {
  const { darkModeProps, ...props } = myProps;
  const mobile = useMobile();
  const [t] = useTranslation();

  if (mobile) {
    // return <div className='menu'>
    //   <UserMultiSelect
    //     placeholder={t('filterForUsers')}
    //     noResultText={t('noUsersFound')}
    //     onUserSelected={props.onUserSelected}
    //     userCounts={props.userCounts}
    //     selectedUsers={props.selectedUsers}
    //     allUsers={props.allUsers}
    //     className='filter-users'
    //   />
    //   <CategoryMultiSelect
    //     placeholder={t('filterForCategories')}
    //     noResultText={t('noCategoryFound')}
    //     onCategorySelected={props.onCategorySelected}
    //     categoryCounts={props.categoryCounts}
    //     selectedCategories={props.selectedCategories}
    //     allCategories={props.allCategories}
    //     className='filter-categories'
    //   />
    //   <Divider />
    //   <SortSelect
    //     fill={true}
    //     className='sort-recipes'
    //     items={props.sortOptions}
    //     onSelected={props.onSortSelected}
    //     selectedValue={props.selectedSortValue}
    //     selectedDesc={props.selectedSortDesc}
    //   />
    // </div>
  }
  const menuLinks: INavigationLink[] = [
    { to: '/', icon: 'git-repo', text: t('recipes'), active: props.currentNavigation === 'recipes' },
    { to: '/shoppingList', icon: 'shopping-cart', text: t('shoppingList'), active: props.currentNavigation === 'shopping-list' }
  ];

  return <div className='side-menu-wrapper'>
    <div className='side-menu'>
      <Link to='/'>
        <img
          src={darkModeProps.darkTheme ? logoDark : logo}
          className="App-logo"
          alt="logo" />
      </Link>

      <div className='settings'>
        <DarkModeSwitch {...darkModeProps} />
        <ButtonGroup>
          <LanguageSelect className='language-select' />
          <LogoutButton />
        </ButtonGroup>
      </div>
      <Divider className='menu-item' />

      <NavigationLinks
        navigationLinks={menuLinks}
      />

      {typeof props.children !== 'undefined' &&<Divider className='menu-item' />}
      {props.children}


    </div>
  </div>
}
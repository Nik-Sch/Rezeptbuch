import React from 'react';
import { Card, Button, InputGroup, Tooltip, Divider, Classes, Icon, IconName } from '@blueprintjs/core';
import { useTranslation } from 'react-i18next';
import { CategoryMultiSelect } from '../helpers/CategoryMultiSelect';
import { SortSelect, ISort } from '../helpers/SortSelect';
import { ICategory, IUser } from '../../util/Recipes';

import './RecipeListMenu.scss'
import { LanguageSelect } from '../helpers/LanguageSelect';
import { DarkModeSwitch } from '../helpers/DarkModeSwitch';
import { IDarkThemeProps } from '../../App';
import { useMobile } from '../helpers/CustomHooks';
import LogoutButton from '../helpers/LogoutButton';
import { UserMultiSelect } from '../helpers/UserMultiSelect';
import { Link } from 'react-router-dom';
import classNames from 'classnames';

export interface ISearchProps {
  handleSearchChange: (newValue: string) => void;
  handleSearchInIngredientsChange: (newValue: boolean) => void;
  onCategorySelected: (categories: ICategory[]) => void;
  onSortSelected: (value: ISort, desc: boolean) => void;
  searchString: string;
  searchInIngredients: boolean;
  selectedCategories: ICategory[];
  allCategories: ICategory[];
  sortOptions: ISort[];
  onUserSelected: (users: IUser[]) => void;
  selectedUsers: IUser[];
  allUsers: IUser[];
  darkModeProps: IDarkThemeProps;
}

export interface IMenuLink {
  to: string;
  icon: IconName;
  text: string;
  active?: boolean;
}

export function MenuLinks(props: { menuLinks: IMenuLink[] }) {
  return <>
    {props.menuLinks.map(menu => (
      <div className='menu-link'>
        <Link
          to={menu.to}
          className={classNames(Classes.BUTTON, Classes.FILL, Classes.ALIGN_LEFT, Classes.MINIMAL, menu.active ? Classes.INTENT_PRIMARY : '')}
          role='button'
        >
          <Icon icon={menu.icon} />
          <span className={Classes.BUTTON_TEXT}>
            {menu.text}
          </span>
        </Link>
      </div>
    ))}
  </>
}

export default function RecipeListMenu(myProps: ISearchProps) {
  const [t] = useTranslation();
  const { darkModeProps, ...props } = myProps;
  const mobile = useMobile();
  const menuLinks: IMenuLink[] = [
    { to: '/', icon: 'git-repo', text: t('recipes'), active: true },
    { to: '/shoppingList', icon: 'shopping-cart', text: t('shoppingList') }
  ];

  if (mobile) {
    return <div className='menu'>
      <div className='settings'>
        <DarkModeSwitch {...darkModeProps} />
        <div className='spacer' />
        <LanguageSelect />
        <LogoutButton />
      </div>

      {/* <Divider />
      <div className='control'>
        <Link
          to='/shoppingList'
          className={classNames(Classes.BUTTON, Classes.ALIGN_LEFT, Classes.LARGE)}
          role='button'
        >
          <Icon icon='shopping-cart' />
          <span className={Classes.BUTTON_TEXT}>
            {t('shoppingList')}
          </span>
        </Link>
      </div>
      <Divider /> */}

      <div className='control'>
        <UserMultiSelect
          placeholder={t('filterForUsers')}
          noResultText={t('noUsersFound')}
          onUserSelected={props.onUserSelected}
          selectedUsers={props.selectedUsers}
          allUsers={props.allUsers}
          className='filter-users'
        />
        <div className='sort-recipes-wrapper'>
          <SortSelect
            fill={true}
            defaultDesc={false}
            defaultIndex={0}
            className='sort-recipes'
            items={props.sortOptions}
            onSelected={props.onSortSelected}
          />
        </div>
        <CategoryMultiSelect
          placeholder={t('filterForCategories')}
          noResultText={t('noCategoryFound')}
          onCategorySelected={props.onCategorySelected}
          selectedCategories={props.selectedCategories}
          allCategories={props.allCategories}
          className='filter-categories'
        />
      </div>
    </div>
  }

  const searchInIngredientsButton = (
    <Tooltip
      content={props.searchInIngredients ? t('tooltipSearchInIngredients') : t('tooltipNotSearchInIngredients')}
    >
      <Button
        icon='properties'
        intent={props.searchInIngredients ? 'primary' : 'none'}
        minimal={true}
        onClick={() => props.handleSearchInIngredientsChange(!props.searchInIngredients)}
      />
    </Tooltip>
  );
  return <Card className='menu'>
    <MenuLinks
      menuLinks={menuLinks}
    />

    <Divider className='menu-item'/>

    <InputGroup
      leftIcon='search'
      rightElement={searchInIngredientsButton}
      placeholder={t('searchRecipe')}
      value={props.searchString}
      className='search-recipe menu-item'
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => props.handleSearchChange(e.target.value)}
    />
    <CategoryMultiSelect
      placeholder={t('filterForCategories')}
      noResultText={t('noCategoryFound')}
      onCategorySelected={props.onCategorySelected}
      selectedCategories={props.selectedCategories}
      allCategories={props.allCategories}
      className='filter-categories menu-item'
    />
    <UserMultiSelect
      placeholder={t('filterForUsers')}
      noResultText={t('noUsersFound')}
      onUserSelected={props.onUserSelected}
      selectedUsers={props.selectedUsers}
      allUsers={props.allUsers}
      className='filter-users menu-item'
    />
  </Card>
}
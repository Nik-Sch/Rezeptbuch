import React from 'react';
import { Card, Button, InputGroup, Divider, Classes, Icon, IconName } from '@blueprintjs/core';
import { useTranslation } from 'react-i18next';
import { CategoryMultiSelect } from '../helpers/CategoryMultiSelect';
import { SortSelect, ISort } from '../helpers/SortSelect';
import { ICategory, IUser } from '../../util/Network';

import './RecipeListMenu.scss'
import { IDarkThemeProps } from '../../App';
import { useMobile } from '../helpers/CustomHooks';
import { UserMultiSelect } from '../helpers/UserMultiSelect';
import { Link } from 'react-router-dom';
import classNames from 'classnames';
import { Tooltip2 } from '@blueprintjs/popover2';

export type Counts = { [id: number]: number };
export interface ISearchProps {
  handleSearchChange: (newValue: string) => void;
  handleSearchInIngredientsChange: (newValue: boolean) => void;
  onCategorySelected: (categories: ICategory[]) => void;
  onSortSelected: (value: ISort, desc: boolean) => void;
  searchString: string;
  searchInIngredients: boolean;
  selectedCategories: ICategory[];
  selectedSortValue: ISort;
  selectedSortDesc: boolean;
  allCategories: ICategory[];
  categoryCounts: Counts;
  sortOptions: ISort[];
  onUserSelected: (users: IUser[]) => void;
  selectedUsers: IUser[];
  allUsers: IUser[];
  userCounts: Counts;
  darkModeProps: IDarkThemeProps;
}

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

export default function RecipeListMenu(myProps: ISearchProps) {
  const [t] = useTranslation();
  const { darkModeProps, ...props } = myProps;
  const mobile = useMobile();
  const menuLinks: INavigationLink[] = [
    { to: '/', icon: 'git-repo', text: t('recipes'), active: true },
    { to: '/shoppingList', icon: 'shopping-cart', text: t('shoppingList') }
  ];

  if (mobile) {
    return <div className='menu'>
        <UserMultiSelect
          placeholder={t('filterForUsers')}
          noResultText={t('noUsersFound')}
          onUserSelected={props.onUserSelected}
          userCounts={props.userCounts}
          selectedUsers={props.selectedUsers}
          allUsers={props.allUsers}
          className='filter-users'
        />
        <CategoryMultiSelect
          placeholder={t('filterForCategories')}
          noResultText={t('noCategoryFound')}
          onCategorySelected={props.onCategorySelected}
          categoryCounts={props.categoryCounts}
          selectedCategories={props.selectedCategories}
          allCategories={props.allCategories}
          className='filter-categories'
        />
        <Divider/>
        <SortSelect
          fill={true}
          className='sort-recipes'
          items={props.sortOptions}
          onSelected={props.onSortSelected}
          selectedValue={props.selectedSortValue}
          selectedDesc={props.selectedSortDesc}
        />
    </div>
  }

  const searchInIngredientsButton = (
    <Tooltip2
      content={props.searchInIngredients ? t('tooltipSearchInIngredients') : t('tooltipNotSearchInIngredients')}
    >
      <Button
        icon='properties'
        intent={props.searchInIngredients ? 'primary' : 'none'}
        minimal={true}
        onClick={() => props.handleSearchInIngredientsChange(!props.searchInIngredients)}
      />
    </Tooltip2>
  );
  return <Card className='menu'>
    <NavigationLinks
      navigationLinks={menuLinks}
    />

    <Divider className='menu-item' />

    <InputGroup
      leftIcon='search'
      rightElement={searchInIngredientsButton}
      placeholder={t('searchRecipe')}
      value={props.searchString}
      className='search-recipe menu-item'
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => props.handleSearchChange(e.target.value)}
    />
    <UserMultiSelect
      placeholder={t('filterForUsers')}
      noResultText={t('noUsersFound')}
      onUserSelected={props.onUserSelected}
      userCounts={props.userCounts}
      selectedUsers={props.selectedUsers}
      allUsers={props.allUsers}
      className='filter-users menu-item'
    />
    <CategoryMultiSelect
      placeholder={t('filterForCategories')}
      noResultText={t('noCategoryFound')}
      onCategorySelected={props.onCategorySelected}
      selectedCategories={props.selectedCategories}
      categoryCounts={props.categoryCounts}
      allCategories={props.allCategories}
      className='filter-categories menu-item'
    />
  </Card>
}
import React from 'react';
import { Card, Button, InputGroup, Tooltip } from '@blueprintjs/core';
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

export default function RecipeListMenu(myProps: ISearchProps) {
  const [t] = useTranslation();
  const { darkModeProps, ...props } = myProps;
  const mobile = useMobile();

  if (mobile) {
    return <div className='recipe-menu'>
      <div className='settings'>
        <DarkModeSwitch {...darkModeProps} />
        <div className='spacer' />
        <LanguageSelect />
        <LogoutButton />
      </div>
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
  return <Card className='recipe-menu'>
    <InputGroup
      leftIcon='search'
      rightElement={searchInIngredientsButton}
      placeholder={t('searchRecipe')}
      value={props.searchString}
      className='search-recipe'
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => props.handleSearchChange(e.target.value)}
    />
    <CategoryMultiSelect
      placeholder={t('filterForCategories')}
      noResultText={t('noCategoryFound')}
      onCategorySelected={props.onCategorySelected}
      selectedCategories={props.selectedCategories}
      allCategories={props.allCategories}
      className='filter-categories'
    />
    <UserMultiSelect
      placeholder={t('filterForUsers')}
      noResultText={t('noUsersFound')}
      onUserSelected={props.onUserSelected}
      selectedUsers={props.selectedUsers}
      allUsers={props.allUsers}
      className='filter-users'
    />
  </Card>
}
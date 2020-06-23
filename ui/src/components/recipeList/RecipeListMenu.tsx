import React from 'react';
import { Card, Button, InputGroup, Tooltip, Classes, Icon } from '@blueprintjs/core';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CategoryMultiSelect } from '../helpers/CategoryMultiSelect';
import { SortSelect, ISort } from '../helpers/SortSelect';
import { ICategory, getUserInfo } from '../../util/Recipes';

import './RecipeListMenu.scss'
import { LanguageSelect } from '../helpers/LanguageSelect';
import { DarkModeSwitch } from '../helpers/DarkModeSwitch';
import { IDarkThemeProps } from '../../App';
import { useOnline } from '../helpers/CustomHooks';
import classNames from 'classnames';
import LogoutButton from '../helpers/LogoutButton';

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
  drawer?: boolean;
  height?: number;
  darkModeProps: IDarkThemeProps;
}

export default function RecipeListMenu(myProps: ISearchProps) {
  const [t] = useTranslation();
  const { darkModeProps, ...props } = myProps;
  const online = useOnline();
  const status = getUserInfo();
  const hasWriteAccess = typeof status !== 'undefined' && status.write;

  if (props.drawer) {
    return <div className='drawer'>
      <div className='settings'>
        <DarkModeSwitch {...darkModeProps} />
        <div className='spacer' />
        <LanguageSelect />
        <LogoutButton/>
      </div>
      <div className='control'>
        <CategoryMultiSelect
          placeholder={t('filterForCategories')}
          noResultText={t('noCategoryFound')}
          onCategorySelected={props.onCategorySelected}
          selectedCategories={props.selectedCategories}
          allCategories={props.allCategories}
          className='filter-categories'

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
  return <Card className={'recipe-menu'} style={{ height: props.height }}>
    <Tooltip
      disabled={online && hasWriteAccess}
      content={hasWriteAccess ? t('tooltipOffline') : t('tooltipNoWrite')}
      position='bottom'
    >
      <Link
        to={(online && hasWriteAccess) ? '/recipes/new' : ''}
        className={classNames('add-recipe', Classes.BUTTON, Classes.INTENT_PRIMARY, (online && hasWriteAccess) ? '' : Classes.DISABLED)}
        role='button'
      >
        <>
          <Icon icon='add' />
          <span className={Classes.BUTTON_TEXT}>
            {t('newRecipe')}
          </span>
        </>
      </Link>
    </Tooltip>
    <div className='spacer' />
    <div className='filter-recipes'>
      <div className='search-recipes'>
        <InputGroup
          leftIcon='search'
          rightElement={searchInIngredientsButton}
          placeholder={t('searchRecipe')}
          value={props.searchString}
          fill={true}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => props.handleSearchChange(e.target.value)}
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

    <div className='sort-recipes-wrapper'>
      <SortSelect
        defaultDesc={false}
        defaultIndex={0}
        className='sort-recipes'
        items={props.sortOptions}
        onSelected={props.onSortSelected}
      />
    </div>
  </Card>
}
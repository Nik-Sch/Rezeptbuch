import React, { useState, useEffect, useRef, useCallback } from 'react';
import recipesHandler, { IRecipe, ICategory, getUserInfo, IUser } from '../../util/Network';
import { Classes, Icon, InputGroup, Button, H3, Collapse, Tooltip } from '@blueprintjs/core';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { ISort, SortSelect } from '../helpers/SortSelect';
import { useMobile, useSessionImmer, useOnline } from '../helpers/CustomHooks';
import RecipeListItem from './RecipeListItem';
import RecipeListMenu, { INavigationLink, Counts } from './RecipeListMenu';
import Header from '../Header';

import './RecipeList.scss'
import classNames from 'classnames';
import { Link } from 'react-router-dom';
import { IDarkThemeProps } from '../../App';
import AskForNotifications from '../AskForNotifications';
import { isNotificationAvailable, registerSW } from '../../pushServiceWorker';
import { sessionStorageFilteredCategories, sessionStorageSearchString, sessionStorageSearchInIngredients, sessionStorageSortingOrder, sessionStorageFilteredUsers } from '../../util/StorageKeys';
import { AppToasterBottom } from '../../util/toaster';
import i18n from '../../util/i18n';
import { WindowScroller, List } from 'react-virtualized';

const skeletonRecipes = [undefined, undefined, undefined, undefined];

export function NavigationIcon(props: { isOpen: boolean, onClick?: () => void }) {
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


const sortOptions: ISort[] = [
  { key: 'date', textKey: 'sortDate', smallTextKey: 'sortDateSmall' },
  { key: 'title', textKey: 'sortTitle', smallTextKey: 'sortTitleSmall' },
];

function onServiceWorkerSuccess() {
  // console.log('[sw] success');
  AppToasterBottom.show({
    message: i18n.t('offline'),
    intent: 'none',
    timeout: 7500

  });
}

function onServiceWorkerUpdate() {
  // console.log('[sw] update');
  AppToasterBottom.show({
    message: i18n.t('newVersion'),
    intent: 'primary',
    icon: 'updated',
    action: {
      onClick: () => window.location.reload(),
      text: i18n.t('updateNow')
    },
    timeout: 10000
  });
}


export default function RecipeList(props: IDarkThemeProps) {
  document.title = 'Unsere Rezepte';
  const [t] = useTranslation();
  const online = useOnline();

  registerSW({
    onUpdate: onServiceWorkerUpdate,
    onSuccess: onServiceWorkerSuccess
  });

  const [recipes, setRecipes] = useState<(IRecipe)[]>([]);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Counts>([]);
  const [users, setUsers] = useState<IUser[]>([]);
  const [filteredCategories, setFilteredCategories] = useSessionImmer<ICategory[]>([], sessionStorageFilteredCategories);
  const [filteredUsers, setFilteredUsers] = useSessionImmer<IUser[]>([], sessionStorageFilteredUsers);
  const [userCounts, setUserCounts] = useState<Counts>([]);
  const [searchString, setSearchString] = useSessionImmer<string>('', sessionStorageSearchString);
  const [searchInIngredients, setSearchInIngredients] = useSessionImmer<boolean>(true, sessionStorageSearchInIngredients);
  const [sortingOrder, setSortingOrder] = useSessionImmer<{ key: keyof IRecipe, desc: boolean }>({ key: 'date', desc: false }, sessionStorageSortingOrder);
  const [recipesToShow, setRecipesToShow] = useState<(IRecipe | undefined)[]>(skeletonRecipes);
  const [filterIsOpen, setFilterIsOpen] = useState(false);
  const timeout = useRef<number>();
  const mobile = useMobile();
  const status = getUserInfo();
  const hasWriteAccess = typeof status !== 'undefined' && status.write;

  // recipe change
  useEffect(() => {
    const handleRecipesChange = (recipes: IRecipe[], categories: ICategory[], users: IUser[]) => {
      setRecipes(recipes);
      setCategories(categories);
      setUsers(users);
    }
    return recipesHandler.subscribe(handleRecipesChange);

  }, []);


  const filterRecipeByCategory = useCallback((recipe?: IRecipe) => {
    if (filteredCategories.length === 0 || !recipe) {
      return true;
    }
    return filteredCategories.findIndex((category) => category.id === recipe.category.id) !== -1
  }, [filteredCategories]);

  const filterRecipeByUser = useCallback((recipe?: IRecipe) => {
    if (filteredUsers.length === 0 || !recipe) {
      return true;
    }
    return filteredUsers.findIndex(user => user.id === recipe.user.id) !== -1
  }, [filteredUsers]);

  const filterRecipeBySearch = useCallback((recipe?: IRecipe) => {
    if (searchString === '' || !recipe) {
      return true;
    }
    const searchStringLower = searchString.toLocaleLowerCase();
    return recipe.title.toLocaleLowerCase().includes(searchStringLower)
      || (searchInIngredients && recipe.ingredients.map(v => v.toLocaleLowerCase().includes(searchStringLower)).reduce((p, c) => p || c, false));
  }, [searchInIngredients, searchString]);

  // categoryCounts
  useEffect(() => {
    const counts: Counts = {};
    for (const category of categories) {
      counts[category.id] = recipes.filter(filterRecipeBySearch).filter(filterRecipeByUser).filter(r => r?.category.id === category.id).length;
    }
    setCategoryCounts(counts);
  }, [categories, filterRecipeBySearch, filterRecipeByUser, recipes]);

  // userCounts
  useEffect(() => {
    const counts: Counts = {};
    for (const user of users) {
      counts[user.id] = recipes.filter(filterRecipeBySearch).filter(filterRecipeByCategory).filter(r => r?.user.id === user.id).length;
    }
    setUserCounts(counts);
  }, [filterRecipeByCategory, filterRecipeBySearch, recipes, users]);

  // search and sort
  useEffect(() => {
    const sortRecipes = (r1?: IRecipe, r2?: IRecipe): number => {
      if (!r1 || !r2) {
        return 0;
      }
      let result = 0;
      switch (sortingOrder.key) {
        case 'date':
          result = dayjs(r2.date).diff(dayjs(r1.date));
          break;
        case 'title':
          result = r1.title.toLowerCase().localeCompare(r2.title.toLowerCase());
          break;
        default:
          break;
      }
      return result * (sortingOrder.desc ? -1 : 1);
    }

    const filterRecipe = (recipe?: IRecipe) => {
      return filterRecipeBySearch(recipe)
        && filterRecipeByCategory(recipe)
        && filterRecipeByUser(recipe);
    }
    window.clearTimeout(timeout.current);
    timeout.current = window.setTimeout(() => {
      if (recipes) {
        setRecipesToShow(recipes.sort(sortRecipes).filter(filterRecipe));
      }
    }, mobile ? 100 : 0);
  }, [filterRecipeByCategory, filterRecipeBySearch, filterRecipeByUser, mobile, recipes, sortingOrder.desc, sortingOrder.key]);


  const handleSearchChange = (value: string) => {
    setSearchString(() => value);
  }

  const onSortSelected = (v: ISort, d: boolean) => {
    setSortingOrder(draft => {
      draft.key = v.key;
      draft.desc = d;
    })
  };

  const searchClearButton = searchString.length === 0
    ? undefined
    : <Button icon='cross' minimal={true} onClick={() => handleSearchChange('')} />;

  const navigationLinks: INavigationLink[] = [
    { to: '/', icon: 'git-repo', text: t('recipes'), active: true },
    { to: '/shoppingList', icon: 'shopping-cart', text: t('shoppingList') }
  ];
  const recipeListMenu = <RecipeListMenu
    darkModeProps={props}
    searchString={searchString}
    handleSearchChange={handleSearchChange}
    handleSearchInIngredientsChange={v => setSearchInIngredients(() => v)}
    searchInIngredients={searchInIngredients}
    onCategorySelected={categories => setFilteredCategories(() => categories)}
    selectedCategories={filteredCategories}
    allCategories={categories}
    categoryCounts={categoryCounts}
    userCounts={userCounts}
    sortOptions={sortOptions}
    onUserSelected={users => setFilteredUsers(() => users)}
    selectedUsers={filteredUsers}
    allUsers={users}
    onSortSelected={onSortSelected}
  />;


  return <>
    <Header
      darkThemeProps={props}
      navigationLinks={navigationLinks}
    >
      {mobile && <>
        <Icon
          className={classNames(Classes.BUTTON, Classes.MINIMAL)}
          icon={filteredCategories.length > 0 || filteredUsers.length > 0 ? 'filter-keep' : 'filter'}
          intent={filterIsOpen ? 'primary' : 'none'}
          iconSize={24}
          onClick={() => {
            setFilterIsOpen(!filterIsOpen);
            if (!filterIsOpen) { // going to open filter
              window.scrollTo(0, 0);
            }
          }}
        />
        <InputGroup
          leftIcon='search'
          large={true}
          rightElement={searchClearButton}
          placeholder={t('searchRecipe')}
          value={searchString}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearchChange(e.target.value)}
          className='recipe-search'
        />
      </>}
    </Header>
    {mobile &&
      <Collapse
        isOpen={filterIsOpen}
      >
        {recipeListMenu}
      </Collapse>
    }
    <div className='body'>
      {!mobile && recipeListMenu}
      <div className='main-content'>
        {!mobile && <div className='header'>
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
              <Icon icon='add' />
              <span className={Classes.BUTTON_TEXT}>
                {t('newRecipe')}
              </span>
            </Link>
          </Tooltip>

          <SortSelect
            defaultDesc={false}
            defaultIndex={0}
            className='sort-recipes'
            items={sortOptions}
            onSelected={onSortSelected}
          />
        </div>}
        {isNotificationAvailable() && <AskForNotifications />}
        {recipes.length === 0 && recipesToShow.length === 0 &&
          <H3 className='error'>
            {t('noRecipes')}
          </H3>}
        {recipes.length > 0 && recipesToShow.length === 0 &&
          <H3 className='error'>
            {t('noRecipesMatching')}
          </H3>}

        {recipesToShow.length > 0 &&
          <WindowScroller>
            {({ height, isScrolling, onChildScroll, scrollTop, width }) => {

              const listWidth = mobile ? width :
                Math.min(width, 1280) * 0.75 - 5;
              return <List
                autoHeight={true}
                height={height}
                isScrolling={isScrolling}
                onScroll={onChildScroll}
                rowCount={recipesToShow.length}
                rowHeight={150 + 20}
                scrollTop={scrollTop}
                width={listWidth}
                rowRenderer={({ index, style, isScrolling }) => <RecipeListItem
                  interactive={true}
                  elevation={1}
                  className={`recipe-list-item`}
                  recipe={recipesToShow[index]}
                  style={style}
                  key={recipesToShow[index]?.id ?? '-1'}
                />}
              />
            }}
          </WindowScroller>}
      </div>
    </div>
    {mobile && online && hasWriteAccess && <Link
      to='/recipes/new'
      className={classNames('fab-add', Classes.BUTTON, Classes.INTENT_SUCCESS)}>
      <Icon
        icon='plus'
        iconSize={55}
      />
    </Link>}
  </>
}
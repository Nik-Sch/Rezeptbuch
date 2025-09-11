import React, { useState, useEffect, useRef, useCallback } from 'react';
import recipesHandler, { IRecipe, ICategory, getUserInfo, IUser } from '../../util/Network';
import { Classes, Icon, InputGroup, Button, H3, Dialog, Divider, Tooltip } from '@blueprintjs/core';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { ISort, SortSelect } from '../helpers/SortSelect';
import { useMobile, useSessionState, useOnline } from '../helpers/CustomHooks';
import RecipeListItem from './RecipeListItem';
import SideMenu, { INavigationLink, Counts } from '../SideMenu';
import MobileHeader from '../MobileHeader';

import './RecipeList.scss';
import classNames from 'classnames';
import { Link } from 'react-router-dom';
import { IDarkThemeProps } from '../../App';
import AskForNotifications from '../AskForNotifications';
import { isNotificationAvailable, registerSW } from '../../serviceWorkerRegistration';
import {
  sessionStorageFilteredCategories,
  sessionStorageSearchString,
  sessionStorageSearchInIngredients,
  sessionStorageSortingOrder,
  sessionStorageFilteredUsers,
  sessionStorageScrollPosition,
} from '../../util/StorageKeys';
import { AppToasterBottom } from '../../util/toaster';
import { WindowScroller, List } from 'react-virtualized';
import i18n from '../../util/i18n';
import { CategoryMultiSelect } from '../helpers/CategoryMultiSelect';
import { UserMultiSelect } from '../helpers/UserMultiSelect';
// import { useRegisterSW } from 'virtual:pwa-register/react'

const sortOptions: ISort[] = [
  { key: 'date', textKey: 'sortDate' },
  { key: 'title', textKey: 'sortTitle' },
];

function onServiceWorkerSuccess() {
  // console.log('[sw] success');
  AppToasterBottom.show({
    message: i18n.t('offline'),
    intent: 'none',
    timeout: 7500,
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
      text: i18n.t('updateNow'),
    },
    timeout: 10000,
  });
}

export default function RecipeList(props: IDarkThemeProps) {
  document.title = 'Unsere Rezepte';
  const [t] = useTranslation();
  const online = useOnline();

  registerSW({
    onUpdate: onServiceWorkerUpdate,
    onSuccess: onServiceWorkerSuccess,
  });

  // const {
  //   offlineReady: [offlineReady, setOfflineReady],
  //   needRefresh: [needRefresh, setNeedRefresh],
  //   updateServiceWorker,
  // } = useRegisterSW({
  //   onRegistered(r) {
  //     // eslint-disable-next-line prefer-template
  //     console.log('SW Registered: ' + JSON.stringify(r))
  //   },
  //   onRegisterError(error) {
  //     console.log('SW registration error', error)
  //   },
  // });
  // console.log(`[sw] ${offlineReady}, ${needRefresh}`);
  // if (offlineReady) {
  //   AppToasterBottom.show({
  //     message: i18n.t('offline'),
  //     intent: 'none',
  //     timeout: 7500,
  //     onDismiss: () => setOfflineReady(false)
  //   });
  // }
  // if (needRefresh) {
  //   AppToasterBottom.show({
  //     message: i18n.t('newVersion'),
  //     intent: 'primary',
  //     icon: 'updated',
  //     action: {
  //       onClick: () => updateServiceWorker(true),
  //       text: i18n.t('updateNow')
  //     },
  //     timeout: 10000
  //   });
  // }

  const [recipes, setRecipes] = useState<IRecipe[]>([]);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Counts>([]);
  const [users, setUsers] = useState<IUser[]>([]);
  const [filteredCategories, setFilteredCategories] = useSessionState<ICategory[]>(
    [],
    sessionStorageFilteredCategories,
  );
  const [filteredUsers, setFilteredUsers] = useSessionState<IUser[]>(
    [],
    sessionStorageFilteredUsers,
  );
  const [userCounts, setUserCounts] = useState<Counts>([]);
  const [searchString, setSearchString] = useSessionState<string>('', sessionStorageSearchString);
  const [searchInIngredients, setSearchInIngredients] = useSessionState<boolean>(
    true,
    sessionStorageSearchInIngredients,
  );
  const defaultSortOrder: { sortValue: ISort; desc: boolean } = {
    sortValue: { key: 'date', textKey: 'sortDate' },
    desc: false,
  };
  const [sortingOrder, setSortingOrder] = useSessionState<{ sortValue: ISort; desc: boolean }>(
    defaultSortOrder,
    sessionStorageSortingOrder,
  );
  const [recipesToShow, setRecipesToShow] = useState<IRecipe[]>([]);
  const [filterIsOpen, setFilterIsOpen] = useState(false);
  const timeout = useRef<number>();
  const mobile = useMobile();
  const status = getUserInfo();
  const hasWriteAccess = status?.write ?? false;

  // recipe change
  useEffect(() => {
    const handleRecipesChange = (recipes: IRecipe[], categories: ICategory[], users: IUser[]) => {
      setRecipes(recipes);
      setCategories(categories);
      setUsers(users);
    };
    return recipesHandler.subscribe(handleRecipesChange);
  }, []);

  const filterRecipeByCategory = useCallback(
    (recipe?: IRecipe) => {
      if (filteredCategories.length === 0 || !recipe) {
        return true;
      }
      return filteredCategories.findIndex((category) => category.id === recipe.category.id) !== -1;
    },
    [filteredCategories],
  );

  const filterRecipeByUser = useCallback(
    (recipe?: IRecipe) => {
      if (filteredUsers.length === 0 || !recipe) {
        return true;
      }
      return filteredUsers.findIndex((user) => user.id === recipe.user.id) !== -1;
    },
    [filteredUsers],
  );

  const filterRecipeBySearch = useCallback(
    (recipe?: IRecipe) => {
      if (searchString === '' || !recipe) {
        return true;
      }
      const searchStringLower = searchString.toLocaleLowerCase();
      return (
        recipe.title.toLocaleLowerCase().includes(searchStringLower) ||
        (searchInIngredients &&
          recipe.ingredients
            .map((v) => v.toLocaleLowerCase().includes(searchStringLower))
            .reduce((p, c) => p || c, false))
      );
    },
    [searchInIngredients, searchString],
  );

  // categoryCounts
  useEffect(() => {
    const counts: Counts = {};
    for (const category of categories) {
      counts[category.id] = recipes
        .filter(filterRecipeBySearch)
        .filter(filterRecipeByUser)
        .filter((r) => r?.category.id === category.id).length;
    }
    setCategoryCounts(counts);
  }, [categories, filterRecipeBySearch, filterRecipeByUser, recipes]);

  // userCounts
  useEffect(() => {
    const counts: Counts = {};
    for (const user of users) {
      counts[user.id] = recipes
        .filter(filterRecipeBySearch)
        .filter(filterRecipeByCategory)
        .filter((r) => r?.user.id === user.id).length;
    }
    setUserCounts(counts);
  }, [filterRecipeByCategory, filterRecipeBySearch, recipes, users]);

  // #27 (scroll to top on filter)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [filterRecipeByCategory, filterRecipeBySearch, filterRecipeByUser]);

  const [scrollPosition, setScrollPosition] = useSessionState(0, sessionStorageScrollPosition);
  useEffect(() => {
    const handleScroll = () => {
      const position = window.scrollY;
      setScrollPosition(position);
    };
    window.scrollTo(0, scrollPosition);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [recipesToShow]);

  // search and sort
  useEffect(() => {
    const sortRecipes = (r1?: IRecipe, r2?: IRecipe): number => {
      if (!r1 || !r2) {
        return 0;
      }
      let result = 0;
      switch (sortingOrder.sortValue.key) {
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
    };

    const filterRecipe = (recipe?: IRecipe) => {
      return (
        filterRecipeBySearch(recipe) && filterRecipeByCategory(recipe) && filterRecipeByUser(recipe)
      );
    };
    window.clearTimeout(timeout.current);
    timeout.current = window.setTimeout(
      () => {
        if (recipes) {
          setRecipesToShow(recipes.sort(sortRecipes).filter(filterRecipe));
        }
      },
      mobile ? 100 : 0,
    );
  }, [
    filterRecipeByCategory,
    filterRecipeBySearch,
    filterRecipeByUser,
    mobile,
    recipes,
    sortingOrder,
  ]);

  const handleSearchChange = (value: string) => {
    setSearchString(value);
  };

  const onSortSelected = (v: ISort, d: boolean) => {
    setSortingOrder({ sortValue: v, desc: d });
  };

  const searchClearButton =
    searchString.length === 0 ? undefined : (
      <Button icon="cross" variant="minimal" onClick={() => handleSearchChange('')} />
    );

  const navigationLinks: INavigationLink[] = [
    { to: '/', icon: 'git-repo', text: t('recipes'), active: true },
    { to: '/shoppingList', icon: 'shopping-cart', text: t('shoppingList') },
  ];

  const searchInIngredientsButton = (
    <Tooltip
      content={
        searchInIngredients ? t('tooltipSearchInIngredients') : t('tooltipNotSearchInIngredients')
      }
      position="bottom"
      popoverClassName={Classes.POPOVER_CONTENT_SIZING}
      renderTarget={({ ref, ...tooltipProps }) => (
        <Button
          {...tooltipProps}
          icon="properties"
          ref={ref}
          intent={searchInIngredients ? 'primary' : 'none'}
          variant="minimal"
          onClick={() => setSearchInIngredients(!searchInIngredients)}
        />
      )}
    />
  );

  const sortAndFilter = (
    <>
      <UserMultiSelect
        placeholder={t('filterForUsers')}
        noResultText={t('noUsersFound')}
        onUserSelected={setFilteredUsers}
        userCounts={userCounts}
        selectedUsers={filteredUsers}
        allUsers={users}
        className="filter-users menu-item"
      />
      <CategoryMultiSelect
        placeholder={t('filterForCategories')}
        noResultText={t('noCategoryFound')}
        onCategorySelected={setFilteredCategories}
        selectedCategories={filteredCategories}
        categoryCounts={categoryCounts}
        allCategories={categories}
        className="filter-categories menu-item"
      />

      <Divider className="menu-item" />
      <SortSelect
        className="menu-item sort-recipes"
        fill={true}
        items={sortOptions}
        onSelected={onSortSelected}
        selectedDesc={sortingOrder.desc}
        selectedValue={sortingOrder.sortValue}
      />
    </>
  );

  const sideMenu = (
    <SideMenu darkModeProps={props} currentNavigation="recipes">
      <InputGroup
        leftIcon="search"
        rightElement={searchInIngredientsButton}
        placeholder={t('searchRecipe')}
        value={searchString}
        className="search-recipe menu-item"
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearchChange(e.target.value)}
      />

      {sortAndFilter}

      <Tooltip
        disabled={online && hasWriteAccess}
        content={hasWriteAccess ? t('tooltipOffline') : t('tooltipNoWrite')}
        position="bottom"
        renderTarget={({ ref, ...tooltipProps }) => (
          <Link
            {...tooltipProps}
            ref={ref}
            to={online && hasWriteAccess ? '/recipes/new' : ''}
            className={classNames(
              'add-recipe',
              Classes.BUTTON,
              Classes.INTENT_PRIMARY,
              online && hasWriteAccess ? '' : Classes.DISABLED,
              Classes.FILL,
              Classes.ALIGN_LEFT,
            )}
            role="button"
          >
            <Icon icon="add" />
            <span className={Classes.BUTTON_TEXT}>{t('newRecipe')}</span>
          </Link>
        )}
      />
    </SideMenu>
  );

  const filterActive = filteredCategories.length > 0 || filteredUsers.length > 0;

  const mobileHeader = (
    <MobileHeader darkThemeProps={props} navigationLinks={navigationLinks}>
      <>
        <Icon
          className={classNames(Classes.BUTTON, Classes.MINIMAL)}
          icon={filterActive ? 'filter-keep' : 'filter'}
          intent={filterActive ? 'primary' : 'none'}
          size={24}
          onClick={() => {
            setFilterIsOpen(!filterIsOpen);
            if (!filterIsOpen) {
              // going to open filter
              window.scrollTo(0, 0);
            }
          }}
        />
        <InputGroup
          leftIcon="search"
          size="large"
          rightElement={searchClearButton}
          placeholder={t('searchRecipe')}
          value={searchString}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearchChange(e.target.value)}
          className="recipe-search"
        />
      </>
    </MobileHeader>
  );

  const mobileFilterDialog = (
    <Dialog isOpen={filterIsOpen} onClose={() => setFilterIsOpen(false)} title={t('filter')}>
      <div className={classNames(Classes.DIALOG_BODY, 'mobile')}>
        <div className="sort-filter">{sortAndFilter}</div>
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button
            text={t('ok')}
            intent="success"
            size="large"
            onClick={() => setFilterIsOpen(false)}
          />
        </div>
      </div>
    </Dialog>
  );

  if (typeof sortingOrder.sortValue === 'undefined') {
    setSortingOrder(defaultSortOrder);
    return <></>;
  }

  return (
    <>
      {mobile && mobileHeader}
      {mobile && mobileFilterDialog}
      <div className="body">
        {!mobile && sideMenu}
        <div className="main-content">
          {isNotificationAvailable() && <AskForNotifications />}
          {recipes.length === 0 && recipesToShow.length === 0 && (
            <H3 className="error">{t('noRecipes')}</H3>
          )}
          {recipes.length > 0 && recipesToShow.length === 0 && (
            <H3 className="error">{t('noRecipesMatching')}</H3>
          )}
          <WindowScroller>
            {({ height, isScrolling, onChildScroll, scrollTop, width }) => {
              const listWidth = mobile ? width : Math.min(width, 1200) - 280; // compensate for sidebar in desktop
              return (
                <List
                  autoHeight={true}
                  height={height}
                  isScrolling={isScrolling}
                  onScroll={onChildScroll}
                  rowCount={recipesToShow.length}
                  rowHeight={(mobile ? 175 : 150) + 20}
                  scrollTop={scrollTop}
                  width={listWidth}
                  rowRenderer={({ index, style }) => (
                    <RecipeListItem
                      recipe={recipesToShow[index]}
                      style={style}
                      key={recipesToShow[index].id}
                    />
                  )}
                />
              );
            }}
          </WindowScroller>
        </div>
      </div>
      {mobile && online && hasWriteAccess && (
        <Link
          to="/recipes/new"
          className={classNames('fab-add', Classes.BUTTON, Classes.INTENT_SUCCESS)}
        >
          <Icon icon="plus" size={55} />
        </Link>
      )}
    </>
  );
}

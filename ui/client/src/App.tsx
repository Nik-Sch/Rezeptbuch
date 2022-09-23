import { lazy, Suspense, useEffect } from 'react';
import './App.scss';
import { Route, BrowserRouter as Router, Routes, Navigate, useLocation } from 'react-router-dom';
import { Classes, Card, H1, H3 } from '@blueprintjs/core';
import recipesHandler, { getUserInfo, ICategory, IRecipe, IUser } from './util/Network';
import { usePersistentState, useMobile } from './components/helpers/CustomHooks';
import { localStorageDarkTheme } from './util/StorageKeys';
import MobileHeader from './components/MobileHeader';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Helmet } from 'react-helmet';
import { AppToasterTop } from './util/toaster';
import SideMenu, { INavigationLink } from './components/SideMenu';


const RecipeList = lazy(() => import('./components/recipeList/RecipeList'));
const Recipe = lazy(() => import('./components/recipe/Recipe'));
const UniqueRecipe = lazy(() => import('./components/recipe/UniqueRecipe'));
const ShoppingList = lazy(() => import('./components/ShoppingList'));
const LoginPage = lazy(() => import('./components/LoginPage'));

function changeThemeClass(darkTheme: boolean) {
  if (darkTheme) {
    document.body.classList.add(Classes.DARK);
  } else {
    document.body.classList.remove(Classes.DARK);
  }
}

export interface IDarkThemeProps {
  darkTheme: boolean;
  onDarkThemeChanged: (theme: boolean) => void;
}

function NotFound(props: IDarkThemeProps) {
  const { t } = useTranslation();
  const mobile = useMobile();
  const navigationLinks: INavigationLink[] = [
    { to: '/', icon: 'git-repo', text: t('recipes'), active: true },
    { to: '/shoppingList', icon: 'shopping-cart', text: t('shoppingList') }
  ];

  return <>
    {mobile && <MobileHeader
      darkThemeProps={props}
      navigationLinks={navigationLinks}
    />}
    <div className='body'>
      {mobile || <SideMenu
        darkModeProps={props}
        currentNavigation='recipes'
      />}
      <div className='main-content'>
        <H1>{t('404Header')}</H1>
        <H3>{t('404Text')}</H3>
      </div>
    </div>
  </>;
}

function Fallback(props: IDarkThemeProps) {
  const mobile = useMobile();
  const { t } = useTranslation();
  const navigationLinks: INavigationLink[] = [
    { to: '/', icon: 'git-repo', text: t('recipes'), active: true },
    { to: '/shoppingList', icon: 'shopping-cart', text: t('shoppingList') }
  ];

  return <>
    {mobile && <MobileHeader
      darkThemeProps={props}
      navigationLinks={navigationLinks}
    />}
    <div className='body'>
      {mobile || <SideMenu
        darkModeProps={props}
        currentNavigation='recipes'
      />}
      <div className='main-content'>
        <H3>Loading...</H3>
      </div>
    </div>
  </>;
}

function App() {
  const [t] = useTranslation();

  const [darkTheme, setDarkTheme] = usePersistentState(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches, localStorageDarkTheme);
  const handleThemeChange = (theme: boolean) => {
    changeThemeClass(theme);
    setDarkTheme(theme);
  }
  useEffect(() => {
    changeThemeClass(darkTheme);
  }, [darkTheme]);

  const [authenticated, setAuthenticated] = useState(typeof getUserInfo() !== 'undefined');
  useEffect(() => {
    const handleRecipesChange = (_recipes: IRecipe[], _categories: ICategory[], _users: IUser[], loggedIn: boolean) => {
      if (authenticated && !loggedIn) {
        AppToasterTop.show({ message: t('loggedOut'), intent: 'danger' });
      }
      setAuthenticated(loggedIn);
    }
    return recipesHandler.subscribe(handleRecipesChange);

  }, [authenticated, t]);
  const mobile = useMobile();

  const routes = [
    { path: '/', Component: RecipeList, priv: true },
    { path: '/recipes/:id', Component: Recipe, priv: true },
    { path: '/shoppingList', Component: ShoppingList, priv: true },
    { path: '/shoppingLists/:listKey/:listName', Component: ShoppingList, priv: false },
    { path: '/uniqueRecipes/:id', Component: UniqueRecipe, priv: false },
    { path: '*', Component: NotFound, priv: false },
  ]
  return (
    <div className={mobile ? 'mobile' : ''}>
      <Helmet>
        <meta name="color-scheme" content={darkTheme ? 'dark' : 'light'} />
      </Helmet>
      <Router>
        <Suspense fallback={<Fallback darkTheme={darkTheme} onDarkThemeChanged={handleThemeChange} />}>
          <Routes>
            <Route
              path='/login'
              element={
                <div className='page'>
                  <LoginPage
                    darkTheme={darkTheme}
                    onDarkThemeChanged={handleThemeChange}
                    setAuthenticated={(success) => setAuthenticated(success)}
                  />
                </div>
              }
            />
            {routes.map(({ path, Component, priv }) => (
              <Route
                key={path || 'undefined'}
                path={path}
                element={priv ?
                  <RequireAuth authenticated={authenticated}>
                    <div className='page'>
                      <Component
                        darkTheme={darkTheme}
                        onDarkThemeChanged={handleThemeChange}
                      />
                    </div>
                  </RequireAuth>
                  : <div className='page'>
                    <Component
                      darkTheme={darkTheme}
                      onDarkThemeChanged={handleThemeChange}
                    />
                  </div>} />
            ))}
          </Routes>
        </Suspense>
      </Router>
    </div>
  );
}

function RequireAuth({ authenticated, children }: { authenticated: boolean, children: JSX.Element }) {
  let location = useLocation();

  if (!authenticated) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return <Navigate
      to="/login"
      state={{ from: location }}
      replace={true}
    />;
  }

  return children;
}

export default App;

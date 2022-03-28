import { useEffect } from 'react';
import './App.scss';
import RecipeList from './components/recipeList/RecipeList';
import { Recipe } from './components/recipe/Recipe';
import { Route, BrowserRouter as Router, Routes, Navigate } from 'react-router-dom';
import { Classes, Card, H1, H3 } from '@blueprintjs/core';
import { fetchUserInfo, getUserInfo } from './util/Network';
import { LoginPage } from './components/LoginPage';
import { usePersistentState, useMobile } from './components/helpers/CustomHooks';
import { localStorageDarkTheme } from './util/StorageKeys';
import { ShoppingList } from './components/ShoppingList';
import Header from './components/Header';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { UniqueRecipe } from './components/recipe/UniqueRecipe';
import { Helmet } from 'react-helmet';

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

  return <>
    <Header
      darkThemeProps={props}
      className='login-header'
    />
    <div className='card-wrapper'>
      <Card
        className='login'
        elevation={1}
      >
        <H1>{t('404Header')}</H1>
        <H3>{t('404Text')}</H3>
      </Card>
    </div>
  </>
}

function App() {

  const [darkTheme, setDarkTheme] = usePersistentState(false, localStorageDarkTheme);
  const handleThemeChange = (theme: boolean) => {
    changeThemeClass(theme);
    setDarkTheme(theme);
  }
  useEffect(() => {
    changeThemeClass(darkTheme);
  }, [darkTheme]);

  const [authenticated, setAuthenticated] = useState(typeof getUserInfo() !== 'undefined');
  useEffect(() => {
    (async () => {
      const result = await fetchUserInfo(); // just make sure to always check the status
      setAuthenticated(typeof result !== 'undefined');
    })();
  }, []);
  const mobile = useMobile();

  const routes = [
    { path: '/', Component: RecipeList, priv: true },
    { path: '/recipes/:id', Component: Recipe, priv: true },
    { path: '/shoppingList', Component: ShoppingList, priv: true },
    { path: '/uniqueRecipes/:id', Component: UniqueRecipe, priv: false },
    { path: '*', Component: NotFound, priv: false },
  ]

  return (
    <div className={mobile ? 'mobile' : ''}>
    <Helmet>
      <meta name="color-scheme" content={darkTheme ? 'dark' : 'light'} />
    </Helmet>
      <Router>
        <Routes>
          <Route
            path='/login'
            element={
              <LoginPage
                darkTheme={darkTheme}
                onDarkThemeChanged={handleThemeChange}
                setAuthenticated={(success) => setAuthenticated(success)}
              />
            }
          />
          {routes.map(({ path, Component, priv }) => (
            <Route
              key={path || 'undefined'}
              path={path}
              element={priv && !authenticated
                ? <Navigate to='/login' />
                : <div className='page'>
                  <Component
                    darkTheme={darkTheme}
                    onDarkThemeChanged={handleThemeChange}
                  />
                </div>} />
          ))}
        </Routes>
      </Router>
    </div>
  );
}

export default App;

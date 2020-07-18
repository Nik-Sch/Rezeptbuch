import React, { useEffect } from 'react';
import './App.scss';
import RecipeList from './components/recipeList/RecipeList';
import { Recipe } from './components/recipe/Recipe';
import { Route, BrowserRouter as Router, RouteProps, Redirect, Switch } from 'react-router-dom';
import { Classes, Card, H1, H3 } from '@blueprintjs/core';
import { fetchUserInfo, getUserInfo } from './util/Recipes';
import { LoginPage } from './components/LoginPage';
import { usePersistentState, useMobile } from './components/helpers/CustomHooks';
import { localStorageDarkTheme } from './util/StorageKeys';
import { UniqueRecipe } from './components/recipe/UniqueRecipe';
import { ShoppingList } from './components/ShoppingList';
import Header from './components/Header';
import { useTranslation } from 'react-i18next';

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

function PrivateRoute({ children, ...rest }: RouteProps) {
  return (
    <Route
      {...rest}
      render={({ location }) =>
        typeof getUserInfo() !== 'undefined' ? (
          children
        ) : (
            <Redirect
              to={{
                pathname: "/login",
                state: { from: location }
              }}
            />
          )
      }
    />
  );
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

  useEffect(() => {
    fetchUserInfo(); // just make sure to always check the status
  }, []);
  const mobile = useMobile();

  const routes = [
    { path: '/', Component: RecipeList, R: PrivateRoute },
    { path: '/recipes/:id', Component: Recipe, R: PrivateRoute },
    { path: '/shoppingList', Component: ShoppingList, R: PrivateRoute },
    { path: '/uniqueRecipes/:id', Component: UniqueRecipe, R: Route },
    { path: '/login', Component: LoginPage, R: Route },
    { path: undefined, Component: NotFound, R: Route },
  ]

  return (
    <div className={mobile ? 'mobile' : ''}>
      <Router>
        <Switch>
          {routes.map(({ path, Component, R }) => (
            <R key={path} exact path={path}>
              <div className='page'>
                <Component
                  darkTheme={darkTheme}
                  onDarkThemeChanged={handleThemeChange}
                />
              </div>
            </R>
          ))}
          {/* <Redirect to='404' /> */}
        </Switch>
      </Router>
    </div>
  );
}

export default App;

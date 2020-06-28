import React, { useEffect } from 'react';
import './App.scss';
import RecipeList from './components/recipeList/RecipeList';
import { Recipe } from './components/recipe/Recipe';
import { Route, BrowserRouter as Router, RouteProps, Redirect } from 'react-router-dom';
import { Classes } from '@blueprintjs/core';
import { fetchUserInfo, getUserInfo } from './util/Recipes';
import { LoginPage } from './components/LoginPage';
import { usePersistentState, useMobile } from './components/helpers/CustomHooks';
import { localStorageDarkTheme } from './util/StorageKeys';
import { UniqueRecipe } from './components/recipe/UniqueRecipe';

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
    { path: '/', Component: RecipeList },
    { path: '/recipes/:id', Component: Recipe },
  ]

  return (
    <div className={mobile ? 'mobile' : ''}>
      <Router>
        {routes.map(({ path, Component }) => (
          <PrivateRoute key={path} exact path={path}>
            <div className='page'>
              <Component
                darkTheme={darkTheme}
                onDarkThemeChanged={handleThemeChange}
              />
            </div>
          </PrivateRoute>
        ))}
        <Route exact path='/uniqueRecipes/:id'>
          <UniqueRecipe
            darkTheme={darkTheme}
            onDarkThemeChanged={handleThemeChange}
          />
        </Route>
        <Route exact path='/login'>
          <LoginPage
            darkTheme={darkTheme}
            onDarkThemeChanged={handleThemeChange}
          />
        </Route>
      </Router>
    </div>
  );
}

export default App;

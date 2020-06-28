import React, { useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { IDarkThemeProps } from "../App";
import Header from "./Header";
import { useMobile } from "./helpers/CustomHooks";
import { Classes, Card, H1, FormGroup, InputGroup, Tooltip, Button, Intent, Callout, H4, Collapse } from "@blueprintjs/core";
import { LanguageSelect } from "./helpers/LanguageSelect";
import { DarkModeSwitch } from "./helpers/DarkModeSwitch";
import { useTranslation } from "react-i18next";

import './LoginPage.scss';
import { loginToRecipes, createAccount } from "../util/Recipes";
import classNames from "classnames";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import { AppToasterTop } from "../util/toaster";
import { NavigationIcon } from "./recipeList/RecipeList";

export function LoginPage(props: IDarkThemeProps) {
  const history = useHistory();
  const location = useLocation();
  const mobile = useMobile();
  const [t] = useTranslation();

  const [drawerIsOpen, setDrawerIsOpen] = useState(false);
  const [login, setLogin] = useState(true); // 'login' | 'register'
  const [details, setDetails] = useState({ username: '', password: '', password2: '' });
  const [visited, setVisited] = useState({ username: false, password: false, password2: false });
  const usernameWarning = visited.username && details.username.trim() === '';
  const passwordWarning = visited.password && details.password.trim() === '';
  const password2Warning = visited.password2 && (details.password2.trim() === '' || details.password !== details.password2);
  const password2WarningText = visited.password2 && details.password2.trim() === ''
    ? t('required')
    : t('noMatch');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [wrongCredentials, setWrongCredentials] = useState(false);


  const previousLocation: any = location.state || { from: { pathname: "/" } };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (login) {
      if (details.username.trim() === '' || details.password.trim() === '') {
        setVisited({ username: true, password: true, password2: true });
        return;
      }
      setIsSubmitting(true);
      const success = await loginToRecipes(details.username, details.password);
      if (success) {
        history.replace(previousLocation.from || '/');
      } else {
        setWrongCredentials(true);
      }
    } else {
      if (details.username.trim() === '' || details.password.trim() === '' || details.password !== details.password2) {
        setVisited({ username: true, password: true, password2: true });
        return;
      }
      setIsSubmitting(true);
      const created = await createAccount(details.username, details.password);
      if (created) {
        AppToasterTop.show({ message: t('accountCreated'), intent: 'success' });
        const success = await loginToRecipes(details.username, details.password);
        if (success) {
          history.replace(previousLocation.from || '/');
        } else {
          AppToasterTop.show({ message: t('accountError'), intent: 'danger' })
        }
      } else {
        AppToasterTop.show({ message: t('accountErrorExists'), intent: 'warning' })
      }
    }
    setIsSubmitting(false);
  }

  const lockButton = (
    <Tooltip content={`${showPassword ? "Hide" : "Show"} Password`} disabled={isSubmitting}>
      <Button
        icon={showPassword ? "unlock" : "lock"}
        intent={Intent.WARNING}
        minimal={true}
        disabled={isSubmitting}
        onClick={() => setShowPassword(!showPassword)}
        tabIndex={-1}
      />
    </Tooltip>
  );
  const lockButton2 = (
    <Tooltip content={`${showPassword2 ? "Hide" : "Show"} Password`} disabled={isSubmitting}>
      <Button
        icon={showPassword2 ? "unlock" : "lock"}
        intent={Intent.WARNING}
        minimal={true}
        disabled={isSubmitting}
        onClick={() => setShowPassword2(!showPassword2)}
        tabIndex={-1}
      />
    </Tooltip>
  );

  return <>
    <Header
      darkThemeProps={props}
      logo={true}
      navigationIcon={<NavigationIcon
        isOpen={drawerIsOpen}
        onClick={() => setDrawerIsOpen(!drawerIsOpen)}
      />}
      className='login-header'
    />
    {mobile && <Collapse
      isOpen={drawerIsOpen}
    >
      <div className='recipe-menu'>
        <div className='settings' style={{marginBottom: '0'}}>
          <DarkModeSwitch {...props} />
          <div className='spacer' />
          <LanguageSelect />
        </div>
      </div>
    </Collapse>}
    <div className='card-wrapper'>
      {wrongCredentials && <Callout intent='danger' className='error-callout'>
        <H4 className='error-callout-content'>
          {t('wrongCredentials')}
          <Button
            icon='cross'
            minimal={true}
            large={true}
            intent='danger'
            onClick={() => setWrongCredentials(false)}
          />
        </H4>
      </Callout>}
      <Card
        className='login'
        elevation={3}
      >
        <H1>{login ? t('loginTitle') : t('createAccount')}</H1>
        <form onSubmit={handleSubmit} >
          <FormGroup
            className='form-group'
            label={t('username')}
            labelFor='username'
            helperText={usernameWarning && t('required')}
            intent={usernameWarning ? 'danger' : 'none'}
            disabled={isSubmitting}
          >
            <InputGroup
              id='username'
              large={mobile}
              placeholder={t('username')}
              value={details.username}
              intent={usernameWarning ? 'danger' : 'none'}
              disabled={isSubmitting}
              onBlur={() => setVisited(visited => ({ ...visited, username: true }))}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                const value = event.currentTarget.value;
                setDetails(details => ({ ...details, username: value }));
              }}
            />
          </FormGroup>
          <FormGroup
            className='form-group'
            label={t('password')}
            labelFor='password'
            helperText={passwordWarning && t('required')}
            intent={passwordWarning ? 'danger' : 'none'}
            disabled={isSubmitting}
          >
            <InputGroup
              id='password'
              large={mobile}
              placeholder={t('password')}
              value={details.password}
              intent={passwordWarning ? 'danger' : 'none'}
              disabled={isSubmitting}
              rightElement={lockButton}
              type={showPassword ? 'text' : 'password'}
              onBlur={() => setVisited(visited => ({ ...visited, password: true }))}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                const value = event.currentTarget.value;
                setDetails(details => ({ ...details, password: value }))
              }}
            />
          </FormGroup>

          <TransitionGroup>
            {!login && <CSSTransition
              timeout={300}
              classNames='fade'
            >
              <FormGroup
                className='form-group'
                label={t('passwordRepeat')}
                labelFor='password2'
                helperText={password2Warning && password2WarningText}
                intent={password2Warning ? 'danger' : 'none'}
                disabled={isSubmitting}
              >
                <InputGroup
                  id='password2'
                  large={mobile}
                  placeholder={t('password')}
                  value={details.password2}
                  intent={password2Warning ? 'danger' : 'none'}
                  disabled={isSubmitting}
                  rightElement={lockButton2}
                  type={showPassword2 ? 'text' : 'password'}
                  onBlur={() => setVisited(visited => ({ ...visited, password2: true }))}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    const value = event.currentTarget.value;
                    setDetails(details => ({ ...details, password2: value }))
                  }}
                />
              </FormGroup>
            </CSSTransition>}
          </TransitionGroup>
          <Button
            intent='primary'
            className='login-button'
            type='submit'
            text={login ? t('login') : t('create')}
            large={mobile}
            disabled={isSubmitting}
          />
          {<div className='toggle-login'>
            <div className={Classes.TEXT_MUTED}>
              {login ? t('new') : ''}
            </div>
            <div
              className={classNames(Classes.ICON, Classes.INTENT_PRIMARY, 'toggle-button')}
              onClick={() => setLogin(l => !l)}
            >
              {login ? t('createAccount') : t('alreadyAccount')}
            </div>
          </div>}
        </form>
      </Card>
    </div>
  </>
}
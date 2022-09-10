import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { IDarkThemeProps } from "../App";
import Header from "./Header";
import { useMobile } from "./helpers/CustomHooks";
import { Classes, Card, H1, FormGroup, InputGroup, Button, Intent, Callout, H4 } from "@blueprintjs/core";
import { useTranslation } from "react-i18next";

import './LoginPage.scss';
import { loginToRecipes, createAccount, getUserInfo } from "../util/Network";
import classNames from "classnames";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import { AppToasterTop } from "../util/toaster";
import { Classes as Classes2, Tooltip2 } from "@blueprintjs/popover2";
import { useEffect } from "react";
import SideMenu from "./SideMenu";

export default function LoginPage(props: IDarkThemeProps & { setAuthenticated: (success: boolean) => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const mobile = useMobile();
  const [t] = useTranslation();

  const from = (location.state as any)?.from?.pathname || '/';

  useEffect(() => {
    if (typeof getUserInfo() !== 'undefined') {
      props.setAuthenticated(true);
      navigate(from, { replace: true });
    }
  });

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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (login) {
      if (details.username.trim() === '' || details.password.trim() === '') {
        setVisited({ username: true, password: true, password2: true });
        return;
      }
      setIsSubmitting(true);
      loginToRecipes(details.username, details.password).then(success => {
        if (success) {
          props.setAuthenticated(true);
          navigate(from, { replace: true });
        } else {
          setWrongCredentials(true);
        }
      });
    } else {
      if (details.username.trim() === '' || details.password.trim() === '' || details.password !== details.password2) {
        setVisited({ username: true, password: true, password2: true });
        return;
      }
      setIsSubmitting(true);
      createAccount(details.username, details.password).then(async created => {
        if (created === true) {
          AppToasterTop.show({ message: t('accountCreated'), intent: 'success' });
          const success = await loginToRecipes(details.username, details.password);
          if (success) {
            props.setAuthenticated(true);
            navigate(from, { replace: true });
          } else {
            AppToasterTop.show({ message: t('accountError'), intent: 'danger' })
          }
        } else if (typeof created === 'string') {
          AppToasterTop.show({ message: t('accountErrorServer', { message: created }), intent: 'warning' })
        } else {
          AppToasterTop.show({ message: t('accountError'), intent: 'warning' })
        }
      });
    }
    setIsSubmitting(false);
  }

  const lockButton = (
    <Tooltip2
      content={`${showPassword ? "Hide" : "Show"} Password`}
      disabled={isSubmitting}
      position='right'
      popoverClassName={Classes2.POPOVER2_CONTENT_SIZING}
      renderTarget={({ isOpen, ref, ...tooltipProps }) => (
        <Button
          {...tooltipProps}
          elementRef={ref as any}
          icon={showPassword ? "unlock" : "lock"}
          intent={Intent.WARNING}
          minimal={true}
          disabled={isSubmitting}
          onClick={() => setShowPassword(!showPassword)}
          tabIndex={-1}
        />)}
    />
  );
  const lockButton2 = (
    <Tooltip2
      content={`${showPassword2 ? "Hide" : "Show"} Password`}
      popoverClassName={Classes2.POPOVER2_CONTENT_SIZING}
      disabled={isSubmitting}
      position='right'
      renderTarget={({ isOpen, ref, ...tooltipProps }) => (
        <Button
          {...tooltipProps}
          elementRef={ref as any}
          icon={showPassword2 ? "unlock" : "lock"}
          intent={Intent.WARNING}
          minimal={true}
          disabled={isSubmitting}
          onClick={() => setShowPassword2(!showPassword2)}
          tabIndex={-1}
        />)}
    />

  );

  return <>
    <Header
      darkThemeProps={props}
      className='login-header'
    />
    <div className='body'>
      {!mobile && <SideMenu darkModeProps={props} currentNavigation='recipes' />}
      <div className='main-content'>
        <div
          className='login'
        >
          <H1>{login ? t('loginTitle') : t('createAccount')}</H1>
            {wrongCredentials && <Callout intent='danger' className='error-callout' icon={null}>
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
        </div>
      </div>
    </div>
  </>
}
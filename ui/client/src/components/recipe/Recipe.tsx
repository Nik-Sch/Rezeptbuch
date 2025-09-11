import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import recipesHandler, { IRecipe, ICategory, emptyRecipe, getUserInfo } from '../../util/Network';
import {
  H1,
  EditableText,
  Classes,
  Button,
  H3,
  H5,
  H4,
  ButtonGroup,
  Icon,
  TextArea,
  H2,
  InputGroup,
  Dialog,
  AnchorButton,
  Alert,
  Tooltip,
  Popover,
} from '@blueprintjs/core';

import { AppToasterTop } from '../../util/toaster';
import { useTranslation } from 'react-i18next';
import { CategorySuggest } from '../helpers/CategorySuggest';
import MobileHeader from '../MobileHeader';
import ImagePart from './ImagePart';
import './Recipe.scss';
import classNames from 'classnames';
import { IDarkThemeProps } from '../../App';
import { useMobile, useOnline } from '../helpers/CustomHooks';
import { CategorySelect } from '../helpers/CategorySelect';
import ShareButton from './ShareButton';
import { DesktopIngredients, showDot } from './Ingredients';
import DescriptionTextArea from './DescriptionTextArea';
import CommentSection from './CommentSection';
import SideMenu, { INavigationLink } from '../SideMenu';
import { addShoppingItems } from '../ShoppingList';
import ReactRouterPrompt from 'react-router-prompt';

function verifyRecipe(recipe: IRecipe): boolean {
  return recipe.title.trim() !== '' && recipe.category.id !== -1;
}

export default function Recipe(props: IDarkThemeProps) {
  let { id } = useParams();
  if (typeof id === 'undefined' || isNaN(parseInt(id))) {
    id = undefined;
  }
  const [t] = useTranslation();
  const navigate = useNavigate();

  const [state, setState] = useState({ editing: id === '-1', loaded: false, dirty: false });
  const [recipe, setRecipe] = useState<IRecipe>(emptyRecipe);
  const [imagesToBeDeleted, setImagesToBeDeleted] = useState<string[]>([]);
  const [ingredientsText, setIngredientsText] = useState<string>(''); // for mobile
  const [mobileCancelIsOpen, setMobileCancelIsOpen] = useState(false);
  const [mobileDeleteIsOpen, setMobileDeleteIsOpen] = useState(false);
  const [error, setError] = useState(false);
  const mobile = useMobile();
  const online = useOnline();
  const status = getUserInfo();
  const hasWriteAccess =
    typeof status !== 'undefined' && status.write && status.username === recipe.user.user;

  // unloading stuff
  useEffect(() => {
    if (state.dirty) {
      window.onbeforeunload = () => true;
    } else {
      window.onbeforeunload = null;
    }
  }, [state.dirty]);

  // load recipes
  useEffect(() => {
    window.scrollTo(0, 0);
    if (typeof id === 'undefined' || id === '-1') {
      setState({
        loaded: true,
        editing: true,
        dirty: false,
      });
      setRecipe(emptyRecipe);
      document.title = t('newRecipe');
    } else {
      const handleRecipesChange = (recipes: IRecipe[]) => {
        if (typeof id === 'undefined') {
          console.error('hey, this should not happen');
          setError(true);
          return;
        }
        const idInt = parseInt(id);
        const r = recipes.find((r) => r.id === idInt);
        if (typeof r === 'undefined') {
          console.debug('recipe not found, deleted? Dunno what to do.');
          setError(true);
          return;
        }

        document.title = r.title;
        setState({
          editing: false,
          loaded: true,
          dirty: false,
        });
        setRecipe(r);
        setIngredientsText(
          r.ingredients.reduce((previous, current, index) => {
            return index === 0 ? current : `${previous}\n${current}`;
          }, ''),
        );
        setError(false);
      };
      recipesHandler.subscribe(handleRecipesChange);
      return () => {
        recipesHandler.unsubscribe(handleRecipesChange);
      };
    }
  }, [id, t]);

  const saveRecipe = async () => {
    console.log('save')
    if (!verifyRecipe(recipe)) {
      AppToasterTop.show({ message: t('minimalRecipe'), intent: 'danger' });
      return;
    }
    if (!state.dirty) {
      AppToasterTop.show({ message: t('recipeNotModified'), intent: 'primary' });
      setState((state) => ({ ...state, editing: false }));
      return;
    }
    setState((state) => ({ ...state, dirty: false }));
    for (const img of imagesToBeDeleted) {
      if (img !== recipe.image && img.trim() !== '') {
        await recipesHandler.deleteImage(img);
      }
    }
    setImagesToBeDeleted([]);
    const newRecipe = JSON.parse(JSON.stringify(recipe)) as IRecipe;
    if (mobile) {
      newRecipe.ingredients = ingredientsText.split('\n').filter((v) => v.trim().length > 0);
      setRecipe(newRecipe);
    } else {
      setIngredientsText(
        recipe.ingredients.reduce(
          (previous, current, index) => (index === 0 ? current : `${previous}\n${current}`),
          '',
        ),
      );
    }
    if (typeof id === 'undefined' || recipe.id === -1) {
      const newId = await recipesHandler.addRecipe(newRecipe);
      if (newId) {
        navigate(`/recipes/${newId}`);
        AppToasterTop.show({ message: t('recipeCreated'), intent: 'success' });
      } else {
        AppToasterTop.show({ message: t('recipeCreatedError'), intent: 'success' });
      }
      return;
    }

    if ((await recipesHandler.updateRecipe(newRecipe)) === true) {
      AppToasterTop.show({ message: t('recipeSaved'), intent: 'success' });
      setState((state) => ({ ...state, editing: false, dirty: false }));
    } else {
      AppToasterTop.show({ message: t('recipeSaveError'), intent: 'warning' });
    }
  };

  const handleCancelClick = () => {
    if (!state.dirty) {
      if (typeof id === 'undefined' || recipe.id === -1) {
        navigate('/');
      } else {
        setState((state) => ({ ...state, editing: false }));
      }
    } else if (mobile) {
      setMobileCancelIsOpen(true);
    }
  };

  const handleDiscardClick = () => {
    if (mobile) {
      setMobileCancelIsOpen(false);
    }
    if (typeof id === 'undefined' || recipe.id === -1) {
      setState((state) => ({ ...state, dirty: false }));
      setTimeout(() => navigate('/'), 0);
    } else {
      setState((state) => ({ ...state, dirty: false }));
      const r = recipesHandler.getRecipeOnce(recipe.id);
      if (typeof r === 'undefined') {
        console.debug('recipe not found, deleted? Dunno what to do.');
        AppToasterTop.show({ message: 'Something unexpected happend.', intent: 'danger' });
        setTimeout(() => navigate('/'), 0);
        return;
      }
      document.title = r.title;
      setState({
        editing: false,
        loaded: true,
        dirty: false,
      });
      setRecipe(r);
      setIngredientsText(
        r.ingredients.reduce((previous, current, index) => {
          return index === 0 ? current : `${previous}\n${current}`;
        }, ''),
      );
    }
  };

  const handleDeleteClick = async () => {
    if (await recipesHandler.deleteRecipe(recipe)) {
      if (mobile) {
        setMobileDeleteIsOpen(false);
      }
      AppToasterTop.show({ message: t('recipeDeleted'), intent: 'success' });
      navigate('/');
    } else {
      AppToasterTop.show({ message: t('recipeNotDeleted'), intent: 'warning' });
    }
  };

  const handleSetEditable = () => setState((state) => ({ ...state, editing: true }));
  const handleSetTitle = (v: string) => {
    setRecipe((recipe) => ({ ...recipe, title: v }));
    setState((state) => ({ ...state, dirty: true }));
  };
  const handleSetDescription = (v: string | undefined) => {
    setRecipe((recipe) => ({ ...recipe, description: v ?? '' }));
    setState((state) => ({ ...state, dirty: true }));
  };
  const handleSetCategory = (category: ICategory) => {
    setRecipe((recipe) => ({ ...recipe, category }));
    setState((state) => ({ ...state, dirty: true }));
  };
  const handleSetImage = (image: string) => {
    setRecipe((recipe) => ({ ...recipe, image }));
    setState((state) => ({ ...state, dirty: true }));
    const deletable = imagesToBeDeleted.slice(0);
    deletable.push(recipe.image);
    setImagesToBeDeleted(deletable);
  };

  const navigationLinks: INavigationLink[] = [
    { to: '/', icon: 'git-repo', text: t('recipes'), active: true },
    { to: '/shoppingList', icon: 'shopping-cart', text: t('shoppingList') },
  ];

  const addIngredientsToShoppingList = () => {
    addShoppingItems(recipe.ingredients.filter(showDot));
    navigate('/shoppingList');
  };

  const prompt = (
    <ReactRouterPrompt when={state.dirty}>
      {({ isActive, onConfirm, onCancel }) => (
        <Alert
          isOpen={isActive}
          cancelButtonText={t('cancel')}
          canEscapeKeyCancel={true}
          onCancel={onCancel}
          confirmButtonText={t('discardChanges')}
          intent="danger"
          onConfirm={onConfirm}
        >
          <p>{t('confirmCancel')}</p>
        </Alert>
      )}
    </ReactRouterPrompt>
  );

  if (mobile) {
    return (
      <>
        {prompt}
        <MobileHeader darkThemeProps={props} navigationLinks={navigationLinks}>
          <Dialog
            className="mobile-cancel-dialog"
            isOpen={mobileCancelIsOpen}
            onClose={() => setMobileCancelIsOpen(false)}
            title={t('confirmCancelTitle')}
          >
            <div className={Classes.DIALOG_BODY}>
              <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                <Button
                  text={t('cancel')}
                  size="large"
                  className={'popover-left'}
                  onClick={() => setMobileCancelIsOpen(false)}
                />
                <Button
                  size="large"
                  text={t('discardChanges')}
                  intent="danger"
                  className={Classes.POPOVER_DISMISS}
                  onClick={handleDiscardClick}
                />
              </div>
            </div>
          </Dialog>
          <Dialog
            className="mobile-delete-dialog"
            isOpen={mobileDeleteIsOpen}
            onClose={() => setMobileDeleteIsOpen(false)}
            title={t('confirmDeleteTitle')}
          >
            <div className={Classes.DIALOG_BODY}>
              <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                <Button
                  text={t('cancel')}
                  size="large"
                  className={'popover-left'}
                  onClick={() => setMobileDeleteIsOpen(false)}
                />
                <Button
                  size="large"
                  text={t('deleteRecipe')}
                  intent="danger"
                  className={Classes.POPOVER_DISMISS}
                  onClick={() => void handleDeleteClick()}
                />
              </div>
            </div>
          </Dialog>
          {state.loaded && (
            <div className="edit-container">
              {state.editing ? (
                <>
                  <Button
                    text={t('cancel')}
                    intent="warning"
                    onClick={handleCancelClick}
                    variant="minimal"
                    size="large"
                  />
                  <Tooltip disabled={online} content={t('tooltipOffline')} position="bottom">
                    <Icon
                      className={classNames(
                        Classes.BUTTON,
                        Classes.MINIMAL,
                        online ? '' : Classes.DISABLED,
                      )}
                      icon="floppy-disk"
                      size={24}
                      intent="primary"
                      onClick={online ? () => void saveRecipe() : undefined}
                    />
                  </Tooltip>
                </>
              ) : (
                <>
                  <ShareButton recipe={recipe} />
                  <Tooltip
                    disabled={online && hasWriteAccess}
                    content={hasWriteAccess ? t('tooltipOffline') : t('tooltipNoWriteRecipe')}
                    position="bottom"
                  >
                    <>
                      <Icon
                        className={classNames(
                          Classes.BUTTON,
                          Classes.MINIMAL,
                          online && hasWriteAccess ? '' : Classes.DISABLED,
                        )}
                        icon="edit"
                        size={24}
                        intent="primary"
                        onClick={online && hasWriteAccess ? handleSetEditable : undefined}
                      />
                      <Icon
                        className={classNames(
                          Classes.BUTTON,
                          Classes.MINIMAL,
                          online && hasWriteAccess ? '' : Classes.DISABLED,
                        )}
                        icon="trash"
                        size={24}
                        onClick={
                          online && hasWriteAccess ? () => setMobileDeleteIsOpen(true) : undefined
                        }
                        intent="danger"
                      />
                    </>
                  </Tooltip>
                </>
              )}
            </div>
          )}
        </MobileHeader>
        <div className="recipe-container-mobile">
          <ImagePart
            recipe={recipe}
            setImage={handleSetImage}
            editable={state.editing}
            className="image"
          />
          <div className="text-wrapper">
            {error && <H3>{t('notFound')}</H3>}
            <H2 className={classNames(state.loaded ? '' : Classes.SKELETON, 'title')}>
              {state.editing ? (
                <InputGroup
                  value={recipe.title}
                  size="large"
                  placeholder={t('phTitle')}
                  onChange={(event) => handleSetTitle(event.target.value)}
                />
              ) : (
                <span>{recipe.title}</span>
              )}
            </H2>
            <H3>
              <CategorySelect
                canAddCategory={true}
                noResultText={t('noCategoryFound')}
                className={classNames(
                  'category-select',
                  Classes.TEXT_MUTED,
                  state.loaded ? '' : Classes.SKELETON,
                )}
                disabled={!state.editing}
                placeholder={t('phCategoryMobile')}
                category={recipe.category}
                onCategorySelected={handleSetCategory}
              />
            </H3>

            <div className="ingredients-title-wrapper">
              <H4 className={classNames(Classes.INTENT_PRIMARY, Classes.ICON, 'ingredients-title')}>
                {t('ingredients')}:
              </H4>
              {recipe.ingredients.length > 0 && !state.editing && (
                <Button
                  text={t('addToShopping')}
                  variant="minimal"
                  intent="success"
                  icon="add"
                  onClick={addIngredientsToShoppingList}
                />
              )}
            </div>
            {state.editing ? (
              <TextArea
                className={classNames('ingredients-edit', Classes.EDITABLE_TEXT_INPUT)}
                autoResize={true}
                value={ingredientsText}
                placeholder={t('phIngredients')}
                onChange={(event) => {
                  setIngredientsText(event.target.value);
                  setState((state) => ({ ...state, dirty: true }));
                }}
              />
            ) : state.loaded ? (
              recipe.ingredients.length > 0 ? (
                recipe.ingredients.map((line, index) => (
                  <div key={index} className="ingredients-line">
                    {showDot(line) && <Icon icon="dot" />}
                    <span className="ingredients-line-text">{line.trim()}</span>
                  </div>
                ))
              ) : (
                <div className={classNames(Classes.TEXT_MUTED, 'ingredients-line')}>
                  {t('noIngredients')}
                </div>
              )
            ) : (
              [1, 2, 3].map((_, index) => (
                <div key={-index} className="ingredients-line">
                  <Icon icon="dot" />
                  <span className={classNames('ingredients-line-text', Classes.SKELETON)} />
                </div>
              ))
            )}
            <H4 className={classNames(Classes.INTENT_PRIMARY, Classes.ICON, 'description-title')}>
              {t('description')}:
            </H4>

            <DescriptionTextArea
              value={recipe.description}
              changeValue={handleSetDescription}
              editable={state.editing}
              placeholder={state.editing ? t('phDescription') : t('noDescription')}
              className={classNames(state.loaded ? '' : Classes.SKELETON, 'description')}
            />
            <H5 className="user">{!state.editing && `${t('by')} ${recipe.user.user}.`}</H5>
          </div>
        </div>
        {recipe.id !== -1 && (
          <CommentSection
            comments={recipe.comments}
            username={status?.username ?? ''}
            recipeId={recipe.id}
            writeAccess={status?.write ?? false}
          />
        )}
        <div className="bottom-padding" />
      </>
    );
  } else {
    return (
      <>
        {prompt}
        <div className="body">
          <SideMenu darkModeProps={props} currentNavigation="recipes" />
          <div className="main-content">
            <div className="recipe-container">
              <div className="recipe">
                {error && <H3>{t('notFound')}</H3>}
                <div className="title-wrapper">
                  <H1 className="title">
                    <EditableText
                      multiline={true}
                      className={classNames(state.loaded ? '' : Classes.SKELETON)}
                      placeholder={t('phTitle')}
                      disabled={!state.editing}
                      value={recipe.title}
                      onChange={handleSetTitle}
                    />
                  </H1>
                  {state.loaded && (
                    <div className="edit-container">
                      {state.editing ? (
                        <ButtonGroup>
                          <CancelButton
                            handleDiscardClick={handleDiscardClick}
                            popoverTarget={
                              <Button
                                text={t('cancelEdit')}
                                intent="warning"
                                onClick={handleCancelClick}
                              />
                            }
                          />
                          <Tooltip
                            disabled={online}
                            content={t('tooltipOffline')}
                            position="bottom"
                          >
                            <AnchorButton
                              disabled={!online}
                              icon="floppy-disk"
                              text={t('saveRecipe')}
                              intent="primary"
                              onClick={() => void saveRecipe()}
                            />
                          </Tooltip>
                        </ButtonGroup>
                      ) : (
                        <ButtonGroup>
                          <ShareButton recipe={recipe} />
                          <Tooltip
                            disabled={online && hasWriteAccess}
                            content={
                              hasWriteAccess ? t('tooltipOffline') : t('tooltipNoWriteRecipe')
                            }
                            position="bottom"
                          >
                            <AnchorButton
                              icon="edit"
                              disabled={!(online && hasWriteAccess)}
                              intent="primary"
                              text={t('editRecipe')}
                              onClick={handleSetEditable}
                            />
                          </Tooltip>
                          <DeleteButton
                            handleDeleteClick={handleDeleteClick}
                            disabled={!(online && hasWriteAccess)}
                            popoverTarget={
                              <Tooltip
                                disabled={online && hasWriteAccess}
                                content={
                                  hasWriteAccess ? t('tooltipOffline') : t('tooltipNoWriteRecipe')
                                }
                                position="bottom"
                              >
                                <AnchorButton
                                  text={t('deleteRecipe')}
                                  disabled={!(online && hasWriteAccess)}
                                  intent="warning"
                                  icon="trash"
                                />
                              </Tooltip>
                            }
                          />
                        </ButtonGroup>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-image-wrapper">
                  <div className="text-wrapper">
                    <H3>
                      <CategorySuggest
                        canAddCategory={true}
                        noResultText={t('noCategoryFound')}
                        className={classNames(
                          'category-select',
                          state.loaded ? '' : Classes.SKELETON,
                        )}
                        disabled={!state.editing}
                        placeholder={t('phCategory')}
                        initialCategory={recipe.category}
                        onCategorySelected={handleSetCategory}
                      />
                    </H3>
                    <div className="ingredients-title-wrapper">
                      <H4
                        className={classNames(
                          Classes.INTENT_PRIMARY,
                          Classes.ICON,
                          'ingredients-title',
                        )}
                      >
                        {t('ingredients')}:
                      </H4>
                      {recipe.ingredients.length > 0 && !state.editing && (
                        <Button
                          text={t('addToShopping')}
                          variant="minimal"
                          intent="success"
                          icon="add"
                          onClick={addIngredientsToShoppingList}
                        />
                      )}
                    </div>
                    <DesktopIngredients
                      ingredients={recipe.ingredients}
                      loaded={state.loaded}
                      editable={state.editing}
                      addIngredient={(...values: string[]) => {
                        setState((state) => ({ ...state, dirty: true }));
                        const ingredients = recipe.ingredients.slice(0);
                        ingredients.push(...values);
                        setRecipe((recipe) => ({ ...recipe, ingredients }));
                      }}
                      deleteIngredient={(index) => {
                        setState((state) => ({ ...state, dirty: true }));
                        const ingredients = recipe.ingredients.filter((_, i) => i !== index);
                        setRecipe((recipe) => ({ ...recipe, ingredients }));
                      }}
                      replaceIngredient={(index, v) => {
                        setState((state) => ({ ...state, dirty: true }));
                        const ingredients = recipe.ingredients.slice(0);
                        ingredients[index] = v;
                        setRecipe((recipe) => ({ ...recipe, ingredients }));
                      }}
                    />
                  </div>
                  <ImagePart
                    recipe={recipe}
                    setImage={handleSetImage}
                    editable={state.editing}
                    className="image"
                  />
                </div>
                <H4
                  className={classNames(Classes.INTENT_PRIMARY, Classes.ICON, 'description-title')}
                >
                  {t('description')}:
                </H4>
                <DescriptionTextArea
                  value={recipe.description}
                  changeValue={handleSetDescription}
                  placeholder={state.editing ? t('phDescription') : t('noDescription')}
                  editable={state.editing}
                  className={classNames(state.loaded ? '' : Classes.SKELETON, 'description')}
                />
                <H5 className="user">{!state.editing && `${t('by')} ${recipe.user.user}.`}</H5>
              </div>
            </div>
            {recipe.id !== -1 && (
              <CommentSection
                comments={recipe.comments}
                username={status?.username ?? ''}
                recipeId={recipe.id}
                writeAccess={status?.write ?? false}
              />
            )}
          </div>
        </div>
        <div className="bottom-padding" />
      </>
    );
  }
}

function CancelButton(props: {
  handleDiscardClick?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  popoverTarget: React.ReactNode;
}) {
  const [t] = useTranslation();
  return (
    <Popover
      popoverClassName={Classes.POPOVER_CONTENT_SIZING}
      defaultIsOpen={false}
      position="bottom"
      content={
        <div>
          <H5>{t('confirmCancelTitle')}</H5>
          <p>{t('confirmCancel')}</p>
          <div className="popover-button-container">
            <Button text={t('cancel')} className={'popover-left ' + Classes.POPOVER_DISMISS} />
            <Button
              text={t('discardChanges')}
              intent="danger"
              className={Classes.POPOVER_DISMISS}
              onClick={props.handleDiscardClick}
            />
          </div>
        </div>
      }
    >
      {props.popoverTarget}
    </Popover>
  );
}

function DeleteButton(props: {
  handleDeleteClick: (event: React.MouseEvent<HTMLElement, MouseEvent>) => Promise<void>;
  popoverTarget: React.ReactNode;
  disabled?: boolean;
}) {
  const [t] = useTranslation();

  return (
    <Popover
      popoverClassName={Classes.POPOVER_CONTENT_SIZING}
      defaultIsOpen={false}
      disabled={props.disabled}
      position="bottom"
      content={
        <div>
          <H5>{t('confirmDeleteTitle')}</H5>
          <p>{t('confirmDelete')}</p>
          <div className="popover-button-container">
            <Button text={t('cancel')} className={'popover-left ' + Classes.POPOVER_DISMISS} />
            <Button
              text={t('deleteRecipe')}
              intent="danger"
              className={Classes.POPOVER_DISMISS}
              onClick={(e) => void props.handleDeleteClick(e)}
            />
          </div>
        </div>
      }
    >
      {props.popoverTarget}
    </Popover>
  );
}

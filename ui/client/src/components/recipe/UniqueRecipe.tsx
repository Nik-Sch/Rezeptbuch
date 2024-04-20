import { Classes, EditableText, H1, H2, H3, H4, H5, Icon } from '@blueprintjs/core';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { emptyRecipe, fetchUniqueRecipe, IRecipe } from '../../util/Network';

import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { IDarkThemeProps } from '../../App';
import { CategorySelect } from '../helpers/CategorySelect';
import { CategorySuggest } from '../helpers/CategorySuggest';
import { useMobile } from '../helpers/CustomHooks';
import MobileHeader from '../MobileHeader';
import SideMenu, { INavigationLink } from '../SideMenu';
import CommentSection from './CommentSection';
import DescriptionTextArea from './DescriptionTextArea';
import ImagePart from './ImagePart';
import { DesktopIngredients, showDot } from './Ingredients';
import './Recipe.scss';
import ShareButton from './ShareButton';


export default function UniqueRecipe(props: IDarkThemeProps) {
  let { id } = useParams();
  const [t] = useTranslation();

  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [recipe, setRecipe] = useState<IRecipe>(emptyRecipe);
  const mobile = useMobile();

  // load recipes
  useEffect(() => {
    if (typeof id === 'undefined') {
      setError(true);
      return;
    }
    fetchUniqueRecipe(id).then(fetchedRecipe => {
      if (typeof fetchedRecipe === 'undefined') {
        setError(true);
      } else {
        document.title = fetchedRecipe.title;
        setRecipe(fetchedRecipe);
        setLoaded(true);
      }

    })
  }, [id]);

  const navigationLinks: INavigationLink[] = [
    { to: '/', icon: 'git-repo', text: t('recipes'), active: true },
    { to: '/shoppingList', icon: 'shopping-cart', text: t('shoppingList') }
  ];

  if (error) {
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
          <H2>{t('notFound')}</H2>
        </div>
      </div>
    </>

  }
  if (mobile) {
    return <>
      <MobileHeader
        darkThemeProps={props}
        navigationLinks={navigationLinks}
      >
        {loaded && <div className='edit-container'>
          <ShareButton recipe={recipe} />
        </div>}
      </MobileHeader>
      <div className='recipe-container-mobile'>
        <ImagePart
          recipe={recipe}
          editable={false}
          className='image'
        />
        <div className='text-wrapper'>
          <H2 className={classNames(loaded ? '' : Classes.SKELETON, 'title')}>
            <span>
              {recipe.title}
            </span>
          </H2>
          <H3>
            <CategorySelect
              canAddCategory={true}
              noResultText={t('noCategoryFound')}
              className={classNames('category-select', Classes.TEXT_MUTED, loaded ? '' : Classes.SKELETON)}
              disabled={true}
              placeholder={t('phCategoryMobile')}
              category={recipe.category}
              onCategorySelected={() => { }}
            />
          </H3>

          <div className='ingredients-title-wrapper'>
            <H4 className={classNames(Classes.INTENT_PRIMARY, Classes.ICON, 'ingredients-title')}>
              {t('ingredients')}:
            </H4>
            {/* {recipe.ingredients.length > 0 && !state.editing && <Button
              text={t('addToShopping')}
              minimal={true}
              intent='success'
              icon='add'
              onClick={addIngredientsToShoppingList}
            />} */}
          </div>
          {loaded
            ? (recipe.ingredients.length > 0 ?
              recipe.ingredients.map((line, index) => (
                <div key={index} className='ingredients-line'>
                  {showDot(line) && <Icon icon='dot' />}
                  <span className='ingredients-line-text'>
                    {line.trim()}
                  </span>
                </div>
              ))
              : <div className={classNames(Classes.TEXT_MUTED, 'ingredients-line')}>{t('noIngredients')}</div>
            )
            : [1, 2, 3].map((_, index) => (
              <div key={-index} className='ingredients-line'>
                <Icon icon='dot' />
                <span className={classNames('ingredients-line-text', Classes.SKELETON)} />
              </div>
            ))
          }
          <H4 className={classNames(Classes.INTENT_PRIMARY, Classes.ICON, 'description-title')}>
            {t('description')}:
          </H4>

          <DescriptionTextArea
            value={recipe.description}
            editable={false}
            placeholder={t('noDescription')}
            className={classNames(loaded ? '' : Classes.SKELETON, 'description')}
          />
          <H5 className='user'>
            {`${t('by')} ${recipe.user.user}.`}
          </H5>
        </div>
      </div>
      {recipe.id !== -1 && <CommentSection
        comments={recipe.comments}
        username={''}
        recipeId={recipe.id}
        writeAccess={false}
      />}
      <div className='bottom-padding' />
    </>
  } else {
    return <>
      <div className='body'>
        <SideMenu darkModeProps={props} currentNavigation='recipes' />
        <div className='main-content'>
          <div className='recipe-container'>
            <div className='recipe'>
              <div className='title-wrapper'>
                <H1 className='title'>
                  <EditableText
                    multiline={true}
                    className={classNames(loaded ? '' : Classes.SKELETON)}
                    placeholder={t('phTitle')}
                    disabled={true}
                    value={recipe.title}
                    onChange={() => { }}
                  />
                </H1>
                {loaded && <div className='edit-container'>
                  <ShareButton recipe={recipe} />
                </div>}
              </div>
              <div className='text-image-wrapper'>
                <div className='text-wrapper'>
                  <H3>
                    <CategorySuggest
                      canAddCategory={true}
                      noResultText={t('noCategoryFound')}
                      className={classNames('category-select', loaded ? '' : Classes.SKELETON)}
                      disabled={true}
                      placeholder={t('phCategory')}
                      initialCategory={recipe.category}
                      onCategorySelected={() => { }}
                    />
                  </H3>
                  <div className='ingredients-title-wrapper'>
                    <H4 className={classNames(Classes.INTENT_PRIMARY, Classes.ICON, 'ingredients-title')}>
                      {t('ingredients')}:
                    </H4>
                    {/* {recipe.ingredients.length > 0 && !state.editing && <Button
                      text={t('addToShopping')}
                      minimal={true}
                      intent='success'
                      icon='add'
                      onClick={addIngredientsToShoppingList}
                    />} */}
                  </div>
                  <DesktopIngredients
                    ingredients={recipe.ingredients}
                    loaded={loaded}
                    editable={false}
                    addIngredient={() => { }}
                    deleteIngredient={() => { }}
                    replaceIngredient={() => { }}
                  />
                </div>
                <ImagePart
                  recipe={recipe}
                  editable={false}
                  className='image'
                />
              </div>
              <H4 className={classNames(Classes.INTENT_PRIMARY, Classes.ICON, 'description-title')}>
                {t('description')}:
              </H4>
              <DescriptionTextArea
                value={recipe.description}
                placeholder={t('noDescription')}
                editable={false}
                className={classNames(loaded ? '' : Classes.SKELETON, 'description')}
              />
              <H5 className='user'>
                {`${t('by')} ${recipe.user.user}.`}
              </H5>
            </div>
          </div>
          {recipe.id !== -1 && <CommentSection
            comments={recipe.comments}
            username={''}
            recipeId={recipe.id}
            writeAccess={false}
          />}
        </div>
      </div>
      <div className='bottom-padding' />
    </>
  }
}
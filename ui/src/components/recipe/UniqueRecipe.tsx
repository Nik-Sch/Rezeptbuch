import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { IRecipe, emptyRecipe, fetchUniqueRecipe } from '../../util/Notwork';
import { H1, Classes, H3, Card, H4, Icon, H2 } from '@blueprintjs/core';

import { useTranslation } from 'react-i18next';
import Header from '../Header';
import ImagePart from './ImagePart';
import './Recipe.scss';
import classNames from 'classnames';
import { IDarkThemeProps } from '../../App';
import { useMobile } from '../helpers/CustomHooks';
import ShareButton from './ShareButton';
import { DesktopIngredients, showDot } from './Ingredients';
import { Helmet } from 'react-helmet';


export function UniqueRecipe(props: IDarkThemeProps) {
  let { id } = useParams();
  const [t] = useTranslation();

  const [recipe, setRecipe] = useState<IRecipe>(emptyRecipe);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

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

  if (error) {
    return <H3>{t('notFound')}</H3>
  }

  if (mobile) {
    return <>
      <Header
        darkThemeProps={props}
        className='login-header'
      >
        {loaded && <div className='edit-container'>
          <ShareButton onlyLink={true} />
        </div>}
      </Header>
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
            <span className={classNames('category-select', Classes.TEXT_MUTED, loaded ? '' : Classes.SKELETON)}>
              {recipe.category.name}
            </span>
          </H3>
          <H4 className={classNames(Classes.INTENT_PRIMARY, Classes.ICON, 'ingredients-title')}>
            {t('ingredients')}:
            </H4>
          {loaded ?
            (recipe.ingredients.length > 0
              ? recipe.ingredients.map((line, index) => (
                <div key={index} className='ingredients-line'>
                  {showDot(line) && <Icon icon='dot' />}
                  <span className='ingredients-line-text'>
                    {line.trim()}
                  </span>
                </div>
              ))
              : <div
                className={classNames(Classes.TEXT_MUTED, 'ingredients-line')}>
                {t('noIngredients')}
              </div>
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
          {(recipe.description.trim().length > 0 || !loaded)
            ? <div className={classNames(loaded ? '' : Classes.SKELETON, 'description')}>
              {recipe.description}
            </div>
            : <div className={classNames(Classes.TEXT_MUTED, 'description')}>
              {t('noDescription')}
            </div>
          }
        </div>
      </div>
    </>
  } else {
    return <>
      <Helmet>
        <title>{recipe.title} | Unsere Rezepte</title>
        <meta name="title" content={recipe.title} />
        <meta name="description" content={recipe.description.split('.')[0]} />

        <meta property="og:title" content={recipe.title} />
        <meta property="og:description" content={recipe.description.split('.')[0]} />
        {recipe.image && recipe.image.trim().length > 0 && <meta
          property="og:image" content={`/api/images/${recipe.image}`}
        />}

        <meta property="twitter:title" content={recipe.title} />
        <meta property="twitter:description" content={recipe.description.split('.')[0]} />
        {recipe.image && recipe.image.trim().length > 0 && <meta
          property="twitter:image" content={`/api/images/${recipe.image}`}
        />}
      </Helmet>
      <Header
        darkThemeProps={props}
      />
      <div className='recipe-container'>
        <Card className='recipe' elevation={2}>
          {loaded && <div className='edit-container'>
            <ShareButton onlyLink={true} />
          </div>}
          <H1 className='title-wrapper'>
            {recipe.title}
          </H1>
          <div className='text-image-wrapper'>
            <div className='text-wrapper'>
              <H3>
                <span className={classNames('category-select', loaded ? '' : Classes.SKELETON)}>
                  {recipe.category.name}
                </span>
              </H3>
              <H4 className={classNames(Classes.INTENT_PRIMARY, Classes.ICON, 'ingredients-title')}>
                {t('ingredients')}:
              </H4>
              <DesktopIngredients
                ingredients={recipe.ingredients}
                loaded={loaded}
                editable={false}
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
          {(recipe.description.trim().length > 0 || !loaded)
            ? <div className={classNames(loaded ? '' : Classes.SKELETON, 'description')}>
              {recipe.description}
            </div>
            : <div className={classNames(Classes.TEXT_MUTED, 'description')}>
              {t('noDescription')}
            </div>
          }
        </Card>
      </div>
    </>
  }
}
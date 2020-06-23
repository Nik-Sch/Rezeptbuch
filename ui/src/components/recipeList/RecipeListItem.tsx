import React from 'react';
import { IRecipe } from '../../util/Recipes';
import { ICardProps, Card, H5, H3, H4, Classes } from '@blueprintjs/core';
import { useTranslation } from 'react-i18next';
import { MyImage } from '../helpers/Image';
import dayjs from 'dayjs';
import 'dayjs/locale/de';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import { Link } from 'react-router-dom';

import './RecipeListItem.scss'
import { useMobile } from '../helpers/CustomHooks';
import classNames from 'classnames';

dayjs.extend(localizedFormat);

interface IRecipeListItemProps extends ICardProps {
  recipe?: IRecipe
}

const RecipeListItem = (myProps: IRecipeListItemProps) => {
  const [, i18n] = useTranslation();
  const { recipe, style, ...props } = myProps;

  const date = dayjs(recipe?.date).locale(i18n.language).format('L');

  const mobile = useMobile();



  if (mobile) {
    return <Link
      to={recipe ? `/recipes/${recipe.id}` : '/'}
      style={style}
      className='mobile'
    >
      <Card
        {...props}
      >
        <div className={classNames('thumbnail', recipe ? '' : Classes.SKELETON)}>
          {recipe && <MyImage
            size={150}
            className='recipe-image'
            fallback={true}
            recipe={recipe}
          />}
        </div>
        <div className='recipe-text-wrapper'>
          <div className='title-category-wrapper'>
            <H4 className={classNames('recipe-title', recipe ? '' : Classes.SKELETON)}>{recipe?.title}</H4>
            <H5 className={classNames('recipe-category', Classes.INTENT_PRIMARY, Classes.ICON, recipe ? '' : Classes.SKELETON)}>{recipe?.category.name}</H5>
          </div>
          <div className='info-wrapper'>
            <div className={classNames('recipe-description', 'ellipsis', Classes.TEXT_MUTED, recipe ? '' : Classes.SKELETON)}>{recipe?.description}</div>
          </div>
        </div>
      </Card>
    </Link>
  } else {

    return <Link
      to={recipe ? `/recipes/${recipe.id}` : ''}
      style={style}
      className='desktop'
    >
      <Card
        {...props}
      >
        <div className={classNames('thumbnail', recipe ? '' : Classes.SKELETON)}>
          {recipe && <MyImage
            size={150}
            className='recipe-image'
            fallback={true}
            recipe={recipe}
          />}
        </div>
        <div className='recipe-text-wrapper'>
          <div className='title-category-wrapper'>
            <H3 className={classNames('recipe-title', recipe ? '' : Classes.SKELETON)}>{recipe?.title}</H3>
            <H5 className={classNames('recipe-category', recipe ? '' : Classes.SKELETON)}>{recipe?.category.name}</H5>
          </div>
          <div className='info-wrapper'>
            <div className={classNames('recipe-description', 'ellipsis', Classes.TEXT_MUTED, recipe ? '' : Classes.SKELETON)}>{recipe?.description}</div>
            <div className={classNames('recipe-date', recipe ? '' : Classes.SKELETON)}>{date}</div>
          </div>
        </div>
      </Card>
    </Link>
  }
};

export default RecipeListItem;
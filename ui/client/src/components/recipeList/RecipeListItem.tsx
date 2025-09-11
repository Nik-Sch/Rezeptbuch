import { IRecipe } from '../../util/Network';
import { H5, H3, Classes, Divider } from '@blueprintjs/core';
import { useTranslation } from 'react-i18next';
import { MyImage } from '../helpers/Image';
import dayjs from 'dayjs';
import 'dayjs/locale/de';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import { Link } from 'react-router-dom';

import './RecipeListItem.scss';
import { useMobile } from '../helpers/CustomHooks';
import classNames from 'classnames';
import { CSSProperties } from 'react';

dayjs.extend(localizedFormat);

interface IRecipeListItemProps {
  recipe?: IRecipe;
  style: CSSProperties;
}

const RecipeListItemDesktop = ({ recipe, style }: IRecipeListItemProps) => {
  const [, i18n] = useTranslation();
  const date = dayjs(recipe?.date).locale(i18n.language).format('L');

  return (
    <Link to={recipe ? `/recipes/${recipe.id}` : ''} style={style}>
      <div className={`recipe-list-item`}>
        <div className={classNames('thumbnail', recipe ? '' : Classes.SKELETON)}>
          {recipe && (
            <MyImage size={150} className="recipe-image" fallback={true} recipe={recipe} />
          )}
        </div>
        <div className="recipe-text-wrapper">
          <div className="title-category-wrapper">
            <H3 className={classNames('recipe-title', recipe ? '' : Classes.SKELETON)}>
              {recipe?.title}
            </H3>
            <H5 className={classNames('recipe-category', recipe ? '' : Classes.SKELETON)}>
              {recipe?.category.name}
            </H5>
          </div>
          <div className="info-wrapper">
            <div
              className={classNames(
                'recipe-description',
                'ellipsis',
                Classes.TEXT_MUTED,
                recipe ? '' : Classes.SKELETON,
              )}
            >
              {recipe?.description}
            </div>
            <div className={classNames('recipe-date', recipe ? '' : Classes.SKELETON)}>{date}</div>
          </div>
        </div>
      </div>
      <Divider />
    </Link>
  );
};

const RecipeListItemMobile = ({ recipe, style }: IRecipeListItemProps) => {
  return (
    <Link to={recipe ? `/recipes/${recipe.id}` : ''} style={style}>
      <div className={`recipe-list-item`}>
        <H3 className={classNames('recipe-title', recipe ? '' : Classes.SKELETON)}>
          {recipe?.title}
        </H3>
        <div className="recipe-content-wrapper">
          <div className={classNames('thumbnail', recipe ? '' : Classes.SKELETON)}>
            {recipe && (
              <MyImage size={150} className="recipe-image" fallback={true} recipe={recipe} />
            )}
          </div>
          <div className="recipe-text-wrapper">
            <div
              className={classNames(
                'recipe-description',
                'ellipsis',
                Classes.TEXT_MUTED,
                recipe ? '' : Classes.SKELETON,
              )}
            >
              {recipe?.description}
            </div>
            <H5 className={classNames('recipe-category', recipe ? '' : Classes.SKELETON)}>
              {recipe?.category.name}
            </H5>
          </div>
        </div>
      </div>
      <Divider className="recipe-list-divider" />
    </Link>
  );
};

const RecipeListItem = (props: IRecipeListItemProps) => {
  if (useMobile()) {
    return <RecipeListItemMobile {...props} />;
  } else {
    return <RecipeListItemDesktop {...props} />;
  }
};

export default RecipeListItem;

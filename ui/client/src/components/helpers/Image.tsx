import React, { MouseEventHandler } from 'react';
import noRecipe from '../../static/default-images/noRecipe.jpg';
import { useTranslation } from 'react-i18next';
import { IRecipe, IRecipeWithIngredientId } from '../../util/Network';
import categoryImageMap from '../../util/categoryImageMap';

interface IProps {
  recipe: IRecipe | IRecipeWithIngredientId;
  className?: string;
  fallback: boolean;
  size: number;
  onClick?: MouseEventHandler<HTMLImageElement>;
  imageProps?: React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>;
}

export function MyImage(props: IProps) {
  const [t] = useTranslation();
  if (props.recipe.image.trim() === '') {
    if (props.fallback) {
      const imageMap = categoryImageMap();
      const src =
        props.recipe.category.id in imageMap ? imageMap[props.recipe.category.id] : noRecipe;
      return <img alt={t('altImage')} src={src} loading="lazy" className={props.className} />;
    } else {
      return <></>;
    }
  }
  const img = props.recipe.image;
  const sizes = [1, 1.5, 2, 2.5, 3];
  const srcSet = sizes
    .map((v) => {
      const realSize = Math.round(v * props.size);
      return `/api/images/${img}?w=${realSize}&h=${realSize} ${v}x`;
    })
    .reduce((p, c, i) => (i === 0 ? c : `${p}, ${c}`), '');

  return (
    <img
      {...props.imageProps}
      alt={t('altImage')}
      loading="lazy"
      srcSet={srcSet}
      src={img}
      className={props.className}
      onClick={props.onClick}
    />
  );
}

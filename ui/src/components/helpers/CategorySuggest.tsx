import { IItemRendererProps, ItemPredicate, Suggest } from '@blueprintjs/select';
import recipesHandler, { ICategory, IRecipe } from '../../util/Recipes';

import React, { useState, useEffect } from 'react';
import { MenuItem } from '@blueprintjs/core';
import { useTranslation } from 'react-i18next';
import { AppToasterTop } from '../../util/toaster';


interface IProps {
  initialCategory: ICategory;
  disabled?: boolean;
  onCategorySelected: (category: ICategory) => void;
  placeholder?: string;
  className?: string;
  noResultText: string;
  canAddCategory: boolean;
}

export function CategorySuggest(props: IProps) {
  const [t] = useTranslation();
  const CatSuggest = Suggest.ofType<ICategory>();

  const [categories, setCategories] = useState<ICategory[] | undefined>();
  const handler = (_: IRecipe[], categories: ICategory[]) => {
    setCategories(categories);
  }
  useEffect(() => {
    recipesHandler.subscribe(handler);
    return () => { recipesHandler.unsubscribe(handler); };
  }, []);

  const itemRenderer = (category: ICategory, { handleClick, modifiers }: IItemRendererProps) => {
    if (!modifiers.matchesPredicate) {
      return null;
    }
    return (
      <MenuItem
        active={modifiers.active}
        key={category.id}
        onClick={handleClick}
        text={category.name}
      />
    );
  };

  const filterCategory: ItemPredicate<ICategory> = (query, category) => {
    return category.name.toLowerCase().indexOf(query.toLowerCase()) >= 0;
  };

  const onItemSelect = (item: ICategory, event?: React.SyntheticEvent<HTMLElement, Event>) => {
    if (item.id === -1) {
      recipesHandler.addCategory(item.name).then((category) => {
        if (category) {
          AppToasterTop.show({ message: t('createdCategory'), intent: 'success' })
          const newCategories = (categories || []).slice();
          newCategories.push(category);
          setCategories(newCategories)
          props.onCategorySelected(category);
        } else {
          AppToasterTop.show({ message: t('createdCategoryError'), intent: 'danger' });
        }
      })
    } else {
      props.onCategorySelected(item);
    }
  };


  const createCategoryElement = (name: string): ICategory => {
    return { name, id: -1 };
  }

  const renderCreateCategory = (query: string, active: boolean, handleClick: React.MouseEventHandler<HTMLElement>) => {
    return <MenuItem
      icon="add"
      text={`${t('create')} "${query}"`}
      active={active}
      onClick={handleClick}
      shouldDismissPopover={false}
    />
  }

  const maybeCreateNewCategory = props.canAddCategory ? createCategoryElement : undefined;
  const maybeCreateNewCategoryRenderer = props.canAddCategory ? renderCreateCategory : undefined;

  const getItemName = (item: ICategory) => item.name;

  return (props.disabled ?
    <span className={props.className}>
      {props.initialCategory.name}
    </span> :
    <CatSuggest
      className={props.className}
      createNewItemFromQuery={maybeCreateNewCategory}
      createNewItemRenderer={maybeCreateNewCategoryRenderer}
      resetOnQuery={true}
      noResults={<MenuItem disabled={true} text={props.noResultText} />}
      items={categories || []}
      defaultSelectedItem={props.initialCategory}
      itemsEqual='id'
      itemPredicate={filterCategory}
      itemRenderer={itemRenderer}
      onItemSelect={onItemSelect}
      disabled={typeof categories === 'undefined'}
      inputValueRenderer={getItemName}
      fill={true}
      inputProps={{
        placeholder: props.placeholder,
        large: true
      }}
    />
  );
}
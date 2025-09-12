import { ItemRendererProps, ItemPredicate, Suggest } from '@blueprintjs/select';
import recipesHandler, { ICategory, IRecipe } from '../../util/Network';

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
  const CatSuggest = Suggest<ICategory>;

  const [categories, setCategories] = useState<ICategory[] | undefined>();
  const handler = (_: IRecipe[], categories: ICategory[]) => {
    setCategories(categories);
  };
  useEffect(() => {
    recipesHandler.subscribe(handler);
    return () => {
      recipesHandler.unsubscribe(handler);
    };
  }, []);

  const itemRenderer = (category: ICategory, { handleClick, modifiers }: ItemRendererProps) => {
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
    return category.name.toLowerCase().includes(query.toLowerCase());
  };

  const onItemSelect = async (item: ICategory) => {
    if (item.id === -1) {
      const category = await recipesHandler.addCategory(item.name);
      if (category) {
        AppToasterTop.show({ message: t('createdCategory'), intent: 'success' });
        const newCategories = (categories ?? []).slice();
        newCategories.push(category);
        setCategories(newCategories);
        props.onCategorySelected(category);
      } else {
        AppToasterTop.show({ message: t('createdCategoryError'), intent: 'danger' });
      }
    } else {
      props.onCategorySelected(item);
    }
  };

  const createCategoryElement = (name: string): ICategory => {
    return { name, id: -1 };
  };

  const renderCreateCategory = (
    query: string,
    active: boolean,
    handleClick: React.MouseEventHandler<HTMLElement>,
  ) => {
    return (
      <MenuItem
        icon="add"
        text={`${t('create')} "${query}"`}
        active={active}
        onClick={handleClick}
        shouldDismissPopover={false}
      />
    );
  };

  const maybeCreateNewCategory = props.canAddCategory ? createCategoryElement : undefined;
  const maybeCreateNewCategoryRenderer = props.canAddCategory ? renderCreateCategory : undefined;

  const getItemName = (item: ICategory) => item.name;

  return props.disabled ? (
    <span className={props.className}>{props.initialCategory.name}</span>
  ) : (
    <CatSuggest
      className={props.className}
      createNewItemFromQuery={maybeCreateNewCategory}
      createNewItemRenderer={maybeCreateNewCategoryRenderer}
      resetOnQuery={true}
      noResults={<MenuItem disabled={true} text={props.noResultText} />}
      items={categories ?? []}
      defaultSelectedItem={props.initialCategory}
      itemsEqual="id"
      itemPredicate={filterCategory}
      itemRenderer={itemRenderer}
      onItemSelect={(i) => void onItemSelect(i)}
      disabled={typeof categories === 'undefined'}
      inputValueRenderer={getItemName}
      fill={true}
      inputProps={{
        placeholder: props.placeholder,
        large: true,
      }}
    />
  );
}

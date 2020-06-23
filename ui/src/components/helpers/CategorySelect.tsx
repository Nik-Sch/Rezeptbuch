import { IItemRendererProps, Select } from '@blueprintjs/select';
import recipesHandler, { ICategory, IRecipe } from '../../util/Recipes';

import React, { useState, useEffect } from 'react';
import { MenuItem, Button } from '@blueprintjs/core';
import { useTranslation } from 'react-i18next';
import { AppToasterTop } from '../../util/toaster';


interface IProps {
  disabled?: boolean;
  category: ICategory;
  onCategorySelected: (category: ICategory) => void;
  placeholder?: string;
  className?: string;
  noResultText: string;
  canAddCategory: boolean;
}

export function CategorySelect(props: IProps) {
  const [t] = useTranslation();
  const CatSelect = Select.ofType<ICategory>();

  const [categories, setCategories] = useState<ICategory[]>([]);
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
        className='mobile-menu-item'
      />
    );
  };


  const onItemSelect = (item: ICategory, event?: React.SyntheticEvent<HTMLElement, Event>) => {
    if (item.id === -1) {
      recipesHandler.addCategory(item.name).then((category) => {
        if (category) {
          AppToasterTop.show({ message: t('createdCategory'), intent: 'success' });
          const newCategories = categories.slice();
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
      className='mobile-menu-item'
    />
  }

  const maybeCreateNewCategory = props.canAddCategory ? createCategoryElement : undefined;
  const maybeCreateNewCategoryRenderer = props.canAddCategory ? renderCreateCategory : undefined;

  // const getItemName = (item: ICategory) => item.name;
  const buttonText = props.category.id === -1 ? props.placeholder : props.category.name;

  return (props.disabled ?
    <span className={props.className}>
      {props.category.name}
    </span> :
    <CatSelect
      className={props.className}
      createNewItemFromQuery={maybeCreateNewCategory}
      createNewItemRenderer={maybeCreateNewCategoryRenderer}
      items={categories}
      itemsEqual='id'
      itemRenderer={itemRenderer}
      onItemSelect={onItemSelect}
      disabled={categories.length === 0}
      filterable={false}
      popoverProps={{ minimal: true }}
    >
      <Button text={buttonText} rightIcon="double-caret-vertical" large={true} />
    </CatSelect>
  );
}
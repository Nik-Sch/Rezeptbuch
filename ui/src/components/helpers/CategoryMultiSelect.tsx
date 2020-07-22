import { IItemRendererProps, ItemPredicate, MultiSelect } from '@blueprintjs/select';
import { ICategory } from '../../util/Notwork';

import React from 'react';
import { Button, MenuItem } from '@blueprintjs/core';
import { useMobile } from './CustomHooks';


interface IProps {
  onCategorySelected: (categories: ICategory[]) => void;
  selectedCategories: ICategory[];
  allCategories: ICategory[];
  placeholder: string;
  className?: string;
  noResultText: string;
}

export function CategoryMultiSelect(props: IProps) {
  const CatSelect = MultiSelect.ofType<ICategory>();

  const isSelected = (category: ICategory) => {
    return props.selectedCategories.findIndex((v) => v.id === category.id) !== -1;
  }

  const itemRenderer = (category: ICategory, { handleClick, modifiers }: IItemRendererProps) => {
    if (!modifiers.matchesPredicate) {
      return null;
    }
    return (
      <MenuItem
        active={modifiers.active}
        key={category.id}
        className={mobile ? 'mobile-menu-item' : ''}
        icon={isSelected(category) ? "tick" : "blank"}
        label={typeof category.count !== 'undefined' ? `${category.count}` : undefined}
        onClick={handleClick}
        text={category.name}
        shouldDismissPopover={false}
      />
    );
  };

  const filterCategory: ItemPredicate<ICategory> = (query, category) => {
    return category.name.toLowerCase().indexOf(query.toLowerCase()) >= 0;
  };

  const onItemSelect = (item: ICategory) => {
    if (isSelected(item)) {
      const cats = props.selectedCategories.filter((v) => v.id !== item.id);
      props.onCategorySelected(cats);
    } else {
      const cats = props.selectedCategories.slice();
      cats.push(item);
      props.onCategorySelected(cats);
    }
  };

  const handleTagRemove = (_: string, index: number) => {
    const cats = props.selectedCategories.filter((_, i) => i !== index);
    props.onCategorySelected(cats);
  }

  const handleClearClick = () => {
    props.onCategorySelected([]);
  }

  const mobile = useMobile();

  const clearButton = props.selectedCategories.length > 0 ?
    <Button icon="cross" minimal={true} onClick={handleClearClick} large={mobile} />
    : undefined;

  return (
    <CatSelect
      noResults={<MenuItem disabled={true} text={props.noResultText} />}
      className={props.className}
      items={props.allCategories}
      selectedItems={props.selectedCategories}
      itemsEqual='id'
      itemPredicate={filterCategory}
      itemRenderer={itemRenderer}
      onItemSelect={onItemSelect}
      fill={true}
      tagInputProps={{
        onRemove: handleTagRemove,
        rightElement: clearButton,
        placeholder: props.placeholder,
        leftIcon: 'filter-list',
        tagProps: {
          minimal: true
        },
        inputRef: input => {
          if (input && mobile) {
            input.readOnly = true;
          }
        },
        large: mobile
      }}
      popoverProps={{
        minimal: mobile,
        position: 'bottom-right'
      }}
      tagRenderer={item => item.name}
      resetOnSelect={true}
    />
  );
}
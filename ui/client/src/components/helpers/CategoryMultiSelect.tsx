import { ItemRendererProps, ItemPredicate, MultiSelect } from '@blueprintjs/select';
import { ICategory } from '../../util/Network';

import React from 'react';
import { Button, MenuItem } from '@blueprintjs/core';
import { useMobile } from './CustomHooks';
import { Counts } from '../SideMenu';

interface IProps {
  onCategorySelected: (categories: ICategory[]) => void;
  selectedCategories: ICategory[];
  allCategories: ICategory[];
  categoryCounts: Counts;
  placeholder: string;
  className?: string;
  noResultText: string;
}

export function CategoryMultiSelect(props: IProps) {
  const CatSelect = MultiSelect<ICategory>;

  const isSelected = (category: ICategory) => {
    return props.selectedCategories.findIndex((v) => v.id === category.id) !== -1;
  };

  const itemRenderer = (category: ICategory, { handleClick, modifiers }: ItemRendererProps) => {
    if (!modifiers.matchesPredicate) {
      return null;
    }
    return (
      <MenuItem
        active={modifiers.active}
        key={category.id}
        className={mobile ? 'mobile-menu-item' : ''}
        icon={isSelected(category) ? 'tick' : 'blank'}
        label={props.categoryCounts[category.id]?.toString()}
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

  const handleTagRemove = (_: React.ReactNode, index: number) => {
    const cats = props.selectedCategories.filter((_, i) => i !== index);
    props.onCategorySelected(cats);
  };

  const handleClearClick = () => {
    props.onCategorySelected([]);
  };

  const mobile = useMobile();

  const clearButton =
    props.selectedCategories.length > 0 ? (
      <Button icon="cross" variant="minimal" onClick={handleClearClick} large={mobile} />
    ) : undefined;

  return (
    <CatSelect
      noResults={<MenuItem disabled={true} text={props.noResultText} />}
      className={props.className}
      items={props.allCategories}
      selectedItems={props.selectedCategories}
      itemsEqual="id"
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
          minimal: true,
        },
        inputRef: (input) => {
          if (input && mobile) {
            input.readOnly = true;
          }
        },
        large: mobile,
      }}
      popoverProps={{
        minimal: mobile,
        position: 'bottom-right',
      }}
      tagRenderer={(item) => item.name}
      resetOnSelect={true}
    />
  );
}

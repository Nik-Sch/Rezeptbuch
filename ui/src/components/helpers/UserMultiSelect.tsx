import { IItemRendererProps, ItemPredicate, MultiSelect } from '@blueprintjs/select';
import { IUser } from '../../util/Recipes';

import React from 'react';
import { Button, MenuItem } from '@blueprintjs/core';
import { useMobile } from './CustomHooks';


interface IProps {
  onUserSelected: (users: IUser[]) => void;
  selectedUsers: IUser[];
  allUsers: IUser[];
  placeholder: string;
  className?: string;
  noResultText: string;
}

export function UserMultiSelect(props: IProps) {
  const Select = MultiSelect.ofType<IUser>();

  const isSelected = (user: IUser) => {
    return props.selectedUsers.findIndex((v) => v.id === user.id) !== -1;
  }

  const itemRenderer = (user: IUser, { handleClick, modifiers }: IItemRendererProps) => {
    if (!modifiers.matchesPredicate) {
      return null;
    }
    return (
      <MenuItem
        active={modifiers.active}
        key={user.id}
        className={mobile ? 'mobile-menu-item' : ''}
        icon={isSelected(user) ? "tick" : "blank"}
        onClick={handleClick}
        label={typeof user.count !== 'undefined' ? `${user.count}` : undefined}
        text={user.user}
        shouldDismissPopover={false}
      />
    );
  };

  const filterUser: ItemPredicate<IUser> = (query, user) => {
    return user.user.toLowerCase().indexOf(query.toLowerCase()) >= 0;
  };

  const onItemSelect = (item: IUser) => {
    if (isSelected(item)) {
      const cats = props.selectedUsers.filter((v) => v.id !== item.id);
      props.onUserSelected(cats);
    } else {
      const cats = props.selectedUsers.slice();
      cats.push(item);
      props.onUserSelected(cats);
    }
  };

  const handleTagRemove = (_: string, index: number) => {
    const cats = props.selectedUsers.filter((_, i) => i !== index);
    props.onUserSelected(cats);
  }

  const handleClearClick = () => {
    props.onUserSelected([]);
  }

  const mobile = useMobile();

  const clearButton = props.selectedUsers.length > 0 ?
    <Button icon="cross" minimal={true} onClick={handleClearClick} large={mobile} />
    : undefined;

  return (
    <Select
      noResults={<MenuItem disabled={true} text={props.noResultText} />}
      className={props.className}
      items={props.allUsers}
      selectedItems={props.selectedUsers}
      itemsEqual='id'
      itemPredicate={filterUser}
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
        position: 'bottom-left'
      }}
      tagRenderer={item => item.user}
      resetOnSelect={true}
    />
  );
}
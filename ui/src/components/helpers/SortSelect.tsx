import { Select, IItemRendererProps } from '@blueprintjs/select';

import React, { useState, useEffect } from 'react';
import { Button, MenuItem, ButtonGroup, Classes } from '@blueprintjs/core';
import { IRecipe } from '../../util/Network';
import classNames from 'classnames';
import { useMobile } from './CustomHooks';
import { useTranslation } from 'react-i18next';

export interface ISort {
  key: keyof IRecipe,
  textKey: string,
  smallTextKey: string
}

interface IProps {
  className?: string;
  items: ISort[];
  onSelected: (value: ISort, desc: boolean) => void;
  defaultDesc: boolean;
  defaultIndex: number;
  fill?: boolean;
}

export function SortSelect(props: IProps) {
  const SortSelect = Select.ofType<ISort>();

  const [selected, setSelected] = useState(props.items[props.defaultIndex]);
  const [desc, setDesc] = useState(props.defaultDesc);
  const {t} = useTranslation();

  useEffect(() => {
    setSelected(props.items[props.defaultIndex]);
  }, [props.items, props.defaultIndex]);


  const itemRenderer = (item: ISort, { handleClick, modifiers }: IItemRendererProps) => {
    if (!modifiers.matchesPredicate) {
      return null;
    }
    return (
      <MenuItem
        active={modifiers.active}
        key={item.key}
        onClick={handleClick}
        text={t(item.textKey)}
        label={''}
      />
    );
  };

  const onItemSelect = (item: ISort) => {
    setSelected(item);
    props.onSelected(item, desc);
  };

  const handleClick = () => {
    props.onSelected(selected, !desc);
    setDesc(!desc);
  }

  const mobile = useMobile();
  const selectedText = mobile ? t(selected.smallTextKey) : t(selected.textKey);

  return (
    <ButtonGroup
      fill={props.fill}
    >
      <SortSelect
        className={classNames(props.className, Classes.FILL)}
        activeItem={selected}
        items={props.items}
        itemRenderer={itemRenderer}
        onItemSelect={onItemSelect}
        filterable={false}
        popoverProps={{
          position: 'bottom-left',
          minimal: true
        }}
      >
        <Button
          className='sort-button'
          large={mobile}
          fill={true}
          text={selectedText}
          rightIcon='caret-down'
        />
      </SortSelect>
      <Button
        className={Classes.FIXED}
        icon={desc ? 'sort-alphabetical-desc' : 'sort-alphabetical'}
        onClick={handleClick}
      />
    </ ButtonGroup>
  );
}
import { Select, IItemRendererProps } from '@blueprintjs/select';

import { Button, MenuItem, ButtonGroup, Classes } from '@blueprintjs/core';
import { IRecipe } from '../../util/Network';
import classNames from 'classnames';
import { useMobile } from './CustomHooks';
import { useTranslation } from 'react-i18next';

export interface ISort {
  key: keyof IRecipe,
  textKey: string
}

interface IProps {
  className?: string;
  items: ISort[];
  onSelected: (value: ISort, desc: boolean) => void;
  selectedValue: ISort;
  selectedDesc: boolean;
  fill?: boolean;
}

export function SortSelect(props: IProps) {
  const SortSelect = Select.ofType<ISort>();

  const { t } = useTranslation();

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
    props.onSelected(item, props.selectedDesc);
  };

  const handleClick = () => {
    props.onSelected(props.selectedValue, !props.selectedDesc);
  }

  const mobile = useMobile();

  return (<>
    <ButtonGroup
      fill={props.fill}
      className={props.className}
    >
      <SortSelect
        className={Classes.FILL}
        activeItem={props.selectedValue}
        items={props.items}
        itemsEqual='key'
        itemRenderer={itemRenderer}
        onItemSelect={onItemSelect}
        filterable={false}
        popoverProps={{
          position: 'bottom-left',
          minimal: mobile
        }}
        fill={true}
      >
        <Button
          className='sort-button'
          large={mobile}
          fill={true}
          alignText={props.fill ? 'left' : 'center'}
          icon='sort'
          text={t(props.selectedValue.textKey)}
          rightIcon='caret-down'
        />
      </SortSelect>
      <Button
        large={mobile}
        className={Classes.FIXED}
        icon={props.selectedDesc ? 'sort-alphabetical-desc' : 'sort-alphabetical'}
        onClick={handleClick}
      />
    </ ButtonGroup>
    </>
  );
}
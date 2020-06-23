import { Select, IItemRendererProps } from '@blueprintjs/select';

import React, { useState } from 'react';
import { Button, MenuItem } from '@blueprintjs/core';
import { useTranslation } from 'react-i18next';
import { ILanguage, availableLanguages } from '../../util/i18n';

import 'flag-icon-css/sass/flag-icon.scss';

interface IProps {
  className?: string;
}

export function LanguageSelect(props: IProps) {
  const [, i18n] = useTranslation();
  const LangSelect = Select.ofType<ILanguage>();

  const [selected, setSelected] = useState(availableLanguages.find((v) => v.key === i18n.language));

  const itemRenderer = (lang: ILanguage, { handleClick, modifiers }: IItemRendererProps) => {
    if (!modifiers.matchesPredicate) {
      return null;
    }
    const flagKey = lang.key === 'en' ? 'gb' : lang.key;
    return (
      <MenuItem
        active={modifiers.active}
        key={lang.key}
        onClick={handleClick}
        text={lang.name}
        label={''}
        labelClassName={`flag-icon flag-icon-${flagKey}`}
      />
    );
  };

  const onItemSelect = (lang: ILanguage, event?: React.SyntheticEvent<HTMLElement, Event>) => {
    setSelected(lang);
    i18n.changeLanguage(lang.key);
  };
    const flagKey = selected?.key === 'en' ? 'gb' : selected?.key;
  return (
    <LangSelect
      activeItem={selected}
      className={props.className}
      items={availableLanguages}
      itemRenderer={itemRenderer}
      onItemSelect={onItemSelect}
      filterable={false}
      popoverProps={{position: 'bottom-right'}}
    >
      <Button text={<span className={`flag-icon flag-icon-${flagKey}`}/>} rightIcon='caret-down' />
    </LangSelect>
  );
}
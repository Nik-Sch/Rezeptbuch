import { Select, ItemRendererProps } from '@blueprintjs/select';

import { useState } from 'react';
import { Button, MenuItem } from '@blueprintjs/core';
import { useTranslation } from 'react-i18next';
import { ILanguage, availableLanguages } from '../../util/i18n';

import './LanguageSelect.scss';

interface IProps {
  className?: string;
}

export function LanguageSelect(props: IProps) {
  const [, i18n] = useTranslation();
  const LangSelect = Select<ILanguage>;

  const [selected, setSelected] = useState(
    availableLanguages.find((v) => i18n.language.startsWith(v.key)),
  );
  const itemRenderer = (lang: ILanguage, { handleClick, modifiers }: ItemRendererProps) => {
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
        labelClassName={`fi fi-${flagKey}`}
      />
    );
  };

  const onItemSelect = (lang: ILanguage) => {
    setSelected(lang);
    void i18n.changeLanguage(lang.key);
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
      popoverProps={{ position: 'bottom-right' }}
    >
      <Button text={<span className={`fi fi-${flagKey}`} />} rightIcon="caret-down" />
    </LangSelect>
  );
}

import React, { useState, useEffect, forwardRef } from "react";
import { useTranslation } from "react-i18next";
import { Icon, Classes, Keys } from "@blueprintjs/core";
import classNames from "classnames";

export function showDot(line: string): boolean {
  return line.length === 0 || line.indexOf(':') !== line.trim().length - 1;
}

interface IIngredientsLine {
  loaded: boolean;
  editable: boolean;
  line: string;
  delete: () => void;
  replace: (v: string, shouldRefocus: boolean) => void;
}

const IngredientsLine = forwardRef((props: IIngredientsLine, ref) => {
  const [hover, setHover] = useState(false);
  const [value, setValue] = useState<string>(props.line);
  useEffect(() => {
    setValue(props.line);
  }, [props.line]);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const handleConfirm = (shouldRefocus: boolean = false) => {
    setIsEditing(false);
    if (value.trim() !== '') {
      props.replace(value, shouldRefocus);
    } else {
      props.delete();
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.which === Keys.ENTER) {
      handleConfirm(true);
    } else if (e.which === Keys.ESCAPE) {
      setIsEditing(false);
      setValue(props.line);
    }
  }

  return <div
    className='ingredients-line'
    onMouseOver={() => setHover(true)}
    onMouseOut={() => setHover(false)}
  >
    {showDot(props.line) && <Icon
      icon={(props.editable && hover) ? 'cross' : 'dot'}
      className={props.editable ? 'ingredients-line-cross' : ''}
      onClick={() => {
        if (props.editable) {
          props.delete();
        }
      }}
    />}
    <div
      ref={ref as any}
      className={classNames(
        Classes.EDITABLE_TEXT,
        {
          [Classes.EDITABLE_TEXT_EDITING]: isEditing,
          [Classes.DISABLED]: !props.editable,
        }
      )}
      onFocus={() => {
        if (props.editable) {
          setIsEditing(true);
        }
      }}
      tabIndex={isEditing ? undefined : 0}
    >
      {isEditing
        ? <input
          className={Classes.EDITABLE_TEXT_INPUT}
          onBlur={() => handleConfirm()}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          ref={input => input?.focus()}
          value={value}
        />
        : <span className={classNames(Classes.EDITABLE_TEXT_CONTENT, 'ingredients-line-text')}>
          {value}
        </span>}
    </div>
  </div>
});

function ExtraIngredientLine(props: {
  addIngredient: (...ing: string[]) => void
}) {
  const { t } = useTranslation();

  const [value, setValue] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const hasValue = value !== '';
  const placeholder = t('phIngredients');

  const handleConfirm = (shouldRefocus: boolean = false) => {
    if (value.trim() !== '') {
      props.addIngredient(value);
      setValue('');
    }
    if (!shouldRefocus) {
      setIsEditing(false);
    }
  }
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.which === Keys.ENTER) {
      handleConfirm(true);
    } else if (e.which === Keys.ESCAPE) {
      setIsEditing(false);
      setValue('');
    }
  }

  return <div className='ingredients-line'>
    <Icon icon='dot' />
    <div
      className={classNames(
        Classes.EDITABLE_TEXT,
        {
          [Classes.EDITABLE_TEXT_EDITING]: isEditing,
          [Classes.EDITABLE_TEXT_PLACEHOLDER]: !hasValue
        }
      )}
      onFocus={() => setIsEditing(true)}
      tabIndex={isEditing ? undefined : 0}
    >
      {isEditing
        ? <input
          className={Classes.EDITABLE_TEXT_INPUT}
          onBlur={() => handleConfirm()}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          ref={input => input?.focus()}
          placeholder={placeholder}
          value={value}
          onPaste={e => {
            const data = e.clipboardData.getData('text').split('\n').map(v => v.trim()).filter(v => v.length > 0);
            if (data.length > 1) {
              props.addIngredient(...data);
              setTimeout(() => {
                setIsEditing(true);
              }, 100);
              e.preventDefault();
            }
          }}
        />
        : <span className={Classes.EDITABLE_TEXT_CONTENT}>
          {hasValue ? value : placeholder}
        </span>}
    </div>
  </div>
}

interface IDesktopIngredients {
  ingredients: string[];
  loaded: boolean;
  editable: boolean;
  addIngredient: (...ing: string[]) => void;
  deleteIngredient: (index: number) => void;
  replaceIngredient: (index: number, ing: string) => void;
}

export function DesktopIngredients(props: IDesktopIngredients) {
  const [t] = useTranslation();

  const ingredientsRefs: HTMLDivElement[] = [];
  return <>
    {props.ingredients.filter(v => v.trim() !== '').map(((line, index) => {
      const handleDelete = () => {
        props.deleteIngredient(index);
      };
      const handleReplace = (v: string, shouldRefocus: boolean) => {
        props.replaceIngredient(index, v);
        if (shouldRefocus && ingredientsRefs[index + 1]) {
          setTimeout(() => {
            ingredientsRefs[index + 1].focus();
          }, 10);
        }
      };
      return <IngredientsLine
        editable={props.editable}
        loaded={props.loaded}
        key={index}
        line={line}
        delete={handleDelete}
        replace={handleReplace}
        ref={v => { if (v) ingredientsRefs[index] = v as HTMLDivElement; }}
      />
    }))
    }
    {props.loaded && !props.editable && props.ingredients.length === 0 &&
      <div className='no-ingredients'>{t('noIngredients')}</div>
    }
    {!props.loaded &&
      [1, 2, 3].map((_, index) => (
        <div key={-index} className='ingredients-line'>
          <Icon icon='dot' />
          <span className={classNames('ingredients-line-text', Classes.SKELETON)} />
        </div>
      ))
    }
    {props.editable && <ExtraIngredientLine
      addIngredient={props.addIngredient}
    />
    }
  </>
}

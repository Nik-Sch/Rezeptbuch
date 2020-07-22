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
        },
        'ingredients-line-text'
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
        : <span className={Classes.EDITABLE_TEXT_CONTENT}>
          {value}
        </span>}
    </div>
  </div>
});

function ExtraIngredientLine(props: {
  addIngredient?: (ing: string) => void
}) {
  const { t } = useTranslation();

  const [value, setValue] = useState<string>();
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const hasValue = typeof value !== 'undefined' && value !== '';
  const placeholder = t('phIngredients');

  const handleConfirm = (shouldRefocus: boolean = false) => {
    setIsEditing(false);
    setValue(undefined);
    if (typeof value !== 'undefined' && value.trim() !== '' && props.addIngredient) {
      props.addIngredient(value);
      if (shouldRefocus) {
        setTimeout(() => {
          setIsEditing(true);
        }, 0);
      }
    }
  }
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.which === Keys.ENTER) {
      handleConfirm(true);
    } else if (e.which === Keys.ESCAPE) {
      setIsEditing(false);
      setValue(undefined);
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
        },
        'ingredients-line-text'
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
  addIngredient?: (ing: string) => void;
  deleteIngredient?: (index: number) => void;
  replaceIngredient?: (index: number, ing: string) => void;
}

export function DesktopIngredients(props: IDesktopIngredients) {
  const [t] = useTranslation();

  if (props.ingredients.length > 0) {
    const ingredientsRefs: HTMLDivElement[] = [];
    return <>
      {props.ingredients.filter(v => v.trim() !== '').map(((line, index) => (
        <IngredientsLine
          editable={props.editable}
          loaded={props.loaded}
          key={index}
          line={line}
          delete={() => {
            if (props.deleteIngredient) {
              props.deleteIngredient(index);
            }
          }}
          replace={(v, shouldRefocus) => {
            if (props.replaceIngredient) {
              props.replaceIngredient(index, v);
              if (shouldRefocus && ingredientsRefs[index + 1]) {
                setTimeout(() => {
                  ingredientsRefs[index + 1].focus();
                }, 10);
              }
            }
          }}
          ref={(v: HTMLDivElement) => {
            if (v) {
              ingredientsRefs[index] = v;
            }
          }}
        />
      )))
      }
      {props.editable && <ExtraIngredientLine
        addIngredient={props.addIngredient}
      />}
    </>
  } else if (props.editable) {
    return <ExtraIngredientLine
      addIngredient={props.addIngredient}
    />;
  } else if (props.loaded) {
    return <div className='no-ingredients'>{t('noIngredients')}</div>
  } else {
    return <>
      {[1, 2, 3].map((_, index) => (
        <div key={-index} className='ingredients-line'>
          <Icon icon='dot' />
          <span className={classNames('ingredients-line-text', Classes.SKELETON)} />
        </div>
      ))
      }
    </>
  }
}

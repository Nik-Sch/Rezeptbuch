import React, { useState, useEffect, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon, Classes } from '@blueprintjs/core';
import update from 'immutability-helper';
import classNames from 'classnames';
import {
  DragDropContext,
  Draggable,
  DraggableProvidedDragHandleProps,
  Droppable,
  DropResult,
} from '@hello-pangea/dnd';
import { v4 } from 'uuid';
import { useMobile } from '../helpers/CustomHooks';

export function showDot(line: IIngredient): boolean {
  return (
    line.ingredient.length === 0 ||
    line.ingredient.indexOf(':') !== line.ingredient.trim().length - 1
  );
}

interface IIngredientsLine {
  loaded: boolean;
  editable: boolean;
  line: IIngredient;
  delete: () => void;
  replace: (v: IIngredient, shouldRefocus: boolean) => void;
  isDragging: boolean;
  dragHandleProps: DraggableProvidedDragHandleProps | null;
}

const IngredientsLine = forwardRef((props: IIngredientsLine, ref) => {
  const [hover, setHover] = useState(false);
  const [value, setValue] = useState(props.line);
  useEffect(() => {
    setValue(props.line);
  }, [props.line]);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const handleConfirm = (shouldRefocus = false) => {
    setIsEditing(false);
    if (value.ingredient.trim() !== '') {
      props.replace(value, shouldRefocus);
    } else {
      props.delete();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleConfirm(true);
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setValue(props.line);
    }
  };
  const mobile = useMobile();

  return (
    <div
      className={props.editable ? 'ingredients-line-draggable' : 'ingredients-line'}
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
    >
      {props.editable ? (
        <Icon
          icon={hover || mobile ? 'drag-handle-vertical' : 'blank'}
          className="drag-handle"
          {...props.dragHandleProps}
        />
      ) : (
        <div {...props.dragHandleProps} />
      )}
      {showDot(props.line) && (
        <Icon
          icon={props.editable && hover ? 'cross' : 'dot'}
          className={props.editable ? 'ingredients-line-cross' : ''}
          onClick={() => {
            if (props.editable) {
              props.delete();
            }
          }}
        />
      )}
      <div
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
        ref={ref as any}
        className={classNames(Classes.EDITABLE_TEXT, {
          [Classes.EDITABLE_TEXT_EDITING]: isEditing,
          [Classes.DISABLED]: !props.editable,
        })}
        onFocus={() => {
          if (props.editable) {
            setIsEditing(true);
          }
        }}
        tabIndex={isEditing ? undefined : 0}
      >
        {isEditing ? (
          <input
            className={Classes.EDITABLE_TEXT_INPUT}
            onBlur={() => handleConfirm()}
            onChange={(e) => setValue((v) => ({ ...v, ingredient: e.target.value }))}
            onKeyDown={handleKeyDown}
            ref={(input) => input?.focus()}
            value={value.ingredient}
          />
        ) : (
          <span className={classNames(Classes.EDITABLE_TEXT_CONTENT, 'ingredients-line-text')}>
            {value.ingredient}
          </span>
        )}
      </div>
    </div>
  );
});
IngredientsLine.displayName = 'IngredientsLine';

const ExtraIngredientLine = forwardRef(
  (props: { addIngredient: (...ing: string[]) => void }, ref) => {
    const { t } = useTranslation();

    const [value, setValue] = useState<string>('');
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const hasValue = value !== '';
    const placeholder = t('phIngredients');

    const handleConfirm = (shouldRefocus = false) => {
      if (value.trim() !== '') {
        props.addIngredient(value);
        setValue('');
      }
      if (!shouldRefocus) {
        setIsEditing(false);
      }
    };
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleConfirm(true);
      } else if (e.key === 'Escape') {
        setIsEditing(false);
        setValue('');
      }
    };

    return (
      <div className="ingredients-line">
        <Icon icon="dot" />
        <div
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
          ref={ref as any}
          className={classNames(Classes.EDITABLE_TEXT, {
            [Classes.EDITABLE_TEXT_EDITING]: isEditing,
            [Classes.EDITABLE_TEXT_PLACEHOLDER]: !hasValue,
          })}
          onFocus={() => setIsEditing(true)}
          tabIndex={isEditing ? undefined : 0}
        >
          {isEditing ? (
            <input
              className={Classes.EDITABLE_TEXT_INPUT}
              onBlur={() => handleConfirm()}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              ref={(input) => input?.focus()}
              placeholder={placeholder}
              value={value}
              onPaste={(e) => {
                const data = e.clipboardData
                  .getData('text')
                  .split('\n')
                  .map((v) => v.trim())
                  .filter((v) => v.length > 0);
                if (data.length > 1) {
                  props.addIngredient(...data);
                  setTimeout(() => {
                    setIsEditing(true);
                  }, 100);
                  e.preventDefault();
                }
              }}
            />
          ) : (
            <span className={Classes.EDITABLE_TEXT_CONTENT}>{hasValue ? value : placeholder}</span>
          )}
        </div>
      </div>
    );
  },
);
ExtraIngredientLine.displayName = 'ExtraIngredientLine';

interface IIngredient {
  ingredient: string;
  id: string;
}

interface IDesktopIngredients {
  ingredients: IIngredient[];
  setIngredients: (ingredients: IIngredient[]) => void;
  loaded: boolean;
  editable: boolean;
}

export function DesktopIngredients(props: IDesktopIngredients) {
  const [t] = useTranslation();

  const onDragEnd = (result: DropResult) => {
    if (result.destination === null) {
      console.log('dropped empty');
      return;
    }
    const sourceItem = props.ingredients[result.source.index];
    props.setIngredients(
      update(props.ingredients, {
        $splice: [
          [result.source.index, 1],
          [result.destination.index, 0, sourceItem],
        ],
      }),
    );
  };

  const deleteItem = (index: number) =>
    props.setIngredients(update(props.ingredients, { $splice: [[index, 1]] }));

  const ingredientsRefs: HTMLDivElement[] = [];
  let extraLineRef: HTMLDivElement | null = null;

  const replaceItem = (index: number, v: IIngredient, shouldRefocus: boolean) => {
    props.setIngredients(
      update(props.ingredients, {
        $splice: [[index, 1, v]],
      }),
    );
    if (shouldRefocus && ingredientsRefs[index + 1]) {
      setTimeout(() => {
        ingredientsRefs[index + 1].focus();
      }, 10);
    } else if (shouldRefocus) {
      setTimeout(() => {
        extraLineRef?.focus();
      }, 10);
    }
  };

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="droppable">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {props.ingredients.map((line, index) => (
                <Draggable index={index} key={line.id} draggableId={line.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      style={{
                        ...provided.draggableProps.style,
                      }}
                    >
                      <IngredientsLine
                        editable={props.editable}
                        loaded={props.loaded}
                        key={index}
                        line={line}
                        delete={() => deleteItem(index)}
                        replace={(v, shouldRefocus) => replaceItem(index, v, shouldRefocus)}
                        ref={(v) => {
                          if (v) ingredientsRefs[index] = v as HTMLDivElement;
                        }}
                        isDragging={snapshot.isDragging}
                        dragHandleProps={provided.dragHandleProps}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      {props.loaded && !props.editable && props.ingredients.length === 0 && (
        <div className="no-ingredients">{t('noIngredients')}</div>
      )}
      {!props.loaded &&
        [1, 2, 3].map((_, index) => (
          <div key={-index} className="ingredients-line">
            <Icon icon="dot" />
            <span className={classNames('ingredients-line-text', Classes.SKELETON)} />
          </div>
        ))}
      {props.editable && (
        <ExtraIngredientLine
          addIngredient={(v) => {
            props.setIngredients(
              update(props.ingredients, { $push: [{ ingredient: v, id: v4() }] }),
            );
          }}
          ref={(v) => {
            if (v) extraLineRef = v as HTMLDivElement;
          }}
        />
      )}
    </>
  );
}

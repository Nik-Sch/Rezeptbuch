import React, { useState, useRef, useEffect } from "react";
import Header from "./Header";
import { Collapse, Card, H1, Checkbox, EditableText, Icon, Button, Divider, Classes, Keys } from "@blueprintjs/core";
import { usePersistentState, useMobile } from "./helpers/CustomHooks";
import { useTranslation } from "react-i18next";
import { IDarkThemeProps } from "../App";
import { INavigationLink, NavigationLinks } from "./recipeList/RecipeListMenu";
import dayjs from "dayjs";
import DraggableList from "react-draggable-list";
import './ShoppingList.scss';
import classNames from "classnames";
import { localStorageShoppingList } from "../util/StorageKeys";

interface IShoppingItem {
  text: string;
  checked: boolean;
  addedTime: string;
  checkedTime?: string;
}

interface IItemProps {
  item: IShoppingItem;
  dragHandleProps?: object;
  commonProps: ICommonProps;
}

interface ICommonProps {
  updateElement: (newElement: IShoppingItem) => void;
  deleteElement?: (elem: IShoppingItem) => void;
}

function NewShoppingListItem(props: {
  onConfirm: (value: string) => void;
}) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState('');
  const [hover, setHover] = useState(false);

  const handleConfirm = (shouldRefocus: boolean = false) => {
    if (text.trim() !== '') {
      props.onConfirm(text);
      if (shouldRefocus) {
        setTimeout(() => {
          setIsEditing(true);
        }, 0);
      }
    }
    setIsEditing(false);
    setText('');
  }
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.which === Keys.ENTER) {
      handleConfirm(true);
    } else if (e.which === Keys.ESCAPE) {
      setIsEditing(false);
      setText('');
    }
  }

  const hoverTimeout = useRef<number>();
  const hasValue = text.trim().length > 0;

  return <div
    onMouseOver={() => {
      window.clearTimeout(hoverTimeout.current);
      hoverTimeout.current = window.setTimeout(() => setHover(true), 50);
    }}
    onMouseOut={() => {
      window.clearTimeout(hoverTimeout.current);
      hoverTimeout.current = window.setTimeout(() => setHover(false), 50);
    }}
  >
    {hover ? <Divider /> : <div className='fake-divider' />}
    <div className='shopping-item'>
      <Icon icon='blank' style={{ marginRight: '10px' }} />
      <Icon
        className='new-icon'
        icon='plus'
      />
      <div
        className={classNames(
          Classes.EDITABLE_TEXT,
          {
            [Classes.EDITABLE_TEXT_EDITING]: isEditing,
            [Classes.EDITABLE_TEXT_PLACEHOLDER]: !hasValue
          },
          'new-text'
        )}
        onFocus={() => setIsEditing(true)}
        tabIndex={isEditing ? undefined : 0}
      >
        {isEditing
          ? <input
            className={Classes.EDITABLE_TEXT_INPUT}
            onBlur={() => handleConfirm()}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            ref={input => input?.focus()}
            placeholder={t('addItem')}
            value={text}
          />
          : <span className={Classes.EDITABLE_TEXT_CONTENT}>
            {hasValue ? text : t('addItem')}
          </span>}
      </div>
    </div>
    {hover ? <Divider /> : <div className='fake-divider' />}
  </div>

}

function ShoppingListItem(props: IItemProps) {
  const [hover, setHover] = useState(false);
  const mobile = useMobile();

  const [text, setText] = useState(props.item.text);

  useEffect(() => {
    setText(props.item.text);
  }, [props.item.text]);

  const hoverTimeout = useRef<number>();

  return <div
    onMouseOver={() => {
      window.clearTimeout(hoverTimeout.current);
      hoverTimeout.current = window.setTimeout(() => setHover(true), 50);
    }}
    onMouseOut={() => {
      window.clearTimeout(hoverTimeout.current);
      hoverTimeout.current = window.setTimeout(() => setHover(false), 50);
    }}
  >
    {hover ? <Divider /> : <div className='fake-divider' />}
    <div
      className={classNames('shopping-item', props.item.checked ? Classes.TEXT_DISABLED : '')}
    >
      <Icon
        icon={hover && props.dragHandleProps ? 'drag-handle-vertical' : 'blank'}
        {...props.dragHandleProps}
        className={classNames('drag-handle', props.dragHandleProps ? 'active' : '')}
      />
      <Checkbox
        className='shopping-item-checkbox'
        checked={props.item.checked}
        onChange={(event: React.FormEvent<HTMLInputElement>) => {
          const v = event.currentTarget.checked;
          props.commonProps.updateElement({ ...props.item, checked: v });
        }}
      />
      {<EditableText
        value={text}
        minWidth={mobile ? undefined : 500}
        alwaysRenderInput={true}
        className='shopping-item-text'
        onChange={v => setText(v)}
        onConfirm={v => props.commonProps.updateElement({ ...props.item, text: v })}
      />}
      <div className='spacer' />
      {<Button
        icon='cross'
        small={true}
        minimal={true}
        onClick={() => props.commonProps.deleteElement && props.commonProps.deleteElement(props.item)}
      />}
    </div>
    {hover ? <Divider /> : <div className='fake-divider' />}
  </div>
}

class ShoppingListItemClassWrapper extends React.Component<IItemProps, Readonly<{}>> {
  render() {
    return <ShoppingListItem {...this.props} />
  }
}

interface IShoppingState {
  notChecked: IShoppingItem[];
  checked: IShoppingItem[];
  nextId: number;
  showChecked: boolean;
}

const defaultShoppingState: IShoppingState = {
  notChecked: [],
  checked: [],
  nextId: 0,
  showChecked: true
}

function CardNoCard(props: { children?: React.ReactNode; className?: string }) {
  const mobile = useMobile();
  const className = classNames(props.className, mobile ? 'mobile' : '');
  return mobile
    ? <div className={className}>
      {props.children}
    </div>
    : <Card className={className}>
      {props.children}
    </Card>
}

export function ShoppingList(props: IDarkThemeProps) {
  const [state, setState] = usePersistentState<IShoppingState>(defaultShoppingState, localStorageShoppingList);

  const { t } = useTranslation();
  const mobile = useMobile();

  const navigationLinks: INavigationLink[] = [
    { to: '/', icon: 'git-repo', text: t('recipes') },
    { to: '/shoppingList', icon: 'shopping-cart', text: t('shoppingList'), active: true }
  ];

  return <>
    <Header
      darkThemeProps={props}
      navigationLinks={navigationLinks}
    >
      <Icon
        className={classNames(Classes.BUTTON, Classes.MINIMAL)}
        icon='trash'
        intent='danger'
        iconSize={24}
        onClick={() => setState(defaultShoppingState)}
      />
    </Header>
    <div className='body'>
      {!mobile &&
        <Card className='menu'>
          <NavigationLinks
            navigationLinks={navigationLinks}
          />
        </Card>}
      <div className='main-content'>
        <CardNoCard className='shopping-list-wrapper'>
          <H1>{t('shoppingList')}</H1>
          <div className='shopping-list'>
            <DraggableList<IShoppingItem, ICommonProps, ShoppingListItemClassWrapper>
              itemKey={item => item.addedTime}
              padding={0}
              template={ShoppingListItemClassWrapper}
              list={state.notChecked}
              onMoveEnd={newList => setState(items => ({ ...items, notChecked: newList.slice() }))}
              commonProps={{
                updateElement: (newItem: IShoppingItem) => {
                  console.log(newItem.text);
                  const notChecked = state.notChecked.slice();
                  const checked = state.checked.slice();
                  const oldElemIndex = notChecked.findIndex(v => v.addedTime === newItem.addedTime);
                  if (newItem.checked) {
                    notChecked.splice(oldElemIndex, 1);
                    checked.push(newItem);
                  } else {
                    notChecked[oldElemIndex] = newItem;
                  }
                  setState(state => ({ ...state, notChecked, checked: checked.sort((a, b) => dayjs(a.addedTime).diff(b.addedTime)) }));
                },
                deleteElement: (elem: IShoppingItem) => {
                  setState(state => ({ ...state, notChecked: state.notChecked.filter(e => e.addedTime !== elem.addedTime) }));
                }
              }}
            />
            <NewShoppingListItem
              onConfirm={(text) => {
                if (text.trim().length > 0) {
                  const notChecked = state.notChecked.slice();
                  const newItem: IShoppingItem = {
                    text: text,
                    checked: false,
                    addedTime: dayjs().toJSON()
                  };
                  notChecked.push(newItem);
                  setState(state => ({ ...state, notChecked, nextId: state.nextId + 1 }));
                }
              }}
            />
            {state.checked.length > 0 && <Divider />}
            {state.checked.length > 0 && <Button
              minimal={true}
              text={t('checkedItems', { count: state.checked.length })}
              icon={state.showChecked ? 'caret-down' : 'caret-right'}
              onClick={() => setState(state => ({ ...state, showChecked: !state.showChecked }))}
            />}
            <Collapse
              isOpen={state.showChecked}
            >
              {state.checked.map(item => {
                return <ShoppingListItem
                  item={item}
                  key={item.addedTime}
                  commonProps={{
                    updateElement: (newItem: IShoppingItem) => {
                      const notChecked = state.notChecked.slice();
                      const checked = state.checked.slice();
                      const oldElemIndex = checked.findIndex(v => v.addedTime === newItem.addedTime);
                      if (!newItem.checked) {
                        checked.splice(oldElemIndex, 1);
                        notChecked.push(newItem);
                      } else {
                        checked[oldElemIndex] = newItem;
                      }
                      setState(state => ({ ...state, notChecked, checked }));
                    },
                    deleteElement: (elem: IShoppingItem) => {
                      setState(state => ({ ...state, checked: state.checked.filter(e => e.addedTime !== elem.addedTime) }));
                    }
                  }}
                />
              })}
            </Collapse>
          </div>
        </CardNoCard>
      </div>
    </div>
  </>
}
import React, { useState, useRef, useEffect } from "react";
import Header from "./Header";
import { Collapse, Card, H1, Checkbox, Icon, Button, Divider, Classes, Keys, Tooltip } from "@blueprintjs/core";
import { usePersistentState, useMobile } from "./helpers/CustomHooks";
import { useTranslation } from "react-i18next";
import { IDarkThemeProps } from "../App";
import { INavigationLink, NavigationLinks } from "./recipeList/RecipeListMenu";
import dayjs from "dayjs";
import DraggableList from "react-draggable-list";
import './ShoppingList.scss';
import classNames from "classnames";
import { localStorageShoppingList } from "../util/StorageKeys";
import { uploadShoppingList } from "../util/Notwork";

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
  const mobile = useMobile();
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState('');
  const [hover, setHover] = useState(false);

  const handleConfirm = (shouldRefocus: boolean = false) => {
    if (text.trim() !== '') {
      props.onConfirm(text);
    }
    if (!shouldRefocus) {
      setIsEditing(false);
    }
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
          'my-editable-text'
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
      <Button
        icon='blank'
        small={!mobile}
        minimal={true}
      />
    </div>
    {hover || mobile ? <Divider /> : <div className='fake-divider' />}
  </div>

}

function ShoppingListItem(props: IItemProps) {
  const [hover, setHover] = useState(false);
  const mobile = useMobile();

  const [text, setText] = useState(props.item.text);
  const [isEditing, setIsEditing] = useState(false);

  const handleConfirm = () => {
    if (text.trim() !== '') {
      props.commonProps.updateElement({ ...props.item, text });
    } else {
      props.commonProps.deleteElement && props.commonProps.deleteElement(props.item);
    }
    setIsEditing(false);
  }
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.which === Keys.ENTER) {
      handleConfirm();
    } else if (e.which === Keys.ESCAPE) {
      setIsEditing(false);
      setText('');
    }
  }

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
    {hover && !mobile ? <Divider /> : <div className='fake-divider' />}
    <div
      className={classNames('shopping-item', props.item.checked ? Classes.TEXT_DISABLED : '')}
    >
      <Icon
        icon={hover && props.dragHandleProps ? 'drag-handle-vertical' : 'blank'}
        {...props.dragHandleProps}
        className={classNames('drag-handle', props.dragHandleProps ? 'active' : '')}
      />
      <Checkbox
        large={mobile}
        className='shopping-item-checkbox'
        checked={props.item.checked}
        onChange={(event: React.FormEvent<HTMLInputElement>) => {
          const v = event.currentTarget.checked;
          props.commonProps.updateElement({ ...props.item, checked: v });
        }}
      />
      <div
        className={classNames(
          Classes.EDITABLE_TEXT,
          {
            [Classes.EDITABLE_TEXT_EDITING]: isEditing
          },
          'my-editable-text'
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
            value={text}
          />
          : <span className={Classes.EDITABLE_TEXT_CONTENT}>
            {text}
          </span>}
      </div>
      <Button
        icon='cross'
        small={!mobile}
        minimal={true}
        onClick={() => props.commonProps.deleteElement && props.commonProps.deleteElement(props.item)}
      />
    </div>
    {hover || mobile ? <Divider /> : <div className='fake-divider' />}
  </div>
}

class ShoppingListItemClassWrapper extends React.Component<IItemProps, Readonly<{}>> {
  render() {
    return <ShoppingListItem {...this.props} />
  }
}
type SyncState = 'initial-fetch' | 'uploading' | 'synced' | 'failed';

export interface IShoppingState {
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

  const [synced, setSynced] = useState<SyncState>('initial-fetch');
  const setStateWithServer = (value: IShoppingState | ((state: IShoppingState) => IShoppingState)) => {
    const newState = (typeof value === 'function') ? value(state) : value;
    setState(newState);
    setSynced('uploading');
    uploadShoppingList(newState).then(r => {
      setSynced(r ? 'synced' : 'failed');
    });
  }

  const { t } = useTranslation();
  const mobile = useMobile();

  useEffect(() => {
    const eventSource = new EventSource('/api/shoppingList');
    eventSource.onmessage = v => {
      const result: IShoppingState | null = JSON.parse(v.data);
      if (result) {
        setState(result);
        // console.log('[shopping list]', result);
      } else {
        // console.log('[shopping list]', null);
      }
      setSynced('synced');
    };
    return () => {
      eventSource.close();
      // console.log('[shopping list]', 'closed');
    };
  }, [setState]);

  const navigationLinks: INavigationLink[] = [
    { to: '/', icon: 'git-repo', text: t('recipes') },
    { to: '/shoppingList', icon: 'shopping-cart', text: t('shoppingList'), active: true }
  ];

  const commonProps = {
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
      setStateWithServer(state => ({ ...state, notChecked, checked: checked.sort((a, b) => dayjs(a.addedTime).diff(b.addedTime)) }));
    },
    deleteElement: (elem: IShoppingItem) => {
      setStateWithServer(state => ({ ...state, notChecked: state.notChecked.filter(e => e.addedTime !== elem.addedTime) }));
    }
  };

  const statusElement = <div
    className={classNames('shopping-list-status-element',
      {
        [Classes.TEXT_DISABLED]: synced === 'synced',
      })}
  >
    {synced === 'synced' &&
      <>
        {/* <Icon icon='cloud-upload' /> */}
        <span className='text'>
          {t('uploaded')}
        </span>
      </>
    }
    {synced === 'uploading' && <>
      <div className='my-spinner' />
      <span className='text'>
        {t('uploading')}
      </span>
    </>
    }
    {synced === 'initial-fetch' && <>
      <div className='my-spinner' />
      <span className='text'>
        {t('syncing')}
      </span>
    </>
    }
    {synced === 'failed' && <Tooltip content={t('retryUploading')} position='bottom'>
      <Button
        text={t('uploadingFailed')}
        icon='repeat'
        intent='danger'
        minimal={true}
        onClick={() => setStateWithServer(state)}
      />
    </Tooltip>
    }
  </div >;

  return <>
    <Header
      darkThemeProps={props}
      navigationLinks={navigationLinks}
    >
      {statusElement}
      <Icon
        className={classNames(Classes.BUTTON, Classes.MINIMAL)}
        icon='trash'
        intent='warning'
        iconSize={24}
        onClick={() => setStateWithServer(defaultShoppingState)}
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
          {!mobile && <div className='edit-container'>
            {statusElement}
            <Button
              text={t('deleteAll')}
              icon='delete'
              intent='warning'
              onClick={() => setStateWithServer(defaultShoppingState)}
            />
          </div>}
          <H1>{t('shoppingList')}</H1>
          <div className='shopping-list'>
            {mobile ?
              state.notChecked.map((item) => {
                return <ShoppingListItem
                  item={item}
                  key={item.addedTime}
                  commonProps={commonProps}
                />
              })
              : <DraggableList<IShoppingItem, ICommonProps, ShoppingListItemClassWrapper>
                itemKey={item => item.addedTime}
                padding={0}
                template={ShoppingListItemClassWrapper}
                list={state.notChecked}
                onMoveEnd={newList => setStateWithServer(items => ({ ...items, notChecked: newList.slice() }))}
                commonProps={commonProps}
              />}
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
                  setStateWithServer(state => ({ ...state, notChecked, nextId: state.nextId + 1 }));
                }
              }}
            />
            {state.checked.length > 0 && !mobile && <Divider />}
            {state.checked.length > 0 && <Button
              minimal={true}
              text={t('checkedItems', { count: state.checked.length })}
              icon={state.showChecked ? 'caret-down' : 'caret-right'}
              onClick={() => setStateWithServer(state => ({ ...state, showChecked: !state.showChecked }))}
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
                      setStateWithServer(state => ({ ...state, notChecked, checked }));
                    },
                    deleteElement: (elem: IShoppingItem) => {
                      setStateWithServer(state => ({ ...state, checked: state.checked.filter(e => e.addedTime !== elem.addedTime) }));
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
import React, { useState, useRef, useEffect, useCallback, forwardRef } from "react";
import Header from "./Header";
import { Collapse, Card, H1, Checkbox, Icon, Button, Divider, Classes, Keys, Tooltip } from "@blueprintjs/core";
import { usePersistentState, useMobile } from "./helpers/CustomHooks";
import { useTranslation } from "react-i18next";
import { IDarkThemeProps } from "../App";
import { INavigationLink, NavigationLinks } from "./recipeList/RecipeListMenu";
import dayjs from "dayjs";
import './ShoppingList.scss';
import classNames from "classnames";
import { localStorageShoppingList } from "../util/StorageKeys";
import { uploadShoppingList } from "../util/Network";
import { useDrag, useDrop, DropTargetMonitor, DndProvider, XYCoord } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import update from 'immutability-helper';

interface IShoppingItem {
  text: string;
  checked: boolean;
  addedTime: string;
  id: number;
  checkedTime?: string;
}

interface IItemProps {
  item: IShoppingItem;
  updateElement: (newElement: IShoppingItem, shouldRefocus: boolean) => void;
  deleteElement: (elem: IShoppingItem) => void;
  index: number;
  moveCard: (dragIndex: number, hoverIndex: number) => void;
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
interface DragItem {
  index: number
  id: string
  type: string
}
const ShoppingListItem = forwardRef((props: IItemProps, forwardedRef) => {
  const ref = useRef<HTMLDivElement>(null);
  const type = props.item.checked ? 'checked' : 'notChecked';
  const [, drop] = useDrop({
    accept: type,
    hover(item: DragItem, monitor: DropTargetMonitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = props.index;
      if (dragIndex === hoverIndex) {
        return;
      }
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = (clientOffset as XYCoord).y - hoverBoundingRect.top;
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }
      props.moveCard(dragIndex, hoverIndex);
      item.index = hoverIndex;
    }
  });
  const [{ isDragging }, drag] = useDrag({
    item: { type, id: props.item.id, index: props.index },
    collect: (monitor: any) => ({
      isDragging: monitor.isDragging()
    })
  });
  // drag(drop(ref));

  const [hover, setHover] = useState(false);
  const mobile = useMobile();

  const [text, setText] = useState(props.item.text);
  const [isEditing, setIsEditing] = useState(false);

  const handleConfirm = (shouldRefocus: boolean = false) => {
    if (text.trim() !== '') {
      props.updateElement({ ...props.item, text }, shouldRefocus);
    } else {
      props.deleteElement && props.deleteElement(props.item);
    }
    setIsEditing(false);
  }
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.which === Keys.ENTER) {
      handleConfirm(true);
    } else if (e.which === Keys.ESCAPE) {
      setIsEditing(false);
      setText(props.item.text);
    }
  }

  useEffect(() => {
    setText(props.item.text);
  }, [props.item.text]);

  const hoverTimeout = useRef<number>();

  return <div
    ref={drop}
    onMouseOver={() => {
      window.clearTimeout(hoverTimeout.current);
      hoverTimeout.current = window.setTimeout(() => setHover(true), 50);
    }}
    onMouseOut={() => {
      window.clearTimeout(hoverTimeout.current);
      hoverTimeout.current = window.setTimeout(() => setHover(false), 50);
    }}
    style={{ opacity: isDragging ? (mobile ? 0.5 : 0) : 1 }}
  >
    <div ref={ref}>
      {hover && !mobile ? <Divider /> : <div className='fake-divider' />}
      <div
        className={classNames('shopping-item', props.item.checked ? Classes.TEXT_DISABLED : '')}
      >
        <div ref={drag}>
          <Icon
            icon={hover || mobile ? 'drag-handle-vertical' : 'blank'}
            className={'drag-handle'}
          />
        </div>
        <Checkbox
          large={mobile}
          className='shopping-item-checkbox'
          checked={props.item.checked}
          onChange={(event: React.FormEvent<HTMLInputElement>) => {
            const v = event.currentTarget.checked;
            props.updateElement({ ...props.item, checked: v }, false);
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
          ref={forwardedRef as any}
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
          onClick={() => props.deleteElement && props.deleteElement(props.item)}
        />
      </div>
      {hover || mobile ? <Divider /> : <div className='fake-divider' />}
    </div>
  </div>
});


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

const itemsToBeAdded: string[] = [];
export function addShoppingItems(items: string[]) {
  itemsToBeAdded.push(...items);
}

export function ShoppingList(props: IDarkThemeProps) {
  const [state, setState] = usePersistentState<IShoppingState>(defaultShoppingState, localStorageShoppingList);

  const [synced, setSynced] = useState<SyncState>('initial-fetch');
  const setStateWithServer = useCallback((value: IShoppingState | ((state: IShoppingState) => IShoppingState)) => {
    const newState = (typeof value === 'function') ? value(state) : value;
    setState(newState);
    setSynced('uploading');
    uploadShoppingList(newState).then(r => {
      setSynced(r ? 'synced' : 'failed');
    });
  }, [setState, state]);

  const { t } = useTranslation();
  const mobile = useMobile();

  // itemsToBeAdded
  useEffect(() => {
    if (itemsToBeAdded.length > 0) {
      const notChecked = state.notChecked.slice(0);
      let id = state.nextId;
      for (const item of itemsToBeAdded) {
        notChecked.push({
          text: item,
          checked: false,
          addedTime: dayjs().toJSON(),
          id: id++
        });
      }
      setStateWithServer(state => ({ ...state, notChecked, nextId: id }))
      itemsToBeAdded.length = 0;
    }
  }, [setStateWithServer, state.notChecked, state.nextId]);

  // sse
  useEffect(() => {
    let eventSource = new EventSource('/api/shoppingList');

    const onMessage = (v: MessageEvent) => {
      const result: IShoppingState | null = JSON.parse(v.data);
      if (result) {
        setState(result);
        // console.log('[shopping list]', result);
      } else {
        // console.log('[shopping list]', null);
      }
      setSynced('synced');
    };
    const onError = () => {
      eventSource.close();
      eventSource = new EventSource('/api/shoppingList');
      eventSource.onmessage = onMessage;
      eventSource.onerror = onError;
    };

    eventSource.onmessage = onMessage;
    eventSource.onerror = onError;
    return () => {
      eventSource.close();
      // console.log('[shopping list]', 'closed');
    };
  }, [setState]);

  const navigationLinks: INavigationLink[] = [
    { to: '/', icon: 'git-repo', text: t('recipes') },
    { to: '/shoppingList', icon: 'shopping-cart', text: t('shoppingList'), active: true }
  ];

  const updateElement = (newItem: IShoppingItem, shouldRefocus: boolean) => {
    const notChecked = state.notChecked.slice();
    const checked = state.checked.slice();
    const oldElemIndexNotChecked = notChecked.findIndex(v => v.id === newItem.id);
    const oldElemIndexChecked = checked.findIndex(v => v.id === newItem.id);
    if (oldElemIndexNotChecked !== -1 && newItem.checked) {
      notChecked.splice(oldElemIndexNotChecked, 1);
      checked.push(newItem);
    } else if (oldElemIndexChecked !== -1 && !newItem.checked) {
      checked.splice(oldElemIndexChecked, 1);
      notChecked.push(newItem);
    } else {
      if (oldElemIndexNotChecked !== -1) {
        notChecked[oldElemIndexNotChecked] = newItem;
        if (shouldRefocus && notCheckedRefs[oldElemIndexNotChecked + 1]) {
          notCheckedRefs[oldElemIndexNotChecked + 1].focus();
        }
      }
      if (oldElemIndexChecked !== -1) {
        checked[oldElemIndexChecked] = newItem;
        if (shouldRefocus && checkedRefs[oldElemIndexChecked + 1]) {
          checkedRefs[oldElemIndexChecked + 1].focus();
        }
      }
    }
    setStateWithServer(state => ({ ...state, notChecked, checked: checked.sort((a, b) => dayjs(a.addedTime).diff(b.addedTime)) }));
  };

  const deleteElement = (elem: IShoppingItem) => {
    setStateWithServer(state => ({
      ...state,
      notChecked: state.notChecked.filter(e => e.id !== elem.id),
      checked: state.checked.filter(e => e.id !== elem.id),
    }));
  };

  const moveCardNotChecked = useCallback((dragIndex: number, hoverIndex: number) => {
    setStateWithServer(state => {
      const dragItem = state.notChecked[dragIndex];
      return {
        ...state, notChecked: update(state.notChecked, {
          $splice: [
            [dragIndex, 1],
            [hoverIndex, 0, dragItem]
          ]
        })
      }
    })
  }, [setStateWithServer]);
  const moveCardChecked = useCallback((dragIndex: number, hoverIndex: number) => {
    setStateWithServer(state => {
      const dragItem = state.checked[dragIndex];
      return {
        ...state, checked: update(state.checked, {
          $splice: [
            [dragIndex, 1],
            [hoverIndex, 0, dragItem]
          ]
        })
      }
    })
  }, [setStateWithServer]);

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


  const checkedRefs: HTMLDivElement[] = [];
  const notCheckedRefs: HTMLDivElement[] = [];
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
            <DndProvider backend={mobile ? TouchBackend : HTML5Backend}>
              {state.notChecked.map((item, index) => {
                return <ShoppingListItem
                  item={item}
                  key={item.id}
                  deleteElement={deleteElement}
                  updateElement={updateElement}
                  moveCard={moveCardNotChecked}
                  index={index}
                  ref={(v: HTMLDivElement) => {
                    if (v) {
                      notCheckedRefs[index] = v;
                    }
                  }}
                />
              })}
            </DndProvider>
            <NewShoppingListItem
              onConfirm={(text) => {
                if (text.trim().length > 0) {
                  const notChecked = state.notChecked.slice();
                  const newItem: IShoppingItem = {
                    text: text,
                    checked: false,
                    addedTime: dayjs().toJSON(),
                    id: state.nextId
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
              <DndProvider backend={mobile ? TouchBackend : HTML5Backend}>
                {state.checked.map((item, index) => {
                  return <ShoppingListItem
                    item={item}
                    key={item.id}
                    updateElement={updateElement}
                    deleteElement={deleteElement}
                    moveCard={moveCardChecked}
                    index={index}
                    ref={(v: HTMLDivElement) => {
                      if (v) {
                        checkedRefs[index] = v;
                      }
                    }}
                  />
                })}
              </DndProvider>
            </Collapse>
          </div>
        </CardNoCard>
      </div>
    </div>
  </>
}
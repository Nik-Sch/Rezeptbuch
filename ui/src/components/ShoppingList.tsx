import React, { useState, useRef, useEffect, useCallback, forwardRef } from "react";
import Header from "./Header";
import { Collapse, Card, H1, Checkbox, Icon, Button, Divider, Classes, Keys, Tooltip, Text } from "@blueprintjs/core";
import { usePersistentState, useMobile } from "./helpers/CustomHooks";
import { useTranslation } from "react-i18next";
import { IDarkThemeProps } from "../App";
import { INavigationLink, NavigationLinks } from "./recipeList/RecipeListMenu";
import dayjs from "dayjs";
import './ShoppingList.scss';
import classNames from "classnames";
import { localStorageShoppingList } from "../util/StorageKeys";
import { updateShoppingItem } from "../util/Network";
import { useDrag, useDrop, DropTargetMonitor, DndProvider, XYCoord } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import update from 'immutability-helper';
import {v4 as uuidv4} from 'uuid';

export interface IShoppingItem {
  text: string;
  checked: boolean;
  addedTime: string;
  id: string;
  position: number;
}

interface IItemProps {
  item: IShoppingItem;
  updateElement: (newElement: IShoppingItem, shouldRefocus: boolean) => void;
  deleteElement: (elem: IShoppingItem) => void;
  index: number;
  moveCard: (dragIndex: number, hoverIndex: number) => void;
  dndFinised: () => void;
}

function NewShoppingListItem(props: {
  onConfirm: (...value: string[]) => void;
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
            onPaste={e => {
              const data = e.clipboardData.getData('text').split('\n').map(v => v.trim()).filter(v => v.length > 0);
              if (data.length > 1) {
                props.onConfirm(...data);
                e.preventDefault();
              }
            }}
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
    }),
    end: () => {
      props.dndFinised();
    }
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


type SyncState = 'initial-fetch' | 'uploading' | 'synced' | 'offline';

export interface IShoppingState {
  items: IShoppingItem[];
  showChecked: boolean;
}

const defaultShoppingState: IShoppingState = {
  items: [],
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
  const { t } = useTranslation();
  const mobile = useMobile();
  const [online, setOnline] = useState(navigator.onLine);

  const [state, setState] = usePersistentState<IShoppingState>(defaultShoppingState, localStorageShoppingList);

  if (typeof (state as any).checked !== 'undefined') {
    console.log('updating state', state);
    window.localStorage.setItem(localStorageShoppingList, JSON.stringify(defaultShoppingState));
  }

  const [synced, setSynced] = useState<SyncState>('initial-fetch');

  // itemsToBeAdded
  useEffect(() => {
    if (itemsToBeAdded.length > 0) {
      const items = itemsToBeAdded.map((text, i) => {
        return {
          text: text,
          checked: false,
          addedTime: dayjs().toJSON(),
          id: uuidv4(),
          position: i + state.items.filter(v => !v.checked).reduce((p, v) => Math.max(p, v.position), 0) + 1
        };
      });
      itemsToBeAdded.splice(0, itemsToBeAdded.length);
      (async () => {
        setSynced('uploading');
        await updateShoppingItem(items, 'POST');
        setSynced('synced');
        // comes over the sse
        // setState({ ...state, items: state.items.concat(items) });
      })();
      
    }
  }, [state]);

  // online
  useEffect(() => {
    const handle = () => {
      setOnline(navigator.onLine);
      if (!navigator.onLine) {
        setSynced('offline');
      }
    }

    window.addEventListener('online', handle);
    window.addEventListener('offline', handle);
    return () => {
      window.removeEventListener('online', handle);
      window.removeEventListener('offline', handle);
    }
  }, []);

  // sse
  useEffect(() => {
    if (online) {
      setSynced('initial-fetch');
      let eventSource = new EventSource('/api/shoppingList');

      const onMessage = (v: MessageEvent) => {
        const result: IShoppingItem[] | null = JSON.parse(v.data);
        console.log("sse message: ", v);
        if (result) {
          setState(state => ({...state, items: result}));
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
        console.log('[shopping list]', 'closed');
      };
    } else {
      setSynced('offline');
    }
  }, [online]);

  const navigationLinks: INavigationLink[] = [
    { to: '/', icon: 'git-repo', text: t('recipes') },
    { to: '/shoppingList', icon: 'shopping-cart', text: t('shoppingList'), active: true }
  ];

  const updateElement = (changedItem: IShoppingItem, shouldRefocus: boolean) => {
    const oldItem = state.items.find(v => v.id === changedItem.id);
    if (typeof oldItem === 'undefined') {
      throw new Error('didnt find the item');
    }
    let newPosition = changedItem.position;
    if (oldItem.checked && !changedItem.checked) {
      newPosition = state.items.filter(v => !v.checked).reduce((p, v) => Math.max(p, v.position), 0) + 1;
    } else if (!oldItem.checked && changedItem.checked) {
      newPosition = state.items.filter(v => v.checked).reduce((p, v) => Math.max(p, v.position), 0) + 1;
    }
    const newItem = update(changedItem, {
      position: {$set: newPosition}
    });
    setState({...state, items: state.items.map(v => v.id === newItem.id ? newItem : v)});
    (async () => {
      setSynced('uploading');
      await updateShoppingItem([newItem], 'PUT');
      setSynced('synced');
    })();
      //   notChecked[oldElemIndexNotChecked] = newItem;
      //   if (shouldRefocus && notCheckedRefs[oldElemIndexNotChecked + 1]) {
      //     notCheckedRefs[oldElemIndexNotChecked + 1].focus();
      //   }
      // }
      // if (oldElemIndexChecked !== -1) {
      //   checked[oldElemIndexChecked] = newItem;
      //   if (shouldRefocus && checkedRefs[oldElemIndexChecked + 1]) {
      //     checkedRefs[oldElemIndexChecked + 1].focus();
      //   }
      // }
  };

  const deleteElement = (item: IShoppingItem) => {
    setState({ ...state, items: state.items.filter(v => v.id !== item.id) });
    (async () => {
      setSynced('uploading');
      await updateShoppingItem([item], 'DELETE');
      setSynced('synced')
    })();
  };

  const moveCardNotChecked = useCallback((dragIndex: number, hoverIndex: number) => {
    const list = state.items.filter(v => !v.checked).sort((v, w) => v.position - w.position);
    const dragItem = list[dragIndex];
    const newItems = update(list, {
        $splice: [
          [dragIndex, 1],
          [hoverIndex, 0, dragItem]
        ]
      });
      newItems.forEach((item, i) => {
        if (item.position !== i) {
          item.position = i;
        }
      });
      setState({...state, items: state.items.filter(v => v.checked).concat(newItems)});
  }, [state]);

  const moveCardChecked = useCallback((dragIndex: number, hoverIndex: number) => {
    const list = state.items.filter(v => v.checked).sort((v, w) => v.position - w.position);
    const dragItem = list[dragIndex];
    const newItems = update(list, {
      $splice: [
        [dragIndex, 1],
        [hoverIndex, 0, dragItem]
      ]
    });
    newItems.forEach((item, i) => {
      if (item.position !== i) {
        item.position = i;
      }
    });
    setState({ ...state, items: state.items.filter(v => !v.checked).concat(newItems) });
  }, [state]);

  const statusElement = <div
    className={classNames('shopping-list-status-element',
      {
        [Classes.TEXT_DISABLED]: synced === 'synced' || synced === 'offline',
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
    {synced === 'offline' && <>
      <Icon icon='offline' intent='danger' />
      <Text className='text'>
        {t('shoppingOffline')}
      </Text>
    </>}
  </div >;


  const itemRefs: Map<string, HTMLDivElement> = new Map();
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
        onClick={() => {
            updateShoppingItem(state.items, 'DELETE');
          setState({ ...state, items: [] });
        }}
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
              onClick={() => {
                setState({ ...state, items: [] });
                (async () => {
                  setSynced('uploading');
                  await updateShoppingItem(state.items, 'DELETE');
                  setSynced('synced');
                })();
              }}
            />
          </div>}
          <H1>{t('shoppingList')}</H1>
          <div className='shopping-list'>
            <DndProvider backend={mobile ? TouchBackend : HTML5Backend}>
              {state.items.filter(v => !v.checked).sort((v, w) => v.position - w.position).map((item, index) => {
                return <ShoppingListItem
                  item={item}
                  key={item.id}
                  deleteElement={deleteElement}
                  updateElement={updateElement}
                  moveCard={moveCardNotChecked}
                  dndFinised={() => {
                    (async () => {
                      setSynced('uploading');
                      await updateShoppingItem(state.items, 'PUT');
                      setSynced('synced');
                    })();
                  }}
                  index={index}
                  ref={(v: HTMLDivElement) => {
                    if (v) {
                      itemRefs.set(item.id, v);
                    }
                  }}
                />
              })}
            </DndProvider>
            <NewShoppingListItem
              onConfirm={(...itemsToBeAdded: string[]) => {
                const items = itemsToBeAdded.map((text, i) => {
                  return {
                    text: text,
                    checked: false,
                    addedTime: dayjs().toJSON(),
                    id: uuidv4(),
                    position: i + state.items.filter(v => !v.checked).reduce((p, v) => Math.max(p, v.position), 0) + 1
                  };
                });
                setState(state => ({ ...state, items: state.items.concat(items) }));
                (async () => {
                  setSynced('uploading');
                  await updateShoppingItem(items, 'POST');
                  setSynced('synced');
                })();
              }}
            />
            {state.items.filter(v => v.checked).length > 0 && !mobile && <Divider />}
            {state.items.filter(v => v.checked).length > 0 && <Button
              minimal={true}
              text={t('checkedItems', { count: state.items.filter(v => v.checked).length })}
              icon={state.showChecked ? 'caret-down' : 'caret-right'}
              onClick={() => setState(state => ({ ...state, showChecked: !state.showChecked }))}
            />}
            <Collapse
              isOpen={state.showChecked}
            >
              <DndProvider backend={mobile ? TouchBackend : HTML5Backend}>
                {state.items.filter(v => v.checked).sort((v, w) => v.position - w.position).map((item, index) => {
                  return <ShoppingListItem
                    item={item}
                    key={item.id}
                    updateElement={updateElement}
                    deleteElement={deleteElement}
                    moveCard={moveCardChecked}
                    dndFinised={() => {
                      (async () => {
                        setSynced('uploading');
                        await updateShoppingItem(state.items, 'PUT');
                        setSynced('synced');
                      })();
                    }}
                    index={index}
                    ref={(v: HTMLDivElement) => {
                      if (v) {
                        itemRefs.set(item.id, v);
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
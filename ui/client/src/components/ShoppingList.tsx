import React, { useState, useRef, useEffect, useCallback, forwardRef } from "react";
import MobileHeader from "./MobileHeader";
import { Collapse, H1, Checkbox, Icon, Button, Divider, Classes, Keys, Text, MenuItem, AnchorButton, ButtonGroup, InputGroup, Dialog, Radio, RadioGroup } from "@blueprintjs/core";
import { usePersistentState, useMobile } from "./helpers/CustomHooks";
import { useTranslation } from "react-i18next";
import { IDarkThemeProps } from "../App";
import SideMenu, { INavigationLink } from "./SideMenu";
import dayjs from "dayjs";
import './ShoppingList.scss';
import classNames from "classnames";
import { localStorageShoppingList } from "../util/StorageKeys";
import recipesHandler, { getShoppingListUrl, getUserInfo, updateShoppingItem } from "../util/Network";
import { useDrag, useDrop, DropTargetMonitor, DndProvider, XYCoord } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import update from 'immutability-helper';
import { v4 as uuidv4 } from 'uuid';
import { Select2 } from "@blueprintjs/select";
import { useNavigate, useParams } from "react-router-dom";
import { Popover2, Tooltip2, Classes as Classes2 } from "@blueprintjs/popover2";
import { shareLink } from "./recipe/ShareButton";

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
  dndFinished: () => void;
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
    {hover ? <Divider /> : <div className='fake-divider' />}
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
  const [, drop] = useDrop<DragItem, void>(() => ({
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
  }));
  const [{ isDragging }, drag] = useDrag({
    type,
    item: () => ({ id: props.item.id, index: props.index }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    }),
    end: () => {
      props.dndFinished();
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
    if (e.key === 'Enter') {
      handleConfirm(true);
    } else if (e.key === 'Escape') {
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
      {hover ? <Divider /> : <div className='fake-divider' />}
    </div>
  </div>
});


type SyncState = 'initial-fetch' | 'uploading' | 'synced' | 'offline';


export interface ISingleShoppingList {
  items: IShoppingItem[];
  name?: string;
}

export interface IShoppingListState {
  lists: { [key: string]: ISingleShoppingList };
  showChecked: boolean;
  active: string;
}

const defaultShoppingList: ISingleShoppingList = {
  items: [],
  name: 'Private'
}

const defaultState: IShoppingListState = {
  lists: { 'default': defaultShoppingList },
  showChecked: true,
  active: 'default'
}

const itemsToBeAdded: string[] = [];
export function addShoppingItems(items: string[]) {
  itemsToBeAdded.push(...items);
}

function ShoppingListSelect(props: {
  parentState: IShoppingListState;
  onItemSelect: (key: string, value: ISingleShoppingList) => void;
  onItemDelete: (key: string) => void;
}) {
  const { parentState } = props;
  const { t } = useTranslation();
  const mobile = useMobile();
  const [newListName, setNewListName] = useState('');
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [deleteKey, setDeleteKey] = useState<string | null>(null);

  const ShoppingListSelect = Select2.ofType<{ key: string, value: ISingleShoppingList }>();

  const createNewList = () => {
    props.onItemSelect(uuidv4(), {
      items: [],
      name: newListName
    });
    setNewListName('');
    setPopoverOpen(false);
  };

  const newListInput = <InputGroup
    autoFocus={true}
    large={mobile}
    value={newListName}
    onChange={e => setNewListName(e.target.value)}
    placeholder={t('newShoppingListPlaceholder')}
    onKeyDown={e => {
      if (e.key === 'Enter') {
        createNewList();
        setPopoverOpen(false);
      }
    }}
  />;

  return <ButtonGroup>
    <Dialog
      isOpen={deleteKey !== null}
      title={t('deleteShoppingList', { name: parentState.lists[deleteKey ?? '']?.name })}
      isCloseButtonShown={true}
      onClose={() => setDeleteKey(null)}
    >
      <div className={Classes.DIALOG_BODY} />
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button
            text={t('cancel')}
            onClick={() => setDeleteKey(null)}
          />
          <Button
            intent='danger'
            text={t('delete')}
            onClick={() => {
              props.onItemDelete(deleteKey ?? '');
              setDeleteKey(null);
            }}
          />
        </div>
      </div>
    </Dialog>
    <ShoppingListSelect
      items={Object.entries(parentState.lists).map(([key, value]) => ({ key, value }))}
      filterable={false}
      itemRenderer={(item, { handleClick, modifiers }) => modifiers.matchesPredicate
        ? <MenuItem
          selected={modifiers.active}
          key={item.key}
          text={item.value.name ?? 'Private'}
          onClick={handleClick}
          labelElement={item.key === 'default' ? undefined : <Button
            icon='cross'
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              setDeleteKey(item.key);
            }}
            minimal={true}
            small={true}
          />}
        />
        : null}
      itemsEqual='key'
      activeItem={{ key: props.parentState.active, value: props.parentState.lists[props.parentState.active] }}
      resetOnClose={true}
      onItemSelect={item => props.onItemSelect(item.key, item.value)}
    >
      <Button
        text={t('shoppingListName', { name: parentState.lists[parentState.active].name ?? 'Private' })}
        rightIcon='double-caret-vertical'
        large={true}
      />
    </ShoppingListSelect>
    <Popover2
      disabled={mobile}
      isOpen={popoverOpen}
      onInteraction={newState => setPopoverOpen(newState)}
      popoverClassName={Classes2.POPOVER2_CONTENT_SIZING}
      content={<div className='create-shopping-list-popover'>
        {newListInput}
        <Button
          className={Classes2.POPOVER2_DISMISS}
          text={t('create')}
          intent='success'
          onClick={createNewList}
        />
      </div>}
      renderTarget={({ isOpen, ref, ...targetProps }) => (
        <Button
          {...targetProps}
          elementRef={ref as any}
          intent='primary'
          icon='add'
          large={true}
          onClick={mobile ? () => setPopoverOpen(true) : (targetProps as any).onClick}
        />
      )}
    />
    <Dialog
      isOpen={mobile && popoverOpen}
      onClose={() => setPopoverOpen(false)}
      title={t('createNewList')}
    >
      <div className={Classes.DIALOG_BODY}>
        {newListInput}
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button
            large={true}
            className={Classes2.POPOVER2_DISMISS}
            text={t('create')}
            intent='success'
            onClick={createNewList}
          />
        </div>
      </div>
    </Dialog>
  </ButtonGroup>
}

export default function ShoppingList(props: IDarkThemeProps) {

  const { listKey, listName } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const mobile = useMobile();
  const authenticated = typeof getUserInfo() !== 'undefined';

  document.title = t('shoppingList');

  const [online, setOnline] = useState(navigator.onLine);

  const [state, setState] = usePersistentState<IShoppingListState>(defaultState, localStorageShoppingList);

  const [itemsToBeAddedDialog, setItemsToBeAddedDialog] = useState<IShoppingItem[]>([]);

  const [synced, setSynced] = useState<SyncState>('initial-fetch');

  const [shoppingListSelectValue, setShoppingListSelectValue] = useState<string>();

  const [updateQueue, setUpdateQueue] = useState<{
    listKey: string,
    items: IShoppingItem[],
    method: 'DELETE' | 'POST' | 'PUT'
  }[]>([]);

  // fetch recipes to refresh the login information
  useEffect(() => {
    recipesHandler.fetchData();
  }, []);


  const updateItems = useCallback(async (listKey: string, items: IShoppingItem[], method: 'DELETE' | 'POST' | 'PUT') => {
    if (online) {
      setSynced('uploading');
      await updateShoppingItem(listKey, items, method);
      setSynced('synced');
    } else {
      setUpdateQueue(updateQueue.concat({ listKey, items, method }));
    }
  }, [online, updateQueue]);

  // itemsToBeAdded
  useEffect(() => {
    // list key is set when not authenticated or when adding a new shopping list
    if (typeof listKey === 'undefined' && itemsToBeAdded.length > 0) {
      const items: IShoppingItem[] = itemsToBeAdded.map((text, i) => {
        return {
          text: text,
          checked: false,
          addedTime: dayjs().toJSON(),
          id: uuidv4(),
          position: i + state.lists[state.active].items.filter(v => !v.checked).reduce((p, v) => Math.max(p, v.position), 0) + 1
        };
      });
      itemsToBeAdded.splice(0, itemsToBeAdded.length);
      if (Object.keys(state.lists).length === 1) {
        (async () => {
          await updateItems(state.active, items, 'POST');
        })();
      } else {
        setItemsToBeAddedDialog(items);
      }

    }
  }, [listKey, state, updateItems]);

  // online
  useEffect(() => {
    const handle = async () => {
      setOnline(navigator.onLine);
      if (!navigator.onLine) {
        setSynced('offline');
      } else {
        setSynced('uploading');
      }
    }

    window.addEventListener('online', handle);
    window.addEventListener('offline', handle);
    return () => {
      window.removeEventListener('online', handle);
      window.removeEventListener('offline', handle);
    }
  }, [state.active]);

  useEffect(() => {
    if (online && updateQueue.length > 0) {
      (async () => {
        setSynced('uploading');
        let element = updateQueue[0];
        await updateShoppingItem(element.listKey, element.items, element.method);
        setUpdateQueue(queue => {
          return queue.slice(1);
        })
      })();
    } else {

      setSynced('synced');
    }
  }, [online, updateQueue]);

  // sse
  useEffect(() => {
    if (online) {
      setSynced('initial-fetch');
      let eventSource = new EventSource(getShoppingListUrl(state.active));

      const onMessage = (v: MessageEvent) => {
        const result: IShoppingItem[] | null = JSON.parse(v.data);
        console.log(`sse message for ${state.active}:`, result);
        if (result) {
          setState(state => update(state, {
            lists: {
              [state.active]: {
                items: {
                  $set: result
                }
              }
            }
          }));
        }
        setSynced('synced');
      };
      const onError = () => {
        eventSource.close();
        eventSource = new EventSource(getShoppingListUrl(state.active));
        eventSource.onmessage = onMessage;
        eventSource.onerror = onError;
      };

      eventSource.onmessage = onMessage;
      eventSource.onerror = onError;
      return () => {
        eventSource.close();
        console.log(`[shopping list] sse for ${state.active} closed`);
      };
    } else {
      setSynced('offline');
    }
  }, [online, setState, state.active]);

  useEffect(() => {
    if (listKey) {
      if (authenticated) {
        const newState = update(state, {
          lists: {
            $merge: {
              [listKey]: {
                items: [],
                name: listName
              }
            }
          },
          active: {
            $set: listKey
          }
        });
        // set state doesn't work when navigating away
        localStorage.setItem(localStorageShoppingList, JSON.stringify(newState));
        navigate('/shoppingList');
      } else if (state.active !== listKey) {
        setState({
          active: listKey,
          lists: {
            [listKey]: {
              items: [],
              name: listName
            }
          },
          showChecked: true
        });
      }
    }
  }, [authenticated, listKey, listName, navigate, setState, state]);

  // was previously only a single shoppinglist
  if (typeof (state as any).lists === 'undefined') {
    console.log('updating state', state);
    const newList: ISingleShoppingList = {
      items: (state as any).items,
      name: 'Private'
    };
    setState({
      lists: { 'default': newList },
      active: 'default',
      showChecked: state.showChecked
    });
    return <></>;
  }

  const navigationLinks: INavigationLink[] = [
    { to: '/', icon: 'git-repo', text: t('recipes') },
    { to: '/shoppingList', icon: 'shopping-cart', text: t('shoppingList'), active: true }
  ];

  const updateElement = (changedItem: IShoppingItem, shouldRefocus: boolean) => {
    const oldItem = state.lists[state.active].items.find(v => v.id === changedItem.id);
    if (typeof oldItem === 'undefined') {
      throw new Error('didnt find the item');
    }
    let newPosition = changedItem.position;
    if (oldItem.checked && !changedItem.checked) {
      newPosition = state.lists[state.active].items.filter(v => !v.checked).reduce((p, v) => Math.max(p, v.position), 0) + 1;
    } else if (!oldItem.checked && changedItem.checked) {
      newPosition = state.lists[state.active].items.filter(v => v.checked).reduce((p, v) => Math.max(p, v.position), 0) + 1;
    }
    const newItem = update(changedItem, {
      position: { $set: newPosition }
    });
    setState(update(state, {
      lists: {
        [state.active]: {
          items: {
            $apply: (items: IShoppingItem[]) => items.map(v => v.id === newItem.id ? newItem : v)
          }
        }
      }
    }));
    (async () => {
      await updateItems(state.active, [newItem], 'PUT');
    })();
  };

  const deleteElement = (item: IShoppingItem) => {
    setState(update(state, {
      lists: {
        [state.active]: {
          items: {
            $apply: (items: IShoppingItem[]) => items.filter(v => v.id !== item.id)
          }
        }
      }
    }));
    (async () => {
      await updateItems(state.active, [item], 'DELETE');
    })();
  };

  const moveCardNotChecked = (dragIndex: number, hoverIndex: number) => {
    setState(state => {
      const list = state.lists[state.active].items.filter(v => !v.checked).sort((v, w) => v.position - w.position);
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

      return update(state, {
        lists: {
          [state.active]: {
            items: {
              $apply: (items: IShoppingItem[]) => items.filter(v => v.checked).concat(newItems)
            }
          }
        }
      });
    });
  };

  const moveCardChecked = (dragIndex: number, hoverIndex: number) => {
    setState(state => {
      const list = state.lists[state.active].items.filter(v => v.checked).sort((v, w) => v.position - w.position);
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
      return update(state, {
        lists: {
          [state.active]: {
            items: {
              $apply: (items: IShoppingItem[]) => items.filter(v => !v.checked).concat(newItems)
            }
          }
        }
      });
    });
  };

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

  const removeAllItems = () => {
    updateItems(state.active, state.lists[state.active].items, 'DELETE');
    setState(state => update(state, {
      lists: {
        [state.active]: {
          items: {
            $set: []
          }
        }
      }
    }));
  };

  const shareShoppingList = () => {
    if (state.active !== 'default') {
      shareLink(`${document.location.origin}/shoppingLists/${state.active}/${state.lists[state.active].name}`);
    }
  };


  const itemRefs: Map<string, HTMLDivElement> = new Map();
  return <>
    <Dialog
      isOpen={itemsToBeAddedDialog.length > 0}
      title={t('selectShoppingList')}
      onClose={() => setItemsToBeAddedDialog([])}
    >
      <div className={Classes.DIALOG_BODY}>
        <div className='shopping-list-select-list'>
          <RadioGroup
            selectedValue={shoppingListSelectValue}
            onChange={e => setShoppingListSelectValue(e.currentTarget.value)}
          >
            {
              Object.entries(state.lists).map(([key, value]) => (<Radio
                id={key}
                value={key}
                label={value.name}
                large={true}
              />))
            }
          </RadioGroup>
        </div>
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button
            text={t('cancel')}
            intent='danger'
            onClick={() => setItemsToBeAddedDialog([])}
          />
          <Button
            text={t('add')}
            intent='success'
            disabled={typeof shoppingListSelectValue === 'undefined'}
            onClick={() => {
              const items = itemsToBeAddedDialog.slice();
              setItemsToBeAddedDialog([]);
              setState(state => ({ ...state, active: shoppingListSelectValue ?? '' }));
              (async () => {
                await updateItems(shoppingListSelectValue ?? '', items, 'POST');
              })()
            }}
          />
        </div>
      </div>
    </Dialog>
    {mobile && <MobileHeader
      darkThemeProps={props}
      navigationLinks={navigationLinks}
    >
      {statusElement}
      <Icon
        className={classNames(Classes.BUTTON, Classes.MINIMAL, state.active === 'default' && Classes.DISABLED)}
        icon='share'
        intent='primary'
        iconSize={24}
        onClick={shareShoppingList}
      />
      <Icon
        className={classNames(Classes.BUTTON, Classes.MINIMAL)}
        icon='trash'
        intent='warning'
        iconSize={24}
        onClick={removeAllItems}
      />
    </MobileHeader>}
    <div className='body'>
      {!mobile && <SideMenu darkModeProps={props} currentNavigation='shopping-list' />}
      <div className='main-content'>
        <div className='shopping-list-wrapper'>
          <div className='shopping-list-head'>
            {authenticated ?
              <ShoppingListSelect
                onItemSelect={(key, value) => setState(state => update(state, {
                  active: {
                    $set: key
                  },
                  lists: {
                    $merge: {
                      [key]: value
                    }
                  }
                }))}
                onItemDelete={key => setState(state => {
                  const x = update(state, {
                    active: {
                      $set: 'default'
                    },
                    lists: {
                      $unset: [key]
                    }
                  });
                  console.log(x);
                  return x;
                })}
                parentState={state}
              />
              : <H1>{`${state.lists[state.active].name} Shopping List`}</H1>
            }
            {!mobile && <div className='edit-container'>
              {statusElement}
              <ButtonGroup vertical={false} alignText='right'>
                <Tooltip2
                  content={state.active === 'default' ? t('shoppingListNoShare') : t('shoppingListShare')}
                  position='bottom'
                >
                  <AnchorButton
                    icon='share'
                    minimal={mobile}
                    large={mobile}
                    text={mobile ? undefined : t('share')}
                    disabled={state.active === 'default'}
                    intent='primary'
                    onClick={shareShoppingList}
                  />
                </Tooltip2>
                <Button
                  text={t('deleteAll')}
                  icon='trash'
                  intent='warning'
                  onClick={removeAllItems}
                />
              </ButtonGroup>
            </div>}
          </div>
          <div className='shopping-list'>
            <DndProvider backend={mobile ? TouchBackend : HTML5Backend}>
              {state.lists[state.active].items.filter(v => !v.checked).sort((v, w) => v.position - w.position).map((item, index) => {
                return <ShoppingListItem
                  item={item}
                  key={item.id}
                  deleteElement={deleteElement}
                  updateElement={updateElement}
                  moveCard={moveCardNotChecked}
                  dndFinished={() => updateItems(state.active, state.lists[state.active].items, 'PUT')}
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
                    position: i + state.lists[state.active].items.filter(v => !v.checked).reduce((p, v) => Math.max(p, v.position), 0) + 1
                  };
                });
                setState(state => update(state, {
                  lists: {
                    [state.active]: {
                      items: {
                        $push: items
                      }
                    }
                  }
                }));
                updateItems(state.active, items, 'POST');
              }}
            />
            {state.lists[state.active].items.filter(v => v.checked).length > 0 && !mobile && <Divider />}
            {state.lists[state.active].items.filter(v => v.checked).length > 0 && <Button
              minimal={true}
              text={t('checkedItems', { count: state.lists[state.active].items.filter(v => v.checked).length })}
              icon={state.showChecked ? 'caret-down' : 'caret-right'}
              onClick={() => setState(state => ({ ...state, showChecked: !state.showChecked }))}
            />}
            <Collapse
              isOpen={state.showChecked}
            >
              <DndProvider backend={mobile ? TouchBackend : HTML5Backend}>
                {state.lists[state.active].items.filter(v => v.checked).sort((v, w) => v.position - w.position).map((item, index) => {
                  return <ShoppingListItem
                    item={item}
                    key={item.id}
                    updateElement={updateElement}
                    deleteElement={deleteElement}
                    moveCard={moveCardChecked}
                    dndFinished={() => updateItems(state.active, state.lists[state.active].items, 'PUT')}
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
        </div>
      </div>
    </div>
  </>
}
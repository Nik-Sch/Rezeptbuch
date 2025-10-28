import React, { useState, useRef, useEffect, useCallback } from 'react';
import MobileHeader from './MobileHeader';
import {
  Collapse,
  H1,
  Checkbox,
  Icon,
  Button,
  Divider,
  Classes,
  Text,
  MenuItem,
  AnchorButton,
  ButtonGroup,
  InputGroup,
  Dialog,
  Radio,
  RadioGroup,
  Popover,
  Tooltip,
  DialogBody,
  DialogFooter,
} from '@blueprintjs/core';
import { usePersistentState, useMobile } from './helpers/CustomHooks';
import { useTranslation } from 'react-i18next';
import { IDarkThemeProps } from '../App';
import SideMenu, { INavigationLink } from './SideMenu';
import dayjs from 'dayjs';
import './ShoppingList.scss';
import classNames from 'classnames';
import { localStorageShoppingList } from '../util/StorageKeys';
import recipesHandler, {
  getShoppingLists,
  getShoppingListUrl,
  getUserInfo,
  updateShoppingItem,
  updateShoppingLists,
} from '../util/Network';
import {
  DragDropContext,
  Draggable,
  DraggableProvidedDragHandleProps,
  Droppable,
  DropResult,
} from '@hello-pangea/dnd';
import update from 'immutability-helper';
import { v4 as uuidv4 } from 'uuid';
import { Select } from '@blueprintjs/select';
import { useNavigate, useParams } from 'react-router-dom';
import { shareLink } from './recipe/ShareButton';

export interface IShoppingItem {
  text: string;
  checked: boolean;
  addedTime: string;
  id: string;
  position: number;
}

interface IItemProps {
  isDragging: boolean;
  dragHandleProps: DraggableProvidedDragHandleProps | null;
  item: IShoppingItem;
  updateElement: (newElement: IShoppingItem, shouldRefocus: boolean) => void;
  deleteElement: (elem: IShoppingItem) => void;
}

function NewShoppingListItem(props: { onConfirm: (...value: string[]) => void }) {
  const { t } = useTranslation();
  const mobile = useMobile();
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState('');
  const [hover, setHover] = useState(false);

  const handleConfirm = (shouldRefocus = false) => {
    if (text.trim() !== '') {
      props.onConfirm(text);
    }
    if (!shouldRefocus) {
      setIsEditing(false);
    }
    setText('');
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleConfirm(true);
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setText('');
    }
  };

  const hoverTimeout = useRef<number>();
  const hasValue = text.trim().length > 0;

  return (
    <div
      onMouseOver={() => {
        window.clearTimeout(hoverTimeout.current);
        hoverTimeout.current = window.setTimeout(() => setHover(true), 50);
      }}
      onMouseOut={() => {
        window.clearTimeout(hoverTimeout.current);
        hoverTimeout.current = window.setTimeout(() => setHover(false), 50);
      }}
    >
      {hover ? <Divider /> : <div className="fake-divider" />}
      <div className="shopping-item">
        <Icon icon="blank" style={{ marginRight: '10px' }} />
        <Icon className="new-icon" icon="plus" />
        <div
          className={classNames(
            Classes.EDITABLE_TEXT,
            {
              [Classes.EDITABLE_TEXT_EDITING]: isEditing,
              [Classes.EDITABLE_TEXT_PLACEHOLDER]: !hasValue,
            },
            'my-editable-text',
          )}
          onFocus={() => setIsEditing(true)}
          tabIndex={isEditing ? undefined : 0}
        >
          {isEditing ? (
            <input
              className={Classes.EDITABLE_TEXT_INPUT}
              onBlur={() => handleConfirm()}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              ref={(input) => input?.focus()}
              placeholder={t('addItem')}
              value={text}
              onPaste={(e) => {
                const data = e.clipboardData
                  .getData('text')
                  .split('\n')
                  .map((v) => v.trim())
                  .filter((v) => v.length > 0);
                if (data.length > 1) {
                  props.onConfirm(...data);
                  e.preventDefault();
                }
              }}
            />
          ) : (
            <span className={Classes.EDITABLE_TEXT_CONTENT}>{hasValue ? text : t('addItem')}</span>
          )}
        </div>
        <Button icon="blank" size={mobile ? 'medium' : 'small'} variant="minimal" />
      </div>
      {hover ? <Divider /> : <div className="fake-divider" />}
    </div>
  );
}
function ShoppingListItem(props: IItemProps) {
  const [hover, setHover] = useState(false);
  const mobile = useMobile();

  const [text, setText] = useState(props.item.text);
  const [isEditing, setIsEditing] = useState(false);

  const handleConfirm = (shouldRefocus = false) => {
    if (text.trim() !== '') {
      props.updateElement({ ...props.item, text }, shouldRefocus);
    } else if (props.deleteElement) {
      props.deleteElement(props.item);
    }
    setIsEditing(false);
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleConfirm(true);
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setText(props.item.text);
    }
  };

  useEffect(() => {
    setText(props.item.text);
  }, [props.item.text]);

  const hoverTimeout = useRef<number>();

  return (
    <div
      onMouseOver={() => {
        window.clearTimeout(hoverTimeout.current);
        hoverTimeout.current = window.setTimeout(() => setHover(true), 50);
      }}
      onMouseOut={() => {
        window.clearTimeout(hoverTimeout.current);
        hoverTimeout.current = window.setTimeout(() => setHover(false), 50);
      }}
      style={{ opacity: props.isDragging ? 0.5 : 1 }}
    >
      <div>
        {hover && !mobile ? <Divider /> : <div className="fake-divider" />}
        <div
          className={classNames('shopping-item', props.item.checked ? Classes.TEXT_DISABLED : '')}
        >
          <div>
            <Icon
              icon={(hover || mobile) && !props.item.checked ? 'drag-handle-vertical' : 'blank'}
              className={props.item.checked ? '' : 'drag-handle'}
              {...props.dragHandleProps}
            />
          </div>
          <Checkbox
            size={mobile ? 'large' : 'medium'}
            className="shopping-item-checkbox"
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
                [Classes.EDITABLE_TEXT_EDITING]: isEditing,
              },
              'my-editable-text',
            )}
            onFocus={() => setIsEditing(true)}
            tabIndex={isEditing ? undefined : 0}
          >
            {isEditing ? (
              <input
                className={Classes.EDITABLE_TEXT_INPUT}
                onBlur={() => handleConfirm()}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                ref={(input) => input?.focus()}
                value={text}
              />
            ) : (
              <span className={Classes.EDITABLE_TEXT_CONTENT}>{text}</span>
            )}
          </div>
          <Button
            icon="cross"
            size={mobile ? 'medium' : 'small'}
            variant="minimal"
            onClick={() => props.deleteElement(props.item)}
          />
        </div>
        {hover ? <Divider /> : <div className="fake-divider" />}
      </div>
    </div>
  );
}

type SyncState = 'initial-fetch' | 'uploading' | 'synced' | 'offline';

export interface ISingleShoppingList {
  items: IShoppingItem[];
  name?: string;
}

export interface IShoppingListState {
  lists: Record<string, ISingleShoppingList>;
  showChecked: boolean;
  active: string;
  version?: number;
}

const defaultShoppingList: ISingleShoppingList = {
  items: [],
  name: 'Private',
};

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

  const ShoppingListSelect = Select<{ key: string; value: ISingleShoppingList }>;

  const createNewList = () => {
    props.onItemSelect(uuidv4(), {
      items: [],
      name: newListName,
    });
    setNewListName('');
    setPopoverOpen(false);
  };

  const newListInput = (
    <InputGroup
      autoFocus={true}
      size={mobile ? 'large' : 'medium'}
      value={newListName}
      onChange={(e) => setNewListName(e.target.value)}
      placeholder={t('newShoppingListPlaceholder')}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          createNewList();
          setPopoverOpen(false);
        }
      }}
    />
  );

  return (
    <ButtonGroup>
      <Dialog
        isOpen={deleteKey !== null}
        title={t('deleteShoppingList', { name: parentState.lists[deleteKey ?? '']?.name })}
        isCloseButtonShown={true}
        onClose={() => setDeleteKey(null)}
      >
        <DialogBody>{t('deleteShoppingListBody')}</DialogBody>
        <DialogFooter
          actions={
            <>
              <Button text={t('cancel')} onClick={() => setDeleteKey(null)} />
              <Button
                intent="danger"
                text={t('delete')}
                onClick={() => {
                  props.onItemDelete(deleteKey ?? '');
                  setDeleteKey(null);
                }}
              />
            </>
          }
        />
      </Dialog>
      <ShoppingListSelect
        items={Object.entries(parentState.lists)
          .toSorted((a, b) => a[1].name?.localeCompare(b[1].name ?? '') ?? 0)
          .map(([key, value]) => ({ key, value }))}
        filterable={false}
        itemRenderer={(item, { handleClick, modifiers }) =>
          modifiers.matchesPredicate ? (
            <MenuItem
              selected={modifiers.active}
              key={item.key}
              text={item.value.name ?? 'Private'}
              onClick={handleClick}
              labelElement={
                item.key === getUserInfo()?.username ? undefined : (
                  <Button
                    icon="cross"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeleteKey(item.key);
                    }}
                    variant="minimal"
                    size="small"
                  />
                )
              }
            />
          ) : null
        }
        itemsEqual="key"
        activeItem={{
          key: props.parentState.active,
          value: props.parentState.lists[props.parentState.active],
        }}
        resetOnClose={true}
        onItemSelect={(item) => props.onItemSelect(item.key, item.value)}
      >
        <Button
          text={t('shoppingListName', {
            name: parentState.lists[parentState.active].name ?? 'Private',
          })}
          endIcon="double-caret-vertical"
          size="large"
        />
      </ShoppingListSelect>
      <Popover
        disabled={mobile}
        isOpen={popoverOpen}
        onInteraction={(newState) => setPopoverOpen(newState)}
        popoverClassName={Classes.POPOVER_CONTENT_SIZING}
        content={
          <div className="create-shopping-list-popover">
            {newListInput}
            <Button
              className={Classes.POPOVER_DISMISS}
              text={t('create')}
              intent="success"
              onClick={createNewList}
            />
          </div>
        }
        renderTarget={({ ref, ...targetProps }) => (
          <Button
            {...targetProps}
            ref={ref}
            intent="primary"
            icon="add"
            size="large"
            onClick={mobile ? () => setPopoverOpen(true) : targetProps.onClick}
          />
        )}
      />
      <Dialog
        isOpen={mobile && popoverOpen}
        onClose={() => setPopoverOpen(false)}
        title={t('createNewList')}
      >
        <DialogBody>{newListInput}</DialogBody>
        <DialogFooter
          actions={
            <Button
              size="large"
              className={Classes.POPOVER_DISMISS}
              text={t('create')}
              intent="success"
              onClick={createNewList}
            />
          }
        />
      </Dialog>
    </ButtonGroup>
  );
}

export default function ShoppingList(props: IDarkThemeProps) {
  const { listKey, listName } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const mobile = useMobile();
  const userInfo = getUserInfo();
  const authenticated = typeof userInfo !== 'undefined';

  document.title = t('shoppingList');

  const [online, setOnline] = useState(navigator.onLine);

  const defaultState: IShoppingListState = {
    lists: {},
    showChecked: true,
    active: userInfo?.username ?? '',
  };
  defaultState.lists[userInfo?.username ?? ''] = defaultShoppingList;

  const [state, setState] = usePersistentState<IShoppingListState>(
    defaultState,
    localStorageShoppingList,
  );

  const [itemsToBeAddedDialog, setItemsToBeAddedDialog] = useState<IShoppingItem[]>([]);

  const [synced, setSynced] = useState<SyncState>('initial-fetch');

  const [shoppingListSelectValue, setShoppingListSelectValue] = useState<string>();

  const [updateQueue, setUpdateQueue] = useState<
    {
      listKey: string;
      items: IShoppingItem[];
      method: 'DELETE' | 'POST' | 'PUT';
    }[]
  >([]);

  // fetch recipes to refresh the login information
  // TODO react19
  useEffect(() => {
    void recipesHandler.fetchData();
  }, []);

  const updateItems = useCallback(
    async (listKey: string, items: IShoppingItem[], method: 'DELETE' | 'POST' | 'PUT') => {
      if (online) {
        setSynced('uploading');
        await updateShoppingItem(listKey, items, method);
        setSynced('synced');
      } else {
        setUpdateQueue(updateQueue.concat({ listKey, items, method }));
      }
    },
    [online, updateQueue],
  );

  // migration !77:
  // - default shopping list is renamed to <userName>
  // - set version to 1
  // - add lists to user
  useEffect(() => {
    console.log(`version: ${state.version}, ${JSON.stringify(Object.keys(state.lists))}`);
    if (typeof state.version === 'undefined') {
      const name = userInfo?.username;
      if (typeof name === 'string' && 'default' in state.lists) {
        console.log(
          `Found legacy shoppinglist with default key, migrating to username key "${name}".`,
        );
        for (const key in state.lists) {
          const id = key === 'default' ? name : key;
          console.log(`Uploading ${id} with name ${state.lists[key].name ?? ''}`);
          void updateShoppingLists(id, state.lists[key].name ?? '', 'POST');
        }
        const defaultList = JSON.parse(JSON.stringify(state.lists.default)) as ISingleShoppingList;
        setState((state) =>
          update(state, {
            lists: {
              [name]: {
                $set: defaultList,
              },
              $unset: ['default'],
            },
            active: {
              $set: name,
            },
            version: {
              $set: 1,
            },
          }),
        );
      }
    }
  }, [state, setState]);

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
          position:
            i +
            state.lists[state.active].items
              .filter((v) => !v.checked)
              .reduce((p, v) => Math.max(p, v.position), 0) +
            1,
        };
      });
      itemsToBeAdded.splice(0, itemsToBeAdded.length);
      if (Object.keys(state.lists).length === 1) {
        void updateItems(state.active, items, 'POST');
      } else {
        setItemsToBeAddedDialog(items);
      }
    }
  }, [listKey, state, updateItems]);

  // online
  useEffect(() => {
    const handle = () => {
      setOnline(navigator.onLine);
      if (!navigator.onLine) {
        setSynced('offline');
      } else {
        setSynced('uploading');
      }
    };

    window.addEventListener('online', handle);
    window.addEventListener('offline', handle);
    return () => {
      window.removeEventListener('online', handle);
      window.removeEventListener('offline', handle);
    };
  }, [state.active]);

  // upload updated elements
  useEffect(() => {
    if (online && updateQueue.length > 0) {
      void (async () => {
        setSynced('uploading');
        const element = updateQueue[0];
        await updateShoppingItem(element.listKey, element.items, element.method);
        setUpdateQueue((queue) => {
          return queue.slice(1);
        });
      })();
    } else {
      setSynced('synced');
    }
  }, [online, updateQueue]);

  // sse
  useEffect(() => {
    if (online) {
      setSynced('initial-fetch');
      void (async () => {
        const newLists: Record<string, ISingleShoppingList> = {};
        ((await getShoppingLists()) ?? [])
          .filter((v) => !(v.id in state.lists))
          .forEach((v) => (newLists[v.id] = { items: [], name: v.name }));
        console.log(`adding ${JSON.stringify(newLists)}`);

        setState((state) =>
          update(state, {
            lists: {
              $merge: newLists,
            },
          }),
        );
      })();
      let eventSource = new EventSource(getShoppingListUrl(state.active));

      const onMessage = (v: MessageEvent) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const result = JSON.parse(v.data) as IShoppingItem[] | null;
        console.log(`sse message for ${state.active}:`, result);
        if (result) {
          setState((state) =>
            update(state, {
              lists: {
                [state.active]: {
                  items: {
                    $set: result,
                  },
                },
              },
            }),
          );
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

  // opening shared list
  useEffect(() => {
    if (listKey) {
      if (authenticated) {
        const newState = update(state, {
          lists: {
            $merge: {
              [listKey]: {
                items: [],
                name: listName,
              },
            },
          },
          active: {
            $set: listKey,
          },
        });
        // set state doesn't work when navigating away
        void updateShoppingLists(listKey, listName ?? '', 'POST');
        localStorage.setItem(localStorageShoppingList, JSON.stringify(newState));
        navigate('/shoppingList');
      } else if (state.active !== listKey) {
        setState({
          active: listKey,
          lists: {
            [listKey]: {
              items: [],
              name: listName,
            },
          },
          showChecked: true,
        });
      }
    }
  }, [authenticated, listKey, listName, navigate, setState, state]);

  const navigationLinks: INavigationLink[] = [
    { to: '/', icon: 'git-repo', text: t('recipes') },
    { to: '/shoppingList', icon: 'shopping-cart', text: t('shoppingList'), active: true },
  ];

  const updateElement = (changedItem: IShoppingItem) => {
    const oldItem = state.lists[state.active].items.find((v) => v.id === changedItem.id);
    if (typeof oldItem === 'undefined') {
      throw new Error("didn't find the item");
    }
    let newPosition = changedItem.position;
    if (oldItem.checked && !changedItem.checked) {
      newPosition =
        state.lists[state.active].items
          .filter((v) => !v.checked)
          .reduce((p, v) => Math.max(p, v.position), 0) + 1;
    } else if (!oldItem.checked && changedItem.checked) {
      newPosition =
        state.lists[state.active].items
          .filter((v) => v.checked)
          .reduce((p, v) => Math.max(p, v.position), 0) + 1;
    }
    const newItem = update(changedItem, {
      position: { $set: newPosition },
    });
    setState(
      update(state, {
        lists: {
          [state.active]: {
            items: {
              $apply: (items: IShoppingItem[]) =>
                items.map((v) => (v.id === newItem.id ? newItem : v)),
            },
          },
        },
      }),
    );
    void updateItems(state.active, [newItem], 'PUT');
  };

  const deleteElement = (item: IShoppingItem) => {
    setState(
      update(state, {
        lists: {
          [state.active]: {
            items: {
              $apply: (items: IShoppingItem[]) => items.filter((v) => v.id !== item.id),
            },
          },
        },
      }),
    );
    void updateItems(state.active, [item], 'DELETE');
  };

  const statusElement = (
    <div
      className={classNames('shopping-list-status-element', {
        [Classes.TEXT_DISABLED]: synced === 'synced' || synced === 'offline',
      })}
    >
      {synced === 'synced' && (
        <>
          {/* <Icon icon='cloud-upload' /> */}
          <span className="text">{t('uploaded')}</span>
        </>
      )}
      {synced === 'uploading' && (
        <>
          <div className="my-spinner" />
          <span className="text">{t('uploading')}</span>
        </>
      )}
      {synced === 'initial-fetch' && (
        <>
          <div className="my-spinner" />
          <span className="text">{t('syncing')}</span>
        </>
      )}
      {synced === 'offline' && (
        <>
          <Icon icon="offline" intent="danger" />
          <Text className="text">{t('shoppingOffline')}</Text>
        </>
      )}
    </div>
  );

  const removeAllItems = () => {
    void updateItems(state.active, state.lists[state.active].items, 'DELETE');
    setState((state) =>
      update(state, {
        lists: {
          [state.active]: {
            items: {
              $set: [],
            },
          },
        },
      }),
    );
  };

  const shareShoppingList = () => {
    if (state.active !== userInfo?.username) {
      void shareLink(
        `${document.location.origin}/shoppingLists/${state.active}/${state.lists[state.active].name}`,
      );
    }
  };

  const onDragEnd = (result: DropResult) => {
    if (result.destination === null) {
      console.log('dropped empty');
      return;
    }

    setState((state) => {
      const list = state.lists[state.active].items
        .filter((v) => !v.checked)
        .sort((v, w) => v.position - w.position);
      const sourceItem = list[result.source.index];
      const newItems = update(list, {
        $splice: [
          [result.source.index, 1],
          [result.destination!.index, 0, sourceItem],
        ],
      });
      newItems.forEach((v, i) => (v.position = i));
      const newState = update(state, {
        lists: {
          [state.active]: {
            items: {
              $apply: (items: IShoppingItem[]) => items.filter((v) => v.checked).concat(newItems),
            },
          },
        },
      });

      void updateItems(newState.active, newState.lists[newState.active].items, 'PUT');

      return newState;
    });
  };
  return (
    <>
      <Dialog
        isOpen={itemsToBeAddedDialog.length > 0}
        title={t('selectShoppingList')}
        onClose={() => setItemsToBeAddedDialog([])}
      >
        <DialogBody>
          <div className="shopping-list-select-list">
            <RadioGroup
              selectedValue={shoppingListSelectValue}
              onChange={(e) => setShoppingListSelectValue(e.currentTarget.value)}
            >
              {Object.entries(state.lists).map(([key, value]) => (
                <Radio id={key} key={key} value={key} label={value.name} size="large" />
              ))}
            </RadioGroup>
          </div>
        </DialogBody>
        <DialogFooter
          actions={
            <>
              <Button
                text={t('cancel')}
                intent="danger"
                onClick={() => setItemsToBeAddedDialog([])}
              />
              <Button
                text={t('add')}
                intent="success"
                disabled={typeof shoppingListSelectValue === 'undefined'}
                onClick={() => {
                  const items = itemsToBeAddedDialog.slice();
                  setItemsToBeAddedDialog([]);
                  setState((state) => ({ ...state, active: shoppingListSelectValue ?? '' }));
                  void updateItems(shoppingListSelectValue ?? '', items, 'POST');
                }}
              />
            </>
          }
        />
      </Dialog>
      {mobile && (
        <MobileHeader darkThemeProps={props} navigationLinks={navigationLinks}>
          {statusElement}
          <Icon
            className={classNames(
              Classes.BUTTON,
              Classes.MINIMAL,
              state.active === userInfo?.username && Classes.DISABLED,
            )}
            icon="share"
            intent="primary"
            size={24}
            onClick={shareShoppingList}
          />
          <Icon
            className={classNames(Classes.BUTTON, Classes.MINIMAL)}
            icon="trash"
            intent="warning"
            size={24}
            onClick={removeAllItems}
          />
        </MobileHeader>
      )}
      <div className="body">
        {!mobile && <SideMenu darkModeProps={props} currentNavigation="shopping-list" />}
        <div className="main-content">
          <div className="shopping-list-wrapper">
            <div className="shopping-list-head">
              {authenticated ? (
                <ShoppingListSelect
                  onItemSelect={(key, value) => {
                    if (!(key in state.lists)) {
                      void updateShoppingLists(key, value.name ?? '', 'POST');
                    }
                    setState((state) =>
                      update(state, {
                        active: {
                          $set: key,
                        },
                        lists: {
                          $merge: {
                            [key]: value,
                          },
                        },
                      }),
                    );
                  }}
                  onItemDelete={(key) =>
                    setState((state) => {
                      void updateShoppingLists(key, state.lists[key].name ?? '', 'DELETE');
                      return update(state, {
                        active: {
                          $set: userInfo.username,
                        },
                        lists: {
                          $unset: [key],
                        },
                      });
                    })
                  }
                  parentState={state}
                />
              ) : (
                <H1>{`${state.lists[state.active].name} Shopping List`}</H1>
              )}
              {!mobile && (
                <div className="edit-container">
                  {statusElement}
                  <ButtonGroup vertical={false} alignText="right">
                    <Tooltip
                      content={
                        state.active === userInfo?.username
                          ? t('shoppingListNoShare')
                          : t('shoppingListShare')
                      }
                      position="bottom"
                    >
                      <AnchorButton
                        icon="share"
                        variant={mobile ? 'minimal' : 'solid'}
                        size={mobile ? 'large' : 'medium'}
                        text={mobile ? undefined : t('share')}
                        disabled={state.active === userInfo?.username}
                        intent="primary"
                        onClick={shareShoppingList}
                      />
                    </Tooltip>
                    <Button
                      text={t('deleteAll')}
                      icon="trash"
                      intent="warning"
                      onClick={removeAllItems}
                    />
                  </ButtonGroup>
                </div>
              )}
            </div>
            <div className="shopping-list">
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="droppable">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef}>
                      {state.lists[state.active].items
                        .filter((v) => !v.checked)
                        .sort((v, w) => v.position - w.position)
                        .map((item, index) => (
                          <Draggable key={item.id} draggableId={item.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                style={{
                                  ...provided.draggableProps.style,
                                }}
                              >
                                <ShoppingListItem
                                  isDragging={snapshot.isDragging}
                                  dragHandleProps={provided.dragHandleProps}
                                  item={item}
                                  deleteElement={deleteElement}
                                  updateElement={updateElement}
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
              <NewShoppingListItem
                onConfirm={(...itemsToBeAdded: string[]) => {
                  const items = itemsToBeAdded.map((text, i) => {
                    return {
                      text: text,
                      checked: false,
                      addedTime: dayjs().toJSON(),
                      id: uuidv4(),
                      position:
                        i +
                        state.lists[state.active].items
                          .filter((v) => !v.checked)
                          .reduce((p, v) => Math.max(p, v.position), 0) +
                        1,
                    };
                  });
                  setState((state) =>
                    update(state, {
                      lists: {
                        [state.active]: {
                          items: {
                            $push: items,
                          },
                        },
                      },
                    }),
                  );
                  void updateItems(state.active, items, 'POST');
                }}
              />
              {state.lists[state.active].items.filter((v) => v.checked).length > 0 && !mobile && (
                <Divider />
              )}
              {state.lists[state.active].items.filter((v) => v.checked).length > 0 && (
                <Button
                  variant="minimal"
                  text={t('checkedItems', {
                    count: state.lists[state.active].items.filter((v) => v.checked).length,
                  })}
                  icon={state.showChecked ? 'caret-down' : 'caret-right'}
                  onClick={() =>
                    setState((state) => ({ ...state, showChecked: !state.showChecked }))
                  }
                />
              )}
              <Collapse isOpen={state.showChecked}>
                {state.lists[state.active].items
                  .filter((v) => v.checked)
                  .sort((v, w) => v.position - w.position)
                  .map((item) => {
                    return (
                      <ShoppingListItem
                        item={item}
                        key={item.id}
                        updateElement={updateElement}
                        deleteElement={deleteElement}
                        isDragging={false}
                        dragHandleProps={null}
                      />
                    );
                  })}
              </Collapse>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

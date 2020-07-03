import React, { useState } from "react";
import Header from "./Header";
import { NavigationIcon } from "./recipeList/RecipeList";
import { Collapse, Card, H1, Checkbox, EditableText, Icon, Button, Divider } from "@blueprintjs/core";
import { DarkModeSwitch } from "./helpers/DarkModeSwitch";
import { LanguageSelect } from "./helpers/LanguageSelect";
import { useMobile, usePersistentState } from "./helpers/CustomHooks";
import { useTranslation } from "react-i18next";
import { IDarkThemeProps } from "../App";
import { IMenuLink, MenuLinks } from "./recipeList/RecipeListMenu";
import { Dayjs } from "dayjs";
import DraggableList from "react-draggable-list";
import './ShoppingList.scss';
import classNames from "classnames";
import { localStorageShoppingList } from "../util/StorageKeys";

interface IShoppingElement {
  text: string;
  done: boolean;
  id: number;
  doneTime?: Dayjs;
}

interface IItemProps {
  item: IShoppingElement;
  dragHandleProps: object;
  commonProps: ICommonProps;
  newElement?: boolean;
  onConfirm?: (value: string) => void;
}

interface ICommonProps {
  updateElement: (newElement: IShoppingElement) => void;
  deleteElement?: (elem: IShoppingElement) => void;
}

function ShoppingListItem(props: IItemProps) {
  const [hover, setHover] = useState(false);

  return <>
    {!props.newElement && <Divider />}
    <div
      className='shopping-item'
      key={props.item.id}
      onMouseOver={() => setHover(true)}
      onMouseOut={() => setHover(false)}
    >
      <Icon
        icon={hover && !props.newElement ? 'drag-handle-vertical' : 'blank'}
        {...props.dragHandleProps}
        className={classNames('drag-handle', !props.newElement ? 'active' : '')}
      />
      <Checkbox
        className='shopping-item-checkbox'
        checked={props.item.done}
        onChange={(event: React.FormEvent<HTMLInputElement>) => {
          const v = event.currentTarget.checked;
          props.commonProps.updateElement({ ...props.item, done: v });
        }}
      />
      <EditableText
        value={props.item.text}
        minWidth={500}
        alwaysRenderInput={true}
        className='shopping-item-text'
        onChange={v => props.commonProps.updateElement({ ...props.item, text: v })}
        onConfirm={props.onConfirm}
      />
      <div className='spacer' />
      {!props.newElement && <Button
        icon='cross'
        small={true}
        minimal={true}
        onClick={() => props.commonProps.deleteElement && props.commonProps.deleteElement(props.item)}
      />}
    </div>
  </>
}

class ShoppingListItemClassWrapper extends React.Component<IItemProps, Readonly<{}>> {
  render() {
    return <ShoppingListItem {...this.props} />
  }
}

export function ShoppingList(props: IDarkThemeProps) {
  const [drawerIsOpen, setDrawerIsOpen] = useState(false);
  const [elements, setElements] = usePersistentState<IShoppingElement[]>([], localStorageShoppingList);
  const [newElement, setNewElement] = useState<IShoppingElement>({ text: '', done: false, id: -1 });
  const mobile = useMobile();
  const { t } = useTranslation();


  const menuLinks: IMenuLink[] = [
    { to: '/', icon: 'git-repo', text: t('recipes') },
    { to: '/shoppingList', icon: 'shopping-cart', text: t('shoppingList'), active: true }
  ];

  return <>
    <Header
      darkThemeProps={props}
      navigationIcon={<NavigationIcon
        isOpen={drawerIsOpen}
        onClick={() => setDrawerIsOpen(!drawerIsOpen)}
      />}
    />
    {mobile && <Collapse
      isOpen={drawerIsOpen}
    >
      <div className='menu'>
        <div className='settings' style={{ marginBottom: '0' }}>
          <DarkModeSwitch {...props} />
          <div className='spacer' />
          <LanguageSelect />
        </div>
      </div>
    </Collapse>}
    <div className='body'>
      <Card className='menu'>
        <MenuLinks
          menuLinks={menuLinks}
        />
      </Card>
      <div className='main-content'>
        <Card className='shopping-list-wrapper'>
          <H1>{t('shoppingList')}</H1>
          <div className='shopping-list'>
            <ShoppingListItem
              item={newElement}
              dragHandleProps={{}}
              commonProps={{ updateElement: setNewElement }}
              newElement={true}
              onConfirm={value => {
                if (value.trim().length > 0) {
                  const elems = elements.slice();
                  const newElem = {
                    text: value,
                    done: newElement.done,
                    id: elems.length > 0 ? elems.reduce((p, c) => p.id > c.id ? p : c).id + 1 : 0
                  };
                  if (newElem.done) {
                    elems.push(newElem)
                  } else {
                    elems.unshift(newElem);
                  }
                  setElements(elems);
                  setNewElement({ text: '', done: false, id: -1 });
                }
              }}
            />
            <DraggableList<IShoppingElement, ICommonProps, ShoppingListItemClassWrapper>
              itemKey='id'
              template={ShoppingListItemClassWrapper}
              list={elements}
              onMoveEnd={newList => setElements(newList.slice())}
              commonProps={{
                updateElement: (newElement: IShoppingElement) => {
                  const elems = elements.slice();
                  const oldElemIndex = elems.findIndex(v => v.id === newElement.id);
                  if (!elems[oldElemIndex].done && newElement.done) {
                    elems.splice(oldElemIndex, 1);
                    elems.push(newElement);
                  } else if (elems[oldElemIndex].done && !newElement.done) {
                    elems.splice(oldElemIndex, 1);
                    elems.unshift(newElement);
                  } else {
                    elems[oldElemIndex] = newElement;
                  }
                  setElements(elems);
                },
                deleteElement: (elem: IShoppingElement) => {
                  setElements(elements.filter(e => e.id !== elem.id));
                }
              }}
            />
          </div>
        </Card>
      </div>
    </div>
  </>
}
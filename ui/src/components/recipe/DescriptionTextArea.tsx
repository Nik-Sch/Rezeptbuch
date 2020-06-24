import React, { useState, useEffect, useRef, KeyboardEventHandler, useCallback } from "react";
import recipesHandler, { IRecipe } from "../../util/Recipes";
import { IQueryListRendererProps, IItemRendererProps, QueryList, ItemPredicate } from "@blueprintjs/select";
import { ITextAreaProps, Classes, MenuItem, Popover, Position, Keys, Tooltip } from "@blueprintjs/core";
import classNames from "classnames";

import './DescriptionTextArea.scss';
import { useMobile } from "../helpers/CustomHooks";
import { Link } from "react-router-dom";

interface IDescriptionTextAreaProps extends ITextAreaProps {
  changeValue?: (v: string | undefined) => void;
  value?: string;
  editable: boolean;
  className?: string;
}

function escapeRegExpChars(text: string) {
  return text.replace(/([.*+?^=!:${}()|[\]/\\])/g, "\\$1");
}

function highlightQueryText(text: string, query: string) {
  let lastIndex = 0;
  const words = query
    .split(/\s+/)
    .filter(word => word.length > 0)
    .map(escapeRegExpChars);
  if (words.length === 0) {
    return [text];
  }
  const regexp = new RegExp(words.join("|"), "gi");
  const tokens: React.ReactNode[] = [];
  while (true) {
    const match = regexp.exec(text);
    if (!match) {
      break;
    }
    const length = match[0].length;
    const before = text.slice(lastIndex, regexp.lastIndex - length);
    if (before.length > 0) {
      tokens.push(before);
    }
    lastIndex = regexp.lastIndex;
    tokens.push(<strong key={lastIndex}>{match[0]}</strong>);
  }
  const rest = text.slice(lastIndex);
  if (rest.length > 0) {
    tokens.push(rest);
  }
  return tokens;
}

function getLineHeight(element: HTMLElement) {
  // getComputedStyle() => 18.0001px => 18
  let lineHeight = parseInt(getComputedStyle(element).lineHeight.slice(0, -2), 10);
  // this check will be true if line-height is a keyword like "normal"
  if (isNaN(lineHeight)) {
    // @see http://stackoverflow.com/a/18430767/6342931
    const line = document.createElement("span");
    line.innerHTML = "<br>";
    element.appendChild(line);
    const singleLineHeight = element.offsetHeight;
    line.innerHTML = "<br><br>";
    const doubleLineHeight = element.offsetHeight;
    element.removeChild(line);
    // this can return 0 in edge cases
    lineHeight = doubleLineHeight - singleLineHeight;
  }
  return lineHeight;
}

function getFontSize(element: HTMLElement) {
  const fontSize = getComputedStyle(element).fontSize;
  return fontSize === "" ? 0 : parseInt(fontSize.slice(0, -2), 10);
}


export default function DescriptionTextArea(props: IDescriptionTextAreaProps) {
  const [recipes, setRecipes] = useState<IRecipe[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [listQuery, setListQuery] = useState<string>();
  const [isEditing, setIsEditing] = useState(false);
  const [textAreaHeight, setTextAreaHeight] = useState<number>(0);
  const mobile = useMobile();

  const textArea = useRef<HTMLTextAreaElement>();
  const queryList = useRef<QueryList<IRecipe>>();
  const contentElement = useRef<HTMLSpanElement>();
  const triggerPosition = useRef<number>();

  const { changeValue, editable, value, className, ...textAreaProps } = props;


  const hasValue = typeof value !== 'undefined' && value !== '';

  // load recipes
  useEffect(() => {
    const handleRecipesChange = (recipes: IRecipe[]) => {
      setRecipes(recipes);
    }
    return recipesHandler.subscribe(handleRecipesChange);
  }, []);

  const filterRecipe: ItemPredicate<IRecipe> = (query, recipe) => {
    return recipe.id.toString().includes(query) || recipe.title.toLocaleLowerCase().includes(query.toLocaleLowerCase());
  }

  const findMatch = (v: string | undefined, pos: number) => {
    if (typeof v === 'undefined') {
      return;
    }
    if (typeof textArea.current !== 'undefined') {
      const regex = RegExp(/#([\da-zA-Z]*)/, 'g');
      let match: RegExpExecArray | null;
      while ((match = regex.exec(v)) !== null) {
        const start = regex.lastIndex - match[0].length
        const end = regex.lastIndex;
        if (pos <= end && pos >= start) {
          return { match, start };
        }
      }
    }
  }

  const handleTextChange = (v: string | undefined) => {
    changeValue && changeValue(v);
    const result = findMatch(v, textArea.current?.selectionStart ?? 0);
    if (result) {
      const { match } = result;
      setIsOpen(true);
      setListQuery(match[1]);
      triggerPosition.current = textArea.current?.selectionStart;
    } else {
      setIsOpen(false);
    }
  }

  const handleItemSelect = (item: IRecipe) => {
    if (typeof textArea.current !== 'undefined') {
      const content = textArea.current.value;
      const result = findMatch(content, triggerPosition.current ?? 0);
      if (result) {
        const { match, start } = result;
        const newValue = content.substring(0, start) + `#${item.id}` + content.substring(start + match[0].length);
        changeValue && changeValue(newValue);
        setIsOpen(false);
      }
    }
  }

  const RecipeSuggestion = QueryList.ofType<IRecipe>();

  const handlePopoverOpened = () => {
    queryList.current?.scrollActiveItemIntoView();
  }

  const handleTextAreaKeyPress: KeyboardEventHandler<HTMLTextAreaElement> = event => {
    const { which } = event;
    if (which === Keys.ESCAPE) {
      setIsOpen(false);
      event.preventDefault();
    } else if (which === Keys.ENTER) {
      event.preventDefault();
    }
  }

  const handlePopoverInteraction = (b: boolean) => {
    if (!b) {
      setIsOpen(false);
    }
  }

  const itemRenderer = (recipe: IRecipe, props: IItemRendererProps) => {
    if (!props.modifiers.matchesPredicate) {
      return null;
    }
    const text = <>{highlightQueryText(recipe.title, props.query)} (<em>{recipe.category.name}</em>)</>
    return <MenuItem
      active={props.modifiers.active}
      key={recipe.id}
      onClick={props.handleClick}
      text={text}
      className={mobile ? 'mobile-menu-item' : ''}
      label={`#${recipe.id}`}
    />;
  }


  const highlightRecipeRef = (text: string) => {
    let lastIndex = 0;
    const regexp = /#(\d+)/g;
    const tokens: React.ReactNode[] = [];
    while (true) {
      const match = regexp.exec(text);
      if (!match) {
        break;
      }
      const length = match[0].length;
      const before = text.slice(lastIndex, regexp.lastIndex - length);
      if (before.length > 0) {
        tokens.push(before);
      }
      lastIndex = regexp.lastIndex;
      const matchedRecipe = recipes.find(r => r.id === parseInt(match[1]));
      if (matchedRecipe) {
        const tooltipContent = <>
          {matchedRecipe.title}<br />
          <em>{matchedRecipe.category.name}</em>
        </>;
        tokens.push(
        <Tooltip key={lastIndex} content={tooltipContent} >
          <Link to={`/recipes/${match[1]}`}>{match[0]}</Link>
        </Tooltip>
        );
      } else {
        tokens.push(match[0]);
      }
    }
    const rest = text.slice(lastIndex);
    if (rest.length > 0) {
      tokens.push(rest);
    }
    return tokens;
  }


  const renderer = (listProps: IQueryListRendererProps<IRecipe>) => {
    return <Popover
      autoFocus={true}
      enforceFocus={true}
      isOpen={isOpen}
      position={Position.BOTTOM_LEFT}
      className={classNames(listProps.className)}
      onInteraction={handlePopoverInteraction}
      popoverClassName={classNames('description-select-popover')}
      onOpened={handlePopoverOpened}
      onClosing={() => textArea.current?.focus()}
      minimal={true}
    >
      <div
        style={{ width: '100%' }}
        onKeyDown={isOpen ? listProps.handleKeyDown : undefined}
        onKeyUp={isOpen ? listProps.handleKeyUp : undefined}
      >
        <textarea
          {...textAreaProps}
          className={classNames(Classes.EDITABLE_TEXT_INPUT, mobile && !isEditing ? Classes.INPUT : '')}
          ref={ta => { if (ta) { textArea.current = ta; } }}
          value={value}
          onKeyPress={isOpen ? handleTextAreaKeyPress : undefined}
          onChange={(event) => handleTextChange(event.target.value)}
          onBlur={() => setIsEditing(false)}
          style={{ height: textAreaHeight }}
        />
      </div>
      <div onKeyDown={listProps.handleKeyDown} onKeyUp={listProps.handleKeyUp}>
        {listProps.itemList}
      </div>
    </Popover>
  }

  const updateHeight = useCallback(() => {
    if (contentElement.current) {
      // const { maxLines, minLines, minWidth, multiline } = this.props;
      const { parentElement, textContent } = contentElement.current;
      let { scrollHeight } = contentElement.current;
      const lineHeight = getLineHeight(contentElement.current);
      // add one line to computed <span> height if text ends in newline
      // because <span> collapses that trailing whitespace but <textarea> shows it
      if (isEditing && /\n$/.test(textContent ?? '')) {
        scrollHeight += lineHeight;
      }
      if (lineHeight > 0) {
        // line height could be 0 if the isNaN block from getLineHeight kicks in
        // scrollHeight = clamp(scrollHeight, minLines * lineHeight, maxLines * lineHeight);
      }
       // at least about 3 lines
      let lineHeightBoundary = parentElement ? getLineHeight(parentElement) * 3 : 0;
      if (mobile) { // plus 20px padding for mobile
        lineHeightBoundary += 20;
      }
      // Chrome's input caret height misaligns text so the line-height must be larger than font-size.
      // The computed scrollHeight must also account for a larger inherited line-height from the parent.
      scrollHeight = Math.max(scrollHeight,
        getFontSize(contentElement.current) + 1,
        lineHeightBoundary);
      
      // IE11 & Edge needs a small buffer so text does not shift prior to resizing
      // if (Browser.isEdge()) {
      //   scrollWidth += BUFFER_WIDTH_EDGE;
      // } else if (Browser.isInternetExplorer()) {
      //   scrollWidth += BUFFER_WIDTH_IE;
      // }
      // console.log(`editable: ${editable}, isEditing: ${isEditing}, height: ${scrollHeight}`);
      setTextAreaHeight(scrollHeight);
      // synchronizes the ::before pseudo-element's height while editing for Chrome 53
      if (isEditing && parentElement) {
        setTimeout(() => (parentElement.style.height = `${scrollHeight}px`));
      }
    }
  }, [isEditing, mobile]);

  useEffect(() => {
    updateHeight();
  }, [updateHeight]);

  return <div
    className={classNames(
      {
        [Classes.EDITABLE_TEXT]: editable,
        [Classes.EDITABLE_TEXT_EDITING]: isEditing,
        [Classes.MULTILINE]: true,
        [Classes.EDITABLE_TEXT_PLACEHOLDER]: !hasValue
      },
      className
    )}
    onFocus={editable ? () => setIsEditing(true) : undefined}
  >
    {editable && <RecipeSuggestion
      onItemSelect={handleItemSelect}
      renderer={renderer}
      ref={v => { if (v) queryList.current = v; }}
      itemRenderer={itemRenderer}
      items={recipes}
      itemPredicate={filterRecipe}
      query={listQuery}
    />}
    <span
      className={Classes.EDITABLE_TEXT_CONTENT}
      ref={v => {
        if (v) {
          contentElement.current = v;
          updateHeight();
        }
      }}
      style={{
        visibility: editable ? 'hidden' : undefined,
        position: editable ? 'absolute' : undefined,
        padding: mobile ? '10px' : undefined
      }}
    >
      {hasValue ? highlightRecipeRef(value ?? '') : textAreaProps.placeholder}
    </span>
  </div>
}
import React, { useState, useEffect, useRef } from "react";
import recipesHandler, { IComment } from "../../util/Recipes";
import { Divider, Classes, H5, ButtonGroup, Button, Popover, TextArea, H3 } from "@blueprintjs/core";
import './CommentSection.scss';
import classNames from "classnames";
import { useTranslation } from "react-i18next";
import dayjs from 'dayjs';
import 'dayjs/locale/de';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import i18n from "../../util/i18n";
import { AppToasterTop } from "../../util/toaster";
import { useMobile } from "../helpers/CustomHooks";

dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);

interface ICommentProps {
  comment: IComment;
  username: string;
}

function Comment(props: ICommentProps) { // TODO: mobile edit
  const [hover, setHover] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newText, setNewText] = useState('');
  const { t } = useTranslation();
  const mobile = useMobile();

  useEffect(() => {
    setNewText(props.comment.text);
  }, [props.comment.text]);

  const deleteComment = async () => {
    if (await recipesHandler.deleteComment(props.comment)) {
      AppToasterTop.show({ message: t('commentDeleted'), intent: 'success' });
    } else {
      AppToasterTop.show({ message: t('commentNotDeleted'), intent: 'warning' });
    }
  }

  const editComment = async () => {
    if (newText === props.comment.text) {
      AppToasterTop.show({ message: t('commentNotModified') });
    } else if (await recipesHandler.updateComment({ ...props.comment, text: newText })) {
      AppToasterTop.show({ message: t('commentSaved'), intent: 'success' });
    } else {
      AppToasterTop.show({ message: t('commentNotSaved'), intent: 'warning' });
    }
    setIsEditing(false);
  }

  const deletePopoverContent = <div>
    <H5>{t('confirmDeleteTitle')}</H5>
    <p>{t('confirmDelete')}</p>
    <div className='popover-button-container'>
      <Button
        text={t('cancel')}
        className={'popover-left ' + Classes.POPOVER_DISMISS}
      />
      <Button
        text={t('deleteComment')}
        intent='danger'
        className={Classes.POPOVER_DISMISS}
        onClick={deleteComment}
      />
    </div>
  </div>

  const mouseOverTimeout = useRef<number>();
  const mouseInTimeout = useRef<number>();

  const mouseOver = () => {
    window.clearTimeout(mouseOverTimeout.current);
    window.clearTimeout(mouseInTimeout.current);
    mouseOverTimeout.current = window.setTimeout(() => {
      setHover(props.username === props.comment.user.user && !mobile);
    }, 0);
  };

  const mouseOut = () => {
    window.clearTimeout(mouseInTimeout.current);
    window.clearTimeout(mouseOverTimeout.current);
    mouseInTimeout.current = window.setTimeout(() => {
      setHover(false);
    }, 100);
  };

  return <div
    key={props.comment.id}
    className='comment'
    onMouseOver={mouseOver}
    onMouseOut={mouseOut}
  >
    <div className='content'>
      <div className='header'>
        <H5 className='name'>
          {props.comment.user.user}
        </H5>
        <div className={classNames(Classes.TEXT_MUTED, 'date')}>
          {dayjs(props.comment.date).locale(i18n.language).fromNow()}
        </div>
        {props.comment.editedDate && <div className={classNames(Classes.TEXT_MUTED, 'date')}>
          {t('edited', { date: dayjs(props.comment.editedDate).locale(i18n.language).fromNow() })}
        </div>}
      </div>
      <div className='text'>
        {isEditing
          ? <TextArea
            className={Classes.EDITABLE_TEXT_INPUT}
            autoFocus={true}
            value={newText}
            placeholder={t('editComment')}
            fill={true}
            onChange={e => {
              const value = e.currentTarget.value;
              setNewText(value);
            }}
          />
          : props.comment.text}
      </div>
    </div>
    {(hover || deleteOpen || isEditing) &&
      <div className='controls'>
        {isEditing
          ? <ButtonGroup
            vertical={true}
            alignText='right'
            minimal={true}
          >
            <Button
              text={t('cancel')}
              icon='undo'
              onClick={() => {
                setIsEditing(false);
                // setNewText(props.comment.text); // wanted?
              }}
            />
            <Button
              text={t('save')}
              icon='floppy-disk'
              intent='primary'
              onClick={editComment}
            />
          </ButtonGroup>
          : <ButtonGroup
            vertical={true}
            minimal={true}
            alignText='right'
          >
            <Button
              rightIcon='edit'
              text={t('edit')}
              intent='primary'
              onClick={() => setIsEditing(true)}
            />
            <Popover
              isOpen={deleteOpen}
              popoverClassName={Classes.POPOVER_CONTENT_SIZING}
              position='right'
              content={deletePopoverContent}
              onClose={() => setDeleteOpen(false)}
            >
              <Button
                rightIcon='delete'
                text={t('delete')}
                intent='danger'
                onClick={() => setDeleteOpen(true)}
              />
            </Popover>
          </ButtonGroup>
        }
      </div>
    }
  </div>
}

function NewComment(props: { username: string, recipeId: number }) {

  const [newText, setNewText] = useState('');
  const [isFocus, setIsFocus] = useState(false);
  const { t } = useTranslation();

  const addComment = async () => {

    if (newText.trim().length === 0) {
      return;
    }
    if (await recipesHandler.addComment(newText, props.recipeId)) {
      AppToasterTop.show({ message: t('commentSaved'), intent: 'success' });
    } else {
      AppToasterTop.show({ message: t('commentNotSaved'), intent: 'warning' });
    }
    setNewText('');
  }

  return <div
    className='comment'
  >
    <div className='content'>
      <div className='header'>
        <H5 className='name'>
          {props.username}
        </H5>
        <div className={classNames(Classes.TEXT_MUTED, 'date')}>
          {t('newComment')}
        </div>
      </div>
      <div className='text'>
        <TextArea
          className={Classes.EDITABLE_TEXT_INPUT}
          value={newText}
          placeholder={t('addComment')}
          onFocus={() => setIsFocus(true)}
          onBlur={() => setTimeout(() => setIsFocus(false), 100)}
          fill={true}
          onChange={e => {
            const value = e.currentTarget.value;
            setNewText(value);
          }}
        />
      </div>
    </div>
    {(isFocus) &&
      <div className='controls'>
        <ButtonGroup
          vertical={true}
          minimal={true}
          alignText='right'
        >
          <Button
            rightIcon='undo'
            text={t('cancel')}
            onClick={() => {
              setNewText('');
            }}
          />
          <Button
            rightIcon='comment'
            text={t('comment')}
            disabled={newText.trim().length === 0}
            intent='primary'
            onClick={addComment}
          />
        </ButtonGroup>
      </div>
    }
  </div>
}

function compareComment(a: IComment, b: IComment) {
  return - dayjs(a.date).diff(b.date);
}

interface IProps {
  comments: IComment[];
  username: string;
  recipeId: number;
  writeAccess: boolean;
};

export default function CommentSection(props: IProps) {
  const mobile = useMobile();
  const { t } = useTranslation();
  return <>
    <div className='comment-section'>
      <Divider />
      <H3 className='comment-count'>
        {(props.comments.length === 0 && props.writeAccess)
          ? t('comments_0')
          : t('comments', { count: props.comments.length })}
      </H3>
      {(!mobile && props.writeAccess) && <NewComment
        username={props.username}
        recipeId={props.recipeId}
      />}
      {props.comments.sort(compareComment).map(c => <Comment
        comment={c}
        username={props.username}
      />)}
    </div>
  </>
}
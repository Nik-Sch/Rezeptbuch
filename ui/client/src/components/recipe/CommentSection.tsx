import { useState, useEffect, useRef } from 'react';
import recipesHandler, { IComment } from '../../util/Network';
import {
  Divider,
  Classes,
  H5,
  ButtonGroup,
  Button,
  TextArea,
  H3,
  Dialog,
  AnchorButton,
  Popover,
  Tooltip,
} from '@blueprintjs/core';
import './CommentSection.scss';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import 'dayjs/locale/de';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import i18n from '../../util/i18n';
import { AppToasterTop } from '../../util/toaster';
import { useMobile, useOnline } from '../helpers/CustomHooks';

dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);

interface ICommentControlProps {
  isEditing: boolean;
  enableEditing: () => void;
  disableEditing: () => void;
  deleteComment: () => Promise<void>;

  deleteOpen: boolean;
  setDeleteOpen: (v: boolean) => void;
  saveComment: () => Promise<void>;
}

function CommentControl(props: ICommentControlProps) {
  const [t] = useTranslation();
  const mobile = useMobile();
  const online = useOnline();

  const deletePopoverContent = (
    <>
      <H5>{t('confirmDeleteTitle')}</H5>
      <p>{t('confirmDelete')}</p>
      <div className="popover-button-container">
        <Button text={t('cancel')} className={'popover-left ' + Classes.POPOVER_DISMISS} />
        <Button
          text={t('deleteComment')}
          intent="danger"
          className={Classes.POPOVER_DISMISS}
          onClick={() => void props.deleteComment()}
        />
      </div>
    </>
  );

  if (props.isEditing) {
    return (
      <ButtonGroup vertical={!mobile} alignText="right" variant="minimal">
        <AnchorButton
          text={t('cancel')}
          icon="undo"
          onClick={() => {
            props.disableEditing();
          }}
        />
        <AnchorButton
          text={t('save')}
          icon="floppy-disk"
          disabled={!online}
          intent="primary"
          onClick={() => void props.saveComment()}
        />
      </ButtonGroup>
    );
  } else {
    return (
      <ButtonGroup vertical={true} variant="minimal" alignText="right">
        <AnchorButton
          endIcon="edit"
          text={t('edit')}
          disabled={!online}
          intent="primary"
          onClick={() => props.enableEditing()}
        />
        <Popover
          isOpen={props.deleteOpen}
          popoverClassName={Classes.POPOVER_CONTENT_SIZING}
          position="left"
          disabled={!online}
          content={deletePopoverContent}
          onClose={() => props.setDeleteOpen(false)}
          renderTarget={({ ref, ...popoverProps }) => (
            <Button
              {...popoverProps}
              ref={ref}
              endIcon="delete"
              text={t('delete')}
              intent="danger"
              disabled={!online}
              onClick={() => props.setDeleteOpen(true)}
            />
          )}
        />
      </ButtonGroup>
    );
  }
}

interface ICommentProps {
  comment: IComment;
  username: string;
}

function Comment(props: ICommentProps) {
  const [hover, setHover] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newText, setNewText] = useState('');
  const [deleteDialogIsOpen, setDeleteDialogIsOpen] = useState(false);
  const { t } = useTranslation();
  const mobile = useMobile();
  const online = useOnline();

  useEffect(() => {
    setNewText(props.comment.text);
  }, [props.comment.text]);

  const deleteComment = async () => {
    if (await recipesHandler.deleteComment(props.comment)) {
      AppToasterTop.show({ message: t('commentDeleted'), intent: 'success' });
    } else {
      AppToasterTop.show({ message: t('commentNotDeleted'), intent: 'warning' });
    }
    setDeleteDialogIsOpen(false);
  };

  const saveComment = async () => {
    if (newText === props.comment.text) {
      AppToasterTop.show({ message: t('commentNotModified') });
    } else if (await recipesHandler.updateComment({ ...props.comment, text: newText })) {
      AppToasterTop.show({ message: t('commentSaved'), intent: 'success' });
    } else {
      AppToasterTop.show({ message: t('commentNotSaved'), intent: 'warning' });
    }
    setIsEditing(false);
  };

  const mobileMorePopoverContent = (
    <div>
      <ButtonGroup variant="minimal" vertical={true} size="large">
        <Button
          text={t('edit')}
          className={'popover-left ' + Classes.POPOVER_DISMISS}
          onClick={() => {
            setNewText(props.comment.text);
            setIsEditing(true);
          }}
        />
        <Button
          text={t('delete')}
          intent="danger"
          className={Classes.POPOVER_DISMISS}
          onClick={() => setDeleteDialogIsOpen(true)}
        />
      </ButtonGroup>
    </div>
  );

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

  return (
    <div key={props.comment.id} className="comment" onMouseOver={mouseOver} onMouseOut={mouseOut}>
      <Dialog
        className="mobile-delete-dialog"
        isOpen={deleteDialogIsOpen}
        onClose={() => setDeleteDialogIsOpen(false)}
        title={t('confirmDeleteTitle')}
      >
        <div className={Classes.DIALOG_BODY}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button
              text={t('cancel')}
              size="large"
              className={'popover-left'}
              onClick={() => setDeleteDialogIsOpen(false)}
            />
            <Button
              size="large"
              text={t('deleteComment')}
              intent="danger"
              className={Classes.POPOVER_DISMISS}
              onClick={() => void deleteComment()}
            />
          </div>
        </div>
      </Dialog>
      <div className="comment-content">
        <div className="comment-header">
          <H5 className="name">{props.comment.user.user}</H5>
          <div className={classNames(Classes.TEXT_MUTED, 'date')}>
            {dayjs(props.comment.date).locale(i18n.language).fromNow()}
          </div>
          {props.comment.editedDate && !mobile && (
            <div className={classNames(Classes.TEXT_MUTED, 'date')}>
              {t('edited', {
                date: dayjs(props.comment.editedDate).locale(i18n.language).fromNow(),
              })}
            </div>
          )}
          {mobile && props.username === props.comment.user.user && (
            <div className="more">
              <Popover
                minimal={true}
                content={mobileMorePopoverContent}
                position="left-top"
                disabled={!online}
              >
                <Tooltip content={t('tooltipOffline')} disabled={online}>
                  <AnchorButton
                    variant="minimal"
                    disabled={!online}
                    icon="more"
                    style={{ transform: 'rotate(90deg)' }}
                  />
                </Tooltip>
              </Popover>
            </div>
          )}
        </div>
        <div className="comment-text">
          {isEditing ? (
            <TextArea
              className={Classes.EDITABLE_TEXT_INPUT}
              autoFocus={true}
              value={newText}
              placeholder={t('editComment')}
              fill={true}
              onChange={(e) => {
                const value = e.currentTarget.value;
                setNewText(value);
              }}
            />
          ) : (
            props.comment.text
          )}
        </div>
      </div>
      {(hover || deleteOpen || isEditing) && (
        <div className="comment-controls">
          <Tooltip
            content={t('tooltipOffline')}
            disabled={online}
            renderTarget={({ ref, ...tooltipProps }) => (
              <div ref={ref} {...tooltipProps}>
                <CommentControl
                  isEditing={isEditing}
                  enableEditing={() => {
                    setNewText(props.comment.text);
                    setIsEditing(true);
                  }}
                  disableEditing={() => setIsEditing(false)}
                  deleteComment={deleteComment}
                  deleteOpen={deleteOpen}
                  setDeleteOpen={setDeleteOpen}
                  saveComment={saveComment}
                />
              </div>
            )}
          />
        </div>
      )}
    </div>
  );
}

function NewComment(props: { username: string; recipeId: number }) {
  const mobile = useMobile();
  const online = useOnline();

  const [newText, setNewText] = useState('');
  const [showControls, setShowControls] = useState(false);
  const { t } = useTranslation();

  const addComment = async () => {
    if (newText.trim().length === 0) {
      return;
    }

    setShowControls(false);
    if (await recipesHandler.addComment(newText, props.recipeId)) {
      AppToasterTop.show({ message: t('commentSaved'), intent: 'success' });
    } else {
      AppToasterTop.show({ message: t('commentNotSaved'), intent: 'warning' });
    }
    setNewText('');
  };

  const blurTimeout = useRef<number>();

  return (
    <div className="comment">
      <div className="comment-content">
        <div className="comment-header">
          <H5 className="name">{props.username}</H5>
          <div className={classNames(Classes.TEXT_MUTED, 'date')}>{t('newComment')}</div>
        </div>
        <div className="comment-text">
          <TextArea
            className={Classes.EDITABLE_TEXT_INPUT}
            value={newText}
            placeholder={t('addComment')}
            onFocus={() => setShowControls(true)}
            onBlur={() => {
              window.clearTimeout(blurTimeout.current);
              blurTimeout.current = window.setTimeout(() => {
                if (newText.trim().length === 0) {
                  setShowControls(false);
                }
              }, 100);
            }}
            fill={true}
            onChange={(e) => {
              const value = e.currentTarget.value;
              setNewText(value);
            }}
          />
        </div>
      </div>
      {showControls && (
        <div className="comment-controls">
          <ButtonGroup vertical={!mobile} variant="minimal" alignText="right">
            <Button
              endIcon="undo"
              text={t('cancel')}
              onClick={() => {
                setShowControls(false);
                setNewText('');
              }}
            />
            <Tooltip content={t('tooltipOffline')} disabled={online}>
              <AnchorButton
                endIcon="comment"
                text={t('comment')}
                disabled={newText.trim().length === 0 || !online}
                intent="primary"
                onClick={() => void addComment()}
              />
            </Tooltip>
          </ButtonGroup>
        </div>
      )}
    </div>
  );
}

function compareComment(a: IComment, b: IComment) {
  return -dayjs(a.date).diff(b.date);
}

interface IProps {
  comments: IComment[];
  username: string;
  recipeId: number;
  writeAccess: boolean;
}

export default function CommentSection(props: IProps) {
  const mobile = useMobile();
  const { t } = useTranslation();
  return (
    <>
      <div className="comment-section">
        {mobile && <Divider />}
        <H3 className="comment-count">
          {props.comments.length === 0 && props.writeAccess
            ? t('comments_0')
            : props.comments.length === 1
              ? t('comments_1')
              : t('comments_plural', { count: props.comments.length })}
        </H3>
        {props.writeAccess && <NewComment username={props.username} recipeId={props.recipeId} />}
        {props.comments.sort(compareComment).map((c) => (
          <Comment comment={c} username={props.username} key={c.id} />
        ))}
      </div>
    </>
  );
}

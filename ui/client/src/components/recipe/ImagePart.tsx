import React, { useState, useEffect } from 'react';
import { Classes, Popover, Button, Dialog, ProgressBar, Intent, H5 } from '@blueprintjs/core';
import { MyImage } from '../helpers/Image';
import { AppToasterTop } from '../../util/toaster';
import { useTranslation } from 'react-i18next';
import { MyFileInput } from '../helpers/MyFileInput';
import classNames from 'classnames';

import './ImagePart.scss';
import { useMobile, useWindowDimensions } from '../helpers/CustomHooks';
import recipesHandler, { IRecipe } from '../../util/Network';

export interface IImagePartProps {
  recipe: IRecipe;
  setImage?: (image: string) => void;
  editable: boolean;
  className?: string;
}

export default function ImagePart(props: IImagePartProps) {
  const mobile = useMobile();
  const [t] = useTranslation();
  const { width, height } = useWindowDimensions();

  const [showImage, setShowImage] = useState<boolean>(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);
  const [fileSelected, setFileSelected] = useState<boolean>(false);
  const [uploadImageText, setUploadImageText] = useState<string>();

  useEffect(() => {
    setUploadImageText(props.recipe.image ? t('changeImage') : t('addImage'));
  }, [props.recipe.image, t]);

  const renderUploadProgress = (progress: number, failure?: boolean) => {
    return {
      message: (
        <ProgressBar
          className={classNames('docs-toast-progress', {
            [Classes.PROGRESS_NO_STRIPES]: progress >= 1,
          })}
          intent={
            progress < 1 || typeof failure === 'undefined'
              ? Intent.PRIMARY
              : failure
                ? Intent.DANGER
                : Intent.SUCCESS
          }
          value={progress}
        />
      ),
      timeout: progress < 1 || typeof failure === 'undefined' ? 0 : 2000,
    };
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsPopoverOpen(false);
    setFileSelected(true);
    if (event.target.files) {
      const uploadToastKey = AppToasterTop.show(renderUploadProgress(0));
      recipesHandler.uploadImage(event.target.files[0], {
        onUploadProgress: (event) => {
          AppToasterTop.show(
            renderUploadProgress(event.loaded / (event.total ?? 0)),
            uploadToastKey,
          );
        },
        onSuccess: (response) => {
          AppToasterTop.show(renderUploadProgress(1, false), uploadToastKey);
          if (props.setImage) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            props.setImage(response.data.name as string);
          }
        },
        onFailure: () => {
          AppToasterTop.show(renderUploadProgress(1, true), uploadToastKey);
        },
      });
    }
  };

  const handleDeleteImageClick = () => props.setImage?.('');

  if (props.editable) {
    if (props.recipe.image.trim() === '') {
      return (
        <MyFileInput
          icon="media"
          className="image-button"
          text={uploadImageText}
          onInputChange={handleFileInputChange}
          hasSelection={fileSelected}
        />
      );
    } else if (mobile) {
      return (
        <div className={classNames(props.className, 'mobile-edit-wrapper')}>
          <MyImage
            size={width}
            className="mobile-edit-image"
            fallback={false}
            recipe={props.recipe}
          />
          <div className="backdrop">
            <div className="mobile-edit-card">
              <MyFileInput
                large={true}
                className="file-input"
                text={uploadImageText}
                onInputChange={handleFileInputChange}
                hasSelection={fileSelected}
                icon="edit"
              />
              <Button
                className="delete-image"
                text={t('delete')}
                intent="danger"
                endIcon="delete"
                size="large"
                onClick={handleDeleteImageClick}
              />
              {/* </div> */}
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className={props.className}>
          <Popover
            // wrapperTagName='div'
            // usePortal={false}
            popoverClassName={Classes.POPOVER_CONTENT_SIZING}
            interactionKind="click"
            onInteraction={(newState) => {
              if (newState) {
                setIsPopoverOpen(true);
              } else {
                setIsPopoverOpen(false);
              }
            }}
            position="left"
            isOpen={isPopoverOpen}
            content={
              <div>
                <H5>{t('editImageTitle')}</H5>
                <p>{t('editImageDescription')}</p>
                <div className="popover-edit-image">
                  <MyFileInput
                    className="popover-left file-input"
                    text={uploadImageText}
                    onInputChange={handleFileInputChange}
                    hasSelection={fileSelected}
                    icon="edit"
                  />
                  <Button
                    text={t('delete')}
                    intent="danger"
                    endIcon="delete"
                    className="delete-image"
                    onClick={handleDeleteImageClick}
                  />
                </div>
              </div>
            }
          >
            <MyImage
              size={height / 2}
              fallback={false}
              recipe={props.recipe}
              imageProps={{
                onMouseOver: () => setIsPopoverOpen(true),
              }}
            />
          </Popover>
        </div>
      );
    }
  } else {
    return props.recipe.image !== '' ? (
      <div className={props.className}>
        <MyImage
          size={mobile ? width : height / 2}
          recipe={props.recipe}
          fallback={false}
          onClick={() => setShowImage(true)}
        />

        <Dialog
          // hasBackdrop={true}
          isOpen={showImage}
          onClose={() => setShowImage(false)}
          className="image-dialog"
        >
          <MyImage
            size={Math.max(width, height)}
            className={mobile ? 'mobile-image' : Classes.DIALOG_BODY}
            recipe={props.recipe}
            fallback={false}
            onClick={() => setShowImage(false)}
          />
        </Dialog>
      </div>
    ) : null;
  }
}

import { Position, OverlayToaster } from '@blueprintjs/core';

export const AppToasterTop = OverlayToaster.create({
  className: 'recipe-toaster',
  position: Position.TOP,
});

export const AppToasterBottom = OverlayToaster.create({
  className: 'recipe-toaster',
  position: Position.BOTTOM,
});

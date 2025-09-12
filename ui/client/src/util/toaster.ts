import { Position, OverlayToaster } from '@blueprintjs/core';

export const AppToasterTop = await OverlayToaster.create({
  className: 'recipe-toaster',
  position: Position.TOP,
});

export const AppToasterBottom = await OverlayToaster.create({
  className: 'recipe-toaster',
  position: Position.BOTTOM,
});

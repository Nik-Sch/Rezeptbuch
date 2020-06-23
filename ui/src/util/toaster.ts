import { Position, Toaster } from "@blueprintjs/core";

export const AppToasterTop = Toaster.create({
  className: "recipe-toaster",
  position: Position.TOP,
});

export const AppToasterBottom = Toaster.create({
  className: "recipe-toaster",
  position: Position.BOTTOM,
});
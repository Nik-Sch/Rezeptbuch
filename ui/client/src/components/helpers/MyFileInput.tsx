import * as React from 'react';
import classNames from 'classnames';
import { Classes, Icon, IconName } from '@blueprintjs/core';

import './MyFileInput.scss';

interface IMyFileInputProps {
  className: string;
  onInputChange: React.ChangeEventHandler<HTMLInputElement>;
  hasSelection: boolean;
  text?: string;
  buttonText?: string;
  disabled?: boolean;
  large?: boolean;
  icon?: IconName;
}

export function MyFileInput(props: IMyFileInputProps) {
  const disabled = props.disabled ?? false;
  const text = props.text ?? 'Choose file...';
  const icon = props.icon ?? 'add';
  const large = props.large ?? false;

  const labelClasses = classNames(
    Classes.FILE_INPUT,
    {
      [Classes.FILE_INPUT_HAS_SELECTION]: props.hasSelection,
      [Classes.DISABLED]: disabled,
    },
    Classes.BUTTON,
    Classes.INTENT_PRIMARY,
    props.className,
  );

  return (
    <>
      <label className={classNames(labelClasses, 'my-file-input', large ? Classes.LARGE : '')}>
        <Icon size={large ? 20 : 16} icon={icon} />
        <span className="text">{text}</span>
        <input onChange={props.onInputChange} type="file" disabled={disabled} />
      </label>
    </>
  );
}

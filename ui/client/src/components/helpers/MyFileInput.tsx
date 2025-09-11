import * as React from 'react';
import classNames from 'classnames';
import { Classes, Icon, IconName } from '@blueprintjs/core';

import './MyFileInput.scss';

interface IMyFileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onInputChange: React.ChangeEventHandler<HTMLInputElement>;
  hasSelection: boolean;
  text?: string;
  buttonText?: string;
  disabled?: boolean;
  large?: boolean;
  icon?: IconName;
}

export function MyFileInput(props: IMyFileInputProps) {
  let { disabled, text, icon, large } = props;
  const { hasSelection, className, ...inputProps } = props;

  if (typeof disabled === 'undefined') {
    disabled = false;
  }
  if (typeof text === 'undefined') {
    text = 'Choose file...';
  }
  if (typeof icon === 'undefined') {
    icon = 'add';
  }

  if (typeof large === 'undefined') {
    large = false;
  }

  const labelClasses = classNames(
    Classes.FILE_INPUT,
    {
      [Classes.FILE_INPUT_HAS_SELECTION]: hasSelection,
      [Classes.DISABLED]: disabled,
    },
    Classes.BUTTON,
    Classes.INTENT_PRIMARY,
    className,
  );

  const handleOnChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    if (props.onInputChange) {
      props.onInputChange(e);
    }
    if (inputProps.onChange) {
      inputProps.onChange(e);
    }
  };

  return (
    <>
      <label className={classNames(labelClasses, 'my-file-input', large ? Classes.LARGE : '')}>
        <Icon size={large ? 20 : 16} icon={icon} />
        <span className="text">{text}</span>
        <input {...inputProps} onChange={handleOnChange} type="file" disabled={disabled} />
      </label>
    </>
  );
}

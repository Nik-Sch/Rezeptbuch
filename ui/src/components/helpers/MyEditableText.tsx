import React, { useState } from 'react';
import { TextArea } from '@blueprintjs/core';

interface IProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string,
  placeHolder?: string,
  editable: boolean
}

export function MyEditableTextArea(myProps: IProps) {
  const {
    value,
    placeHolder,
    editable,
    ...props
  } = myProps;

  const handleBlur = () => setEditing(false);
  const handleFocus = () => setEditing(editable);

  const [isEditing, setEditing] = useState(false);
  if (isEditing) {
    return <TextArea
      value={value}
      onBlur={handleBlur}
    />
  } else {
    return <span
      onFocus={handleFocus}
      {...props}
    >
      {value}

    </span>
  }
}
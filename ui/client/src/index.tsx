import React, { Suspense } from 'react';
import './index.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';
import '@blueprintjs/core/lib/css/blueprint.css';
import App from './App';
import logo from './static/logo-no-text.svg';
import { hydrate, render } from "react-dom";


const rootElement = document.getElementById("root");
const fallback = <div style={{
    maxWidth: '90vw',
    maxHeight: '90vh',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)'}} >
  <img src={logo} alt='loading' />
</div>

const node = <React.StrictMode>
  <Suspense fallback={fallback}>
    <App />
  </Suspense>
</React.StrictMode>;

if (rootElement && rootElement.hasChildNodes()) {
  hydrate(node, rootElement);
} else {
  render(node, rootElement);
}

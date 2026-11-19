import React from 'react';
import ReactDOM from 'react-dom';
import PickerPage from './picker/page';

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.render(<PickerPage />, rootEl);
}

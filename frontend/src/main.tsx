// ---------------------------------------------------------------------------
// Application entry point
// ---------------------------------------------------------------------------

import React from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';

const googleClientId =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    '524704483090-hm6hjicmrhh5flr9c28kr1tdelba7tbf.apps.googleusercontent.com';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <GoogleOAuthProvider clientId={googleClientId}>
            <App />
        </GoogleOAuthProvider>
    </React.StrictMode>,
);

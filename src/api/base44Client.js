import { createClient } from '@base44/sdk';

const base44 = createClient({
  appId: import.meta.env.VITE_BASE44_APP_ID || 'your-app-id',
});

export default base44;

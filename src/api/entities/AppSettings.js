import svc from '../firestoreService';

const AppSettings = {
  list: () => svc.list('settings'),
  create: (data) => svc.create('settings', data),
  update: (id, data) => svc.update('settings', id, data),
  delete: (id) => svc.delete('settings', id),
};

export default AppSettings;

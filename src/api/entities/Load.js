import svc from '../firestoreService';

const Load = {
  list: () => svc.list('loads'),
  get: (id) => svc.get('loads', id),
  create: (data) => svc.create('loads', data),
  update: (id, data) => svc.update('loads', id, data),
  delete: (id) => svc.delete('loads', id),
  bulkCreate: (arr) => svc.bulkCreate('loads', arr),
  filter: (filters) => svc.filter('loads', filters),
  listPaginated: (opts) => svc.listPaginated('loads', opts),
};

export default Load;

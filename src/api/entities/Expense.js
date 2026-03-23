import svc from '../firestoreService';

const Expense = {
  list: () => svc.list('expenses'),
  get: (id) => svc.get('expenses', id),
  create: (data) => svc.create('expenses', data),
  update: (id, data) => svc.update('expenses', id, data),
  delete: (id) => svc.delete('expenses', id),
  bulkCreate: (arr) => svc.bulkCreate('expenses', arr),
  filter: (filters) => svc.filter('expenses', filters),
};

export default Expense;

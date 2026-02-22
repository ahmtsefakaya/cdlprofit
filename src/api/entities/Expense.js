import base44 from '../base44Client';

const Expense = {
  list: () => base44.entities.Expense.list(),
  create: (data) => base44.entities.Expense.create(data),
  update: (id, data) => base44.entities.Expense.update(id, data),
  delete: (id) => base44.entities.Expense.delete(id),
  bulkCreate: (arr) => base44.entities.Expense.bulkCreate(arr),
  filter: (query) => base44.entities.Expense.filter(query),
};

export default Expense;

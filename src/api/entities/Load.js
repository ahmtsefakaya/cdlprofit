import base44 from '../base44Client';

const Load = {
  list: () => base44.entities.Load.list(),
  create: (data) => base44.entities.Load.create(data),
  update: (id, data) => base44.entities.Load.update(id, data),
  delete: (id) => base44.entities.Load.delete(id),
  bulkCreate: (arr) => base44.entities.Load.bulkCreate(arr),
  filter: (query) => base44.entities.Load.filter(query),
};

export default Load;

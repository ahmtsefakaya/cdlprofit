import base44 from '../base44Client';

const AppSettings = {
  list: () => base44.entities.AppSettings.list(),
  create: (data) => base44.entities.AppSettings.create(data),
  update: (id, data) => base44.entities.AppSettings.update(id, data),
  delete: (id) => base44.entities.AppSettings.delete(id),
  bulkCreate: (arr) => base44.entities.AppSettings.bulkCreate(arr),
  filter: (query) => base44.entities.AppSettings.filter(query),
};

export default AppSettings;

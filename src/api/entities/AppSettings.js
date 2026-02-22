import { db, auth } from '../firebase';
import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, where, writeBatch,
} from 'firebase/firestore';

function getColRef() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('User not authenticated');
  return collection(db, 'users', uid, 'settings');
}

const AppSettings = {
  list: async () => {
    const snap = await getDocs(getColRef());
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },
  create: async (data) => {
    const ref = await addDoc(getColRef(), { ...data, createdAt: new Date().toISOString() });
    return { id: ref.id, ...data };
  },
  update: async (id, data) => {
    await updateDoc(doc(db, 'users', auth.currentUser.uid, 'settings', id), {
      ...data, updatedAt: new Date().toISOString(),
    });
    return { id, ...data };
  },
  delete: async (id) => {
    await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'settings', id));
  },
  bulkCreate: async (arr) => {
    const batch = writeBatch(db);
    const colRef = getColRef();
    arr.forEach((data) => {
      const ref = doc(colRef);
      batch.set(ref, { ...data, createdAt: new Date().toISOString() });
    });
    await batch.commit();
  },
  filter: async (queryObj) => {
    const constraints = Object.entries(queryObj).map(([k, v]) => where(k, '==', v));
    const q = query(getColRef(), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },
};

export default AppSettings;
